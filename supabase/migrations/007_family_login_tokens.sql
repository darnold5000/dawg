-- Passwordless email login for the family portal (/my).

create table if not exists public.dawg_family_login_tokens (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.dawg_parents (id) on delete cascade,
  token_hash text not null unique,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dawg_family_login_tokens_parent_idx
  on public.dawg_family_login_tokens (parent_id);

create index if not exists dawg_family_login_tokens_expires_idx
  on public.dawg_family_login_tokens (expires_at)
  where used_at is null;

alter table public.dawg_family_login_tokens enable row level security;

drop policy if exists "dawg_staff_read_family_login_tokens" on public.dawg_family_login_tokens;
create policy "dawg_staff_read_family_login_tokens"
  on public.dawg_family_login_tokens
  for select
  using (public.dawg_is_staff());

comment on table public.dawg_family_login_tokens is
  'One-time magic link tokens for family portal login. Service role only.';
