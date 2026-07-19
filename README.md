# DAWG Youth Training

Launch package site for DAWG Youth Training (Mooresville, Indiana): public marketing site, group/private scheduling, guest Stripe Checkout, pay-at-facility bookings, and a staff admin dashboard.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, RLS) with `dawg_*` table prefixes
- Stripe Checkout (one-time payments via dynamic `price_data`)
- Resend for booking and contact emails

## Project overview

Parents browse programs and the schedule, book group classes or private lessons, and either pay online (Stripe) or pay at the facility. Staff manage sessions, rosters/attendance, bookings/payments, reviews, and business settings from `/admin`.

DAWG intentionally shares the Dugout Intel Supabase project using isolated `dawg_*` tables (same pattern as Oak Tree).

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase env vars the public site and admin UI run with seeded fallback content. Bookings return a local confirmation number.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (Checkout redirects) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser / SSR anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes (bookings, webhooks) |
| `STRIPE_SECRET_KEY` | Stripe API (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional client Stripe.js |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM_EMAIL` | From address |
| `STAFF_NOTIFICATION_EMAIL` | New booking / contact alerts |
| `CRON_SECRET` | Protects `/api/cron/expire-holds` |

## Database setup

1. Use the shared Dugout Intel Supabase project credentials.
2. Run `supabase/migrations/001_initial.sql`.
3. Run `supabase/migrations/002_payment_model.sql` if payment columns / RPCs are missing.
4. Run `supabase/seed.sql` for demo programs, sessions, and an owner profile.
5. Create a Supabase Auth user (invitation only) and ensure a matching `dawg_profiles` row exists.

Key payment objects:

- Session: `price_cents`, `payment_requirement` (`pay_online` \| `pay_at_facility` \| `online_or_facility`)
- Booking: separate `status`, `attendance_status`, `payment_status`, Stripe IDs, `booking_expires_at`
- `dawg_try_create_booking` — atomic capacity + 15-minute online holds
- `dawg_stripe_events` — webhook idempotency
- `dawg_payment_transactions` — payment/refund audit trail
- `dawg_expire_stale_pending_bookings` — abandoned hold cleanup

## Stripe architecture

1. Parent selects payment method on the booking form.
2. Server creates a booking via `dawg_try_create_booking` (pending + 15-minute hold for Stripe).
3. Server creates Stripe Checkout (`mode: payment`) with **database-loaded** `price_data` (never trust the browser price).
4. Parent pays on Stripe; webhook `checkout.session.completed` verifies amount/currency and confirms the booking.
5. Confirmation email sends once (`confirmation_email_sent_at`).
6. Abandoned holds expire via webhook `checkout.session.expired` and/or `/api/cron/expire-holds`.

Admin can mark facility payments paid/unpaid and issue full Stripe refunds from `/admin/bookings/[id]`.

Shared catalog/membership billing from `@signalworks/billing` is **not** used for DAWG session checkout — only Stripe client + webhook verify patterns were reused.

## Email architecture

Resend sends:

- Booking confirmation (facility immediately; online after verified payment)
- Staff new-booking notification
- Waitlist confirmation
- Contact form notification + sender acknowledgement

## Cron endpoint

`POST /api/cron/expire-holds` (also accepts GET)

- Marks stale `pending` bookings past `booking_expires_at` as expired
- Re-opens sessions that are no longer full
- Authorize with `Authorization: Bearer $CRON_SECRET` in production

## Folder structure

```
app/
  (public)/          Marketing, schedule, book, contact, booking success/cancel
  admin/             Staff dashboard
  api/               Bookings, Stripe webhook, contact, admin, cron
components/
  public/            Marketing + booking UI
  admin/             Admin shell, roster attendance, billing panel
  ui/                shadcn primitives
lib/
  billing/           Stripe adapter, Checkout, webhooks, formatters
  supabase/          Clients + table map
  *.ts               Domain helpers (bookings, sessions, email, gallery…)
supabase/
  migrations/        Schema
  seed.sql           Demo content
docs/                Audit, launch status, payment test checklist
public/images/dawg/  Brand + gallery assets
```

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing homepage |
| `/schedule` | Public schedule |
| `/book/[sessionId]` | Booking / waitlist |
| `/booking/success` | Stripe success |
| `/booking/cancelled` | Checkout cancelled / retry |
| `/contact` | Contact form |
| `/admin` | Today’s schedule dashboard |
| `/admin/sessions` | Session CRUD |
| `/admin/sessions/[id]/roster` | Roster + attendance |
| `/admin/bookings/[id]` | Booking billing |
| `/api/stripe/webhook` | Stripe events |
| `/api/cron/expire-holds` | Hold cleanup |

## Install on phone (PWA)

- **iPhone:** Share → Add to Home Screen
- **Android:** Install app / Add to Home screen

## Docs

- [`docs/launch-status.md`](docs/launch-status.md) — Launch completeness + owner content + Growth ideas
- [`docs/launch-payment-test-checklist.md`](docs/launch-payment-test-checklist.md) — Stripe test checklist
- [`docs/dawg-billing-integration-audit.md`](docs/dawg-billing-integration-audit.md) — Billing integration audit

## Website credit

Footer includes **Website by Signal Works**.
