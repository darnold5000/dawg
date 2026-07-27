# Auth recovery (Supabase + browser session bootstrap)

Portable helpers for **password reset** and other Supabase Auth email links:

- Parse URL hash / `code` / `token_hash` on the client
- Build recovery redirect URLs (callback + `next` or direct reset page)
- `generateLink` recovery wrapper (`AuthLinkService`)
- Safe forgot-password delivery orchestration (inject email sender)

**No React.** **No client branding.** Pair with the `email` module for Resend.

## Environment variables

Consumed by the **client app**, not this package:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only `generateLink` |
| `NEXT_PUBLIC_SITE_URL` | Redirect URL origin |

## Installation

1. Add a TypeScript path alias to `src/index.ts` (or copy `src/` into the app).
2. On the reset page, call `establishSessionFromAuthRedirect(supabase)` in `useEffect`.
3. On forgot-password API route, use `createAuthLinkService(admin)` + `deliverPasswordResetRequest`.

## Public API

See `src/index.ts`.

## Testing

```bash
cd signalworks-modules/auth-recovery && npx vitest run
```

## Reference apps

- **MA5** — `/auth/callback` + `/auth/reset-password`
- **DAWG** — direct `/admin/reset-password`
