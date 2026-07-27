# ADR 0008: Legacy MA5 Schema and Vertical Domain Modules

**Status:** Accepted  
**Date:** 2026-07-27  
**Scope:** Signal Works `signalworks-services` Supabase project and client apps (MA5, DAWG, future youth-training tenants)

## Context

The platform uses one shared Supabase project with multiple tenants. Early clients used **product-prefixed tables** (`ma5_*`, `dawg_*`) on hobby or shared hobby-tier projects. MA5 production is moving to **tenant-scoped `ma5_*`** on Signal Works Pro without renaming tables. DAWG must move to the same Pro project without coupling to MA5’s gym product schema.

We need a stable rule for:

- what stays frozen vs what generalizes;
- how new client **types** (youth training vs adult performance gym) get schemas;
- how platform modules (`tenants`, billing, documents, messaging) stay shared.

## Decision

Adopt a **three-layer model**:

### 1. Platform layer

Shared across tenants and verticals. Includes at minimum:

- `tenants`, `profiles`, `tenant_memberships`, `roles`, `permissions`
- Signal Works commercial tables (`client_offers`, `tenant_subscriptions`, `documents`, …)
- Genuinely generic modules: shared billing ledger/catalog where applicable, messaging, media conventions, permissions helpers

All **tenant-owned** platform rows include `tenant_id` and RLS via trusted membership helpers. Client apps resolve tenant context **server-side** (deployment env or approved resolver)—never from unvalidated browser input.

### 2. MA5 product layer (frozen)

- Keep existing **`ma5_*` table names** in production.
- Do **not** rename, remove, or generalize the MA5 schema as part of DAWG or platform work.
- Keep **`tenant_id NOT NULL`** and tenant-aware RLS on all MA5 business tables.
- Do **not** route DAWG data through `ma5_*` tables.
- Treat MA5 as a **frozen production product schema** for the adult performance / gym hub feature set.

A second gym with the same MA5 feature set is modeled as **another `tenants` row** using the same `ma5_*` tables with `tenant_id` isolation—not as a new prefix family.

### 3. Vertical domain modules (e.g. youth training)

- Clients like DAWG use a **tenant-aware vertical schema** on the same Pro project.
- Register each business in `public.tenants`.
- Staff identity: **`tenant_memberships`** + vertical staff profile (not `ma5_profiles`).
- Business tables use **domain or module names** (e.g. `yt_*` youth-training vertical), not permanent client brands (`dawg_*`).
- Every vertical business table: `tenant_id NOT NULL`, indexes, RLS, service-role queries filtered by deployment tenant.

New youth-training clients reuse the **same vertical tables** with a different `tenant_id`, not a copied schema.

### Hobby / legacy databases

- **`main` on the DAWG repo** remains the legacy app targeting Dugout Intel / hobby Supabase with existing `dawg_*` migrations unchanged.
- Production multitenant work ships on **`feature/dawg-production-multitenant`** until reviewed; no merge to `main` until the operator replaces the legacy implementation.

## Consequences

**Positive**

- MA5 production stability; no forced big-bang rename.
- Clear boundary for DAWG and future youth tenants.
- Aligns with ADR 0001 (shared schema + RLS) and ADR 0002 (`tenant_id` on owned data).

**Negative**

- Two product schemas on one database (`ma5_*` + youth vertical) until/unless MA5 eventually migrates domain-by-domain into modules.
- DAWG requires a full migration chain and app refactor—not an env var flip.

**Explicitly not doing**

- Merging DAWG into `ma5_*`.
- Dropping `ma5_` prefixes on MA5 tables.
- Applying production multitenant migrations to the hobby Dugout project from this effort.

## Follow-up

- DAWG: audit and phased implementation on `feature/dawg-production-multitenant` (see `docs/migration/`).
- Update platform module catalog when the youth vertical ships.
- Cross-tenant security tests for every new vertical table.

## Related

- [ADR 0001](../../../../docs/adr/0001-multi-tenant-architecture.md) (workspace)
- [ADR 0002](../../../../docs/adr/0002-tenant-id-strategy.md) (workspace)
- [ADR 0005](../../../../docs/adr/0005-module-boundaries.md) (workspace)
