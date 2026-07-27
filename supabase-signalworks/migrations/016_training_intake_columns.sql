-- Migration 016: Intake form columns + athlete unique upsert (matches app + hobby dawg_intake_submissions).
-- Run on Pro if intake save fails with "Run the latest database migration."

alter table public.training_intake_submissions
  add column if not exists package_interest text,
  add column if not exists shirt_size text,
  add column if not exists goal text,
  add column if not exists media_consent boolean not null default false,
  add column if not exists waiver_accepted_at timestamptz;

alter table public.training_intake_submissions
  drop constraint if exists training_intake_submissions_package_interest_check;

alter table public.training_intake_submissions
  add constraint training_intake_submissions_package_interest_check
  check (
    package_interest is null
    or package_interest in ('single', 'pack-10', 'pack-20')
  );

-- Upsert on athlete_id (submitIntake uses onConflict: athlete_id)
create unique index if not exists training_intake_submissions_athlete_id_key
  on public.training_intake_submissions (athlete_id);

-- Family magic links: intake purpose (email links before booking)
alter table public.training_family_login_tokens
  drop constraint if exists training_family_login_tokens_purpose_check;

alter table public.training_family_login_tokens
  add constraint training_family_login_tokens_purpose_check
  check (purpose in ('login', 'claim', 'intake'));

grant insert, update on table public.training_family_login_tokens to service_role;
