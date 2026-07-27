-- Migration 003: Training vertical — packages, payments, family portal, intake.

create table if not exists public.training_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  session_count integer not null check (session_count > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.training_package_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guardian_id uuid references public.training_guardians (id) on delete restrict,
  package_id uuid not null references public.training_packages (id) on delete restrict,
  athlete_id uuid references public.training_athletes (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'expired')),
  sessions_total integer not null check (sessions_total > 0),
  sessions_remaining integer not null check (sessions_remaining >= 0),
  amount_paid_cents integer not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  post_purchase_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sessions_remaining <= sessions_total),
  check (status <> 'paid' or guardian_id is not null)
);

create index if not exists training_package_purchases_guardian_idx
  on public.training_package_purchases (tenant_id, guardian_id);
create unique index if not exists training_package_purchases_checkout_uidx
  on public.training_package_purchases (tenant_id, stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.training_package_redemptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  purchase_id uuid not null references public.training_package_purchases (id) on delete restrict,
  booking_id uuid not null references public.training_session_bookings (id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  unique (tenant_id, booking_id)
);

create table if not exists public.training_package_credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  purchase_id uuid references public.training_package_purchases (id) on delete set null,
  staff_user_id uuid,
  action text not null check (action in ('grant', 'add', 'remove')),
  delta integer not null check (delta <> 0),
  sessions_before integer,
  sessions_after integer,
  reason text not null check (char_length(trim(reason)) >= 10),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, staff_user_id)
    references public.training_staff_profiles (tenant_id, user_id)
    on delete set null
);

create index if not exists training_package_credit_adj_guardian_idx
  on public.training_package_credit_adjustments (tenant_id, guardian_id, created_at desc);

create table if not exists public.training_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  athlete_id uuid not null references public.training_athletes (id) on delete cascade,
  school_grade text,
  height_weight text,
  sport_position text,
  health_issues text,
  emergency_contact_1_name text,
  emergency_contact_1_phone text,
  emergency_contact_2_name text,
  emergency_contact_2_phone text,
  agreements_version text,
  agreements_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_family_login_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  token_hash text not null,
  email text not null,
  purpose text not null default 'login'
    check (purpose in ('login', 'claim')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, token_hash)
);

create index if not exists training_family_login_tokens_guardian_idx
  on public.training_family_login_tokens (tenant_id, guardian_id);

create table if not exists public.training_device_families (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  token_hash text not null unique,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  payload jsonb not null,
  agreements_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_device_families_guardian_idx
  on public.training_device_families (tenant_id, guardian_id);

create table if not exists public.training_stripe_events (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  stripe_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb,
  primary key (tenant_id, stripe_event_id)
);

create table if not exists public.training_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  booking_id uuid references public.training_session_bookings (id) on delete set null,
  transaction_type text not null
    check (transaction_type in ('charge', 'refund', 'adjustment')),
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  status text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists training_payment_tx_booking_idx
  on public.training_payment_transactions (tenant_id, booking_id);

drop trigger if exists training_packages_updated_at on public.training_packages;
create trigger training_packages_updated_at
  before update on public.training_packages
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_package_purchases_updated_at on public.training_package_purchases;
create trigger training_package_purchases_updated_at
  before update on public.training_package_purchases
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_intake_submissions_updated_at on public.training_intake_submissions;
create trigger training_intake_submissions_updated_at
  before update on public.training_intake_submissions
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_device_families_updated_at on public.training_device_families;
create trigger training_device_families_updated_at
  before update on public.training_device_families
  for each row execute function public.training_set_updated_at();
