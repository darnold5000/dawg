-- Migration 023: 12-week ($600) package credits expire 12 weeks after payment.

alter table public.training_packages
  add column if not exists validity_weeks integer
  check (validity_weeks is null or validity_weeks > 0);

alter table public.training_package_purchases
  add column if not exists credits_valid_until timestamptz;

update public.training_packages p
set
  validity_weeks = 12,
  description = 'Strength Development — 5 days per week for 12 weeks (60 sessions). Book each class on the schedule. Credits expire 12 weeks after purchase.',
  updated_at = now()
from public.tenants t
where p.tenant_id = t.id
  and t.slug = 'dawg-youth-training'
  and p.slug = 'twelve-week';

update public.training_package_purchases pu
set
  credits_valid_until = pu.paid_at + interval '12 weeks',
  updated_at = now()
from public.training_packages pk,
  public.tenants tn
where pu.package_id = pk.id
  and pu.tenant_id = tn.id
  and tn.slug = 'dawg-youth-training'
  and pk.slug = 'twelve-week'
  and pu.status = 'paid'
  and pu.paid_at is not null
  and pu.credits_valid_until is null;
