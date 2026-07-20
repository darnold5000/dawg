-- Packages (punch cards), redemptions, intake submissions.
-- Also allow booking payment_method = package_credit.

-- ---------------------------------------------------------------------------
-- 1. Packages catalog
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  session_count integer not null check (session_count > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.dawg_packages (slug, name, description, session_count, price_cents, display_order)
values
  (
    'single',
    'Single session',
    'One training session — $25.',
    1,
    2500,
    1
  ),
  (
    'pack-10',
    '10 sessions',
    '10 sessions at $20 each — $200 total.',
    10,
    20000,
    2
  ),
  (
    'pack-20',
    '20 sessions',
    '20 sessions at $15 each — $300 total.',
    20,
    30000,
    3
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  session_count = excluded.session_count,
  price_cents = excluded.price_cents,
  display_order = excluded.display_order,
  active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Package purchases (punch cards)
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_package_purchases (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.dawg_parents (id) on delete restrict,
  package_id uuid not null references public.dawg_packages (id) on delete restrict,
  athlete_id uuid references public.dawg_athletes (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'expired')),
  sessions_total integer not null check (sessions_total > 0),
  sessions_remaining integer not null check (sessions_remaining >= 0),
  amount_paid_cents integer not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sessions_remaining <= sessions_total)
);

create index if not exists dawg_package_purchases_parent_idx
  on public.dawg_package_purchases (parent_id);

create index if not exists dawg_package_purchases_active_idx
  on public.dawg_package_purchases (parent_id, status)
  where status = 'paid' and sessions_remaining > 0;

create unique index if not exists dawg_package_purchases_checkout_uidx
  on public.dawg_package_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Redemptions
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_package_redemptions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.dawg_package_purchases (id) on delete restrict,
  booking_id uuid not null references public.dawg_bookings (id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists dawg_package_redemptions_purchase_idx
  on public.dawg_package_redemptions (purchase_id);

-- ---------------------------------------------------------------------------
-- 4. Intake submissions
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.dawg_parents (id) on delete cascade,
  athlete_id uuid not null references public.dawg_athletes (id) on delete cascade,
  school_grade text,
  height_weight text,
  sport_position text,
  health_issues text,
  emergency_contact_1_name text,
  emergency_contact_1_phone text,
  emergency_contact_2_name text,
  emergency_contact_2_phone text,
  package_interest text
    check (
      package_interest is null
      or package_interest in ('single', 'pack-10', 'pack-20')
    ),
  shirt_size text,
  goal text,
  media_consent boolean not null default false,
  agreements_version text not null,
  waiver_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id)
);

create index if not exists dawg_intake_submissions_parent_idx
  on public.dawg_intake_submissions (parent_id);

-- ---------------------------------------------------------------------------
-- 5. Booking payment_method: package_credit
-- ---------------------------------------------------------------------------

alter table public.dawg_bookings
  drop constraint if exists dawg_bookings_payment_method_check;

alter table public.dawg_bookings
  add constraint dawg_bookings_payment_method_check
  check (
    payment_method is null
    or payment_method in ('stripe', 'pay_at_facility', 'package_credit')
  );

create or replace function public.dawg_try_create_booking(
  p_session_id uuid,
  p_parent_id uuid,
  p_athlete_id uuid,
  p_confirmation_number text,
  p_amount_due_cents integer,
  p_payment_status text,
  p_payment_method text,
  p_customer_notes text,
  p_waiver_acknowledged_at timestamptz,
  p_media_consent boolean,
  p_hold_minutes integer default 15
)
returns public.dawg_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_count int;
  v_status text;
  v_session_date date;
  v_requirement text;
  v_booking public.dawg_bookings;
  v_booking_status text;
  v_expires_at timestamptz;
  v_currency text;
begin
  select
    capacity,
    status,
    session_date,
    payment_requirement,
    currency
  into
    v_capacity,
    v_status,
    v_session_date,
    v_requirement,
    v_currency
  from public.dawg_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_status not in ('published', 'full') then
    raise exception 'SESSION_NOT_BOOKABLE';
  end if;

  if v_session_date < current_date then
    raise exception 'SESSION_IN_PAST';
  end if;

  if p_payment_method not in ('stripe', 'pay_at_facility', 'package_credit') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_payment_method = 'stripe'
     and v_requirement not in ('pay_online', 'online_or_facility') then
    raise exception 'ONLINE_PAYMENT_NOT_ALLOWED';
  end if;

  if p_payment_method = 'pay_at_facility'
     and v_requirement not in ('pay_at_facility', 'online_or_facility') then
    raise exception 'FACILITY_PAYMENT_NOT_ALLOWED';
  end if;

  -- package_credit is always allowed when the parent has credits (checked in app)

  update public.dawg_bookings
  set
    status = 'expired',
    payment_status = case
      when payment_status = 'pending' then 'failed'
      else payment_status
    end,
    updated_at = now()
  where session_id = p_session_id
    and status = 'pending'
    and booking_expires_at is not null
    and booking_expires_at <= now();

  select public.dawg_session_booked_count(p_session_id) into v_count;

  if v_count >= v_capacity then
    update public.dawg_sessions
    set status = 'full'
    where id = p_session_id and status = 'published';
    raise exception 'SESSION_FULL';
  end if;

  if p_payment_method = 'stripe' then
    v_booking_status := 'pending';
    v_expires_at := now() + make_interval(mins => greatest(coalesce(p_hold_minutes, 15), 1));
  else
    -- facility + package credit confirm immediately
    v_booking_status := 'confirmed';
    v_expires_at := null;
  end if;

  insert into public.dawg_bookings (
    session_id,
    parent_id,
    athlete_id,
    confirmation_number,
    status,
    attendance_status,
    payment_method,
    payment_status,
    amount_due_cents,
    amount_paid_cents,
    amount_refunded_cents,
    currency,
    customer_notes,
    waiver_acknowledged_at,
    media_consent,
    booking_expires_at,
    confirmation_token,
    paid_at
  ) values (
    p_session_id,
    p_parent_id,
    p_athlete_id,
    p_confirmation_number,
    v_booking_status,
    'registered',
    p_payment_method,
    p_payment_status,
    coalesce(p_amount_due_cents, 0),
    case
      when p_payment_method = 'package_credit' then coalesce(p_amount_due_cents, 0)
      else 0
    end,
    0,
    coalesce(v_currency, 'usd'),
    p_customer_notes,
    p_waiver_acknowledged_at,
    coalesce(p_media_consent, false),
    v_expires_at,
    gen_random_uuid(),
    case when p_payment_method = 'package_credit' then now() else null end
  )
  returning * into v_booking;

  if v_count + 1 >= v_capacity then
    update public.dawg_sessions set status = 'full' where id = p_session_id;
  end if;

  return v_booking;
end;
$$;

-- Redeem one credit atomically. Returns remaining sessions after redeem.
create or replace function public.dawg_redeem_package_credit(
  p_purchase_id uuid,
  p_booking_id uuid,
  p_parent_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update public.dawg_package_purchases
  set
    sessions_remaining = sessions_remaining - 1,
    updated_at = now()
  where id = p_purchase_id
    and parent_id = p_parent_id
    and status = 'paid'
    and sessions_remaining > 0
  returning sessions_remaining into v_remaining;

  if not found then
    raise exception 'NO_CREDIT_AVAILABLE';
  end if;

  insert into public.dawg_package_redemptions (purchase_id, booking_id)
  values (p_purchase_id, p_booking_id);

  return v_remaining;
end;
$$;
