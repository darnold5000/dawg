-- Migration 001: Register DAWG Youth Training tenant on Signal Works Pro (idempotent).

insert into public.tenants (
  slug,
  display_name,
  status,
  platform_category
)
values (
  'dawg-youth-training',
  'DAWG Youth Training',
  'active',
  'services'
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  status = excluded.status,
  platform_category = excluded.platform_category,
  updated_at = now();

comment on table public.tenants is
  'Platform tenants; DAWG production uses slug dawg-youth-training — set TRAINING_TENANT_ID from select id ...';
