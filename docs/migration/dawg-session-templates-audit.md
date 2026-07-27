# DAWG session templates + calendar scheduling — audit

**Branch:** `feature/dawg-production-multitenant`  
**Updated:** 2026-07-27  
**Status:** **Phases 1–3 implemented in repo** (migration `013` — **not applied on Pro until reviewed**)  
**Admin workflow:** `docs/admin/session-templates.md`  
**Related:** `lib/sessions.ts`, `lib/session-templates.ts`, `lib/template-scheduling.ts`, `training_sessions`, `training_session_templates`

---

## Implementation summary (Phases 1–3)

| Item | Decision |
|------|----------|
| Migration | `013_training_session_templates.sql` (`012` reserved for coach bio) |
| Template table | `training_session_templates` with `default_trainer_id` → `training_coaches.id` (same as `sessions.trainer_id`; spec “coach user” = coach row) |
| Occurrence link | Nullable `training_sessions.template_id` |
| Recurrence series table | **Deferred** — reuse `recurrence_group_id` on materialized rows only |
| Snapshot | Schedule copies title, times, capacity, price, program, coach, description, payment into each `training_sessions` row; template edits do not update existing rows |
| Duplicate protection | Same tenant + program + date + start time (optional skip) |
| Admin calendar | **Phase 4 — not built** |
| Series edit/cancel | **Phase 5 — not built** |
| Dev seed | `scripts/seed-dawg-session-templates.sql` (not for production auto-run) |

### Model polish (post-review, same release)

| Item | Decision |
|------|----------|
| Template names | **Not unique** — duplicate labels allowed (e.g. multiple “Private Lesson”) |
| Program names | Canonical **Little Dawgs** / **Big Dawgs** (`014`) |
| Color | **`training_programs.calendar_color`** — templates inherit |
| Capacity / price | Nullable on template = **inherit from program** at schedule time |
| Visibility | `default_visibility` on program + optional template override; snapshotted to `training_sessions.visibility` |
| Coaches | `default_trainer_id` + `default_assistant_trainer_id` (UI for assistant reserved) |
| Admin UX | **Templates** then **Calendar** nav; **Add to calendar** (not “schedule template”) |
| Phase 4 calendar | **Still deferred** — `/admin/sessions` is interim calendar list |

---

## Pre-flight (required before coding)

| Check | Result |
|--------|--------|
| Active branch | `feature/dawg-production-multitenant` |
| Working tree clean | **No** — many modified/untracked files (login, grades, media, migrations 008–011, etc.) |
| Migrations applied on Pro | Operator-managed; do not apply new migrations in this task without approval |

**Recommendation:** Commit or stash unrelated work, then implement templates on a focused commit series.

---

## Executive summary

DAWG already has **dated session rows** (`training_sessions`) as the booking surface, **program catalog** (`training_programs`), **coaches**, **package-credit roster sessions**, **Stripe** for paid sessions, and **client-side recurrence** when creating sessions (`recurrence` + `recurrence_group_id`). There is **no** `training_session_templates` table and **no** admin calendar—only a **list** of sessions.

The safest path is **additive**:

1. Add `training_session_templates` (+ optional `training_session_recurrence_series`).
2. Add nullable `template_id` (and light override columns if missing) on `training_sessions`.
3. Refactor **creation/scheduling** to materialize rows from templates; keep **bookings → `session_id`** unchanged.
4. Extend existing `createSessionsFromForm` / recurrence logic rather than a parallel scheduler.

**Stop-condition review:** None block implementation if we avoid destructive changes and do not retro-edit booked occurrences when templates change.

---

## Current data model

### Tables (Pro / `training_*`)

| Table | Role |
|--------|------|
| `training_programs` | Little/Big Dawgs catalog, default duration/capacity/price |
| `training_session_types` | Group class, private lesson, etc. |
| `training_coaches` | Coach display + `trainer_id` on sessions |
| `training_sessions` | **Dated occurrence** — what public schedule and bookings use |
| `training_session_bookings` | `session_id` FK; capacity via counts; package credit + Stripe |
| `training_waitlist_entries` | Session-scoped |
| `training_packages` / purchases / redemptions | Credits; roster sessions identified by program slug |

### `training_sessions` (occurrence) today

Combines **definition + calendar row** in one record:

- Identity: `id`, `tenant_id`
- Catalog links: `program_id`, `session_type_id`, `trainer_id`
- Schedule: `session_date`, `start_time`, `end_time`, `timezone`
- Offering: `title`, `description`, `capacity`, `price_cents`, `payment_requirement`, ages, location, policies
- Lifecycle: `status`, `published_at`, `featured`
- Recurrence: `recurrence_group_id` (UUID shared by batch insert only — **not** a series metadata table)

There is **no** `template_id`, **no** `starts_at`/`ends_at` timestamptz (date + time columns only), **no** override columns.

### Programs vs “templates”

`training_programs` describes **product lines** (Little Dawgs, Big Dawgs), not **time slots** (4:00–5:00 Little Dawgs). Avery’s pain is re-entering **title, program, times, capacity, coach, description** for every date—not missing program entities.

---

## Recurrence (existing)

| Piece | Location | Behavior |
|--------|-----------|----------|
| Form UI | `components/admin/session-form.tsx` | `none` \| `weekly` \| `weekdays` \| `custom` + weeks 1–26 |
| Server | `lib/sessions.ts` `buildOccurrenceDates` + `createSessionsFromForm` | Inserts **N rows**; sets shared `recurrence_group_id` when N > 1 |
| Edit series | **Not implemented** | Edit route omits recurrence; single-session PATCH only |
| Cancel series | **Not implemented** | Per-session delete/status only |

`recurrence_group_id` is a **correlation id**, not FK to a recurrence definition. Safe to introduce `training_session_recurrence_series` and optionally backfill `series_id` alongside existing `recurrence_group_id` for compatibility.

---

## Admin UX (existing)

| Surface | Implementation |
|---------|----------------|
| Session list | `/admin/sessions` — cards, roster, edit, delete |
| Create | `/admin/sessions/new` + `SessionForm` — full form + recurrence |
| Edit | `/admin/sessions/[id]/edit` — no recurrence |
| Calendar | **None** in admin; public `/schedule` has list/calendar **grouped by date** only |
| Private slots | `components/admin/availability-tool.tsx` + `POST /api/admin/availability` → `generatePrivateSlots` |
| Programs / paid one-offs | `/admin/programs` + paid session variant |

Nav (`admin-shell.tsx`): Dashboard, Sessions, Bookings, Clients, Programs, Trainers, Reviews, Settings.

---

## Public booking (unchanged contract)

- Schedule: `getFilteredSessions` → `training_sessions` published, tenant via RLS + deployment client scope on writes.
- Book: `sessionId` → RPC / `lib/bookings.ts`; Little/Big = package credit (`isRosterCreditSession` by program slug).
- Stripe: session `price_cents` + `payment_requirement` on **occurrence row**.
- Emails: `ConfirmPayload` carries **session title, date, times, location** at send time (loaded from session + booking flow)—not stored as booking snapshot columns.

**Risk:** Editing a booked **session row** changes what admins/rosters show and what **re-sent** emails would show. Templates must **not** bulk-update existing `training_sessions` when edited. Optional future: booking snapshot columns (out of scope unless required).

---

## Code dependencies on `session_id` / session rows

High-touch paths (must keep stable IDs):

- `lib/bookings.ts`, `lib/billing/*`, webhooks, `training_try_create_session_booking` RPC
- `lib/email.ts`, `lib/calendar.ts`
- Admin roster, attendance API, clients merge
- `lib/data.ts` public schedule + capacity enrichment
- Package redemption tied to session program

Grep: service-role reads/writes use `DAWG_TABLES.sessions` + `createTrainingServiceClient()` tenant proxy (`lib/supabase/training-client-scope.ts`).

---

## Tenant isolation (existing)

- All `training_*` business tables: `tenant_id NOT NULL`.
- RLS in `005_training_rls.sql`; staff helpers `training_is_*`.
- App: `TRAINING_TENANT_ID` + `createTrainingServiceClient()` injects tenant on `from()` / `p_tenant_id` RPCs.
- **Gap:** Some tables may still need explicit `GRANT`s (see migration `008` pattern for staff profiles). New template tables need **RLS + GRANTs in same migration**.

Tests: `npm run test:training-tenant` — extend for template table proxy behavior.

---

## Gap analysis vs target product

| Requirement | Today | Proposed |
|-------------|--------|----------|
| Reusable class definition | Duplicated per `training_sessions` row | `training_session_templates` |
| Schedule once, many dates | Recurrence on create only | “Schedule template” + series table |
| Admin calendar | List only | Add calendar view (reuse public date grouping or lightweight month grid) |
| Edit template vs occurrence | N/A | Template updates defaults only; occurrence PATCH unchanged |
| Edit this / future in series | Missing | `series_id` + `occurrence_index` or date cutoff updates |
| Archive template | N/A | `active` / `archived_at`; block schedule if archived |
| Duplicate detection | None | Unique `(tenant_id, template_id, session_date, start_time)` optional + confirm |
| DAWG default templates | SQL seeds in `seed_weekly_schedule.sql` | Optional **non-production** seed script / admin “setup defaults” action |
| 6:30 school / Saturday window | Manual / availability tool | Same materialization; templates optional |

---

## Recommended target schema (migration `012+`, not applied)

### `training_session_templates`

Align with existing naming (`program_id` not `program_type`):

- `id`, `tenant_id`
- `name` (e.g. “Little Dawgs — 4:00 PM”)
- `program_id` → `training_programs`
- `session_type_id`, `trainer_id` (coach)
- `description`, `title` (or derive title from name + program)
- `default_start_time`, `default_end_time` (time)
- `default_capacity`, `default_price_cents`, `payment_requirement`
- `color` (optional UI)
- `active` (archive = `active false`)
- timestamps  
- `unique (tenant_id, name)` optional

FK: `(tenant_id, program_id)` tenant-safe check via RLS, not composite FK unless added.

### `training_session_recurrence_series` (lightweight)

- `id`, `tenant_id`, `template_id`
- `start_date`, `end_date`, `days_of_week` (int[] or bitmask)
- `start_time`, `duration_minutes` (or end_time)
- `timezone`, `active`
- Override fields: `trainer_id`, `capacity`, `price_cents`, `notes`
- timestamps

### `training_sessions` (alter)

Add nullable:

- `template_id` → templates
- `recurrence_series_id` → series (keep `recurrence_group_id` for legacy batches)
- Optional: `capacity_override`, `price_override_cents`, `trainer_override_id`, `schedule_notes`

**Do not remove** `session_date`, `start_time`, `end_time`, or pricing columns.

### Materialization rules

On schedule:

1. Load template (service client, tenant scoped).
2. Build occurrence list (reuse `buildOccurrenceDates` logic).
3. Insert rows with **snapshot** of title, capacity, price, program, trainer, times from template + overrides.
4. Set `template_id` + `recurrence_series_id`.

On template edit:

- Update template row only.
- Optionally offer “apply to future unpublished occurrences” as **explicit** admin action (v2).

---

## Compatibility strategy

1. **Legacy sessions:** `template_id IS NULL` — fully supported forever.
2. **Bookings:** No migration; `session_id` unchanged.
3. **Backfill script (optional, separate SQL):** Group existing sessions by `(program_id, start_time, end_time, title)` per tenant; create templates; set `template_id` only where confidence is high. **Do not** run automatically on production.
4. **Creation flows:** New UI uses templates; keep “legacy” one-off form behind “Custom session (no template)” until deprecated.

---

## Implementation phases (after approval)

### Phase 1 — Schema + types (no UI)

- `012_training_session_templates.sql` — tables, RLS, grants, FK checks
- Types in `lib/types/database.ts`
- `lib/session-templates.ts` — CRUD via `createTrainingServiceClient()`
- Extend `test:training-tenant` for template `from()` scoping

### Phase 2 — Schedule from template

- `scheduleTemplateOccurrences()` in `lib/sessions.ts` (or sibling module)
- API: `POST /api/admin/session-templates/[id]/schedule`
- Preview count endpoint
- Duplicate detection

### Phase 3 — Admin UI

- `/admin/session-templates` — list, create, edit, duplicate, archive, “Add to calendar”
- Reuse `SessionForm` field groups / `form-panel` styles
- Dialog for one-time vs repeat (mirror existing recurrence options)

### Phase 4 — Calendar

- `/admin/sessions/calendar` or toggle on sessions index
- Show **occurrences**; click → roster / edit
- Empty slot → pick template

### Phase 5 — Series edit/cancel

- `this` / `this and future` for status and field updates
- Warnings when `booked_count > 0`

### Phase 6 — Docs + seeds

- `docs/migration/dawg-session-templates-runbook.md`
- `scripts/seed-dawg-session-templates.sql` (dev only, four default templates)

---

## DAWG default templates (dev seed content)

| Name | Program slug | Time | Duration |
|------|----------------|------|----------|
| Little Dawgs — 4:00 PM | `little-dawgs` | 16:00–17:00 | 60 min |
| Big Dawgs — 5:00 PM | `big-dawgs` | 17:00–18:00 | 60 min |
| Little Dawgs — 6:00 PM | `little-dawgs` | 18:00–19:00 | 60 min |
| Big Dawgs — 7:00 PM | `big-dawgs` | 19:00–20:00 | 60 min |

Pull capacity/price from current `training_programs` at seed time—not hardcoded in audit.

Grade copy: use `lib/program-grades.ts` in template descriptions only; do not book templates publicly.

---

## Tests & validation (when implemented)

```bash
npm run test:training-tenant
npm run build
```

Manual checklist: user’s validation list (create template, M–F series, book one slot, edit template, cancel one occurrence, cross-tenant denial, legacy sessions, package + Stripe unchanged).

---

## Unresolved risks

| Risk | Mitigation |
|------|------------|
| Template edit appears to change past bookings in admin UI | Occurrence snapshot; warn on edit; document behavior |
| No admin calendar yet — scope creep | Ship templates + list first; calendar as Phase 4 |
| `recurrence_group_id` vs new `series_id` | Support both; prefer series for new code |
| Missing GRANTs on new tables | Copy MA5/008 pattern in same migration |
| Dirty branch | Split commits: media/login vs templates |

---

## Stop conditions — result

| Condition | Finding |
|-----------|---------|
| Template abstraction already exists | **No** — programs only |
| Recurrence should be extended | **Yes** — extend `lib/sessions.ts`, add series table |
| Bookings + mutable session risk | **Manageable** — do not auto-sync template → occurrences |
| Destructive migration required | **No** — additive |
| Stripe/package safety | **Yes** — keep `session_id` and occurrence pricing |
| Tenant helpers | **Yes** — extend tests |

**Proceed with implementation** once working tree is clean and operator approves Phase 1 migration file creation (still **do not apply** on Pro without approval).

---

## Files likely touched (implementation)

- `supabase-signalworks/migrations/012_*.sql`
- `lib/types/database.ts`, `lib/supabase/tables.ts`
- `lib/session-templates.ts`, `lib/sessions.ts`
- `app/admin/session-templates/**`, `app/api/admin/session-templates/**`
- `components/admin/session-template-*.tsx`, `schedule-template-dialog.tsx`
- `components/admin/admin-shell.tsx` (nav)
- `scripts/test-training-tenant-scope.ts`
- `docs/migration/dawg-session-templates-runbook.md`

No commit in this audit step.
