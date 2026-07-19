-- DAWG Launch payment model: integer cents, payment requirements,
-- booking vs attendance status, Stripe holds, idempotent events.
-- Extends dawg_* schema from 001_initial.sql.

-- ---------------------------------------------------------------------------
-- 1. Programs: default_price → default_price_cents
-- ---------------------------------------------------------------------------

alter table public.dawg_programs
  add column if not exists default_price_cents integer;

update public.dawg_programs
set default_price_cents = round(coalesce(default_price, 0) * 100)::integer
where default_price_cents is null;

alter table public.dawg_programs
  drop column if exists default_price;

-- ---------------------------------------------------------------------------
-- 2. Sessions: money → cents, payment_requirement enum
-- ---------------------------------------------------------------------------

alter table public.dawg_sessions
  add column if not exists price_cents integer,
  add column if not exists deposit_amount_cents integer,
  add column if not exists currency text;

update public.dawg_sessions
set
  price_cents = round(coalesce(price, 0) * 100)::integer,
  deposit_amount_cents = case
    when deposit_amount is null then null
    else round(deposit_amount * 100)::integer
  end,
  currency = coalesce(currency, 'usd')
where price_cents is null;

alter table public.dawg_sessions
  alter column price_cents set default 0,
  alter column price_cents set not null,
  alter column currency set default 'usd',
  alter column currency set not null;

alter table public.dawg_sessions
  drop column if exists price,
  drop column if exists deposit_amount;

alter table public.dawg_sessions
  drop constraint if exists dawg_sessions_payment_requirement_check;

update public.dawg_sessions
set payment_requirement = case payment_requirement
  when 'full_at_booking' then 'pay_online'
  when 'deposit_at_booking' then 'online_or_facility'
  else payment_requirement
end
where payment_requirement in ('full_at_booking', 'deposit_at_booking');

alter table public.dawg_sessions
  alter column payment_requirement set default 'pay_at_facility';

alter table public.dawg_sessions
  add constraint dawg_sessions_payment_requirement_check
  check (payment_requirement in ('pay_online', 'pay_at_facility', 'online_or_facility'));

-- ---------------------------------------------------------------------------
-- 3. Bookings: attendance split, payment fields, holds, email idempotency
-- ---------------------------------------------------------------------------

alter table public.dawg_bookings
  add column if not exists attendance_status text,
  add column if not exists payment_method text,
  add column if not exists amount_due_cents integer,
  add column if not exists amount_paid_cents integer,
  add column if not exists amount_refunded_cents integer,
  add column if not exists currency text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists payment_failure_message text,
  add column if not exists booking_expires_at timestamptz,
  add column if not exists confirmation_token uuid,
  add column if not exists confirmation_email_sent_at timestamptz;

-- Migrate legacy booking.status values that become attendance
update public.dawg_bookings
set
  attendance_status = case status
    when 'attended' then 'attended'
    when 'no_show' then 'no_show'
    when 'cancelled' then 'cancelled'
    else 'registered'
  end,
  status = case status
    when 'attended' then 'confirmed'
    when 'no_show' then 'confirmed'
    when 'refunded' then 'cancelled'
    else status
  end
where attendance_status is null;

update public.dawg_bookings
set attendance_status = coalesce(attendance_status, 'registered');

alter table public.dawg_bookings
  alter column attendance_status set default 'registered',
  alter column attendance_status set not null;

alter table public.dawg_bookings
  drop constraint if exists dawg_bookings_status_check;

alter table public.dawg_bookings
  add constraint dawg_bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'waitlisted', 'expired'));

alter table public.dawg_bookings
  drop constraint if exists dawg_bookings_attendance_status_check;

alter table public.dawg_bookings
  add constraint dawg_bookings_attendance_status_check
  check (attendance_status in ('registered', 'attended', 'no_show', 'cancelled'));

-- Money migration
update public.dawg_bookings
set
  amount_due_cents = round(coalesce(amount_due, 0) * 100)::integer,
  amount_paid_cents = round(coalesce(amount_paid, 0) * 100)::integer,
  amount_refunded_cents = coalesce(amount_refunded_cents, 0),
  currency = coalesce(currency, 'usd')
where amount_due_cents is null;

alter table public.dawg_bookings
  alter column amount_due_cents set default 0,
  alter column amount_due_cents set not null,
  alter column amount_paid_cents set default 0,
  alter column amount_paid_cents set not null,
  alter column amount_refunded_cents set default 0,
  alter column amount_refunded_cents set not null,
  alter column currency set default 'usd',
  alter column currency set not null;

alter table public.dawg_bookings
  drop column if exists amount_due,
  drop column if exists amount_paid;

-- Payment method + status migration
update public.dawg_bookings
set payment_method = case
  when payment_status = 'pay_at_facility' then 'pay_at_facility'
  when stripe_checkout_session_id is not null or stripe_payment_intent_id is not null
    then 'stripe'
  else coalesce(payment_method, 'pay_at_facility')
end
where payment_method is null;

update public.dawg_bookings
set payment_status = case payment_status
  when 'pay_at_facility' then 'unpaid'
  when 'deposit_paid' then case
    when amount_paid_cents > 0 then 'paid'
    else 'unpaid'
  end
  when 'pending' then 'pending'
  when 'paid' then 'paid'
  when 'refunded' then 'refunded'
  when 'not_required' then 'not_required'
  else 'unpaid'
end;

alter table public.dawg_bookings
  drop constraint if exists dawg_bookings_payment_status_check;

alter table public.dawg_bookings
  add constraint dawg_bookings_payment_status_check
  check (payment_status in (
    'not_required', 'unpaid', 'pending', 'paid',
    'failed', 'partially_refunded', 'refunded'
  ));

alter table public.dawg_bookings
  drop constraint if exists dawg_bookings_payment_method_check;

alter table public.dawg_bookings
  add constraint dawg_bookings_payment_method_check
  check (
    payment_method is null
    or payment_method in ('stripe', 'pay_at_facility')
  );

alter table public.dawg_bookings
  alter column payment_status set default 'unpaid';

update public.dawg_bookings
set confirmation_token = gen_random_uuid()
where confirmation_token is null;

alter table public.dawg_bookings
  alter column confirmation_token set default gen_random_uuid(),
  alter column confirmation_token set not null;

create unique index if not exists dawg_bookings_confirmation_token_uidx
  on public.dawg_bookings (confirmation_token);

create index if not exists dawg_bookings_stripe_checkout_idx
  on public.dawg_bookings (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists dawg_bookings_stripe_pi_idx
  on public.dawg_bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists dawg_bookings_payment_status_idx
  on public.dawg_bookings (payment_status);

create index if not exists dawg_bookings_expires_idx
  on public.dawg_bookings (booking_expires_at)
  where status = 'pending' and booking_expires_at is not null;

drop index if exists public.dawg_bookings_unique_athlete_session;
create unique index dawg_bookings_unique_athlete_session
  on public.dawg_bookings (session_id, athlete_id)
  where status in ('pending', 'confirmed', 'waitlisted');

-- ---------------------------------------------------------------------------
-- 4. Stripe events (idempotency) + payment transactions
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  booking_id uuid references public.dawg_bookings (id) on delete set null,
  processed boolean not null default false,
  processing_error text,
  payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists dawg_stripe_events_event_id_idx
  on public.dawg_stripe_events (stripe_event_id);

create table if not exists public.dawg_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.dawg_bookings (id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('payment', 'refund', 'adjustment')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dawg_payment_transactions_booking_idx
  on public.dawg_payment_transactions (booking_id, created_at desc);

create unique index if not exists dawg_payment_transactions_refund_uidx
  on public.dawg_payment_transactions (stripe_refund_id)
  where stripe_refund_id is not null;

alter table public.dawg_stripe_events enable row level security;
alter table public.dawg_payment_transactions enable row level security;

drop policy if exists "dawg_staff_read_stripe_events" on public.dawg_stripe_events;
create policy "dawg_staff_read_stripe_events"
  on public.dawg_stripe_events for select using (public.dawg_is_staff());

drop policy if exists "dawg_admin_manage_stripe_events" on public.dawg_stripe_events;
create policy "dawg_admin_manage_stripe_events"
  on public.dawg_stripe_events for all using (public.dawg_is_admin());

drop policy if exists "dawg_staff_read_payment_tx" on public.dawg_payment_transactions;
create policy "dawg_staff_read_payment_tx"
  on public.dawg_payment_transactions for select using (public.dawg_is_staff());

drop policy if exists "dawg_admin_manage_payment_tx" on public.dawg_payment_transactions;
create policy "dawg_admin_manage_payment_tx"
  on public.dawg_payment_transactions for all using (public.dawg_is_admin());

-- ---------------------------------------------------------------------------
-- 5. Capacity helpers — confirmed + non-expired pending holds
-- ---------------------------------------------------------------------------

create or replace function public.dawg_session_booked_count(p_session_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.dawg_bookings b
  where b.session_id = p_session_id
    and (
      b.status = 'confirmed'
      or (
        b.status = 'pending'
        and (b.booking_expires_at is null or b.booking_expires_at > now())
      )
    );
$$;

-- Extended booking reservation. Returns the booking row (includes id + confirmation_token).
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

  if p_payment_method not in ('stripe', 'pay_at_facility') then
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

  -- Expire stale pending holds for this session before capacity check
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
    confirmation_token
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
    0,
    0,
    coalesce(v_currency, 'usd'),
    p_customer_notes,
    p_waiver_acknowledged_at,
    p_media_consent,
    v_expires_at,
    gen_random_uuid()
  )
  returning * into v_booking;

  if v_count + 1 >= v_capacity then
    update public.dawg_sessions set status = 'full' where id = p_session_id;
  end if;

  return v_booking;
end;
$$;

-- Expire stale pending bookings globally (optional cleanup job / cron)
create or replace function public.dawg_expire_stale_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.dawg_bookings
    set
      status = 'expired',
      payment_status = case
        when payment_status = 'pending' then 'failed'
        else payment_status
      end,
      updated_at = now()
    where status = 'pending'
      and booking_expires_at is not null
      and booking_expires_at <= now()
    returning session_id
  )
  select count(*)::integer into v_count from expired;

  -- Re-open sessions that are no longer full
  update public.dawg_sessions s
  set status = 'published'
  where s.status = 'full'
    and public.dawg_session_booked_count(s.id) < s.capacity;

  return coalesce(v_count, 0);
end;
$$;
