-- Migration 014: Program-owned calendar defaults + canonical Little/Big Dawgs names.
-- Run after 013. Safe if 013 used an earlier draft (drops template name unique / color if present).

alter table public.training_programs
  add column if not exists calendar_color text,
  add column if not exists default_visibility text not null default 'public'
    check (
      default_visibility in (
        'public',
        'private',
        'members_only',
        'hidden',
        'waitlist_only'
      )
    );

update public.training_programs
set
  name = 'Little Dawgs',
  calendar_color = coalesce(calendar_color, '#2563eb'),
  default_visibility = coalesce(default_visibility, 'public')
where slug = 'little-dawgs';

update public.training_programs
set
  name = 'Big Dawgs',
  calendar_color = coalesce(calendar_color, '#dc2626'),
  default_visibility = coalesce(default_visibility, 'public')
where slug = 'big-dawgs';

-- Earlier 013 draft: remove template name uniqueness and per-template color.
alter table public.training_session_templates
  drop constraint if exists training_session_templates_tenant_id_name_key;

alter table public.training_session_templates
  drop column if exists color;

-- Relax capacity/price to nullable overrides (no-op if 013 already applied).
alter table public.training_session_templates
  alter column default_capacity drop not null,
  alter column default_price_cents drop not null,
  alter column default_price_cents drop default;

alter table public.training_session_templates
  add column if not exists default_assistant_trainer_id uuid
    references public.training_coaches (id) on delete set null;

alter table public.training_session_templates
  add column if not exists default_visibility text check (
    default_visibility is null
    or default_visibility in (
      'public',
      'private',
      'members_only',
      'hidden',
      'waitlist_only'
    )
  );
