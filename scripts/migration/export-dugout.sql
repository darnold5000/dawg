-- Export Dugout dawg_* tables for offline transform (read-only).
-- Usage: psql "$DUGOUT_DATABASE_URL" -f scripts/migration/export-dugout.sql

\copy (select * from public.dawg_parents order by created_at) to stdout with csv header
\echo '--- dawg_athletes ---'
\copy (select * from public.dawg_athletes order by created_at) to stdout with csv header
\echo '--- dawg_bookings ---'
\copy (select * from public.dawg_bookings order by booked_at) to stdout with csv header
\echo '--- dawg_package_purchases ---'
\copy (select * from public.dawg_package_purchases order by created_at) to stdout with csv header
