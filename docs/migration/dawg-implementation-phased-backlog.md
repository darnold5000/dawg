# DAWG production multitenant — phased implementation backlog (Phase 2)

**Status:** Plan only — **blocked until operator approves** audit + this backlog  
**Branch:** `feature/dawg-production-multitenant`  
**Prerequisites:** Signal Works Pro already has `signalworks-platform/core` + MA5 migrations applied (shared `tenants` table exists)

---

## Phase A — Platform registration (DB + env docs)

1. Add migration `001_yt_tenant_registration.sql` (idempotent insert `tenants` slug `dawg-youth-training`, `platform_category = services`).
2. Document `YOUTH_TENANT_ID` (or `DAWG_TENANT_ID`) in `.env.example` on **feature branch only**.
3. Add `lib/tenant/deployment.ts` mirroring MA5 pattern: `requireYouthTenantId()`, UUID validation, no client bundle import.

**Exit:** Tenant row exists on disposable Pro; env documented.

---

## Phase B — Youth vertical schema (forward-only migrations)

New directory: `dawg/supabase-signalworks/migrations/` (never modify `supabase/migrations/001-014`).

1. Create core tables with `tenant_id NOT NULL`, indexes on `(tenant_id, …)`, FKs tenant-safe.
2. Port RPC logic from `dawg_try_create_booking`, redeem, expire, merge with `p_tenant_id`.
3. RLS: enable on all `yt_*`; policies via platform membership helpers (align with MA5 `028`/`029` patterns where applicable).
4. Grants for `authenticated`, `service_role` explicit.

**Exit:** `supabase db reset` or push to disposable project succeeds; no app wired yet.

---

## Phase C — Application deployment context

1. Replace `DAWG_TABLES` with `YOUTH_TABLES` (or generated map).
2. Refactor **every** `createServiceClient()` query to `.eq('tenant_id', ctx.tenantId)` (or RPC with tenant param).
3. Staff auth: load role from `yt_staff_profiles` + verify `tenant_memberships`.
4. Keep family portal **non-Auth** but scope all token/parent lookups by tenant.

**Exit:** Grep shows no unscoped service-role table access; no `ma5_` references.

---

## Phase D — Storage & media

1. Tenant-prefixed paths in `admin-trainers.ts`.
2. Migration for bucket policies (public read optional per tenant path; staff write scoped).
3. Import script for existing `trainer-photos` objects.

---

## Phase E — Stripe & webhooks

1. `yt_stripe_events` with unique `(tenant_id, stripe_event_id)`.
2. Webhook handler: resolve tenant from deployment env; reject metadata tenant mismatch.
3. Package + session checkout metadata includes `tenant_id` for defense in depth.
4. Idempotency replay tests.

---

## Phase F — Auth redirects & staff lifecycle

1. Document Supabase redirect URLs for feature-branch preview host only (operator adds in dashboard).
2. Staff invite flow: create auth user + `tenant_memberships` + `yt_staff_profiles` (no `dawg_profiles` on Pro).
3. **No** `auth.users` trigger for automatic vertical profile creation.

---

## Phase G — Data migration (if hobby data is active)

1. `scripts/export-dugout-readonly.sql` — copy-friendly SELECTs (operator runs on hobby).
2. `scripts/import-yt-tenant.sql` — transform with fixed `YOUTH_TENANT_ID`.
3. Validation queries: row counts, orphan FKs, package balances, open pending bookings.
4. Optional: UUID preserve vs new UUIDs with mapping table.

**If data is disposable:** seed Pro from adapted `seed.sql` with tenant_id only.

---

## Phase H — Testing & validation

1. Unit/integration: booking create/cancel, package redeem, family portal token, staff 401 cross-tenant.
2. Cross-tenant test fixture: second tenant row + prove isolation.
3. `npm run lint`, `npm run build`, test script (add Vitest/playwright as needed).
4. Manual checklist from user brief (webhook replay, cron scope).

---

## Phase I — Runbooks (no execution)

1. `docs/migration/dawg-dry-run-cutover.md` — preview env, smoke tests, rollback.
2. `docs/migration/dawg-acceptance-test-plan.md`.

---

## Phase J — Operator cutover (manual only)

- [ ] Apply `supabase-signalworks` migrations on Pro
- [ ] Run data import or seed
- [ ] Create Vercel **preview** env vars pointing to Pro + `YOUTH_TENANT_ID`
- [ ] Stripe webhook endpoint for preview URL
- [ ] Verify; then later switch production env and retire Dugout connection
- [ ] Merge `feature/dawg-production-multitenant` → `main` when ready

**Explicitly out of scope for agent:** merge to `main`, production Vercel env, deploy, hobby DB DDL.

---

## Suggested migration numbering

| Range | Content |
|-------|---------|
| `001` | Tenant registration |
| `002` | `yt_staff_profiles`, coaches, programs, session types |
| `003` | Sessions, guardians, athletes, bookings, waitlist |
| `004` | Packages, purchases, redemptions, adjustments, intake |
| `005` | Stripe events, payment transactions, family tokens, device families |
| `006` | Reviews, settings, blocked times |
| `007` | RPCs |
| `008` | RLS policies |
| `009` | Storage policies |

---

## Approval checklist (operator)

- [ ] Accept `yt_` naming (or request rename before Phase B)
- [ ] Confirm hobby data: migrate vs reseed
- [ ] Confirm Pro Supabase project URL for disposable testing
- [ ] Authorize Phase B–H implementation on feature branch
