-- SAMPLE seed data for DAWG. Remove or replace sessions before launch.
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

-- Restore real DAWG contact/location if a prior demo anonymization was applied
update public.dawg_business_settings set
  business_name = 'DAWG Youth Training',
  phone = '(317) 835-1076',
  email = 'coachavery1287@gmail.com',
  address_line_1 = '477 Town Center St',
  city = 'Mooresville',
  state = 'IN',
  postal_code = '46158',
  facebook_url = 'https://www.facebook.com/DawgYouthTraining',
  map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3080.5!2d-86.37!3d39.61!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s477%20Town%20Center%20St%2C%20Mooresville%2C%20IN!5e0!3m2!1sen!2sus!4v1',
  business_hours = 'Hours TBD — contact DAWG for current training times';

update public.dawg_trainers set name = 'Coach Jordan'
where name = 'Coach Avery';



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
  default_duration_minutes, default_capacity, default_price_cents, image_url, active, featured, display_order
)
values
  ('Little Dawgs', 'little-dawgs',
   'For athletes in 2nd through 6th grade — foundational movement, speed, agility, and confidence in a positive group setting.',
   'Little Dawgs is for 2nd grade through 6th grade. Athletes build strength, coordination, speed, and body control through fun, age-appropriate drills.',
   null, null, 60, 10, 2500, '/images/dawg/programs/little-dawgs.png', true, true, 1),
  ('Big Dawgs', 'big-dawgs',
   'For athletes from 7th grade through collegiate — advanced strength, speed, agility, and competitive athletic development.',
   'Big Dawgs serves 7th grade through collegiate athletes with progressive strength, speed, agility, and conditioning.',
   null, null, 60, 12, 3000, '/images/dawg/programs/big-dawgs.png', true, true, 2),
  ('Private Training', 'private-training',
   'Individualized instruction based on the athlete''s age, sport, experience, and development goals.',
   'One-on-one sessions with customized plans for speed, strength, agility, or sport-specific performance.',
   5, 18, 60, 1, 6000, '/images/dawg/programs/private.jpg', true, true, 3),
  ('Small-Group Training', 'small-group-training',
   'Focused instruction for siblings, teammates, or small groups who want to train together.',
   'Small-group sessions keep coaching attention high while building teamwork.',
   7, 18, 60, 4, 4000, '/images/dawg/programs/small-group.jpg', true, true, 4)
on conflict (slug) do nothing;

insert into public.dawg_trainers (name, title, bio, photo_url, specialties, active, display_order)
select
  'Coach Jordan',
  'Owner / Head Trainer',
  'DAWG specifically emphasizes developing both physical and mental attributes in athletes within a positive and engaging setting.',
  '/images/dawg/trainers/placeholder.svg',
  array['Speed', 'Agility', 'Youth Athletic Development'],
  true,
  1
where not exists (select 1 from public.dawg_trainers where name = 'Coach Jordan');

-- Demo future sessions for development
insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id,
  st.id,
  t.id,
  'Little Dawgs Speed & Agility',
  'Age-appropriate athletic training at DAWG Youth Training.',
  (current_date + 3),
  '16:00',
  '17:00',
  null, null, 'Beginner',
  10, 2500, 'usd', 'online_or_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle, comfortable training clothes',
  'Please cancel at least 24 hours in advance when possible.',
  'published',
  now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'little-dawgs' and st.slug = 'group-class' and t.name = 'Coach Jordan'
  and not exists (select 1 from public.dawg_sessions where title like 'Little Dawgs Speed%');

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  'Big Dawgs Strength & Speed',
  'Age-appropriate athletic training at DAWG Youth Training.',
  (current_date + 4),
  '17:00', '18:00',
  null, null, 'Intermediate',
  12, 3000, 'usd', 'pay_online',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle, comfortable training clothes',
  'Please cancel at least 24 hours in advance when possible.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'big-dawgs' and st.slug = 'group-class' and t.name = 'Coach Jordan'
  and not exists (select 1 from public.dawg_sessions where title like 'Big Dawgs Strength%');

insert into public.dawg_sessions (
  program_id, session_type_id, trainer_id, title, description,
  session_date, start_time, end_time, minimum_age, maximum_age, skill_level,
  capacity, price_cents, currency, payment_requirement, location_name, location_address,
  what_to_bring, cancellation_policy, status, published_at
)
select
  p.id, st.id, t.id,
  'Private Training — Speed Focus',
  'One-on-one private training focused on the athlete’s goals.',
  (current_date + 5),
  '15:00', '16:00',
  7, 18, 'All levels',
  1, 6000, 'usd', 'online_or_facility',
  'DAWG Youth Training',
  '477 Town Center St, Mooresville, IN 46158',
  'Athletic shoes, water bottle',
  'Please cancel at least 24 hours in advance when possible.',
  'published', now()
from public.dawg_programs p
cross join public.dawg_session_types st
cross join public.dawg_trainers t
where p.slug = 'private-training' and st.slug = 'private-lesson' and t.name = 'Coach Jordan'
  and not exists (select 1 from public.dawg_sessions where title like 'Private Training%');

insert into public.dawg_reviews (
  reviewer_name, reviewer_description, rating, review_text, published, featured, display_order
)
select * from (values
  ('Brad Allen', 'Parent · Facebook · August 24, 2025', 5,
   'Working with Avery is a true blessing. My boys have been going to the Dawg house for a little over 6 months and their transformation is incredible. Not only are they stronger and more agile but their confidence in themselves is skyrocketing! Can''t recommend Avery highly enough!',
   true, true, 1),
  ('Amber Altmeyer', 'Parent · Facebook · February 5, 2020', 5,
   'Great program and highly recommend it. Love seeing all the kids from different local sports get involved in workouts and strength building. I have to say my boys truly loved it. Love how the community is getting together and later we will all look back and remember these days. I''ve seen a lot of Previous BD Giant parents and love watching my kids experience growing up in the Wayne township and Ben Davis Community.',
   true, true, 2),
  ('Jen McCann', 'Parent · Facebook · February 4, 2020', 5,
   'My boys love going to workouts. They are learning how to push through challenges and having fun at the same time. They are aware of how these workouts will help them in-season. My youngest went to show off his new exercise move to his soccer coach because he was so proud of himself! I love how kid-friendly the workouts are while making them work (hard!) and teaching life lessons at the same time!',
   true, true, 3),
  ('Amy Armour', 'Parent · Facebook · February 4, 2020', 5,
   'My son enjoys going to the workouts. It''s challenging and fun',
   true, false, 4),
  ('Melissa Aguirre', 'Parent · Facebook · February 3, 2020', 5,
   'This is such a great experience for the kids! Especially during the winter months when the weather is crazy and it''s dark by dinner time! Not to mention he''s doing it all for free!',
   true, false, 5)
) as v(reviewer_name, reviewer_description, rating, review_text, published, featured, display_order)
where not exists (select 1 from public.dawg_reviews limit 1);

-- ---------------------------------------------------------------------------
-- Seed admin user (login at /admin/login)
-- Email: hello@hiresignalworks.com
-- Password: 1Password
-- Change this password after first login in production.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'hello@hiresignalworks.com';
  v_encrypted_pw text := crypt('1Password', gen_salt('bf'));
begin
  if exists (select 1 from auth.users where email = v_email) then
    select id into v_user_id from auth.users where email = v_email;
  else
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DAWG Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, v_email)::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.dawg_profiles (id, full_name, email, role, active)
  values (v_user_id, 'DAWG Admin', v_email, 'owner', true)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role,
        active = true;
end $$;
