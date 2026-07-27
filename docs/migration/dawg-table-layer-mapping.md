# DAWG table → layer mapping

**Branch:** `feature/dawg-production-multitenant`  
**Working vertical prefix:** `yt_` (youth training module — not client-branded)  
**Status:** Proposed — confirm at implementation approval

| Current DAWG object | Target layer | Proposed object | Migration approach |
|---------------------|--------------|-----------------|----------------------|
| `dawg_profiles` | Platform + vertical | `tenant_memberships` + `yt_staff_profiles` (`tenant_id`, `user_id`, role) | Map staff auth users to memberships; migrate profile fields |
| `dawg_trainers` | Youth vertical | `yt_coaches` | Copy rows + `tenant_id`; optional link to staff profile |
| `dawg_programs` | Youth vertical | `yt_programs` | Copy + `tenant_id`; slug unique per tenant |
| `dawg_session_types` | Youth vertical | `yt_session_types` | Copy + `tenant_id` |
| `dawg_sessions` | Youth vertical | `yt_training_sessions` | Copy + `tenant_id`; FKs to vertical tables |
| `dawg_parents` | Youth vertical | `yt_guardians` | Copy PII + `tenant_id`; preserve UUIDs if possible for FK stability |
| `dawg_athletes` | Youth vertical | `yt_athletes` | Copy + `tenant_id` |
| `dawg_bookings` | Youth vertical | `yt_session_bookings` | Copy + `tenant_id`; preserve Stripe + token fields |
| `dawg_waitlist_entries` | Youth vertical | `yt_waitlist_entries` | Copy + `tenant_id` |
| `dawg_reviews` | Youth vertical | `yt_reviews` | Copy + `tenant_id` |
| `dawg_business_settings` | Youth vertical | `yt_tenant_settings` (1 row per tenant, not global id=1) | Transform singleton → `tenant_id` PK/unique |
| `dawg_blocked_times` | Youth vertical | `yt_blocked_times` | Copy + `tenant_id` |
| `dawg_stripe_events` | Youth vertical (or platform payments) | `yt_stripe_events` with `(tenant_id, stripe_event_id)` unique | **Prefer vertical** for DAWG session checkout isolation; evaluate merge with `signalworks-platform` billing later |
| `dawg_payment_transactions` | Youth vertical | `yt_payment_transactions` | Copy + `tenant_id` |
| `dawg_device_families` | Youth vertical | `yt_device_families` | Copy + `tenant_id`; rotate tokens optional |
| `dawg_packages` | Youth vertical | `yt_training_packages` | Copy catalog + `tenant_id`; slug unique per tenant |
| `dawg_package_purchases` | Youth vertical | `yt_package_purchases` | Copy + `tenant_id` |
| `dawg_package_redemptions` | Youth vertical | `yt_package_redemptions` | Copy + `tenant_id` |
| `dawg_package_credit_adjustments` | Youth vertical | `yt_package_credit_adjustments` | Copy + `tenant_id` |
| `dawg_intake_submissions` | Youth vertical | `yt_intake_submissions` | Copy + `tenant_id` |
| `dawg_family_login_tokens` | Youth vertical | `yt_family_login_tokens` | Copy + `tenant_id`; invalidate all on cutover optional |
| `dawg_session_booked_count` | Youth vertical | `yt_session_booked_count(tenant_id, session_id)` | Add tenant guard in function body |
| `dawg_try_create_booking` | Youth vertical | `yt_try_create_session_booking` | Require `p_tenant_id`; verify session belongs to tenant |
| `dawg_redeem_package_credit` | Youth vertical | `yt_redeem_package_credit` | Require tenant; scope purchase/booking |
| `dawg_expire_stale_pending_bookings` | Youth vertical | `yt_expire_stale_pending_bookings(p_tenant_id)` | Cron passes deployment tenant |
| `dawg_merge_parents` | Youth vertical | `yt_merge_guardians` | Tenant-scoped merge only |
| `dawg_is_staff/admin/owner` | Platform + vertical | `yt_is_staff(tenant_id)` using `tenant_memberships` + `yt_staff_profiles` | Replace prefix-only checks |
| Storage `trainer-photos` | Platform media convention | Bucket `tenant-media` or keep bucket with path `{tenant_id}/coaches/...` | Per ADR 0004; migrate objects |
| `tenants` row | Platform | `tenants` slug e.g. `dawg-youth-training` | Insert on Pro; env `YOUTH_TENANT_ID` |
| SW `documents` | Platform | As needed for SW↔DAWG contracts | Manual / portal—not athlete PII |
| Messaging module | Platform | Future—DAWG has email-only today | Not in scope v1 unless required |

**Hobby `dawg_*` on Dugout:** No drop, no alter—frozen legacy.

**MA5 `ma5_*`:** No reads/writes from DAWG app.
