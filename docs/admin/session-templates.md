# Session templates (admin)

## Concepts

- **Program** (`training_programs`): Product line — **Little Dawgs**, **Big Dawgs**, etc. Owns calendar color, default capacity, price, and visibility.
- **Template** (`training_session_templates`): Reusable slot (e.g. `4:00 PM`) under a program. Overrides only when needed. Identified by **ID**, not unique name.
- **Occurrence** (`training_sessions`): Dated row on the **calendar** that parents book. Snapshots template + program defaults at creation time.

## Workflow

1. **Admin → Templates** — create or duplicate (program + time label).
2. **Add to calendar** — one date or recurrence, preview, confirm.
3. **Admin → Calendar** — see occurrences; public **Schedule** shows `visibility = public` only.

Archive hides a template from new calendar adds; existing occurrences stay.

Legacy **New group session** (no template) still works (`template_id` null).

## Not built yet (planned)

- Drag-and-drop calendar, copy week, full calendar homepage (Phase 4+).
