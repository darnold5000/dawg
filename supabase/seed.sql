-- SAMPLE seed data for DAWG. Remove or replace [SAMPLE] sessions before launch.
-- Run after 001_initial.sql

insert into public.dawg_business_settings (
  business_name, phone, email, address_line_1, city, state, postal_code,
  facebook_url, business_hours, cancellation_policy, booking_policy, map_embed_url
)
select
  'DAWG Youth Training',
  '(317) 835-1076',
  'coachavery1287@gmail.com',
  '477 Town Center St',
  'Mooresville',
  'IN',
  '46158',
  'https://www.facebook.com/DawgYouthTraining',
  'Hours TBD — contact DAWG for current training times',
  'Please cancel at least 24 hours in advance when possible. Contact DAWG to reschedule.',
  'Reservations hold your athlete''s spot. Payment is due at the facility unless otherwise noted. Parent or legal guardian must book for minors.',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3080.5!2d-86.37!3d39.61!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s477%20Town%20Center%20St%2C%20Mooresville%2C%20IN!5e0!3m2!1sen!2sus!4v1'
where not exists (select 1 from public.dawg_business_settings);

insert into public.dawg_session_types (name, slug)
values
  ('Group Class', 'group-class'),
  ('Private Lesson', 'private-lesson'),
  ('Small-Group Lesson', 'small-group-lesson'),
  ('Camp', 'camp'),
  ('Clinic', 'clinic')
on conflict (slug) do nothing;

insert into public.dawg_programs (
  name, slug, short_description, full_description, minimum_age, maximum_age,
  default_duration_minutes, default_capacity, default_price, image_url, active, featured, display_order
)
values
  ('Little Dawgs', 'little-dawgs',
   'For younger athletes learning proper movement, balance, coordination, speed, and body control in a positive environment.',
   'Little Dawgs introduces foundational athletic skills through fun, age-appropriate drills.',
   5, 10, 45, 10, 25, '/images/dawg/programs/little-dawgs.svg', true, true, 1),
  ('Big Dawgs', 'big-dawgs',
   'Advanced athletic development for older youth athletes — strength, speed, agility, conditioning, and competitive movement.',
   'Big Dawgs challenges older athletes with progressive strength, speed, and agility training.',
   11, 18, 60, 12, 30, '/images/dawg/programs/big-dawgs.svg', true, true, 2),
  ('Private Training', 'private-training',
   'Individualized instruction based on the athlete''s age, sport, experience, and development goals.',
   'One-on-one sessions with customized plans for speed, strength, agility, or sport-specific performance.',
   5, 18, 60, 1, 60, '/images/dawg/programs/private.svg', true, true, 3),
  ('Small-Group Training', 'small-group-training',
   'Focused instruction for siblings, teammates, or small groups who want to train together.',
   'Small-group sessions keep coaching attention high while building teamwork.',
   7, 18, 60, 4, 40, '/images/dawg/programs/small-group.svg', true, true, 4)
on conflict (slug) do nothing;

insert into public.dawg_trainers (name, title, bio, photo_url, specialties, active, display_order)
select
  'Coach Avery',
  'Owner / Head Trainer',
  'DAWG specifically emphasizes developing both physical and mental attributes in athletes within a positive and engaging setting.',
  '/images/dawg/trainers/placeholder.svg',
  array['Speed', 'Agility', 'Youth Athletic Development'],
  true,
  1
where not exists (select 1 from public.dawg_trainers where name = 'Coach Avery');

-- Sample future sessions (clearly marked)
insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id,
  st.id,
  t.id,
  '[SAMPLE] Little Dawgs Speed & Agility',
  'Sample session for development — replace before launch.',
  (current_date + 3),
  '16:00',
  '16:45',
  5, 10, 'Beginner',
  10, 25, 'pay_at_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle, comfortable training clothes',
  'Please cancel at least 24 hours in advance when possible.',
  'published',
  now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'little-dawgs' and st.slug = 'group-class' and t.name = 'Coach Avery'
  and not exists (select 1 from public.dawg_sessions where title like '[SAMPLE] Little Dawgs Speed%');

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  '[SAMPLE] Big Dawgs Strength & Speed',
  'Sample session for development — replace before launch.',
  (current_date + 4),
  '17:00', '18:00',
  11, 18, 'Intermediate',
  12, 30, 'pay_at_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle, comfortable training clothes',
  'Please cancel at least 24 hours in advance when possible.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'big-dawgs' and st.slug = 'group-class' and t.name = 'Coach Avery'
  and not exists (select 1 from public.dawg_sessions where title like '[SAMPLE] Big Dawgs Strength%');

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  '[SAMPLE] Private Training — Speed Focus',
  'Sample private lesson slot — replace before launch.',
  (current_date + 5),
  '15:00', '16:00',
  7, 18, 'All levels',
  1, 60, 'pay_at_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle',
  'Please cancel at least 24 hours in advance when possible.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'private-training' and st.slug = 'private-lesson' and t.name = 'Coach Avery'
  and not exists (select 1 from public.dawg_sessions where title like '[SAMPLE] Private Training%');
