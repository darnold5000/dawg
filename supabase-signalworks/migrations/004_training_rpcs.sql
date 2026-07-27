-- Migration 004: Training vertical RPCs (tenant-scoped).

create or replace function public.training_session_booked_count(
  p_tenant_id uuid,
  p_session_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.training_session_bookings b
  where b.tenant_id = p_tenant_id
    and b.session_id = p_session_id
    and b.status in ('pending', 'confirmed')
    and (
      b.status <> 'pending'
      or b.booking_expires_at is null
      or b.booking_expires_at > now()
    );
$$;

create or replace function public.training_try_create_session_booking(
  p_tenant_id uuid,
  p_session_id uuid,
  p_guardian_id uuid,
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
returns public.training_session_bookings
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
  v_booking public.training_session_bookings;
  v_booking_status text;
  v_expires_at timestamptz;
  v_currency text;
  v_roster_only boolean;
begin
  select
    capacity, status, session_date, payment_requirement, currency
  into
    v_capacity, v_status, v_session_date, v_requirement, v_currency
  from public.training_sessions
  where id = p_session_id and tenant_id = p_tenant_id
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

  if not exists (
    select 1 from public.training_guardians g
    where g.id = p_guardian_id and g.tenant_id = p_tenant_id
  ) then
    raise exception 'GUARDIAN_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.training_athletes a
    where a.id = p_athlete_id
      and a.tenant_id = p_tenant_id
      and a.guardian_id = p_guardian_id
  ) then
    raise exception 'ATHLETE_NOT_FOUND';
  end if;

  v_roster_only := coalesce(p_payment_status, '') = 'not_required';

  if not v_roster_only then
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
  end if;

  update public.training_session_bookings
  set
    status = 'expired',
    payment_status = case
      when payment_status = 'pending' then 'failed'
      else payment_status
    end,
    updated_at = now()
  where tenant_id = p_tenant_id
    and session_id = p_session_id
    and status = 'pending'
    and booking_expires_at is not null
    and booking_expires_at <= now();

  select public.training_session_booked_count(p_tenant_id, p_session_id) into v_count;

  if v_count >= v_capacity then
    update public.training_sessions
    set status = 'full'
    where id = p_session_id and tenant_id = p_tenant_id and status = 'published';
    raise exception 'SESSION_FULL';
  end if;

  if p_payment_method = 'stripe' and not v_roster_only then
    v_booking_status := 'pending';
    v_expires_at := now() + make_interval(mins => greatest(coalesce(p_hold_minutes, 15), 1));
  else
    v_booking_status := 'confirmed';
    v_expires_at := null;
  end if;

  insert into public.training_session_bookings (
    tenant_id,
    session_id,
    guardian_id,
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
    p_tenant_id,
    p_session_id,
    p_guardian_id,
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
    update public.training_sessions
    set status = 'full'
    where id = p_session_id and tenant_id = p_tenant_id;
  end if;

  return v_booking;
end;
$$;

create or replace function public.training_redeem_package_credit(
  p_tenant_id uuid,
  p_purchase_id uuid,
  p_booking_id uuid,
  p_guardian_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update public.training_package_purchases
  set
    sessions_remaining = sessions_remaining - 1,
    updated_at = now()
  where id = p_purchase_id
    and tenant_id = p_tenant_id
    and guardian_id = p_guardian_id
    and status = 'paid'
    and sessions_remaining > 0
  returning sessions_remaining into v_remaining;

  if not found then
    raise exception 'NO_CREDIT_AVAILABLE';
  end if;

  insert into public.training_package_redemptions (tenant_id, purchase_id, booking_id)
  values (p_tenant_id, p_purchase_id, p_booking_id);

  return v_remaining;
end;
$$;

create or replace function public.training_expire_stale_pending_bookings(
  p_tenant_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired int;
begin
  update public.training_session_bookings
  set
    status = 'expired',
    payment_status = 'failed',
    updated_at = now()
  where tenant_id = p_tenant_id
    and status = 'pending'
    and booking_expires_at is not null
    and booking_expires_at <= now();

  get diagnostics v_expired = row_count;

  update public.training_sessions s
  set status = 'published', updated_at = now()
  where s.tenant_id = p_tenant_id
    and s.status = 'full'
    and public.training_session_booked_count(p_tenant_id, s.id) < s.capacity;

  return v_expired;
end;
$$;

create or replace function public.training_merge_guardians(
  p_tenant_id uuid,
  p_canonical_id uuid,
  p_duplicate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved_athletes int := 0;
  v_moved_bookings int := 0;
  v_moved_purchases int := 0;
  v_moved_intakes int := 0;
  v_moved_devices int := 0;
begin
  if p_canonical_id = p_duplicate_id then
    raise exception 'MERGE_SAME_GUARDIAN';
  end if;

  if not exists (
    select 1 from public.training_guardians
    where id = p_canonical_id and tenant_id = p_tenant_id
  ) then
    raise exception 'CANONICAL_GUARDIAN_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.training_guardians
    where id = p_duplicate_id and tenant_id = p_tenant_id
  ) then
    raise exception 'DUPLICATE_GUARDIAN_NOT_FOUND';
  end if;

  update public.training_athletes
  set guardian_id = p_canonical_id, updated_at = now()
  where tenant_id = p_tenant_id and guardian_id = p_duplicate_id;
  get diagnostics v_moved_athletes = row_count;

  update public.training_session_bookings
  set guardian_id = p_canonical_id, updated_at = now()
  where tenant_id = p_tenant_id and guardian_id = p_duplicate_id;
  get diagnostics v_moved_bookings = row_count;

  update public.training_package_purchases
  set guardian_id = p_canonical_id, updated_at = now()
  where tenant_id = p_tenant_id and guardian_id = p_duplicate_id;
  get diagnostics v_moved_purchases = row_count;

  update public.training_intake_submissions
  set guardian_id = p_canonical_id, updated_at = now()
  where tenant_id = p_tenant_id and guardian_id = p_duplicate_id;
  get diagnostics v_moved_intakes = row_count;

  update public.training_device_families
  set guardian_id = p_canonical_id, updated_at = now()
  where tenant_id = p_tenant_id and guardian_id = p_duplicate_id;
  get diagnostics v_moved_devices = row_count;

  update public.training_guardians c
  set
    account_claimed_at = coalesce(c.account_claimed_at, d.account_claimed_at),
    account_invite_sent_at = case
      when c.account_invite_sent_at is null then d.account_invite_sent_at
      when d.account_invite_sent_at is null then c.account_invite_sent_at
      else greatest(c.account_invite_sent_at, d.account_invite_sent_at)
    end,
    phone = coalesce(nullif(trim(c.phone), ''), nullif(trim(d.phone), ''), c.phone),
    first_name = coalesce(nullif(trim(c.first_name), ''), d.first_name),
    last_name = coalesce(nullif(trim(c.last_name), ''), d.last_name),
    updated_at = now()
  from public.training_guardians d
  where c.id = p_canonical_id
    and d.id = p_duplicate_id
    and c.tenant_id = p_tenant_id
    and d.tenant_id = p_tenant_id;

  delete from public.training_guardians
  where id = p_duplicate_id and tenant_id = p_tenant_id;

  return jsonb_build_object(
    'athletes', v_moved_athletes,
    'bookings', v_moved_bookings,
    'purchases', v_moved_purchases,
    'intakes', v_moved_intakes,
    'devices', v_moved_devices
  );
end;
$$;

revoke all on function public.training_session_booked_count(uuid, uuid) from public;
revoke all on function public.training_try_create_session_booking(uuid, uuid, uuid, uuid, text, integer, text, text, text, timestamptz, boolean, integer) from public;
revoke all on function public.training_redeem_package_credit(uuid, uuid, uuid, uuid) from public;
revoke all on function public.training_expire_stale_pending_bookings(uuid) from public;
revoke all on function public.training_merge_guardians(uuid, uuid, uuid) from public;

grant execute on function public.training_session_booked_count(uuid, uuid) to service_role;
grant execute on function public.training_try_create_session_booking(uuid, uuid, uuid, uuid, text, integer, text, text, text, timestamptz, boolean, integer) to service_role;
grant execute on function public.training_redeem_package_credit(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.training_expire_stale_pending_bookings(uuid) to service_role;
grant execute on function public.training_merge_guardians(uuid, uuid, uuid) to service_role;
