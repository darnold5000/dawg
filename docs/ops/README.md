# DAWG package credit ops (2026-10-28)

Snapshots for revert if a one-time backfill needs rolling back:

| File | Purpose |
|------|---------|
| `credit-balance-snapshot-2026-10-28.json` | Restore `sessions_remaining` per purchase |
| `credit-redemptions-snapshot-2026-10-28.json` | Four July 2026 redemptions — do not delete |
| `credit-backfill-bookings-snapshot-2026-10-28.json` | 16 attended bookings; backfill **15** (skip Brittany) |

After **Attended → redeem** is deployed:

1. Dry run: `npm run db:backfill-package-credits` (from `dawg/` with `.env.local` prod vars).
2. Apply: `APPLY=1 npm run db:backfill-package-credits`
3. Re-run audit SQL in `credit-backfill-bookings-query.sql` — expect no rows except Brittany.

Per-guardian alternative: Admin → client profile → **Apply credits for attended sessions** (if that button was removed, use the npm script only).
