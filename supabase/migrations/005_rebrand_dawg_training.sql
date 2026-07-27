-- Rebrand display name: DAWG Youth Training → Dawg Training (idempotent).

update public.dawg_business_settings
set
  business_name = 'Dawg Training',
  updated_at = now()
where business_name in ('DAWG Youth Training', 'Dawg Youth Training');

update public.dawg_sessions
set
  location_name = 'Dawg Training',
  updated_at = now()
where location_name in ('DAWG Youth Training', 'Dawg Youth Training');
