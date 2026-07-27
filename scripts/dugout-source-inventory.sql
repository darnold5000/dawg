-- Read-only inventory for Dugout (hobby) before production cutover.
-- Run against the legacy project; do not delete data based on this alone.

\echo '=== Row counts (dawg_*) ==='
select 'dawg_profiles' as table_name, count(*)::bigint as row_count from public.dawg_profiles
union all select 'dawg_trainers', count(*) from public.dawg_trainers
union all select 'dawg_programs', count(*) from public.dawg_programs
union all select 'dawg_session_types', count(*) from public.dawg_session_types
union all select 'dawg_sessions', count(*) from public.dawg_sessions
union all select 'dawg_parents', count(*) from public.dawg_parents
union all select 'dawg_athletes', count(*) from public.dawg_athletes
union all select 'dawg_bookings', count(*) from public.dawg_bookings
union all select 'dawg_waitlist_entries', count(*) from public.dawg_waitlist_entries
union all select 'dawg_reviews', count(*) from public.dawg_reviews
union all select 'dawg_business_settings', count(*) from public.dawg_business_settings
union all select 'dawg_blocked_times', count(*) from public.dawg_blocked_times
union all select 'dawg_stripe_events', count(*) from public.dawg_stripe_events
union all select 'dawg_payment_transactions', count(*) from public.dawg_payment_transactions
union all select 'dawg_device_families', count(*) from public.dawg_device_families
union all select 'dawg_packages', count(*) from public.dawg_packages
union all select 'dawg_package_purchases', count(*) from public.dawg_package_purchases
union all select 'dawg_package_redemptions', count(*) from public.dawg_package_redemptions
union all select 'dawg_package_credit_adjustments', count(*) from public.dawg_package_credit_adjustments
union all select 'dawg_intake_submissions', count(*) from public.dawg_intake_submissions
union all select 'dawg_family_login_tokens', count(*) from public.dawg_family_login_tokens
order by table_name;

\echo '=== Bookings by status ==='
select status, payment_status, count(*)::bigint
from public.dawg_bookings
group by 1, 2
order by 1, 2;

\echo '=== Package purchases by status ==='
select status, count(*)::bigint
from public.dawg_package_purchases
group by 1
order by 1;

\echo '=== Storage objects (trainer photos) ==='
select bucket_id, count(*)::bigint as object_count
from storage.objects
where bucket_id in ('trainer-photos', 'training-coach-photos')
group by 1;
