-- Development-only: DAWG default session templates (do not run on production without review).
-- Requires tenant slug dawg-youth-training, programs Little Dawgs / Big Dawgs, migration 013+014.

insert into public.training_session_templates (
  tenant_id,
  name,
  program_id,
  description,
  default_start_time,
  default_duration_minutes,
  default_capacity,
  default_price_cents,
  default_trainer_id,
  is_active
)
select
  t.id,
  v.slot_name,
  p.id,
  coalesce(p.short_description, p.full_description),
  v.start_time::time,
  coalesce(p.default_duration_minutes, 60),
  null,
  null,
  (
    select c.id
    from public.training_coaches c
    where c.tenant_id = t.id
      and c.active = true
    order by c.display_order
    limit 1
  ),
  true
from public.tenants t
cross join (
  values
    ('4:00 PM', 'little-dawgs', '16:00'),
    ('5:00 PM', 'big-dawgs', '17:00'),
    ('6:00 PM', 'little-dawgs', '18:00'),
    ('7:00 PM', 'big-dawgs', '19:00')
) as v(slot_name, program_slug, start_time)
join public.training_programs p
  on p.tenant_id = t.id
 and p.slug = v.program_slug
where t.slug = 'dawg-youth-training';
