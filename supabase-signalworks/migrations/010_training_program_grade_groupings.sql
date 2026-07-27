-- Migration 010: Grade-based groupings for Little Dawgs / Big Dawgs (public copy).

update public.training_programs
set
  short_description =
    'For athletes in 2nd through 6th grade — foundational movement, speed, agility, and confidence in a positive group setting.',
  full_description =
    'Little Dawgs is for 2nd grade through 6th grade. Athletes build strength, coordination, speed, and body control through age-appropriate drills and encouraging coaching.',
  minimum_age = null,
  maximum_age = null,
  updated_at = now()
where slug = 'little-dawgs';

update public.training_programs
set
  short_description =
    'For athletes from 7th grade through collegiate — advanced strength, speed, agility, and competitive athletic development.',
  full_description =
    'Big Dawgs serves 7th grade through collegiate athletes with progressive strength, speed, agility, and conditioning. Some 6th graders may participate with coach and parent approval.',
  minimum_age = null,
  maximum_age = null,
  updated_at = now()
where slug = 'big-dawgs';

update public.training_sessions s
set
  minimum_age = null,
  maximum_age = null,
  updated_at = now()
from public.training_programs p
where s.program_id = p.id
  and p.slug in ('little-dawgs', 'big-dawgs');
