-- Rebrand display name: DAWG Youth Training → Dawg Training (idempotent).

update public.training_tenant_settings
set
  business_name = 'Dawg Training',
  updated_at = now()
where business_name in ('DAWG Youth Training', 'Dawg Youth Training');

update public.training_sessions
set
  location_name = 'Dawg Training',
  updated_at = now()
where location_name in ('DAWG Youth Training', 'Dawg Youth Training');
