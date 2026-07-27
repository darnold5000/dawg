-- Migration 009: All DAWG group sessions are 60 minutes (not 45).

update public.training_programs
set
  default_duration_minutes = 60,
  updated_at = now()
where default_duration_minutes is distinct from 60;

update public.training_sessions
set
  end_time = (start_time + interval '60 minutes')::time,
  updated_at = now()
where start_time is not null
  and end_time is not null
  and (end_time - start_time) = interval '45 minutes';
