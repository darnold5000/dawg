-- DAWG: bookings eligible for one-time credit backfill (same rules as 2026-10-28 audit).
-- Tenant: dawg-youth-training. Cutoff: adjust deploy date if needed.
-- Exclude Brittany Phelps guardian_id manually if skipping her row.

with params as (
  select
    t.id as tenant_id,
    '2026-08-17'::date as cutoff_date
  from public.tenants t
  where t.slug = 'dawg-youth-training'
)
select
  b.id as booking_id,
  b.guardian_id,
  g.email,
  g.first_name,
  g.last_name,
  b.athlete_id,
  b.payment_method,
  b.payment_status,
  b.attendance_status,
  s.session_date,
  s.start_time,
  p.slug as program_slug,
  p.name as program_name
from training_session_bookings b
join training_sessions s on s.id = b.session_id and s.tenant_id = b.tenant_id
join training_programs p on p.id = s.program_id and p.tenant_id = b.tenant_id
join training_guardians g on g.id = b.guardian_id and g.tenant_id = b.tenant_id
cross join params par
where b.tenant_id = par.tenant_id
  and b.status = 'confirmed'
  and b.attendance_status = 'attended'
  and s.session_date >= par.cutoff_date
  and p.slug not in ('little-dawgs', 'big-dawgs')
  and not exists (
    select 1 from training_package_redemptions r
    where r.tenant_id = b.tenant_id and r.booking_id = b.id
  )
  and not (
    b.payment_method = 'stripe'
    and b.payment_status in ('paid', 'pending')
  )
  and not (
    b.payment_method = 'pay_at_facility'
    and b.payment_status = 'paid'
  )
  -- Optional: skip Brittany until reviewed
  -- and b.guardian_id <> '43c16ebe-b09f-4d78-8db2-8c8bca92bc42'
order by g.last_name, g.first_name, s.session_date, s.start_time;
