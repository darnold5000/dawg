-- Migration 005: Training vertical RLS helpers and policies.

create or replace function public.training_is_staff(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_staff_profiles p
    where p.tenant_id = p_tenant_id
      and p.user_id = auth.uid()
      and p.active = true
      and p.role in ('owner', 'admin', 'trainer')
  );
$$;

create or replace function public.training_is_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_staff_profiles p
    where p.tenant_id = p_tenant_id
      and p.user_id = auth.uid()
      and p.active = true
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.training_is_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_staff_profiles p
    where p.tenant_id = p_tenant_id
      and p.user_id = auth.uid()
      and p.active = true
      and p.role = 'owner'
  );
$$;

-- Enable RLS on all training_* tables
alter table public.training_staff_profiles enable row level security;
alter table public.training_coaches enable row level security;
alter table public.training_programs enable row level security;
alter table public.training_session_types enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_guardians enable row level security;
alter table public.training_athletes enable row level security;
alter table public.training_session_bookings enable row level security;
alter table public.training_waitlist_entries enable row level security;
alter table public.training_reviews enable row level security;
alter table public.training_tenant_settings enable row level security;
alter table public.training_blocked_times enable row level security;
alter table public.training_packages enable row level security;
alter table public.training_package_purchases enable row level security;
alter table public.training_package_redemptions enable row level security;
alter table public.training_package_credit_adjustments enable row level security;
alter table public.training_intake_submissions enable row level security;
alter table public.training_family_login_tokens enable row level security;
alter table public.training_device_families enable row level security;
alter table public.training_stripe_events enable row level security;
alter table public.training_payment_transactions enable row level security;

-- Staff profiles
drop policy if exists training_staff_read_own on public.training_staff_profiles;
create policy training_staff_read_own on public.training_staff_profiles
  for select using (auth.uid() = user_id);
drop policy if exists training_staff_admin_read on public.training_staff_profiles;
create policy training_staff_admin_read on public.training_staff_profiles
  for select using (public.training_is_admin(tenant_id));
drop policy if exists training_staff_owner_manage on public.training_staff_profiles;
create policy training_staff_owner_manage on public.training_staff_profiles
  for all using (public.training_is_owner(tenant_id));

-- Public catalog reads (anon + authenticated)
drop policy if exists training_public_read_coaches on public.training_coaches;
create policy training_public_read_coaches on public.training_coaches
  for select using (active = true);
drop policy if exists training_admin_manage_coaches on public.training_coaches;
create policy training_admin_manage_coaches on public.training_coaches
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_public_read_programs on public.training_programs;
create policy training_public_read_programs on public.training_programs
  for select using (active = true);
drop policy if exists training_admin_manage_programs on public.training_programs;
create policy training_admin_manage_programs on public.training_programs
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_public_read_session_types on public.training_session_types;
create policy training_public_read_session_types on public.training_session_types
  for select using (active = true);
drop policy if exists training_admin_manage_session_types on public.training_session_types;
create policy training_admin_manage_session_types on public.training_session_types
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_public_read_sessions on public.training_sessions;
create policy training_public_read_sessions on public.training_sessions
  for select using (status = 'published');
drop policy if exists training_staff_read_sessions on public.training_sessions;
create policy training_staff_read_sessions on public.training_sessions
  for select using (public.training_is_staff(tenant_id));
drop policy if exists training_admin_manage_sessions on public.training_sessions;
create policy training_admin_manage_sessions on public.training_sessions
  for all using (public.training_is_admin(tenant_id));

-- PII: staff only (service role bypasses — app must filter tenant_id)
drop policy if exists training_staff_guardians on public.training_guardians;
create policy training_staff_guardians on public.training_guardians
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_athletes on public.training_athletes;
create policy training_staff_athletes on public.training_athletes
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_bookings on public.training_session_bookings;
create policy training_staff_bookings on public.training_session_bookings
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_waitlist on public.training_waitlist_entries;
create policy training_staff_waitlist on public.training_waitlist_entries
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_public_read_reviews on public.training_reviews;
create policy training_public_read_reviews on public.training_reviews
  for select using (published = true);
drop policy if exists training_admin_reviews on public.training_reviews;
create policy training_admin_reviews on public.training_reviews
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_public_read_settings on public.training_tenant_settings;
create policy training_public_read_settings on public.training_tenant_settings
  for select using (true);
drop policy if exists training_admin_settings on public.training_tenant_settings;
create policy training_admin_settings on public.training_tenant_settings
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_staff_blocked on public.training_blocked_times;
create policy training_staff_blocked on public.training_blocked_times
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_public_read_packages on public.training_packages;
create policy training_public_read_packages on public.training_packages
  for select using (active = true);
drop policy if exists training_admin_packages on public.training_packages;
create policy training_admin_packages on public.training_packages
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_staff_package_purchases on public.training_package_purchases;
create policy training_staff_package_purchases on public.training_package_purchases
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_redemptions on public.training_package_redemptions;
create policy training_staff_redemptions on public.training_package_redemptions
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_credit_adj on public.training_package_credit_adjustments;
create policy training_staff_credit_adj on public.training_package_credit_adjustments
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_intake on public.training_intake_submissions;
create policy training_staff_intake on public.training_intake_submissions
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_family_tokens on public.training_family_login_tokens;
create policy training_staff_family_tokens on public.training_family_login_tokens
  for select using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_device_families on public.training_device_families;
create policy training_staff_device_families on public.training_device_families
  for all using (public.training_is_staff(tenant_id));

drop policy if exists training_staff_stripe_events on public.training_stripe_events;
create policy training_staff_stripe_events on public.training_stripe_events
  for all using (public.training_is_admin(tenant_id));

drop policy if exists training_staff_payment_tx on public.training_payment_transactions;
create policy training_staff_payment_tx on public.training_payment_transactions
  for all using (public.training_is_staff(tenant_id));
