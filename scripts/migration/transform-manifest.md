# Dugout → Pro transform manifest

**Target tenant:** `TRAINING_TENANT_ID` (slug `dawg-youth-training` on Pro).

## Column renames (vertical tables)

| Dugout | Pro |
|--------|-----|
| `dawg_parents` | `training_guardians` |
| `parent_id` on athletes, bookings, purchases, … | `guardian_id` |
| `dawg_profiles` | `training_staff_profiles` + `tenant_memberships` |
| `dawg_trainers` | `training_coaches` |
| `dawg_business_settings` (singleton) | `training_tenant_settings` (`tenant_id` = deployment tenant) |

## Preserve

- UUIDs for guardians, athletes, bookings, sessions where FK graph allows.
- Stripe IDs (`stripe_checkout_session_id`, `stripe_payment_intent_id`, …).
- `confirmation_token` on bookings.

## Storage

- `trainer-photos` bucket paths → `training-coach-photos/{tenant_id}/coaches/...`

## Not in automated export yet

Programs, session types, sessions, packages catalog, reviews, waitlist, intake, device families, login tokens — add to export SQL after inventory classifies volume.

## Import order (FK-safe)

1. Staff profiles + memberships (manual / invite script)
2. Coaches, programs, session types, sessions, packages
3. Guardians, athletes
4. Package purchases, bookings, redemptions, adjustments
5. Intake, reviews, waitlist, device families, tokens
6. Stripe events (optional; may skip and rely on Stripe replay in test)
