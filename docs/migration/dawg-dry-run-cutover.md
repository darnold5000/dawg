# DAWG Dugout → Pro training vertical (dry run)

**Branch:** `feature/dawg-production-multitenant`  
**Do not run against live Pro or change Vercel env without explicit approval.**

## Preconditions

1. Disposable Signal Works Pro project (or isolated schema) with migrations `001`–`007` applied from `dawg/supabase-signalworks/migrations/`.
2. `TRAINING_TENANT_ID` set to the UUID from `001_training_tenant_registration.sql` (`dawg-youth-training`).
3. Dugout inventory executed: `scripts/dugout-source-inventory.sql` — review counts; treat data as **migrate unless proven seed**.

## Environment (preview only)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pro project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pro anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Pro service role (server only) |
| `TRAINING_TENANT_ID` | Training vertical tenant UUID |

Stripe, Resend, and `CRON_SECRET` mirror production merchant config only on the approved preview deployment.

## Dry-run sequence

### 1. Inventory source (read-only)

```bash
psql "$DUGOUT_DATABASE_URL" -f scripts/dugout-source-inventory.sql
```

Save output with date. Classify tables as **must migrate**, **selective**, or **discard** (discard requires operator sign-off).

### 2. Export Dugout (`dawg_*`)

```bash
psql "$DUGOUT_DATABASE_URL" -f scripts/migration/export-dugout.sql -o /tmp/dawg-export.tsv
```

Exports are logical copies for transform — not applied directly to Pro.

### 3. Transform

Map `dawg_*` → `training_*`, add `tenant_id = TRAINING_TENANT_ID`, rename `parent_id` → `guardian_id` on vertical tables. See `scripts/migration/transform-manifest.md`.

### 4. Import to disposable Pro

Run generated SQL only against the **disposable** database. Never against production Pro until cutover approval.

### 5. Validate

```bash
psql "$PRO_DATABASE_URL" -f scripts/migration/validate-pro-training.sql
```

Compare row counts and checksums to inventory. Spot-check: staff login, public schedule, booking hold, Stripe webhook idempotency (`training_stripe_events` PK `(tenant_id, stripe_event_id)`).

### 6. Application smoke (preview URL)

- `npm run build` with Pro env + `TRAINING_TENANT_ID`
- Book session → checkout hold → webhook → confirmation email (test mode)
- Package purchase → credit redemption on attendance
- Cron: `POST /api/cron/expire-holds` with `CRON_SECRET`

## Rollback

- Preview: redeploy previous commit; leave disposable Pro data in place or drop schema.
- Live cutover (future): revert Vercel env to Dugout; do not delete Dugout until Pro validated.

## Automated checks

```bash
npm run test:training-tenant
npm run test:safeguards
```

Tenant wrapper tests assert `tenant_id` filters and RPC `p_tenant_id` injection — run after any change to `training-client-scope.ts`.

## Approval gates

| Gate | Owner |
|------|--------|
| Apply migrations to disposable Pro | Operator |
| Import Dugout data | Operator + inventory review |
| Point preview Vercel at Pro + `TRAINING_TENANT_ID` | Operator |
| Production cutover | Explicit separate approval |
