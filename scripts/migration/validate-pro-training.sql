-- Post-import validation on disposable Pro (training vertical).
-- Set tenant in psql: \set tenant_id 'YOUR-TRAINING-TENANT-UUID'

\echo '=== training_* row counts for tenant ==='
select 'training_guardians' as tbl, count(*)::bigint from public.training_guardians where tenant_id = :'tenant_id'::uuid
union all select 'training_athletes', count(*) from public.training_athletes where tenant_id = :'tenant_id'::uuid
union all select 'training_sessions', count(*) from public.training_sessions where tenant_id = :'tenant_id'::uuid
union all select 'training_session_bookings', count(*) from public.training_session_bookings where tenant_id = :'tenant_id'::uuid
union all select 'training_package_purchases', count(*) from public.training_package_purchases where tenant_id = :'tenant_id'::uuid
order by 1;

\echo '=== orphan bookings (should be 0) ==='
select count(*)::bigint as orphan_bookings
from public.training_session_bookings b
where b.tenant_id = :'tenant_id'::uuid
  and not exists (
    select 1 from public.training_guardians g
    where g.id = b.guardian_id and g.tenant_id = b.tenant_id
  );

\echo '=== stripe events per tenant (idempotency table) ==='
select count(*)::bigint as stripe_events
from public.training_stripe_events
where tenant_id = :'tenant_id'::uuid;
