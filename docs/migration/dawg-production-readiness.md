# DAWG production migration readiness

**Branch:** `feature/dawg-production-multitenant`  
**Purpose:** Single gate before disposable Pro testing, then before live cutover.  
**Related:** [Dry-run cutover](dawg-dry-run-cutover.md) · [Phased backlog](dawg-implementation-phased-backlog.md) · [Risk register](dawg-cutover-risk-register.md)

Update this file as each gate is satisfied. Do not apply migrations or change Vercel/Supabase production config until **Cutover** is explicitly approved.

---

## Architecture

- [x] `training_*` schema defined (`supabase-signalworks/migrations/001`–`008`)
- [x] `tenant_id` on every training vertical business table
- [x] RLS policies defined (`005_training_rls.sql`)
- [x] Staff table API grants + login RPCs (`008_training_staff_login_grants.sql`)
- [x] Deployment context (`TRAINING_TENANT_ID`, `lib/tenant/deployment.ts`)
- [ ] Migrations applied on **disposable** Pro project
- [ ] Migrations applied on **live** Pro project (cutover approval only)

## Application

- [x] Service-role access via `createTrainingServiceClient()` (tenant scope when env set)
- [x] Tenant scope unit tests (`npm run test:training-tenant`)
- [x] Storage paths tenant-aware (`training-coach-photos/{tenant_id}/…`)
- [x] RPCs receive `p_tenant_id` via scoped client
- [x] Guardian ↔ `parent_id` mapping helpers for app types
- [x] Stripe idempotency documented; `training_stripe_events` PK `(tenant_id, stripe_event_id)` + adapter columns (`007`)
- [ ] Staff auth verified on Pro (`POST /api/admin/login`, `training_staff_profiles` + migration `008` grants/RPCs; server-side login sets session cookies)
- [ ] End-to-end review of billing webhook + `claimStripeEvent` on disposable Pro

## Migration

- [x] Dugout inventory SQL (`scripts/dugout-source-inventory.sql`)
- [x] Export / transform manifest / validate scripts (`scripts/migration/`)
- [ ] Dugout inventory executed and signed off (migrate vs discard)
- [ ] Export complete
- [ ] Transform complete
- [ ] Import complete (disposable Pro only)
- [ ] Validation complete (`validate-pro-training.sql` + count reconciliation)

## Testing (disposable Pro + preview env)

- [ ] `TRAINING_TENANT_ID` set on preview only
- [ ] `npm run build` against Pro env
- [ ] Public schedule + session detail
- [ ] Booking flow (hold, Stripe checkout, confirmation)
- [ ] Package purchase + credit redemption on attendance
- [ ] Family portal + device remember + magic link
- [ ] Trainer photo upload
- [ ] Cron: expire stale pending bookings
- [ ] Cross-tenant isolation test (second tenant UUID, negative cases)

## Cutover (live — separate approval)

- [ ] Production migration approved
- [ ] Maintenance window communicated
- [ ] Rollback plan verified (revert env to Dugout; data retention documented)
- [ ] Stripe webhook endpoint / signing secret updated for Pro deployment
- [ ] Vercel env + production deploy approved
- [ ] DNS / domain unchanged or explicitly updated
- [ ] Post-cutover smoke on production URL

---

## Commit milestones (review order)

| Hash | Summary |
|------|---------|
| `740e49e` | Tenant-aware training schema foundation |
| `98dd0ef` | Application data access scoped by training tenant |
| `83bd574` | Migration inventory and runbooks (`training_*` naming) |
| `f2a3501` | Tenant validation, migration tooling, cutover runbook |

**Out of scope until checklist above:** merge to `main`, push, production deploy, live Supabase apply, production env changes.
