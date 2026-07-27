-- Migration 011: Client photos and coach bio (static paths under /public).

update public.training_coaches c
set
  photo_url = '/images/dawg/trainers/coach-avery.png',
  bio =
    'Coach Avery leads DAWG Youth Training in Mooresville, helping athletes build strength, speed, agility, and confidence in a positive, high-energy room. He focuses on developing physical skills and mental toughness—from Little Dawgs through Big Dawgs and collegiate athletes—so kids show up stronger in training, competition, and everyday life.',
  updated_at = now()
from public.tenants t
where c.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and c.name ilike '%Avery%';

update public.training_programs p
set
  image_url = '/images/dawg/programs/little-dawgs.png',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'little-dawgs';

update public.training_programs p
set
  image_url = '/images/dawg/programs/big-dawgs.png',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'big-dawgs';
