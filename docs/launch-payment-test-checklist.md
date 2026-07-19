# DAWG Launch payment test checklist

## Database

Verified against shared Dugout Intel project (`oshpxrqe…`) where DAWG intentionally uses `dawg_*` tables:

- `002_payment_model.sql` columns already present (`price_cents`, `attendance_status`, `booking_expires_at`, `dawg_stripe_events`, …)
- `dawg_try_create_booking` accepts new signature (`p_amount_due_cents`, `p_payment_method`, `p_hold_minutes`)
- `dawg_expire_stale_pending_bookings` callable

Do **not** re-run the full migration if those objects already exist (it is largely idempotent, but avoid unnecessary churn).

## Local / CI smoke

```bash
cd dawg
npx tsc --noEmit
npm run build
node scripts/payment-model-smoke.mjs
```

## Stripe test mode (requires `.env.local`)

Set:

- `STRIPE_SECRET_KEY` (test)
- `STRIPE_WEBHOOK_SECRET` (from `stripe listen` or Dashboard)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Supabase keys for the DAWG/`dawg_*` project
- `RESEND_API_KEY` (optional for email)

Forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Then:

1. Set a session `payment_requirement` to `online_or_facility` or `pay_online`
2. Book and pay with test card `4242…` → expect `/booking/success` confirmed + one email
3. Declined card `4000000000000002` → booking not confirmed / failed
4. Cancel Checkout → `/booking/cancelled`, retry while hold active, expire after 15 min
5. Replay same webhook event → `dawg_stripe_events` idempotent (`synced: false` / no duplicate email)
6. Fill class to capacity; second pending hold should fail with SESSION_FULL
7. Pay-at-facility booking → confirmed + unpaid; admin mark paid/unpaid
8. Full refund from admin booking detail → Stripe refund + `refunded` status

Cleanup job:

```bash
curl -X POST "http://localhost:3000/api/cron/expire-holds" \
  -H "Authorization: Bearer $CRON_SECRET"
```
