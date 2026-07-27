-- Migration 007: Align training_stripe_events with DAWG webhook adapter (tenant-scoped idempotency).

alter table public.training_stripe_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists booking_id uuid references public.training_session_bookings (id) on delete set null,
  add column if not exists processed boolean not null default false,
  add column if not exists processing_error text,
  add column if not exists created_at timestamptz not null default now();

alter table public.training_stripe_events
  alter column processed_at drop not null,
  alter column processed_at drop default;

create unique index if not exists training_stripe_events_id_uidx
  on public.training_stripe_events (id);
