-- Intake links use the same secure token table with purpose = 'intake'.

alter table public.dawg_family_login_tokens
  drop constraint if exists dawg_family_login_tokens_purpose_check;

alter table public.dawg_family_login_tokens
  add constraint dawg_family_login_tokens_purpose_check
  check (purpose in ('login', 'claim', 'intake'));

comment on column public.dawg_family_login_tokens.purpose is
  'login = portal sign-in; claim = optional account claim; intake = one-time intake form access.';
