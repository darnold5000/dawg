# DAWG × Signal Works Billing Integration Audit

**Date:** 2026-07-19  
**Scope:** Phase 1 of the DAWG Launch Completion Plan  
**Sources:** `dawg/`, `signalworks-platform/billing/` (`@signalworks/billing`)

---

## 1. DAWG application audit

### Framework

| Item | Value |
|------|--------|
| Framework | Next.js App Router |
| Next.js | **16.2.10** |
| React | 19.2.4 |
| Styling | Tailwind CSS 4 + shadcn/ui (`@base-ui/react`) |
| Auth / DB | Supabase (`@supabase/ssr` 0.12, `@supabase/supabase-js` 2.109) |
| Email | Resend 6.17 |
| Validation | Zod 4.4 |
| Stripe dependency | **Not installed** (env stubs only) |
| Monorepo | **No** — standalone Next app |
| Deploy target | `NEXT_PUBLIC_SITE_URL=https://dawg-ashen.vercel.app` (Vercel-oriented; `@vercel/analytics` present; no `vercel.json`) |

### Database schema (current)

Single migration: `supabase/migrations/001_initial.sql`  
All tables use `dawg_*` prefix on the shared Dugout Intel Supabase project.

| Table | Role |
|-------|------|
| `dawg_profiles` | Staff auth (`owner` / `admin` / `trainer`) |
| `dawg_trainers` | Public trainer bios |
| `dawg_programs` | Program catalog |
| `dawg_session_types` | e.g. group / private |
| `dawg_sessions` | Bookable sessions |
| `dawg_parents` / `dawg_athletes` | Customer records (no auth accounts) |
| `dawg_bookings` | Reservations |
| `dawg_waitlist_entries` | Waitlist |
| `dawg_reviews` | CMS testimonials |
| `dawg_business_settings` | Contact + homepage announcement |
| `dawg_blocked_times` | Trainer blocks |

**Already present payment-related fields**

`dawg_sessions`:

- `price numeric(10,2)` — dollars, not cents
- `deposit_amount numeric(10,2)`
- `payment_requirement` check: `full_at_booking` \| `deposit_at_booking` \| `pay_at_facility` (default `pay_at_facility`)
- No `currency` column

`dawg_bookings`:

- `payment_status` check: `not_required` \| `pending` \| `deposit_paid` \| `paid` \| `refunded` \| `pay_at_facility`
- `amount_due` / `amount_paid` as `numeric(10,2)`
- `stripe_checkout_session_id`, `stripe_payment_intent_id`
- Missing vs Launch plan: `payment_method`, `amount_*_cents`, `stripe_customer_id`, `stripe_charge_id`, `paid_at`, `refunded_at`, `payment_failure_message`, `booking_expires_at`, `confirmation_email_sent_at`

**Capacity helpers already exist**

- `dawg_session_booked_count(session_id)` — counts `pending` + `confirmed` + `attended`
- `dawg_try_create_booking(...)` — `FOR UPDATE` on session, capacity check, inserts booking as **`confirmed` always**, `amount_paid = 0`

No `stripe_events` or `payment_transactions` tables.

### Booking workflow (current)

1. Public form → `POST /api/bookings` (`app/api/bookings/route.ts`)
2. Zod validate via `bookingSchema` (`lib/bookings.ts`)
3. In-memory rate limit by IP + email
4. Upsert parent by email; create athlete
5. Call `dawg_try_create_booking` (atomic capacity)
6. Immediately send Resend confirmation + staff notification
7. Return confirmation number → `/book/[sessionId]/confirmation`

**Gaps vs Launch payment model**

- No payment method choice on the form
- No Stripe Checkout redirect
- Bookings are confirmed before any payment
- Email always says “pay at facility”
- Demo mode (no Supabase) creates a local confirmed booking

Waitlist: separate `POST /api/waitlist`.

### Supabase client helpers

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser client |
| `lib/supabase/server.ts` | Cookie client + `createServiceClient()` |
| `lib/supabase/middleware.ts` | Session refresh |
| `lib/supabase/tables.ts` | `DAWG_TABLES` name map |
| `middleware.ts` | Calls `updateSession` |

### Authentication and admin roles

- Invitation-only Supabase Auth (no public signup)
- Roles in `dawg_profiles`: `owner`, `admin`, `trainer`
- Helpers: `requireStaff` / `requireAdmin` / `requireOwner` + API variants (`lib/auth.ts`, `lib/roles.ts`)
- Demo mode: fake owner profile when Supabase unset

### Existing API routes

| Route | Purpose |
|-------|---------|
| `POST /api/bookings` | Public booking |
| `POST /api/waitlist` | Waitlist join |
| `POST/PATCH /api/admin/sessions` | Session create/update |
| `POST /api/admin/availability` | Private-slot generator |
| `PATCH /api/admin/settings` | Business settings |
| `POST /api/admin/reviews` | Reviews CMS |

No `/api/stripe/*` or checkout routes.

### Session availability logic

- Public spots: `lib/data.ts` uses booked counts vs `capacity`
- Admin recurrence: `lib/sessions.ts` + session form
- Private lessons: `/admin/availability` generates published sessions
- Atomic reserve: `dawg_try_create_booking` (must be extended for pending Stripe holds + expiry)

### Email confirmation logic

`lib/email.ts` (Resend):

- `sendBookingConfirmation` — parent; hardcodes pay-at-facility wording
- `sendStaffBookingNotification` — staff
- `sendWaitlistConfirmation` — waitlist

Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STAFF_NOTIFICATION_EMAIL`  
No `confirmation_email_sent_at` → webhook retries would risk duplicates once Stripe is added.

### Environment variables (current `.env.example`)

```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
STAFF_NOTIFICATION_EMAIL
# STRIPE_* stubs commented out
```

Plan’s `NEXT_PUBLIC_APP_URL` / `DAWG_NOTIFICATION_EMAIL` / `EMAIL_FROM_ADDRESS` should map onto existing names or be aliases.

### Deployment configuration

- No `vercel.json`
- `next.config.ts`: image SVG policy + service-worker cache headers
- PWA: `app/manifest.ts`, `components/pwa-register.tsx`
- Site credit / brand constants in `lib/constants.ts`

### Non-billing Launch gaps (for context)

| Feature | Status |
|---------|--------|
| Photo gallery | Stub UI; assets under `public/images/dawg/gallery/` |
| Contact form | Contact page is info + map only |
| Attendance UI | Statuses in booking `status` enum; roster has no mark-attended actions |
| Admin payment update | Display only |
| Reminder emails | Not present |

---

## 2. Signal Works billing module audit

**Package:** `@signalworks/billing`  
**Path:** `signalworks-platform/billing/`  
**Purpose:** DB-authoritative **product catalog**, Stripe Price sync, catalog Checkout, webhook ledger, admin product/ledger UI.

### Module inventory

| Area | Files | Notes |
|------|-------|-------|
| Stripe server client | `src/stripe-client.ts` | `getStripe()`, `isStripeConfigured()` via `STRIPE_SECRET_KEY` |
| Stripe browser client | **None** | Checkout uses hosted redirect; publishable key unused in module |
| Checkout | `src/checkout.ts` | `createProductCheckout` — requires catalog product + `currentStripePriceId` + logged-in `userId` |
| Webhooks | `src/webhooks.ts` | Signature verify + event handlers |
| Portal | `src/portal.ts` | Customer billing portal (subscriptions) |
| Catalog / admin products | `catalog.ts`, `products-admin.ts`, `product-lifecycle.ts` | Stripe Product/Price sync |
| Refund **create** API | **Missing** | Only `charge.refunded` webhook sync into `refunds` |
| Config / context | `config.ts`, `context.ts` | Table name overrides + `BillingHooks` |
| Types | `src/types.ts` | Catalog product types |
| Validation | Zod in route stubs only | No shared booking payment schemas |
| Admin UI | `src/admin/*` | ProductsManager, Payments/Subscriptions/Invoices/Refunds tables, labels, utils |
| Route templates | `src/routes/stripe-*.ts`, `admin-products*.ts` | Copy into host app; stubs throw for auth |
| Migrations | `supabase/migrations/001–003` | `products`, `product_prices`, ledger tables |
| Peer deps | `stripe`, `@supabase/supabase-js`, `react`, `zod` | |

### Checkout model (module)

```
productSlug → load products row → Stripe Price ID → Checkout Session
metadata: user_id, product_id, product_slug
```

Uses **Stripe Price objects**, not `price_data` line items.  
Assumes authenticated storefront user with `profiles.stripe_customer_id`.

### Webhook events handled

- `checkout.session.completed` / `expired`
- `customer.subscription.*`
- `invoice.paid` / `invoice.payment_failed`
- `payment_intent.succeeded` / `payment_failed`
- `charge.refunded`

**Not present:** event idempotency table (`stripe_events`), amount verification against a booking row, booking confirmation / email hooks.

### Admin UI reality check

Reusable as **presentation + API client pattern**:

- `PaymentsTable`, `RefundsTable`, `formatMoney`, `ProductStatusBadge`, label factory, `BillingAdminProvider`

**Not a drop-in for DAWG booking billing:**

- Ledger rows keyed by `userId` (auth user), not parent/athlete/booking
- No payment-status badge component dedicated to booking statuses
- No refund dialog / “create refund” control — tables are read-only lists
- ProductsManager / Subscriptions / Invoices / BillingPortal are Growth/MA5 features

### Explicit architecture note (from module docs)

`docs/ARCHITECTURE.md` states **session/class checkout (non-catalog pricing) stays in the host app**.

That matches DAWG: per-session `price` + guest parent booking, not a product catalog.

---

## 3. Integration decisions (audit conclusions)

### 1. Files that can be copied / reused directly

| Source | Reuse as |
|--------|----------|
| `stripe-client.ts` | DAWG `lib/billing/stripe/server.ts` (or dependency import) |
| `verifyAndHandleStripeWebhook` signature pattern | Adapt; keep `constructEvent` + raw body |
| `src/routes/stripe-webhook.ts` | Template for `app/api/stripe/webhook/route.ts` |
| Admin utils: `formatMoney`, `formatDate`, `cn` | Booking billing UI |
| Admin label / provider patterns | Wire DAWG ledger API shapes |
| Env var names | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Webhook refund sync logic (shape) | Map onto DAWG booking + transactions |

If DAWG can depend on the package via local path / workspace:

```json
"@signalworks/billing": "file:../signalworks-platform/billing"
```

Otherwise copy the thin Stripe client + webhook verify helpers into `lib/billing/` with attribution comment.

### 2. Files that need DAWG-specific adapters

| Capability | Why adapter needed |
|------------|-------------------|
| Checkout creation | Module requires catalog Price ID + auth user; DAWG needs **dynamic `price_data`**, guest email, `bookingId` metadata |
| Webhook completion | Module writes `payments`/`checkout_sessions` by `user_id`/`product_id`; DAWG must confirm **`dawg_bookings`**, send email once, release capacity on expire |
| Admin payments table | Needs booking-centric columns (guardian, athlete, session, payment_method) |
| Refunds | Module does not **issue** refunds — DAWG must add `stripe.refunds.create` + admin dialog |
| Config URLs | Success/cancel must be `/booking/success` and `/booking/cancelled` (or equivalent) |
| Table names | Prefer extending `dawg_*` booking model over importing full catalog ledger |

**Recommended adapter interface (host-owned):**

```ts
interface BookingPaymentAdapter {
  getBookingForPayment(bookingId: string): Promise<BookingPaymentRecord>;
  markBookingPaid(input: MarkBookingPaidInput): Promise<void>;
  markBookingFailed(input: MarkBookingFailedInput): Promise<void>;
  markBookingRefunded(input: MarkBookingRefundedInput): Promise<void>;
  markBookingCheckoutExpired(input: { bookingId: string }): Promise<void>;
}
```

### 3. Database changes required

**Normalize / migrate (do not blindly duplicate):**

1. Align `payment_requirement` enums with Launch model  
   Current: `full_at_booking` \| `deposit_at_booking` \| `pay_at_facility`  
   Target: `pay_online` \| `pay_at_facility` \| `online_or_facility`  
   (Map `full_at_booking` → `pay_online`; decide whether to keep deposit for later.)

2. Prefer **cents integers** going forward (`price_cents`, `amount_due_cents`, …) with a migration from existing `numeric` dollars, **or** keep dollars and adapt the app — plan prefers cents; pick one and update TypeScript types.

3. Extend `dawg_bookings` with:  
   `payment_method`, expanded `payment_status`, Stripe IDs, amounts in cents (or migrated), `paid_at`, `refunded_at`, `payment_failure_message`, `booking_expires_at`, `confirmation_email_sent_at`.

4. Add `dawg_stripe_events` (idempotency) and optionally `dawg_payment_transactions`.

5. Update `dawg_try_create_booking` (or replace with `dawg_reserve_session_spot`) to:
   - Accept booking status `pending` vs `confirmed`
   - Set `booking_expires_at` for Stripe holds
   - Ignore expired pending in capacity counts
   - Not auto-confirm Stripe bookings

6. **Separate attendance from booking status** (Launch Phase 11): today `attended` / `no_show` live on `dawg_bookings.status`. Prefer `attendance_status` column so payment/booking status stay independent.

7. RLS: public must not read payment columns; staff/service role only.

**Do not require for Launch:** full `@signalworks/billing` catalog tables (`products`, `subscriptions`, `invoices`) unless we deliberately want a parallel ledger. Prefer booking-centric tables.

### 4. Environment variables required

| Variable | Used by |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` (or alias `NEXT_PUBLIC_APP_URL`) | Checkout success/cancel URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing |
| `SUPABASE_SERVICE_ROLE_KEY` | Bookings + webhooks |
| `STRIPE_SECRET_KEY` | Server Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional client (Checkout redirect may not need it) |
| `STRIPE_WEBHOOK_SECRET` | Webhook verify |
| `RESEND_API_KEY` | Existing |
| `RESEND_FROM_EMAIL` | Existing (maps to plan’s `EMAIL_FROM_ADDRESS`) |
| `STAFF_NOTIFICATION_EMAIL` | Existing (maps to plan’s `DAWG_NOTIFICATION_EMAIL`) |

Add `stripe` npm dependency to DAWG.

### 5. Features in the billing module not needed for DAWG Launch

- Product catalog admin (`ProductsManager`, Stripe Product/Price sync)
- Subscriptions + invoices tables/UI
- Customer Billing Portal
- Membership / session-credit hooks
- Authenticated storefront checkout by `productSlug`
- Per-user `profiles.stripe_customer_id` as primary identity (parents are not auth users)
- MA5 “Offerings” labels / admin product routes

### 6. MA5-specific assumptions to remove / avoid

| Assumption | DAWG reality |
|------------|--------------|
| Logged-in member buys a catalog product | Guest parent books a session |
| `user_id` + `product_id` metadata | `bookingId`, `sessionId`, `athleteId`, `business: "dawg"` |
| Stripe Price ID required | Use Checkout `price_data` from session `price` / `price_cents` |
| Membership activation hooks | N/A |
| Table examples `ma5_*` in README | Use `dawg_*` only |
| Success URL `/app/billing` or `/billing` | `/booking/success` |
| RLS `billing_is_staff()` | Reuse `dawg_is_staff()` / `dawg_is_admin()` |
| Dollars vs cents inconsistency risk | Normalize in migration + types |
| Attendance encoded in booking status | Split for Launch attendance UI |

---

## 4. Recommended integration approach

### Do not

- Mount full `@signalworks/billing` catalog checkout as DAWG’s booking path.
- Copy MA5 membership webhook side effects.
- Delay Launch to adopt the entire product ledger schema.

### Do

1. **Reuse** Stripe client + webhook signature verification + refund-sync patterns from `@signalworks/billing`.
2. **Implement in DAWG** (`lib/billing/` + booking adapter):
   - Session Checkout with `mode: "payment"` + `price_data`
   - Webhook handlers that update `dawg_bookings` and send emails once
   - Admin booking billing panel (filters, mark facility paid, full refund)
3. **Optionally** install package as `file:` dependency for shared primitives; keep booking domain logic in DAWG.
4. Extend existing `dawg_try_create_booking` rather than inventing a parallel capacity system.
5. Finish non-Stripe Launch items in parallel: gallery, contact form, attendance column/UI.

### Effort split (rough)

| Workstream | Fit |
|------------|-----|
| Schema + reserve function | Medium — enum/cents migration careful |
| Stripe Checkout + webhook + success/cancel | Medium-High — new path; module helps ~30% |
| Admin billing on bookings | Medium — build booking UI; reuse formatters |
| Refund create | Small-Medium — not in module today |
| Gallery + contact + attendance | Small-Medium each — independent of Stripe |

---

## 5. Gap summary vs Launch plan

| Launch requirement | DAWG today | Billing module |
|--------------------|------------|----------------|
| Pay at facility | Yes (default path) | N/A |
| Pay online (Stripe Checkout) | No | Catalog-only Checkout |
| Webhook confirm booking | No | Ledger by user/product |
| Pending hold + expiry | No | Checkout session `expired` only |
| Atomic capacity | Yes (needs pending/expiry update) | N/A |
| Admin mark facility paid | No | N/A |
| Admin Stripe refund | No | Sync only, no create |
| Payment status on bookings list | Partial display | User-centric PaymentsTable |
| Confirmation email after pay | Emails on create today | N/A |
| Gallery / contact / attendance | Incomplete | N/A |

---

## 6. Phase 1 verdict

DAWG is a strong Launch base for marketing + scheduling + pay-at-facility.  
`@signalworks/billing` is the right **Stripe primitives and catalog platform** package, but it is **not** a session-booking payment engine.

**Integration strategy:** extract/reuse Stripe client + webhook verification (+ optional admin table chrome); implement a **DAWG booking payment adapter** with dynamic Checkout line items and booking-centric schema/webhooks. Do not force the MA5 product catalog onto DAWG for Launch.

**Ready for Phase 2+** once this audit is accepted: payment model enum alignment, migration design, then checkout/webhook implementation.

---

## 7. Phase 2–4 implementation status (2026-07-19)

### Delivered

- Migration: `supabase/migrations/002_payment_model.sql` (not yet applied to remote — no Supabase CLI in this environment)
- Types + cents formatting across public/admin UI
- `lib/billing/*` adapter, Checkout scaffold (`createBookingCheckout` + `price_data`), webhook verify route stub
- Extended `dawg_try_create_booking` (holds, payment method, confirmation token)
- Admin bookings table chrome + `PaymentStatusBadge`
- `stripe` npm dependency; `.env.example` updated
- `tsc --noEmit` and `next build` succeed

### Conflicts / decisions to acknowledge before Checkout + webhook wiring

1. **Stripe Checkout `expires_at` vs 15-minute hold** — Stripe requires Checkout session expiry ≥ 30 minutes. DAWG keeps a **15-minute** `booking_expires_at` hold and does **not** set Stripe `expires_at` unless the remaining window is ≥ 30 minutes. Capacity release relies on DAWG expiry + `checkout.session.expired` / cleanup, not Stripe’s 30-minute minimum.
2. **`deposit_at_booking` → `online_or_facility`** — Legacy deposit requirement has no Launch equivalent; migrated to choice of online or facility (full amount). Deposit amount columns remain for later.
3. **RPC signature break** — `dawg_try_create_booking` parameters changed (`p_amount_due_cents`, `p_payment_method`, etc.). Deploy app and migration together.
4. **Nested Supabase select in adapter** — `getBookingForCheckout` uses relation embeds (`session:dawg_sessions`, …). If PostgREST rejects ambiguous FKs, switch to explicit FK hints after migration is live.
5. **Migration not applied here** — Run `002_payment_model.sql` on the Dugout Intel project before testing live booking/Stripe paths. Demo mode still works without Supabase.
6. **Webhook handlers not wired** — Route verifies signatures only; adapter `claimStripeEvent` / `confirmPaidBooking` ready for Phase 5+.
7. **Public booking still defaults to pay-at-facility** — `paymentMethod` accepted on API; Checkout redirect UI not wired yet.
