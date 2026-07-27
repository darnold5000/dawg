# DAWG production multitenant — architecture audit (Phase 1)

**Status:** Read-only audit complete  
**Date:** 2026-07-27  
**Branch:** `feature/dawg-production-multitenant`  
**Legacy baseline:** `main` → Dugout Intel / hobby Supabase, `dawg_*` prefix, no `tenant_id`  
**Target:** Signal Works Pro shared project per [ADR 0008](../adr/0008-legacy-ma5-and-vertical-domain-modules.md)

**No implementation** in this phase. No hobby DB changes. No Vercel/env changes.

---

## 1. Executive summary

DAWG is a Next.js 16 app with **21 `dawg_*` tables**, **7 business RPCs**, **1 storage bucket**, and **heavy service-role** usage. Isolation today is **table prefix + `dawg_is_staff()` RLS**, not `tenant_id`. There is **zero** reference to MA5 tables in the DAWG codebase.

Moving to Pro requires a **new migration chain** (`supabase-signalworks/` or equivalent), **youth vertical tables** with `tenant_id`, platform **`tenants` + `tenant_memberships`** for staff, refactored app layer (`YOUTH_TABLES` / deployment context), and a **data migration** from Dugout if hobby data is production-active.

---

## 2. Current schema inventory

### 2.1 Tables (`public.dawg_*`)

| Table | Purpose | PK | Notable FKs | Ownership | RLS (summary) | Service role | Seed / live |
|-------|---------|-----|-------------|-----------|---------------|--------------|-------------|
| `dawg_profiles` | Staff linked to `auth.users` | `id` → auth | auth.users | Staff | Own row; admin read; owner manage | Rare (admin flows) | `seed.sql` demo owner |
| `dawg_trainers` | Public coach profiles | uuid | `profile_id` optional | Business | Public read active; admin manage | Admin uploads | seed + admin |
| `dawg_programs` | Program catalog | uuid | — | Business | Public read active; admin manage | Reads | seed |
| `dawg_session_types` | Session type taxonomy | uuid | — | Business | Public read; admin manage | Reads | seed |
| `dawg_sessions` | Schedulable sessions | uuid | program, type, trainer | Business | Public published; staff read all; admin manage | Booking RPC | seed + admin |
| `dawg_parents` | Guardian contact records | uuid | — | PII | Staff only | **All family/booking writes** | runtime |
| `dawg_athletes` | Athletes per parent | uuid | parent_id | PII | Staff only | **All booking/intake** | runtime |
| `dawg_bookings` | Session registrations | uuid | session, parent, athlete | Business | Staff only | **RPC + adapter** | runtime |
| `dawg_waitlist_entries` | Full session waitlist | uuid | session, parent | Business | Staff only | API | runtime |
| `dawg_reviews` | Testimonials CMS | uuid | — | Marketing | Public published; admin manage | Admin | seed optional |
| `dawg_business_settings` | Singleton site settings | id (int) | — | Business | Public read; admin manage | Admin API | seed id=1 |
| `dawg_blocked_times` | Admin availability blocks | uuid | — | Business | Staff manage | Availability API | admin |
| `dawg_stripe_events` | Webhook idempotency | stripe_event_id | — | Ops | Staff read; admin manage | **Webhook** | runtime |
| `dawg_payment_transactions` | Payment audit trail | uuid | booking_id | Finance | Staff read; admin manage | **Billing adapter** | runtime |
| `dawg_device_families` | Remembered family cookie payload | uuid | parent_id | PII | Staff read/manage | **family-device** | runtime |
| `dawg_packages` | Package catalog | uuid | — | Catalog | (RLS via 006—staff/public per migration) | Packages lib | **006 seeds rows** |
| `dawg_package_purchases` | Punch cards | uuid | parent, package, athlete | Finance | Staff / service | **Stripe package flow** | runtime |
| `dawg_package_redemptions` | Credit use per booking | uuid | purchase, booking | Finance | Service | **RPC redeem** | runtime |
| `dawg_package_credit_adjustments` | Admin credit adjustments | uuid | purchase | Finance | Staff | Admin panel | admin |
| `dawg_intake_submissions` | Athlete intake forms | uuid | parent, athlete | PII | Staff | **intake.ts** | runtime |
| `dawg_family_login_tokens` | Magic links for `/my` | uuid | parent_id | Security | Staff read; **writes service-only** | **family-login** | runtime |

**Views:** none in migration chain.

**Triggers:** `dawg_set_updated_at` on most mutable tables.

### 2.2 Functions / RPCs

| Object | Type | Purpose | Tenant scope today |
|--------|------|---------|-------------------|
| `dawg_set_updated_at` | trigger fn | `updated_at` | N/A |
| `dawg_session_booked_count(session_id)` | SQL | Capacity count | Session implicit single-tenant |
| `dawg_try_create_booking(...)` | RPC | Atomic book + hold | **No tenant param** |
| `dawg_redeem_package_credit(...)` | RPC | Debit package + link booking | **No tenant param** |
| `dawg_expire_stale_pending_bookings()` | RPC | Cron cleanup | **Global** all pending |
| `dawg_merge_parents(keep_id, merge_id)` | RPC | Admin dedupe parents | **No tenant param** |
| `dawg_is_staff / _admin / _owner` | RLS helpers | Staff gates | **Any** `dawg_profiles` row |

### 2.3 Storage

| Bucket | Migration | Policies | App path |
|--------|-----------|----------|----------|
| `trainer-photos` | `010_trainer_photo_storage.sql` | Public read; admin write via `dawg_is_admin()` | `lib/admin-trainers.ts` — paths **not tenant-prefixed** |

### 2.4 Scheduled / cron

| Mechanism | Entry | Behavior |
|-----------|-------|----------|
| HTTP | `POST/GET /api/cron/expire-holds` | Calls `dawg_expire_stale_pending_bookings()`; `CRON_SECRET` in prod |
| DB | No `pg_cron` in repo | — |

### 2.5 Migration files (hobby chain — do not edit)

`supabase/migrations/001` through `014`, plus seeds: `seed.sql`, `seed_weekly_schedule.sql`, `seed_test_sessions.sql`.

---

## 3. Application dependency inventory

### 3.1 `DAWG_TABLES` (`lib/supabase/tables.ts`)

Single map of 21 table names — **all server reads/writes** should migrate to a vertical map (e.g. `YOUTH_TABLES`) on the feature branch.

### 3.2 `SUPABASE_SERVICE_ROLE_KEY` / `createServiceClient()`

Used in **~30 application modules** (grep count on `createServiceClient` / service role guard), including:

- `lib/bookings.ts`, `lib/billing/adapter.ts`, `lib/billing/webhook-handlers.ts`, `lib/billing/reconcile-checkout.ts`, `lib/billing/booking-lookup.ts`
- `lib/packages.ts`, `lib/intake.ts`, `lib/family-login.ts`, `lib/family-portal.ts`, `lib/family-device.ts`, `lib/parent-account.ts`
- `lib/admin-*`, `lib/sessions.ts`, `lib/data.ts`, `lib/merge-parents.ts`
- Most `app/api/admin/*`, `app/api/packages/*`, `app/api/family/*`, booking success page

**Pattern:** `if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)` then no-op or fallback demo data.

**Gap:** No `tenant_id` filter on any query.

### 3.3 Supabase RPC calls (application)

| RPC | Call site |
|-----|-----------|
| `dawg_try_create_booking` | `lib/bookings.ts` |
| `dawg_redeem_package_credit` | `lib/packages.ts` |
| `dawg_expire_stale_pending_bookings` | `lib/billing/booking-lookup.ts` |
| `dawg_merge_parents` | `lib/merge-parents.ts` |

### 3.4 Staff auth

- `lib/auth.ts` — `getCurrentProfile()` → `dawg_profiles` by `auth.uid()`
- `lib/roles.ts` — owner / admin / trainer
- Admin routes use `requireStaff*` helpers
- **No** `tenant_memberships` integration

### 3.5 Family portal

- Magic links: `dawg_family_login_tokens` (hashed token, expiry, `used_at`)
- Device remember: `dawg_device_families` + cookie `dawg_family_device`
- Routes: `/my`, `/api/my/login`, `/api/my/verify`, `/api/my/register`, intake flows
- **No Supabase Auth** for parents (by design)

### 3.6 Stripe

- Webhook: `app/api/stripe/webhook/route.ts` → `processStripeWebhookEvent`
- Tables: `dawg_stripe_events`, `dawg_payment_transactions`
- Idempotency: **unique on `stripe_event_id` only** (single-tenant safe today; **must add `tenant_id`** on Pro if event IDs could theoretically collide across Connect accounts—prefer composite unique `(tenant_id, stripe_event_id)` or include Stripe account in dedup like MA5)
- Package checkout: separate metadata path in `lib/billing/package-checkout.ts`

### 3.7 Resend

- `lib/email.ts` — `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STAFF_NOTIFICATION_EMAIL`
- Booking, waitlist, contact, package claim, intake, family login emails

### 3.8 Environment variables (`.env.example`)

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, Stripe return |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Client + SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes |
| `STRIPE_*` | DAWG merchant |
| `RESEND_*`, `STAFF_NOTIFICATION_EMAIL` | Email |
| `CRON_SECRET` | Hold expiration |

**Future (feature branch):** `YOUTH_TENANT_ID` or `DAWG_TENANT_ID`, optional `STRIPE_ACCOUNT_ID` for webhook dedup alignment with MA5 pattern.

### 3.9 MA5 coupling

**None** — no `ma5_` / `MA5` references in DAWG TypeScript.

---

## 4. Layer assignment (summary)

See full matrix: [dawg-table-layer-mapping.md](./dawg-table-layer-mapping.md).

- **Platform:** tenant registration, staff via `tenant_memberships`, SW commercial/docs as needed for Signal Works client relationship—not DAWG parent PII.
- **Youth vertical:** guardians, athletes, sessions, bookings, packages, intake, family tokens, vertical stripe event log (or shared payments module with `tenant_id`).
- **Remain hobby-only:** all existing `dawg_*` objects on Dugout—unchanged.

**Proposed vertical prefix (working name):** `yt_` (*youth training* module). Final names confirmed at implementation approval.

---

## 5. Risk assessment

See [dawg-cutover-risk-register.md](./dawg-cutover-risk-register.md).

---

## 6. Data decision (evidence-based)

| Evidence | Inference |
|----------|-----------|
| `seed.sql`, `seed_test_sessions.sql`, `seed_weekly_schedule.sql` in repo | Hobby/dev **seed content** is common |
| `006_packages_and_intake.sql` **inserts catalog packages** on migrate | Fresh DBs get default packages |
| Launch docs list Stripe live, cron, Resend as owner ops | **Production site** (`dawgz.hiresignalworks.com`) may hold **real** parents/bookings/payments |
| No export scripts in repo | Migration tooling **not yet built** |
| Family portal + packages + intake shipped after early launch doc | Hobby DB may be **mixed**: seeds + real registrations |

**Conclusion:** Treat hobby data as **potentially active** until operator confirms row counts and Stripe mode (test vs live) on Dugout. Plan for **selective migration** (parents, athletes, bookings, purchases, Stripe IDs, trainer photos) with validation—not an undocumented fresh start.

**Operator verification (manual):**

```sql
-- Run on Dugout (read-only)
select 'parents' as entity, count(*) from dawg_parents
union all select 'athletes', count(*) from dawg_athletes
union all select 'bookings', count(*) from dawg_bookings
union all select 'package_purchases', count(*) from dawg_package_purchases
union all select 'stripe_events', count(*) from dawg_stripe_events;
```

---

## 7. Approval gate

| Deliverable | Status |
|-------------|--------|
| Schema inventory | Done |
| App dependency inventory | Done |
| Table-to-layer mapping | Done |
| Risk register | Done |
| Phased implementation plan | [dawg-implementation-phased-backlog.md](./dawg-implementation-phased-backlog.md) |
| **Implementation (migrations + app)** | **Blocked** — awaiting operator approval |

---

## 8. Related documents

- [ADR 0008](../adr/0008-legacy-ma5-and-vertical-domain-modules.md)
- [dawg-table-layer-mapping.md](./dawg-table-layer-mapping.md)
- [dawg-cutover-risk-register.md](./dawg-cutover-risk-register.md)
- [dawg-implementation-phased-backlog.md](./dawg-implementation-phased-backlog.md)
