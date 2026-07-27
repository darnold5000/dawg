-- Per-tenant email identity (Resend / transactional).
-- Rename table if your client uses a prefix; FK to public.tenants is required.

begin;

create table if not exists public.tenant_email_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  from_name text not null,
  from_email text not null,
  reply_to text,
  support_email text,
  support_phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  button_color text,
  footer_text text,
  privacy_url text,
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_email_settings_from_email_check
    check (from_email ~ '^[^@]+@[^@]+\.[^@]+$')
);

alter table public.tenant_email_settings enable row level security;

-- Service role writes; staff read via tenant membership policies in client migrations.

commit;
