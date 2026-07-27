-- Migration 008: Staff login grants and security-definer staff lookup RPCs.

grant select on table public.training_staff_profiles to authenticated, service_role;

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
    and p.role in ('owner', 'admin', 'trainer')
  limit 1;
$$;

revoke all on function public.training_staff_profile_for_user(uuid, uuid) from public;
grant execute on function public.training_staff_profile_for_user(uuid, uuid) to service_role;

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
    and p.role in ('owner', 'admin', 'trainer')
  limit 1;
$$;

revoke all on function public.training_staff_profile_for_current_user(uuid) from public;
grant execute on function public.training_staff_profile_for_current_user(uuid) to authenticated, service_role;
