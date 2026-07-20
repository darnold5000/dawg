-- DAWG weekly schedule + content cleanup
-- Paste into Supabase SQL Editor. Safe to re-run (skips duplicate sessions).

-- 1) Hide programs and coach no longer offered on the public site
update public.dawg_programs
set active = false, featured = false, updated_at = now()
where slug in ('private-training', 'small-group-training');

update public.dawg_trainers
set active = false, updated_at = now()
where name = 'Coach Jordan';

-- Ensure Coach Avery exists for new sessions
insert into public.dawg_trainers (name, title, bio, photo_url, specialties, active, display_order)
select
  'Coach Avery',
  'Owner / Head Trainer',
  'DAWG emphasizes developing physical and mental attributes in athletes within a positive, engaging setting.',
  '/images/dawg/trainers/placeholder.svg',
  array['Speed', 'Agility', 'Youth Athletic Development'],
  true,
  1
where not exists (
  select 1 from public.dawg_trainers where name = 'Coach Avery'
);

-- Cancel future sessions for removed programs
update public.dawg_sessions s
set status = 'cancelled', updated_at = now()
from public.dawg_programs p
where s.program_id = p.id
  and p.slug in ('private-training', 'small-group-training')
  and s.session_date >= current_date
  and s.status = 'published';

insert into public.dawg_session_types (name, slug)
values ('Group Class', 'group-class')
on conflict (slug) do nothing;

-- 2) Build Mon–Fri recurring sessions for the next 8 weeks
-- Little Dawgs: 4:00–5:00 PM and 6:00–7:00 PM
-- Big Dawgs: 5:00–6:00 PM

with dates as (
  select d::date as session_date
  from generate_series(
    current_date,
    current_date + interval '8 weeks',
    interval '1 day'
  ) as d
  where extract(isodow from d) between 1 and 5 -- Mon–Fri
),
slots as (
  select *
  from (values
    ('little-dawgs', 'Little Dawgs — Afternoon', '16:00'::time, '17:00'::time, 5, 10, 2500, 10, 45),
    ('big-dawgs',     'Big Dawgs — Evening',      '17:00'::time, '18:00'::time, 11, 18, 3000, 12, 60),
    ('little-dawgs', 'Little Dawgs — Late',      '18:00'::time, '19:00'::time, 5, 10, 2500, 10, 60)
  ) as t(program_slug, title, start_time, end_time, min_age, max_age, price_cents, capacity, duration_hint)
)
insert into public.dawg_sessions (
  program_id,
  session_type_id,
  trainer_id,
  title,
  description,
  session_date,
  start_time,
  end_time,
  minimum_age,
  maximum_age,
  skill_level,
  capacity,
  price_cents,
  currency,
  payment_requirement,
  location_name,
  location_address,
  what_to_bring,
  cancellation_policy,
  status,
  published_at
)
select
  p.id,
  st.id,
  t.id,
  s.title,
  'Weekly group training at DAWG Youth Training.',
  d.session_date,
  s.start_time,
  s.end_time,
  s.min_age,
  s.max_age,
  'All levels',
  s.capacity,
  s.price_cents,
  'usd',
  'pay_at_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle, comfortable training clothes',
  'Please cancel at least 24 hours in advance when possible.',
  'published',
  now()
from dates d
cross join slots s
join public.dawg_programs p on p.slug = s.program_slug and p.active = true
join public.dawg_session_types st on st.slug = 'group-class'
join public.dawg_trainers t on t.name = 'Coach Avery' and t.active = true
where not exists (
  select 1
  from public.dawg_sessions existing
  where existing.program_id = p.id
    and existing.session_date = d.session_date
    and existing.start_time = s.start_time
    and existing.status in ('published', 'full')
);

-- Verify counts
select
  p.name as program,
  s.start_time,
  count(*) as sessions_created
from public.dawg_sessions s
join public.dawg_programs p on p.id = s.program_id
where s.session_date between current_date and current_date + interval '8 weeks'
  and s.status = 'published'
group by p.name, s.start_time
order by p.name, s.start_time;
