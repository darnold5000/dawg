-- DAWG production catalog seed (Signal Works Pro / training vertical).
-- Paste into Supabase SQL Editor. Safe to re-run (upserts by tenant + slug).
--
-- Prerequisites:
--   - Tenant registered (migration 001): slug dawg-youth-training
--   - Migrations 002+ (training_* tables); 014 adds calendar_color / default_visibility on programs
--
-- After this runs, optional: scripts/seed-dawg-session-templates.sql (needs 013+014).

do $$
declare
  v_tenant_id uuid;
  v_bio text := $bio$My name is Avery Thompson Sr. I'm the owner and founder of Dawgs Youth Sports Performance. Dawg was founded in 2018 on the Westside of Indianapolis until moving to Mooresville in 2024. I was a 4 sport athlete in football, basketball, baseball, and track. I was blessed to be a high jumper on the state runner up Track & Field team at Ben Davis High School in 2002. I also won state twice in football as player in 2001 & 2002. I won another state title as coach for Ben Davis in 2017 on the undefeated national ranked football team. I have over a decade of experience in coaching youth sports and I'm on year 13 of coaching high school football. I won 2 National Titles in 2008 & 2017 with the Indianapolis Tornados. Since retiring I have dedicated my time to multiple communities in helping young athletes reach their fitness goals and build their confidence through mental toughness. I just really enjoy being apart of athlete's journey to success by creating a fun atmosphere with incredible work ethic. Be. A. Dawg🐾🦴🖤$bio$;
begin
  select id into v_tenant_id
  from public.tenants
  where slug = 'dawg-youth-training';

  if v_tenant_id is null then
    raise exception 'Tenant dawg-youth-training not found — run migration 001 first.';
  end if;

  -- Coach Avery (primary trainer for templates and sessions)
  if not exists (
    select 1
    from public.training_coaches c
    where c.tenant_id = v_tenant_id
      and c.name = 'Avery Thompson Sr.'
  ) then
    insert into public.training_coaches (
      tenant_id,
      name,
      title,
      bio,
      photo_url,
      specialties,
      certifications,
      coaching_experience,
      sports_background,
      active,
      display_order
    ) values (
      v_tenant_id,
      'Avery Thompson Sr.',
      'Owner & Founder · DAWG Youth Sports Performance',
      v_bio,
      '/images/dawg/trainers/coach-avery.png',
      array['Speed', 'Agility', 'Youth Athletic Development'],
      array[]::text[],
      'Youth athletic training in Mooresville, Indiana',
      'Sports performance coaching',
      true,
      1
    );
  else
    update public.training_coaches c
    set
      title = 'Owner & Founder · DAWG Youth Sports Performance',
      bio = v_bio,
      photo_url = coalesce(c.photo_url, '/images/dawg/trainers/coach-avery.png'),
      specialties = array['Speed', 'Agility', 'Youth Athletic Development'],
      active = true,
      display_order = 1,
      updated_at = now()
    where c.tenant_id = v_tenant_id
      and c.name = 'Avery Thompson Sr.';
  end if;

  -- Programs (public site shows Little / Big; private/small kept inactive)
  insert into public.training_programs (
    tenant_id,
    name,
    slug,
    short_description,
    full_description,
    minimum_age,
    maximum_age,
    default_duration_minutes,
    default_capacity,
    default_price_cents,
    image_url,
    calendar_color,
    default_visibility,
    active,
    featured,
    display_order
  ) values
    (
      v_tenant_id,
      'Little Dawgs',
      'little-dawgs',
      'For athletes in 2nd through 6th grade — foundational movement, speed, agility, and confidence in a positive group setting.',
      'Little Dawgs is for 2nd grade through 6th grade. Athletes build strength, coordination, speed, and body control through age-appropriate drills and encouraging coaching.',
      null,
      null,
      60,
      10,
      2500,
      '/images/dawg/programs/little-dawgs.png',
      '#2563eb',
      'public',
      true,
      true,
      1
    ),
    (
      v_tenant_id,
      'Big Dawgs',
      'big-dawgs',
      'For athletes from 7th grade through collegiate — advanced strength, speed, agility, and competitive athletic development.',
      'Big Dawgs serves 7th grade through collegiate athletes with progressive strength, speed, agility, and conditioning. Some 6th graders may participate with coach and parent approval.',
      null,
      null,
      60,
      12,
      3000,
      '/images/dawg/programs/big-dawgs.png',
      '#dc2626',
      'public',
      true,
      true,
      2
    ),
    (
      v_tenant_id,
      'Private Training',
      'private-training',
      'Individualized instruction based on the athlete''s age, sport, experience, and development goals.',
      'One-on-one sessions with customized plans for speed, strength, agility, or sport-specific performance.',
      5,
      18,
      60,
      1,
      6000,
      '/images/dawg/programs/private.jpg',
      null,
      'public',
      false,
      false,
      3
    ),
    (
      v_tenant_id,
      'Small-Group Training',
      'small-group-training',
      'Focused instruction for siblings, teammates, or small groups who want to train together.',
      'Small-group sessions keep coaching attention high while building teamwork.',
      7,
      18,
      60,
      4,
      4000,
      '/images/dawg/programs/small-group.jpg',
      null,
      'public',
      false,
      false,
      4
    )
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    short_description = excluded.short_description,
    full_description = excluded.full_description,
    minimum_age = excluded.minimum_age,
    maximum_age = excluded.maximum_age,
    default_duration_minutes = excluded.default_duration_minutes,
    default_capacity = excluded.default_capacity,
    default_price_cents = excluded.default_price_cents,
    image_url = excluded.image_url,
    calendar_color = coalesce(excluded.calendar_color, public.training_programs.calendar_color),
    default_visibility = excluded.default_visibility,
    active = excluded.active,
    featured = excluded.featured,
    display_order = excluded.display_order,
    updated_at = now();

  -- Session types (templates default to Group Class)
  insert into public.training_session_types (tenant_id, name, slug, active)
  values
    (v_tenant_id, 'Group Class', 'group-class', true),
    (v_tenant_id, 'Private Lesson', 'private-lesson', true),
    (v_tenant_id, 'Small-Group Lesson', 'small-group-lesson', true),
    (v_tenant_id, 'Camp', 'camp', true),
    (v_tenant_id, 'Clinic', 'clinic', true)
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    active = excluded.active;

  -- Training packages (public /packages checkout)
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
  values
    (
      v_tenant_id,
      'single',
      'Single session',
      'One training session credit.',
      1,
      2500,
      'usd',
      true,
      1
    ),
    (
      v_tenant_id,
      'pack-10',
      '10 sessions',
      'Ten training session credits.',
      10,
      20000,
      'usd',
      true,
      2
    ),
    (
      v_tenant_id,
      'pack-20',
      '20 sessions',
      'Twenty training session credits.',
      20,
      30000,
      'usd',
      true,
      3
    )
  on conflict (tenant_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    session_count = excluded.session_count,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    active = excluded.active,
    display_order = excluded.display_order,
    updated_at = now();

  -- Parent reviews (Facebook recommends)
  delete from public.training_reviews r
  where r.tenant_id = v_tenant_id
    and r.reviewer_name in (
      'Brad Allen',
      'Amber Altmeyer',
      'Jen McCann',
      'Amy Armour',
      'Melissa Aguirre',
      'Jessica M.',
      'Marcus T.',
      'Amanda R.',
      'Chris D.'
    );

  insert into public.training_reviews (
    tenant_id,
    reviewer_name,
    reviewer_description,
    rating,
    review_text,
    published,
    featured,
    display_order
  )
  values
    (
      v_tenant_id,
      'Brad Allen',
      'Parent · Facebook · August 24, 2025',
      5,
      'Working with Avery is a true blessing. My boys have been going to the Dawg house for a little over 6 months and their transformation is incredible. Not only are they stronger and more agile but their confidence in themselves is skyrocketing! Can''t recommend Avery highly enough!',
      true,
      true,
      1
    ),
    (
      v_tenant_id,
      'Amber Altmeyer',
      'Parent · Facebook · February 5, 2020',
      5,
      'Great program and highly recommend it. Love seeing all the kids from different local sports get involved in workouts and strength building. I have to say my boys truly loved it. Love how the community is getting together and later we will all look back and remember these days. I''ve seen a lot of Previous BD Giant parents and love watching my kids experience growing up in the Wayne township and Ben Davis Community.',
      true,
      true,
      2
    ),
    (
      v_tenant_id,
      'Jen McCann',
      'Parent · Facebook · February 4, 2020',
      5,
      'My boys love going to workouts. They are learning how to push through challenges and having fun at the same time. They are aware of how these workouts will help them in-season. My youngest went to show off his new exercise move to his soccer coach because he was so proud of himself! I love how kid-friendly the workouts are while making them work (hard!) and teaching life lessons at the same time!',
      true,
      true,
      3
    ),
    (
      v_tenant_id,
      'Amy Armour',
      'Parent · Facebook · February 4, 2020',
      5,
      'My son enjoys going to the workouts. It''s challenging and fun',
      true,
      false,
      4
    ),
    (
      v_tenant_id,
      'Melissa Aguirre',
      'Parent · Facebook · February 3, 2020',
      5,
      'This is such a great experience for the kids! Especially during the winter months when the weather is crazy and it''s dark by dinner time! Not to mention he''s doing it all for free!',
      true,
      false,
      5
    );

  raise notice 'DAWG catalog seeded for tenant %', v_tenant_id;
end $$;

-- Quick verification
select 'coaches' as kind, count(*)::text as count
from public.training_coaches c
join public.tenants t on t.id = c.tenant_id
where t.slug = 'dawg-youth-training'
union all
select 'programs', count(*)::text
from public.training_programs p
join public.tenants t on t.id = p.tenant_id
where t.slug = 'dawg-youth-training'
union all
select 'session_types', count(*)::text
from public.training_session_types st
join public.tenants t on t.id = st.tenant_id
where t.slug = 'dawg-youth-training'
union all
select 'packages', count(*)::text
from public.training_packages pk
join public.tenants t on t.id = pk.tenant_id
where t.slug = 'dawg-youth-training'
union all
select 'reviews', count(*)::text
from public.training_reviews r
join public.tenants t on t.id = r.tenant_id
where t.slug = 'dawg-youth-training' and r.published = true;
