-- Migration 022: Strength Development program card image (home #training section).

update public.training_programs p
set
  image_url = '/images/dawg/programs/strength-development.jpg',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'strength-development';
