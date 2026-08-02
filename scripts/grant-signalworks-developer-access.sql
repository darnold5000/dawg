-- Provision Signal Works developer on shared Supabase (MA5 + DAWG).
-- Run in Supabase SQL Editor. Replace COMMIT at the end (default is safe ROLLBACK preview).
--
-- Auth user must already exist:
--   id:    9e8b0da7-5f59-48c9-b3cf-f2506e2bb89c
--   email: developer@hiresignalworks.com
--
-- Requires: tenants ma5-performance, dawg-youth-training
-- DAWG: migration 019_training_staff_developer_role.sql applied (developer role)

begin;

do $$
declare
  v_user_id uuid := '9e8b0da7-5f59-48c9-b3cf-f2506e2bb89c';
  v_email text := 'developer@hiresignalworks.com';
  v_full_name text := 'Signal Works Developer';
  v_ma5_tenant_id uuid;
  v_dawg_tenant_id uuid;
begin
  if not exists (select 1 from auth.users where id = v_user_id) then
    raise exception 'Auth user % not found. Create user in Authentication first.', v_user_id;
  end if;

  select id into strict v_ma5_tenant_id
  from public.tenants where slug = 'ma5-performance';

  select id into strict v_dawg_tenant_id
  from public.tenants where slug = 'dawg-youth-training';

  insert into public.profiles (id, email, full_name, active)
  values (v_user_id, v_email, v_full_name, true)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    active = true,
    updated_at = now();

  update auth.users
  set
    email = v_email,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('full_name', v_full_name, 'name', v_full_name),
    updated_at = now()
  where id = v_user_id;

  -- MA5 (profile required for middleware gate; roles for /admin and /app)
  insert into public.ma5_profiles (
    id,
    tenant_id,
    email,
    full_name,
    preferred_name,
    active,
    invitation_status,
    invitation_accepted_at,
    client_status
  ) values (
    v_user_id,
    v_ma5_tenant_id,
    v_email,
    v_full_name,
    'Developer',
    true,
    'accepted',
    now(),
    'active'
  )
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    email = excluded.email,
    full_name = excluded.full_name,
    preferred_name = excluded.preferred_name,
    active = true,
    invitation_status = 'accepted',
    invitation_accepted_at = coalesce(public.ma5_profiles.invitation_accepted_at, now()),
    client_status = 'active',
    updated_at = now();

  insert into public.ma5_user_roles (tenant_id, user_id, role)
  values
    (v_ma5_tenant_id, v_user_id, 'admin'),
    (v_ma5_tenant_id, v_user_id, 'client')
  on conflict (tenant_id, user_id, role) do nothing;

  -- DAWG admin (developer = staff + admin per migration 019)
  insert into public.training_staff_profiles (
    tenant_id,
    user_id,
    full_name,
    email,
    role,
    active
  ) values (
    v_dawg_tenant_id,
    v_user_id,
    v_full_name,
    v_email,
    'developer',
    true
  )
  on conflict (tenant_id, user_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = 'developer',
    active = true,
    updated_at = now();
end $$;

-- Must see one MA5 row and one DAWG row before COMMIT
select 'ma5' as surface, p.id, p.email, p.client_status, t.slug,
       (select array_agg(r.role order by r.role)
        from public.ma5_user_roles r
        where r.tenant_id = p.tenant_id and r.user_id = p.id) as roles
from public.ma5_profiles p
join public.tenants t on t.id = p.tenant_id
where p.id = '9e8b0da7-5f59-48c9-b3cf-f2506e2bb89c';

select 'dawg' as surface, p.user_id, p.email, p.role, p.active, t.slug
from public.training_staff_profiles p
join public.tenants t on t.id = p.tenant_id
where p.user_id = '9e8b0da7-5f59-48c9-b3cf-f2506e2bb89c';

-- When both selects return a row, change to: commit;
rollback;
