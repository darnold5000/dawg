-- Paste into Supabase SQL Editor to create / reopen bookable test sessions.
-- Safe to re-run.

-- 1) Re-open any existing sessions that are past, draft, or full
update public.dawg_sessions
set
  status = 'published',
  published_at = coalesce(published_at, now()),
  session_date = case
    when session_date < current_date then current_date + 2
    else session_date
  end,
  -- Prefer both payment options on reopened sessions
  payment_requirement = 'online_or_facility',
  location_name = coalesce(nullif(location_name, ''), 'DAWG Youth Training'),
  location_address = coalesce(
    nullif(location_address, ''),
    '477 Town Center St, Mooresville, IN 46158'
  ),
  updated_at = now()
where status in ('draft', 'full', 'published', 'completed')
  or session_date < current_date;

-- Ensure all upcoming published sessions offer Pay online + Pay at facility
update public.dawg_sessions
set payment_requirement = 'online_or_facility',
    updated_at = now()
where status = 'published'
  and session_date >= current_date;

-- 2) Ensure program / session type / trainer exist for inserts below
insert into public.dawg_session_types (name, slug)
values
  ('Group Class', 'group-class'),
  ('Private Lesson', 'private-lesson'),
  ('Small-Group Lesson', 'small-group-lesson')
on conflict (slug) do nothing;

insert into public.dawg_programs (
  name, slug, short_description, full_description,
  minimum_age, maximum_age, default_duration_minutes, default_capacity,
  default_price_cents, image_url, active, featured, display_order
)
values
  (
    'Private Training',
    'private-training',
    'Individualized instruction.',
    'One-on-one sessions for testing online booking.',
    5, 18, 60, 1, 6000,
    '/images/dawg/programs/private.jpg',
    true, true, 3
  )
on conflict (slug) do nothing;

insert into public.dawg_trainers (name, title, bio, photo_url, specialties, active, display_order)
select
  'Coach Jordan',
  'Owner / Head Trainer',
  'Test trainer for DAWG booking demos.',
  '/images/dawg/trainers/avery.jpg',
  array['Speed', 'Agility'],
  true,
  1
where not exists (
  select 1 from public.dawg_trainers where name = 'Coach Jordan'
);

-- 3) Insert three individual / small test sessions (skip if already present)
insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  'TEST Private — Online or Facility',
  'Bookable test session. Choose Pay online or Pay at facility.',
  (current_date + 2),
  '15:00', '16:00',
  7, 18, 'All levels',
  1, 6000, 'usd', 'online_or_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle',
  'Test session — cancel anytime with staff.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'private-training'
  and st.slug = 'private-lesson'
  and t.name = 'Coach Jordan'
  and not exists (
    select 1 from public.dawg_sessions
    where title = 'TEST Private — Online or Facility'
  );

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  'TEST Private — Pay Online Only',
  'Bookable test session. Stripe Checkout only.',
  (current_date + 3),
  '16:00', '17:00',
  7, 18, 'All levels',
  1, 6000, 'usd', 'pay_online',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle',
  'Test session — cancel anytime with staff.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'private-training'
  and st.slug = 'private-lesson'
  and t.name = 'Coach Jordan'
  and not exists (
    select 1 from public.dawg_sessions
    where title = 'TEST Private — Pay Online Only'
  );

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  'TEST Private — Facility Only',
  'Bookable test session. Pay at facility only.',
  (current_date + 4),
  '17:00', '18:00',
  7, 18, 'All levels',
  1, 6000, 'usd', 'pay_at_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle',
  'Test session — cancel anytime with staff.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'private-training'
  and st.slug = 'private-lesson'
  and t.name = 'Coach Jordan'
  and not exists (
    select 1 from public.dawg_sessions
    where title = 'TEST Private — Facility Only'
  );

-- 4) Show what you can book
select
  id,
  title,
  session_date,
  start_time,
  payment_requirement,
  status,
  capacity
from public.dawg_sessions
where status = 'published'
  and session_date >= current_date
order by session_date, start_time;
