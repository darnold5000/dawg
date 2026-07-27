# DAWG production cutover — risk register

**Branch:** `feature/dawg-production-multitenant`  
**Date:** 2026-07-27

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | **Shared Auth** — same `auth.users` pool as MA5 and SW portal | High | No global auth triggers writing to `yt_*` or `ma5_*`; staff invites set `tenant_memberships` only for DAWG tenant; document Supabase redirect URLs for both apps |
| R2 | **Global auth trigger** (if MA5 hobby trigger still on Pro) | Critical | Confirm Pro has `ma5_on_auth_user_created` **dropped** (MA5 migration 036+); never add DAWG equivalent without metadata gate |
| R3 | **Cross-tenant RLS leakage** on new `yt_*` tables | Critical | Every table `tenant_id NOT NULL`; policies use `is_tenant_member(tenant_id)`; cross-tenant integration tests with two `yt_` tenants |
| R4 | **Service-role queries without `tenant_id`** | Critical | `requireYouthDeploymentContext()`; code review grep; lint rule / test that fails unscoped `.from()` in service paths |
| R5 | **RPCs trust session_id only** | High | All RPCs take `p_tenant_id`; validate child rows match tenant |
| R6 | **`dawg_expire_stale_pending_bookings` global** | High | Replace with tenant-scoped RPC; cron iterates tenants or single-tenant deploy env per DAWG Vercel project |
| R7 | **Stripe webhook idempotency** | High | Unique `(tenant_id, stripe_event_id)`; optional `STRIPE_ACCOUNT_ID` metadata check; replay tests |
| R8 | **Duplicate Stripe events across tenants** | Medium | Unlikely across separate Connect accounts; still scope dedup table by tenant |
| R9 | **Storage path collision** | Medium | Prefix paths with `tenant_id`; update `admin-trainers` upload/list |
| R10 | **Redirect URL conflicts** | Medium | Add `https://dawgz…` and production domain to Pro Auth allow list without removing MA5 URLs |
| R11 | **Family magic link token leakage** | High | Keep hashed tokens; short TTL; single use; scope token lookup by tenant; HTTPS only |
| R12 | **Parent/athlete PII migration** | High | Encrypted transit; dry-run on copy; validate counts; rollback = keep hobby URL live |
| R13 | **Booking + package FK integrity** | High | Migrate in order: guardians → athletes → sessions → bookings → purchases → redemptions |
| R14 | **Stripe IDs point to wrong mode** | High | Document test vs live; do not import test PaymentIntents into live webhook handler |
| R15 | **Trainer photos** | Medium | Storage migration script; update `photo_url` columns |
| R16 | **Slug uniqueness** | Medium | Change global unique on `dawg_packages.slug` to `(tenant_id, slug)` on vertical tables |
| R17 | **Rollback** | High | Keep `main` + hobby env; feature branch only; revert Pro env switch if cutover fails |
| R18 | **Cron on wrong DB** | Medium | Point cron only after cutover; dual cron during parallel run risks double-expire—avoid |
| R19 | **Operator merges feature branch early** | High | Process: test branch deploy preview only; merge only when replacing legacy |
| R20 | **MA5 accidental coupling** | Low | Grep CI: no `ma5_` in DAWG |

**Rollback requirements**

1. Revert Vercel env to Dugout Supabase URL/keys (operator—out of scope for agent).
2. Hobby `dawg_*` unchanged—immediate app recovery.
3. Pro `yt_*` rows may remain orphan until cleanup script—document retention.
