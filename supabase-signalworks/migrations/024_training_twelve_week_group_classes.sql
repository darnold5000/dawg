-- Migration 024: 12-week credits apply to group classes (not private training).

update public.training_packages p
set
  description = '60 group sessions over 12 weeks. Book any class on the schedule except private lessons. One credit is used when staff mark your athlete attended. Credits expire 12 weeks after purchase.',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'twelve-week';
