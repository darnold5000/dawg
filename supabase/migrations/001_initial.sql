-- DAWG Youth Training schema for the shared Dugout Intel Supabase project.
-- Creates ONLY dawg_* tables, functions, triggers, and policies.

create extension if not exists "pgcrypto";

create or replace function public.dawg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.dawg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'trainer' check (role in ('owner', 'admin', 'trainer')),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_trainers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.dawg_profiles(id) on delete set null,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  minimum_age int,
  maximum_age int,
  default_duration_minutes int,
  default_capacity int,
  default_price numeric(10,2),
  image_url text,
  active boolean not null default true,
  featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_session_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true
);

create table if not exists public.dawg_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.dawg_programs(id) on delete set null,
  session_type_id uuid references public.dawg_session_types(id) on delete set null,
  trainer_id uuid references public.dawg_trainers(id) on delete set null,
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
  price numeric(10,2) not null default 0,
  deposit_amount numeric(10,2),
  payment_requirement text not null default 'pay_at_facility'
    check (payment_requirement in ('full_at_booking', 'deposit_at_booking', 'pay_at_facility')),
  location_name text,
  location_address text,
  what_to_bring text,
  cancellation_policy text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'full', 'cancelled', 'completed')),
  featured boolean not null default false,
  published_at timestamptz,
  recurrence_group_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists dawg_sessions_date_idx on public.dawg_sessions (session_date);
create index if not exists dawg_sessions_status_idx on public.dawg_sessions (status);
create index if not exists dawg_sessions_public_idx
  on public.dawg_sessions (status, session_date)
  where status = 'published';

create table if not exists public.dawg_parents (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists dawg_parents_email_idx on public.dawg_parents (lower(email));

create table if not exists public.dawg_athletes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.dawg_parents(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  primary_sport text,
  experience_level text,
  medical_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dawg_sessions(id) on delete cascade,
  parent_id uuid not null references public.dawg_parents(id) on delete restrict,
  athlete_id uuid not null references public.dawg_athletes(id) on delete restrict,
  confirmation_number text not null unique,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'waitlisted', 'attended', 'no_show', 'refunded')),
  payment_status text not null default 'pay_at_facility'
    check (payment_status in ('not_required', 'pending', 'deposit_paid', 'paid', 'refunded', 'pay_at_facility')),
  amount_due numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  customer_notes text,
  internal_notes text,
  waiver_acknowledged_at timestamptz,
  media_consent boolean not null default false,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists dawg_bookings_session_idx on public.dawg_bookings (session_id);
create index if not exists dawg_bookings_status_idx on public.dawg_bookings (status);

-- Prevent duplicate active bookings for the same athlete on one session
create unique index if not exists dawg_bookings_unique_athlete_session
  on public.dawg_bookings (session_id, athlete_id)
  where status in ('pending', 'confirmed', 'attended', 'waitlisted');

create table if not exists public.dawg_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dawg_sessions(id) on delete cascade,
  parent_name text not null,
  athlete_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'promoted', 'cancelled')),
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null,
  reviewer_description text,
  athlete_sport text,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  published boolean not null default false,
  featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dawg_business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'DAWG Youth Training',
  phone text,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  map_embed_url text,
  facebook_url text,
  business_hours text,
  homepage_announcement text,
  cancellation_policy text,
  booking_policy text,
  updated_at timestamptz default now()
);

create table if not exists public.dawg_blocked_times (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.dawg_trainers(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Capacity helper — atomic check used by service-role booking path
-- ---------------------------------------------------------------------------

create or replace function public.dawg_session_booked_count(p_session_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.dawg_bookings b
  where b.session_id = p_session_id
    and b.status in ('pending', 'confirmed', 'attended');
$$;

create or replace function public.dawg_try_create_booking(
  p_session_id uuid,
  p_parent_id uuid,
  p_athlete_id uuid,
  p_confirmation_number text,
  p_amount_due numeric,
  p_payment_status text,
  p_customer_notes text,
  p_waiver_acknowledged_at timestamptz,
  p_media_consent boolean
)
returns public.dawg_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_count int;
  v_status text;
  v_booking public.dawg_bookings;
begin
  select capacity, status into v_capacity, v_status
  from public.dawg_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_status not in ('published', 'full') then
    raise exception 'SESSION_NOT_BOOKABLE';
  end if;

  select public.dawg_session_booked_count(p_session_id) into v_count;

  if v_count >= v_capacity then
    update public.dawg_sessions set status = 'full' where id = p_session_id and status = 'published';
    raise exception 'SESSION_FULL';
  end if;

  insert into public.dawg_bookings (
    session_id, parent_id, athlete_id, confirmation_number, status,
    payment_status, amount_due, amount_paid, customer_notes,
    waiver_acknowledged_at, media_consent
  ) values (
    p_session_id, p_parent_id, p_athlete_id, p_confirmation_number, 'confirmed',
    p_payment_status, p_amount_due, 0, p_customer_notes,
    p_waiver_acknowledged_at, p_media_consent
  )
  returning * into v_booking;

  if v_count + 1 >= v_capacity then
    update public.dawg_sessions set status = 'full' where id = p_session_id;
  end if;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.dawg_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dawg_profiles p
    where p.id = auth.uid() and p.active = true
      and p.role in ('owner', 'admin', 'trainer')
  );
$$;

create or replace function public.dawg_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dawg_profiles p
    where p.id = auth.uid() and p.active = true
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.dawg_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dawg_profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists dawg_profiles_updated_at on public.dawg_profiles;
create trigger dawg_profiles_updated_at before update on public.dawg_profiles
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_trainers_updated_at on public.dawg_trainers;
create trigger dawg_trainers_updated_at before update on public.dawg_trainers
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_programs_updated_at on public.dawg_programs;
create trigger dawg_programs_updated_at before update on public.dawg_programs
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_sessions_updated_at on public.dawg_sessions;
create trigger dawg_sessions_updated_at before update on public.dawg_sessions
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_parents_updated_at on public.dawg_parents;
create trigger dawg_parents_updated_at before update on public.dawg_parents
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_athletes_updated_at on public.dawg_athletes;
create trigger dawg_athletes_updated_at before update on public.dawg_athletes
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_bookings_updated_at on public.dawg_bookings;
create trigger dawg_bookings_updated_at before update on public.dawg_bookings
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_waitlist_updated_at on public.dawg_waitlist_entries;
create trigger dawg_waitlist_updated_at before update on public.dawg_waitlist_entries
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_reviews_updated_at on public.dawg_reviews;
create trigger dawg_reviews_updated_at before update on public.dawg_reviews
  for each row execute procedure public.dawg_set_updated_at();

drop trigger if exists dawg_settings_updated_at on public.dawg_business_settings;
create trigger dawg_settings_updated_at before update on public.dawg_business_settings
  for each row execute procedure public.dawg_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.dawg_profiles enable row level security;
alter table public.dawg_trainers enable row level security;
alter table public.dawg_programs enable row level security;
alter table public.dawg_session_types enable row level security;
alter table public.dawg_sessions enable row level security;
alter table public.dawg_parents enable row level security;
alter table public.dawg_athletes enable row level security;
alter table public.dawg_bookings enable row level security;
alter table public.dawg_waitlist_entries enable row level security;
alter table public.dawg_reviews enable row level security;
alter table public.dawg_business_settings enable row level security;
alter table public.dawg_blocked_times enable row level security;

-- profiles
drop policy if exists "dawg_read_own_profile" on public.dawg_profiles;
create policy "dawg_read_own_profile" on public.dawg_profiles for select using (auth.uid() = id);
drop policy if exists "dawg_admin_read_profiles" on public.dawg_profiles;
create policy "dawg_admin_read_profiles" on public.dawg_profiles for select using (public.dawg_is_admin());
drop policy if exists "dawg_owner_manage_profiles" on public.dawg_profiles;
create policy "dawg_owner_manage_profiles" on public.dawg_profiles for all using (public.dawg_is_owner());

-- trainers (public read active)
drop policy if exists "dawg_public_read_trainers" on public.dawg_trainers;
create policy "dawg_public_read_trainers" on public.dawg_trainers for select using (active = true);
drop policy if exists "dawg_admin_manage_trainers" on public.dawg_trainers;
create policy "dawg_admin_manage_trainers" on public.dawg_trainers for all using (public.dawg_is_admin());

-- programs
drop policy if exists "dawg_public_read_programs" on public.dawg_programs;
create policy "dawg_public_read_programs" on public.dawg_programs for select using (active = true);
drop policy if exists "dawg_admin_manage_programs" on public.dawg_programs;
create policy "dawg_admin_manage_programs" on public.dawg_programs for all using (public.dawg_is_admin());

-- session types
drop policy if exists "dawg_public_read_session_types" on public.dawg_session_types;
create policy "dawg_public_read_session_types" on public.dawg_session_types for select using (active = true);
drop policy if exists "dawg_admin_manage_session_types" on public.dawg_session_types;
create policy "dawg_admin_manage_session_types" on public.dawg_session_types for all using (public.dawg_is_admin());

-- sessions (public: published future only)
drop policy if exists "dawg_public_read_sessions" on public.dawg_sessions;
create policy "dawg_public_read_sessions" on public.dawg_sessions for select
  using (status = 'published' and session_date >= current_date);
drop policy if exists "dawg_staff_read_all_sessions" on public.dawg_sessions;
create policy "dawg_staff_read_all_sessions" on public.dawg_sessions for select using (public.dawg_is_staff());
drop policy if exists "dawg_admin_manage_sessions" on public.dawg_sessions;
create policy "dawg_admin_manage_sessions" on public.dawg_sessions for all using (public.dawg_is_admin());

-- parents / athletes / bookings — staff only (public writes via service role)
drop policy if exists "dawg_staff_read_parents" on public.dawg_parents;
create policy "dawg_staff_read_parents" on public.dawg_parents for select using (public.dawg_is_staff());
drop policy if exists "dawg_staff_manage_parents" on public.dawg_parents;
create policy "dawg_staff_manage_parents" on public.dawg_parents for all using (public.dawg_is_staff());

drop policy if exists "dawg_staff_read_athletes" on public.dawg_athletes;
create policy "dawg_staff_read_athletes" on public.dawg_athletes for select using (public.dawg_is_staff());
drop policy if exists "dawg_staff_manage_athletes" on public.dawg_athletes;
create policy "dawg_staff_manage_athletes" on public.dawg_athletes for all using (public.dawg_is_staff());

drop policy if exists "dawg_staff_read_bookings" on public.dawg_bookings;
create policy "dawg_staff_read_bookings" on public.dawg_bookings for select using (public.dawg_is_staff());
drop policy if exists "dawg_staff_manage_bookings" on public.dawg_bookings;
create policy "dawg_staff_manage_bookings" on public.dawg_bookings for all using (public.dawg_is_staff());

drop policy if exists "dawg_staff_read_waitlist" on public.dawg_waitlist_entries;
create policy "dawg_staff_read_waitlist" on public.dawg_waitlist_entries for select using (public.dawg_is_staff());
drop policy if exists "dawg_staff_manage_waitlist" on public.dawg_waitlist_entries;
create policy "dawg_staff_manage_waitlist" on public.dawg_waitlist_entries for all using (public.dawg_is_staff());

-- reviews (public published only)
drop policy if exists "dawg_public_read_reviews" on public.dawg_reviews;
create policy "dawg_public_read_reviews" on public.dawg_reviews for select using (published = true);
drop policy if exists "dawg_admin_manage_reviews" on public.dawg_reviews;
create policy "dawg_admin_manage_reviews" on public.dawg_reviews for all using (public.dawg_is_admin());

-- business settings
drop policy if exists "dawg_public_read_settings" on public.dawg_business_settings;
create policy "dawg_public_read_settings" on public.dawg_business_settings for select using (true);
drop policy if exists "dawg_admin_manage_settings" on public.dawg_business_settings;
create policy "dawg_admin_manage_settings" on public.dawg_business_settings for all using (public.dawg_is_admin());

-- blocked times
drop policy if exists "dawg_staff_manage_blocks" on public.dawg_blocked_times;
create policy "dawg_staff_manage_blocks" on public.dawg_blocked_times for all using (public.dawg_is_staff());
