-- Parent-level emergency contacts (shared across athletes in a family).

alter table public.dawg_parents
  add column if not exists emergency_contact_1_name text,
  add column if not exists emergency_contact_1_phone text,
  add column if not exists emergency_contact_2_name text,
  add column if not exists emergency_contact_2_phone text;

-- Backfill from the most recent intake per parent.
update public.dawg_parents p
set
  emergency_contact_1_name = i.emergency_contact_1_name,
  emergency_contact_1_phone = i.emergency_contact_1_phone,
  emergency_contact_2_name = i.emergency_contact_2_name,
  emergency_contact_2_phone = i.emergency_contact_2_phone,
  updated_at = now()
from (
  select distinct on (parent_id)
    parent_id,
    emergency_contact_1_name,
    emergency_contact_1_phone,
    emergency_contact_2_name,
    emergency_contact_2_phone
  from public.dawg_intake_submissions
  where emergency_contact_1_name is not null
    and emergency_contact_1_phone is not null
  order by parent_id, updated_at desc
) i
where p.id = i.parent_id
  and p.emergency_contact_1_name is null;

comment on column public.dawg_parents.emergency_contact_1_name is
  'Family emergency contact — collected once, shared across athletes.';
