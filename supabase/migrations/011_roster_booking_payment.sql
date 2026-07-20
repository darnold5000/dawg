-- Allow roster-only bookings (Little/Big Dawgs) with no payment step.

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
  v_roster_only boolean;
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

  v_roster_only := coalesce(p_payment_status, '') = 'not_required';

  if not v_roster_only then
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
  end if;

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

  if p_payment_method = 'stripe' and not v_roster_only then
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
