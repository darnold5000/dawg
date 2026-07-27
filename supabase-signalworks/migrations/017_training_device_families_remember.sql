-- Align training_device_families with remembered-family cookie flow (dawg parity).

alter table public.training_device_families
  alter column payload drop not null,
  alter column payload set default '{}'::jsonb;

update public.training_device_families
set payload = '{}'::jsonb
where payload is null;

alter table public.training_device_families
  add column if not exists accepted_agreements_version text,
  add column if not exists accepted_agreements_at timestamptz,
  add column if not exists media_consent_preference boolean not null default false,
  add column if not exists last_used_at timestamptz not null default now(),
  add column if not exists revoked_at timestamptz;

update public.training_device_families
set accepted_agreements_version = agreements_version
where accepted_agreements_version is null
  and agreements_version is not null;
