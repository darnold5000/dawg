-- Migration 015: PostgREST privileges for training_* tables (pair with 005 RLS).
-- Without GRANT, authenticated staff JWT gets "permission denied" even when RLS policies match.

-- Public catalog (anon + authenticated read; staff/admin write via RLS)
grant select on table public.training_coaches to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_coaches to authenticated, service_role;

grant select on table public.training_programs to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_programs to authenticated, service_role;

grant select on table public.training_session_types to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_session_types to authenticated, service_role;

grant select on table public.training_sessions to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_sessions to authenticated, service_role;

grant select on table public.training_reviews to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_reviews to authenticated, service_role;

grant select on table public.training_tenant_settings to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_tenant_settings to authenticated, service_role;

grant select on table public.training_packages to anon, authenticated, service_role;
grant select, insert, update, delete on table public.training_packages to authenticated, service_role;

-- Staff / PII (authenticated + service_role only)
grant select, insert, update, delete on table public.training_guardians to authenticated, service_role;
grant select, insert, update, delete on table public.training_athletes to authenticated, service_role;
grant select, insert, update, delete on table public.training_session_bookings to authenticated, service_role;
grant select, insert, update, delete on table public.training_waitlist_entries to authenticated, service_role;
grant select, insert, update, delete on table public.training_blocked_times to authenticated, service_role;
grant select, insert, update, delete on table public.training_package_purchases to authenticated, service_role;
grant select, insert, update, delete on table public.training_package_redemptions to authenticated, service_role;
grant select, insert, update, delete on table public.training_package_credit_adjustments to authenticated, service_role;
grant select, insert, update, delete on table public.training_intake_submissions to authenticated, service_role;
grant select on table public.training_family_login_tokens to authenticated, service_role;
grant select, insert, update, delete on table public.training_device_families to authenticated, service_role;
grant select, insert, update, delete on table public.training_stripe_events to authenticated, service_role;
grant select, insert, update, delete on table public.training_payment_transactions to authenticated, service_role;

-- training_staff_profiles: 008
-- training_session_templates: 013
