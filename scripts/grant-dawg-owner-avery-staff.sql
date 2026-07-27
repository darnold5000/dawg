-- DAWG owner staff row + Auth user display metadata (Signal Works Pro).
-- Run in Supabase SQL Editor after auth user exists.
--
-- Auth user: coachavery1287@gmail.com
-- user_id:  77fae5b4-3926-46a5-b2a1-3045f0cd2636
-- tenant:   TRAINING_TENANT_ID in dawg/.env.local

-- 1) Supabase Auth → Users table "Display name" (and phone if shown)
update auth.users
set
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'full_name', 'Avery Thompson Sr.',
      'name', 'Avery Thompson Sr.'
    ),
  phone = '+13178351076',
  updated_at = now()
where id = '77fae5b4-3926-46a5-b2a1-3045f0cd2636'::uuid;

-- 2) DAWG admin login (required for /admin)
insert into public.training_staff_profiles (
  tenant_id,
  user_id,
  full_name,
  email,
  phone,
  role,
  active
)
values (
  '6bd000db-c17e-4ca9-98ee-030f57aa523a'::uuid,
  '77fae5b4-3926-46a5-b2a1-3045f0cd2636'::uuid,
  'Avery Thompson Sr.',
  'coachavery1287@gmail.com',
  '(317) 835-1076',
  'owner',
  true
)
on conflict (tenant_id, user_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  active = true,
  updated_at = now();

-- Verify
select user_id, full_name, email, phone, role, active
from public.training_staff_profiles
where tenant_id = '6bd000db-c17e-4ca9-98ee-030f57aa523a'::uuid
  and user_id = '77fae5b4-3926-46a5-b2a1-3045f0cd2636'::uuid;
