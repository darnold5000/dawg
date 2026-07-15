# DAWGZ Youth Training

Modern marketing site and scheduling platform for DAWGZ Youth Training in Mooresville, Indiana.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, RLS) with `dawg_*` table prefixes
- Resend for booking emails
- Pay at facility now; Stripe hooks reserved for later

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase env vars the public site and admin UI run in **demo mode** using seeded fallback content (`[SAMPLE]` sessions). Bookings return a local confirmation number.

## Supabase setup

1. Use the shared Dugout Intel Supabase project (same pattern as Oak Tree).
2. Run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).
3. Run [`supabase/seed.sql`](supabase/seed.sql).
4. Create an Auth user in Supabase (invitation only — no public signup), **or** run `seed.sql` which creates:

   - Email: `hello@hiresignalworks.com`
   - Password: `1Password`

5. Insert a matching `dawg_profiles` row (seed does this automatically):

```sql
insert into public.dawg_profiles (id, full_name, email, role, active)
values ('<auth-user-uuid>', 'Owner Name', 'owner@email.com', 'owner', true);
```

6. Set env vars from `.env.example`.

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing homepage |
| `/schedule` | Public schedule + filters |
| `/book/[sessionId]` | Booking / waitlist |
| `/admin` | Staff dashboard |
| `/admin/sessions` | Session CRUD + recurrence |
| `/admin/sessions/[id]/roster` | Roster + CSV export |
| `/admin/availability` | Private-lesson slot generator |
| `/admin/settings` | Business contact CMS |

## Install on phone (PWA)

Parents can save the site to their home screen and open it like an app:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** Menu → **Install app** / **Add to Home screen**

Requires a live HTTPS deploy for the Android install prompt. Icons and manifest live under `public/icons/` and `app/manifest.ts`.

## Brand / assets

Placeholder images live in `public/images/dawg/`. Replace with approved DAWGZ logo and photos before launch. Business contact seeded from [facebook.com/DawgYouthTraining](https://www.facebook.com/DawgYouthTraining).

## Website credit

Footer includes **Website by Signal Works**.
