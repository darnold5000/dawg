-- Migration 013: Reusable session templates + optional link from occurrences.

create table if not exists public.training_session_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  program_id uuid references public.training_programs (id) on delete set null,
  description text,
  default_start_time time not null,
  default_duration_minutes int not null default 60
    check (default_duration_minutes > 0 and default_duration_minutes <= 480),
  -- Null = inherit from program at schedule time.
  default_capacity int check (default_capacity is null or default_capacity > 0),
  default_price_cents int check (default_price_cents is null or default_price_cents >= 0),
  default_trainer_id uuid references public.training_coaches (id) on delete set null,
  default_assistant_trainer_id uuid references public.training_coaches (id) on delete set null,
  default_session_type_id uuid references public.training_session_types (id) on delete set null,
  default_visibility text check (
    default_visibility is null
    or default_visibility in (
      'public',
      'private',
      'members_only',
      'hidden',
      'waitlist_only'
    )
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_session_templates_tenant_active_idx
  on public.training_session_templates (tenant_id, is_active);

create index if not exists training_session_templates_tenant_program_idx
  on public.training_session_templates (tenant_id, program_id);

drop trigger if exists training_session_templates_updated_at on public.training_session_templates;
create trigger training_session_templates_updated_at
  before update on public.training_session_templates
  for each row execute function public.training_set_updated_at();

alter table public.training_sessions
  add column if not exists template_id uuid
    references public.training_session_templates (id) on delete set null;

alter table public.training_sessions
  add column if not exists visibility text check (
    visibility is null
    or visibility in (
      'public',
      'private',
      'members_only',
      'hidden',
      'waitlist_only'
    )
  );

create index if not exists training_sessions_template_idx
  on public.training_sessions (tenant_id, template_id)
  where template_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.training_session_templates enable row level security;

drop policy if exists training_staff_read_session_templates on public.training_session_templates;
create policy training_staff_read_session_templates
  on public.training_session_templates for select
  using (public.training_is_staff(tenant_id));

drop policy if exists training_admin_manage_session_templates on public.training_session_templates;
create policy training_admin_manage_session_templates
  on public.training_session_templates for all
  using (public.training_is_admin(tenant_id));

grant select, insert, update, delete on table public.training_session_templates
  to authenticated, service_role;
