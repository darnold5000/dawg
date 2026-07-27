# DAWG → Signal Works Pro (training vertical)

Forward-only migrations for the **training_*** tenant-aware vertical on the shared Pro Supabase project.

| Path | Purpose |
|------|---------|
| `supabase/migrations/` (repo root) | **Legacy hobby/Dugout** — do not apply to Pro |
| `supabase-signalworks/migrations/` | **Pro training vertical** — apply only with operator approval |

**Prerequisites on destination:** `signalworks-platform/core` (`tenants`, `tenant_memberships`, …).

**Deployment env (feature branch / preview only):** `TRAINING_TENANT_ID` (UUID from `001` registration).

Do **not** apply to live Pro without explicit operator approval.
