-- Migration 002: Training vertical core schema (tenant-scoped).
-- Mirrors hobby dawg_* final shape + tenant_id on every business table.

create or replace function public.training_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff (auth-linked, per tenant)
-- ---------------------------------------------------------------------------

create table if not exists public.training_staff_profiles (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'trainer'
    check (role in ('owner', 'admin', 'trainer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists training_staff_profiles_user_idx
  on public.training_staff_profiles (user_id);

-- ---------------------------------------------------------------------------
-- Catalog & scheduling
-- ---------------------------------------------------------------------------

create table if not exists public.training_coaches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_user_id uuid,
  name text not null,
  title text,
  bio text,
  photo_url text,
  specialties text[],
  certifications text[],
  coaching_experience text,
  sports_background text,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, profile_user_id)
    references public.training_staff_profiles (tenant_id, user_id)
    on delete set null
);

create index if not exists training_coaches_tenant_idx
  on public.training_coaches (tenant_id, active);

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  short_description text,
  full_description text,
  minimum_age int,
  maximum_age int,
  default_duration_minutes int,
  default_capacity int,
  default_price_cents integer,
  image_url text,
  active boolean not null default true,
  featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists training_programs_tenant_idx
  on public.training_programs (tenant_id, active);

create table if not exists public.training_session_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  active boolean not null default true,
  unique (tenant_id, slug)
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  program_id uuid references public.training_programs (id) on delete set null,
  session_type_id uuid references public.training_session_types (id) on delete set null,
  trainer_id uuid references public.training_coaches (id) on delete set null,
  title text not null,
  description text,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/Indiana/Indianapolis',
  minimum_age int,
  maximum_age int,
  skill_level text,
  capacity int not null check (capacity > 0),
  price_cents integer not null default 0,
  deposit_amount_cents integer,
  currency text not null default 'usd',
  payment_requirement text not null default 'pay_at_facility'
    check (payment_requirement in ('pay_online', 'pay_at_facility', 'online_or_facility')),
  location_name text,
  location_address text,
  what_to_bring text,
  cancellation_policy text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'full', 'cancelled', 'completed')),
  featured boolean not null default false,
  published_at timestamptz,
  recurrence_group_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_sessions_tenant_date_idx
  on public.training_sessions (tenant_id, session_date);
create index if not exists training_sessions_tenant_status_idx
  on public.training_sessions (tenant_id, status);
create index if not exists training_sessions_public_idx
  on public.training_sessions (tenant_id, status, session_date)
  where status = 'published';

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------

create table if not exists public.training_guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  account_claimed_at timestamptz,
  account_invite_sent_at timestamptz,
  emergency_contact_1_name text,
  emergency_contact_1_phone text,
  emergency_contact_2_name text,
  emergency_contact_2_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_guardians_tenant_email_idx
  on public.training_guardians (tenant_id, lower(email));

create table if not exists public.training_athletes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  primary_sport text,
  experience_level text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_athletes_guardian_idx
  on public.training_athletes (tenant_id, guardian_id);

-- ---------------------------------------------------------------------------
-- Bookings & waitlist
-- ---------------------------------------------------------------------------

create table if not exists public.training_session_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete restrict,
  athlete_id uuid not null references public.training_athletes (id) on delete restrict,
  confirmation_number text not null,
  confirmation_token uuid not null default gen_random_uuid(),
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'waitlisted', 'expired')),
  attendance_status text not null default 'registered'
    check (attendance_status in ('registered', 'attended', 'no_show', 'cancelled')),
  payment_method text
    check (
      payment_method is null
      or payment_method in ('stripe', 'pay_at_facility', 'package_credit')
    ),
  payment_status text not null default 'unpaid'
    check (payment_status in (
      'not_required', 'unpaid', 'pending', 'paid',
      'failed', 'partially_refunded', 'refunded'
    )),
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  amount_refunded_cents integer not null default 0,
  currency text not null default 'usd',
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  payment_failure_message text,
  booking_expires_at timestamptz,
  confirmation_email_sent_at timestamptz,
  customer_notes text,
  internal_notes text,
  waiver_acknowledged_at timestamptz,
  media_consent boolean not null default false,
  agreements_version text,
  agreements_accepted_at timestamptz,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, confirmation_number)
);

create index if not exists training_session_bookings_session_idx
  on public.training_session_bookings (tenant_id, session_id);
create index if not exists training_session_bookings_token_idx
  on public.training_session_bookings (tenant_id, confirmation_token);

create table if not exists public.training_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  guardian_id uuid not null references public.training_guardians (id) on delete cascade,
  athlete_id uuid references public.training_athletes (id) on delete set null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  unique (tenant_id, session_id, guardian_id, athlete_id)
);

-- ---------------------------------------------------------------------------
-- CMS & settings
-- ---------------------------------------------------------------------------

create table if not exists public.training_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  author_name text not null,
  author_role text,
  body text not null,
  rating int check (rating between 1 and 5),
  published boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_tenant_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  business_name text,
  tagline text,
  phone text,
  email text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  facebook_url text,
  instagram_url text,
  announcement text,
  business_hours jsonb,
  cancellation_policy text,
  booking_policy text,
  map_embed_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_blocked_times (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_blocked_times_tenant_idx
  on public.training_blocked_times (tenant_id, start_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers (subset; remainder in 003)
-- ---------------------------------------------------------------------------

drop trigger if exists training_staff_profiles_updated_at on public.training_staff_profiles;
create trigger training_staff_profiles_updated_at
  before update on public.training_staff_profiles
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_coaches_updated_at on public.training_coaches;
create trigger training_coaches_updated_at
  before update on public.training_coaches
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_programs_updated_at on public.training_programs;
create trigger training_programs_updated_at
  before update on public.training_programs
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_sessions_updated_at on public.training_sessions;
create trigger training_sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_guardians_updated_at on public.training_guardians;
create trigger training_guardians_updated_at
  before update on public.training_guardians
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_athletes_updated_at on public.training_athletes;
create trigger training_athletes_updated_at
  before update on public.training_athletes
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_session_bookings_updated_at on public.training_session_bookings;
create trigger training_session_bookings_updated_at
  before update on public.training_session_bookings
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_reviews_updated_at on public.training_reviews;
create trigger training_reviews_updated_at
  before update on public.training_reviews
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_tenant_settings_updated_at on public.training_tenant_settings;
create trigger training_tenant_settings_updated_at
  before update on public.training_tenant_settings
  for each row execute function public.training_set_updated_at();

drop trigger if exists training_blocked_times_updated_at on public.training_blocked_times;
create trigger training_blocked_times_updated_at
  before update on public.training_blocked_times
  for each row execute function public.training_set_updated_at();
