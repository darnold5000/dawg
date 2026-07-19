-- New sessions should offer Pay online + Pay at facility by default.
-- Existing upcoming published sessions are flipped so Pay online appears.

alter table public.dawg_sessions
  alter column payment_requirement set default 'online_or_facility';

update public.dawg_sessions
set
  payment_requirement = 'online_or_facility',
  updated_at = now()
where status = 'published'
  and session_date >= current_date
  and payment_requirement = 'pay_at_facility';
