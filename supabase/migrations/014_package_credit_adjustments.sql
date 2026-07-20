-- Audit trail for staff manual package credit changes.

create table if not exists public.dawg_package_credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.dawg_parents (id) on delete cascade,
  purchase_id uuid references public.dawg_package_purchases (id) on delete set null,
  staff_profile_id uuid references public.dawg_profiles (id) on delete set null,
  action text not null check (action in ('grant', 'add', 'remove')),
  delta integer not null check (delta <> 0),
  sessions_before integer,
  sessions_after integer,
  reason text not null check (char_length(trim(reason)) >= 10),
  created_at timestamptz not null default now()
);

create index if not exists dawg_package_credit_adjustments_parent_idx
  on public.dawg_package_credit_adjustments (parent_id, created_at desc);

comment on table public.dawg_package_credit_adjustments is
  'Staff manual grants or corrections to family package session balances.';
