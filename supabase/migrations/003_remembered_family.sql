-- Remembered family device tokens + agreement versioning on bookings.
-- Opaque token lives in an httpOnly cookie; only the SHA-256 hash is stored.

create table if not exists public.dawg_device_families (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  parent_id uuid not null references public.dawg_parents(id) on delete cascade,
  accepted_agreements_version text,
  accepted_agreements_at timestamptz,
  media_consent_preference boolean not null default false,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists dawg_device_families_parent_idx
  on public.dawg_device_families (parent_id)
  where revoked_at is null;

create index if not exists dawg_device_families_token_idx
  on public.dawg_device_families (token_hash)
  where revoked_at is null;

alter table public.dawg_bookings
  add column if not exists agreements_version text,
  add column if not exists agreements_accepted_at timestamptz;

alter table public.dawg_device_families enable row level security;

drop policy if exists "dawg_staff_read_device_families" on public.dawg_device_families;
create policy "dawg_staff_read_device_families"
  on public.dawg_device_families
  for select
  using (public.dawg_is_staff());

drop policy if exists "dawg_staff_manage_device_families" on public.dawg_device_families;
create policy "dawg_staff_manage_device_families"
  on public.dawg_device_families
  for all
  using (public.dawg_is_staff());

comment on table public.dawg_device_families is
  'Opaque device tokens for passwordless returning-family booking. Service role only for public paths.';
