# Signal Works modules (DAWG)

DAWG imports shared modules through thin barrels in `lib/signalworks/*.ts` (re-exports from `../signalworks-modules/`).

| Barrel | Module |
|--------|--------|
| `@/lib/signalworks/auth-recovery` | Recovery links, session bootstrap, forgot-password orchestration |
| `@/lib/signalworks/email` | `escapeHtml`, Resend from-address helpers, password-reset template |
| `@/lib/signalworks/toast` | `toastError` / `toastSuccess` durations |
| `@/lib/signalworks/forms` | Validation + injectable field groups (`lib/platform/form-field-bridge.tsx`) |

Source of truth: `../signalworks-modules/`. **Before build**, run `npm run prebuild` (or `bash scripts/sync-signalworks-modules.sh`) to refresh `vendor/signalworks-modules/`. Vercel runs `prebuild` automatically via `package.json`.

**Training vertical** (booking, rosters, package credits, intake) stays in DAWG until a second training client justifies `signalworks-training`.
