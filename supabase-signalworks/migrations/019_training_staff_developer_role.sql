-- Migration 019: Recognize developer as staff (login RPCs + RLS helpers).

begin;

alter table public.training_staff_profiles
  drop constraint if exists training_staff_profiles_role_check;

alter table public.training_staff_profiles
  add constraint training_staff_profiles_role_check
  check (role in ('owner', 'admin', 'trainer', 'developer'));

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
      and p.role in ('owner', 'admin', 'trainer', 'developer')
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
      and p.role in ('owner', 'admin', 'developer')
  );
$$;

create or replace function public.training_staff_profile_for_user(
  p_tenant_id uuid,
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'full_name', p.full_name,
    'email', p.email,
    'phone', p.phone,
    'role', p.role,
    'active', p.active,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  from public.training_staff_profiles p
  where p.tenant_id = p_tenant_id
    and p.user_id = p_user_id
    and p.active = true
    and p.role in ('owner', 'admin', 'trainer', 'developer')
  limit 1;
$$;

create or replace function public.training_staff_profile_for_current_user(p_tenant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'full_name', p.full_name,
    'email', p.email,
    'phone', p.phone,
    'role', p.role,
    'active', p.active,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  from public.training_staff_profiles p
  where p.tenant_id = p_tenant_id
    and p.user_id = auth.uid()
    and p.active = true
    and p.role in ('owner', 'admin', 'trainer', 'developer')
  limit 1;
$$;

commit;
