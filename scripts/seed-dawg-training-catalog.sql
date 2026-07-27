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
where t.slug = 'dawg-youth-training';
