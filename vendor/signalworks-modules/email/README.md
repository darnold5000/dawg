# Email (Resend + tenant branding)

Transactional email for multi-tenant Signal Works apps. **Server-side only.** Templates stay separate from send logic; **no hardcoded from-addresses**.

## Features

- Pluggable `EmailProvider` (Resend implementation included)
- `TenantEmailSettings` for from name, reply-to, brand colors, footer links
- `formatFromAddress()` helper
- Optional `tenant_email_settings` table migration

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For Resend | API key from Resend dashboard |
| `TENANT_EMAIL_FROM` | Fallback | Used when DB settings row missing |
| `TENANT_EMAIL_FROM_NAME` | Optional | Display name for fallback |

Per-tenant rows in `tenant_email_settings` override env when `loadTenantEmailSettings()` is wired (see MA5 `tenant-email-settings.ts`).

## Installation

1. Apply `supabase/migrations/001_tenant_email_settings.sql` (or merge into client migration set).
2. Copy `src/` into the client (e.g. `src/lib/platform/email/`) or add as git subtree.
3. Implement `loadTenantEmailSettings(tenantId)` using your Supabase client.
4. Copy auth templates from MA5 `templates/auth-messages.ts` or author client-specific templates that accept `TenantEmailSettings`.

## Integration points

| Consumer | Responsibility |
|----------|----------------|
| Auth API routes | Generate Supabase links → `EmailService.send*` |
| Invite / coach flows | Same stack; never block DB commit on email failure |
| Webhooks | Do **not** send duplicate receipts—gate on ledger state (`stripe-core`) |

## Public API

```ts
import {
  createResendProvider,
  ResendProvider,
  formatFromAddress,
  type EmailProvider,
  type TenantEmailSettings,
  type EmailDeliveryResult,
} from "./index";
```

Full orchestration (auth links + delivery) lives in the client until extracted—see MA5 `auth-email-flows.ts`.

## Domain DNS (required for each Resend domain)

When you verify a domain in Resend, you must add **all** of the following in DNS for that domain (and again for every additional domain or subdomain you send from):

| Record | Who provides it | Notes |
|--------|-----------------|--------|
| SPF | Resend dashboard | Usually merged with existing SPF if one exists |
| DKIM | Resend dashboard | One or more CNAME/TXT records |
| **DMARC** | **You (DNS host)** | TXT at `_dmarc.<domain>` — not optional for production |

Resend verifies SPF/DKIM; **DMARC is not created automatically**. Add it for every domain you set up in Resend, or delivery and inbox placement can suffer and some receivers will flag mail.

Example monitoring policy:

```txt
_dmarc.example.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com"
```

Do not use a `RESEND_FROM_EMAIL` / tenant from-address on a domain until Resend shows **Verified** and DMARC is published.


```bash
cd signalworks-modules/email && npx vitest run
```

## Reference implementation

`MA5/src/lib/email/`
