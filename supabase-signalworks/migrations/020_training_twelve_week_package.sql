-- Migration 020: Sell Strength Development as a 12-week package.
-- Parents pay once on /packages. Class times stay on the calendar with no booking.

insert into public.training_packages (
  tenant_id,
  slug,
  name,
  description,
  session_count,
  price_cents,
  currency,
  active,
  display_order
)
select
  t.id,
  'twelve-week',
  '12-week program',
  'Strength Development, once a week for 12 weeks. Show up for class.',
  12,
  60000,
  'usd',
  true,
  4
from public.tenants t
where t.slug = 'dawg-youth-training'
on conflict (tenant_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  session_count = excluded.session_count,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();
