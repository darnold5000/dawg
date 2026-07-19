# DAWG Launch status

Signal Works **$49/month Launch** package for DAWGZ Youth Training.

## Completed Launch features

### Public website
- Modern responsive marketing site (Home, Schedule, About, Contact, policies)
- Photo gallery with Next/Image + lightbox (brand gallery SVGs)
- Reviews section (CMS via admin)
- Contact form (validation, honeypot, rate limit, Resend)
- Google Maps embed + Facebook / social links
- SEO basics (metadata, sitemap, robots, JSON-LD)
- Homepage announcement bar (admin settings)
- PWA install path

### Scheduling
- Online schedule with filters
- Group class registration
- Private lesson booking + admin availability generator
- Remaining spots displayed
- Waitlist when full
- Recurring session creation

### Payments
- Stripe Checkout (guest, dynamic `price_data`)
- Pay at facility
- Session payment modes: online / facility / either
- 15-minute pending holds + capacity protection
- Webhook confirm / expire / fail / refund sync
- Idempotent `dawg_stripe_events`
- One-shot confirmation emails
- Success + cancelled pages with secure token lookup
- Abandoned hold cleanup cron

### Admin
- Today’s schedule dashboard
- Session create / edit / cancel
- Bookings list + billing detail panel
- Mark facility paid/unpaid
- Full Stripe refund
- Transaction history
- Roster attendance (Registered / Attended / No show / Cancelled)
- Reviews CMS + business settings

### Platform services (offered with Launch)
- Hosting / DB hosting pattern documented
- Security updates & backups via hosting providers
- Support for small site edits (service, not code)

## Remaining owner content required

These are content/ops items, not missing product features:

| Item | Notes |
| --- | --- |
| Approved JPG/PNG photos | Replace gallery/program/trainer SVG placeholders with real DAWGZ photos |
| Final logo file | Prefer raster logo in `public/images/dawg/` |
| Real business phone / email / address | Confirm in admin settings + env notification email |
| Published schedule | Create live sessions (or approve seeded ones) |
| Session prices & payment modes | Set `price_cents` + `payment_requirement` per session |
| Parent reviews | Publish via Admin → Reviews (or import from Facebook) |
| Legal waiver language | Booking checkbox is acknowledgement only — attorney-approved text still needed |
| Stripe live account | DAWG-owned Stripe; verify business, bank, webhook, statement descriptor |
| Resend domain | Verify sending domain for production From address |
| Cron schedule | Wire `/api/cron/expire-holds` on Vercel Cron or similar |

## Growth package ideas (not implemented)

Keep for upsell — do not build for Launch:

- Parent portal / accounts
- Athlete progress tracking
- Membership billing & packages (10-packs)
- AI chatbot
- SMS / text reminders
- Native mobile apps (beyond PWA)
- Staff invite UI / advanced coach tools
- Analytics / revenue reports beyond basic metrics
- Multiple locations
- Automated waitlist promotion
- Marketing email campaigns
- Promo codes / saved cards / customer portal

## Engineering notes

- Money is integer cents throughout
- Booking status ≠ attendance status ≠ payment status
- Online confirmation emails only after verified Stripe success
- Capacity ignores expired pending holds
