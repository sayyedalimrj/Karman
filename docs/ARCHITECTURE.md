# Architecture

Karman is a production-grade, RTL/Persian-first platform for construction-project
financial and review workflows, built on Next.js (App Router) + TypeScript with
PostgreSQL (via Prisma) as the operational runtime database.

This document summarizes the layering and the **reference-data pipeline**. See
also [`TAKSA_COMPATIBILITY.md`](./TAKSA_COMPATIBILITY.md) and
[`REFERENCE_DATA.md`](./REFERENCE_DATA.md). The authoritative source remains the
spec at `.kiro/specs/karman-foundation/design.md`.

## Layers

```text
app/*        transport  (Server Components, Server Actions, Route Handlers, middleware)
   ↓
server/*     domain     (auth, permissions, workflow, audit, calc, taksa, reference)
   ↓
prisma       data       (singleton Prisma client → PostgreSQL)
```

- **Server is the source of truth for authorization.** Every Server Action /
  Route Handler routes through the permission service before touching data.
- **Thin transport, fat domain.** Business rules live in `server/*` and are
  unit-testable and reusable.
- **Single Prisma access path.** `src/server/db.ts` is the only DB gateway;
  monetary and reference numeric fields are `Decimal`, never `Float`.
- **Append-only audit** written inside the same transaction as the mutation it
  describes.

## Domain modules (`src/server`)

| Module | Responsibility |
|--------|----------------|
| `auth` | Password hashing, sessions, current-user resolution. |
| `permissions` | Server-side authorization (deny-by-default). |
| `workflow` | Formal state machine: transitions, locking, revisions. |
| `audit` | Append-only audit logging. |
| `calc` | Decimal-safe financial computation primitives. |
| `taksa` | **Raw preservation** of Taksa sources (byte-stable round-trip). |
| `reference` | **Reference master data** mapping (Taksa-derived → normalized PostgreSQL). |

## Operational vs reference data

Karman stores two kinds of data in the same PostgreSQL operational database:

- **Operational runtime data** — the live transactional state created by users
  in-app (User, Project, Contract, WorkflowCase, AuditLog, …). PostgreSQL is its
  single source of truth.
- **Reference / master data** — official data imported/mapped from Taksa and
  other official sources (فهرست‌بها items, units, resources, شاخص indices,
  بخشنامه circulars, ضرایب coefficients, کسورات deductions). It is consumed by
  the calculation/report/validation layers and by golden tests.

PostgreSQL remains the operational runtime DB at all times. Taksa is **never**
the live runtime DB; its data flows *into* PostgreSQL as reference data.

## The reference-data pipeline

```text
Taksa sources (DB / SQL / SVZT / BRVT / PSNT / Excel / PDF / research)
   → staging / extraction
   → RAW PRESERVATION layer        (src/server/taksa; TaksaArtifact/RawTable/RawRow)
   → REFERENCE MAPPING layer       (src/server/reference; map* contracts)
   → normalized PostgreSQL tables  (Reference* models)
   → calculations / reports / validation / golden tests
```

- **Raw preservation** keeps every original Taksa row verbatim for round-trip
  safety; it is intentionally not usable business data.
- **Reference mapping** normalizes those rows into usable `Reference*` tables
  with full provenance and an explicit mapping-status lifecycle
  (`RAW → MAPPED → VERIFIED`, with `CONFLICT`/`DEPRECATED`).
- **`ReferenceMapping`** bridges the two layers, linking a raw source row to the
  normalized entity it produced.

Official values are never hard-coded; they must come from imported/mapped
reference data. All reference numerics are `Decimal @db.Decimal(18,4)`.

## Decimal-safe numerics

Monetary and reference numeric values use `Decimal` end-to-end (decimal.js /
`Prisma.Decimal`), with a central rounding policy (ROUND_HALF_UP, scale 4). A JS
`number` supplied as a monetary/reference value is rejected at the boundary
(`assertNotNumber`). The `npm run check:decimal` lint enforces
`@db.Decimal(18,4)` on all such fields.


## Runtime, routes, and the UI shell

Karman is a Next.js **App Router** + TypeScript application. Routing as
implemented:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Server-side redirect only: authenticated → `/dashboard`, otherwise → `/login`. No marketing page. |
| `/login` | `src/app/(auth)/login/page.tsx` | Login form; redirects away if already authenticated. |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Real empty state inside the AppShell. |
| `/inbox` | `src/app/(app)/inbox/page.tsx` | Real empty state inside the AppShell. |
| `/projects/setup` | `src/app/(app)/projects/setup/page.tsx` | Honest read-only placeholder (or an honest "no access" state) — no fake project data. |
| `/api/auth` | `src/app/api/auth/route.ts` | Login/logout route handler. |
| `/api/health` | `src/app/api/health/route.ts` | Deployment readiness probe (DB connectivity). |

The authenticated `(app)` segment is wrapped by `src/app/(app)/layout.tsx`,
which resolves the user server-side and renders the **AppShell**
(`src/components/shell`): a brand sidebar with permission-aware navigation, a top
bar with the current user + logout, and a content slot. The shell receives only
serializable user data and performs **no** authorization itself. See
[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for the shell/ui/state components.

## Authentication and sessions

`src/server/auth` provides:

- **Password hashing** (`password.ts`): salted `scrypt`
  (`scrypt$<salt>$<hash>`), constant-time verification, and a `dummyHash` to
  equalize timing for unknown accounts.
- **Sessions** (`session.ts`): a stateless HMAC-signed token in an **httpOnly**,
  `sameSite=lax`, `path=/` cookie (`karman_session`), `secure` outside
  development. The payload carries only the user id + issued-at; the current
  user is always re-resolved from the DB so deactivated users lose access
  immediately. `SESSION_SECRET` comes from the environment (fail-fast if
  missing).
- **Page guards** (`page-guard.ts`): real `redirect()` to `/login?next=…` for
  unauthenticated visitors; bounce authenticated users away from `/login`.

## Server-side permissions and the middleware

Authorization is **deny-by-default** and enforced **server-side** by
`src/server/permissions` (`canAccessProject`, `requireProjectAccess`,
`resolveEffectiveRole`, `requireRole`, `assertNotLocked`). `middleware.ts` is a
**redirect-only convenience**: it is edge-safe, only inspects the structural
shape of the session cookie to redirect clearly-unauthenticated visitors of
`(app)` routes to `/login`, and **grants no access**. UI navigation visibility is
presentation only and is never a security boundary. Full details in
[`ROLES_AND_PERMISSIONS.md`](./ROLES_AND_PERMISSIONS.md).

## Workflow state machine

`src/server/workflow` implements a formal, role-gated state machine over 16
`WorkflowState` values with a single 17-row transition table as the source of
truth. The engine validates edges + role gates (`assertCanTransition`), applies
lock effects, rejects silent mutation of locked records, supports corrections via
`reviseLockedCase` (new superseding revision), and writes audit rows atomically
with each transition. Full table and rules in [`WORKFLOW.md`](./WORKFLOW.md).

## Append-only audit

`src/server/audit` exposes `record(entry, tx)` which **only inserts** immutable
`AuditLog` rows inside the caller's transaction — it never updates or deletes.
This is what makes a workflow transition and its audit record atomic (CP5).
Audit `metadata` is sanitized before persistence: keys matching sensitive
patterns (password, secret, token, cookie, `database_url`, api/private keys,
etc.) are replaced with `[REDACTED]`, so secrets can never enter the audit trail.

## Decimal-safe calculation contracts

`src/server/calc` implements the foundation calculation contracts — `sum`,
`applyPercentage`, `netAfterDeductions` — operating **exclusively** on `Decimal`
(`src/lib/money`). Each guards its inputs with `assertNotNumber` and throws a
`TypeError` immediately if a JS `number` is supplied, and normalizes results to
the central rounding policy (ROUND_HALF_UP, scale 4). These are the primitives
only; full payment-certificate business rules are future work.

## Taksa raw preservation

`src/server/taksa` is the **raw preservation** layer: it keeps every original
Taksa row byte-for-byte (`rawTableName`, `tableOrder`, `rowOrder`, `rawJson`
immutable; edits confined to `patchJson`), with per-artifact/table/row checksums
for round-trip integrity (CP7). It is intentionally **not** usable business data;
the usable normalized form is the reference master-data layer (above). See
[`TAKSA_COMPATIBILITY.md`](./TAKSA_COMPATIBILITY.md) and
[`REFERENCE_DATA.md`](./REFERENCE_DATA.md).

## No-fake-data policy

Karman is **not** a demo or mock. Business screens render **real** empty/honest
placeholder states driven by real queries — never fabricated dashboards, stats,
charts, projects, workflow items, or mock API responses. Official reference
values must come from imported/mapped reference data, never code constants
(enforced by a guard test). Every underlying layer (schema, permissions,
workflow, locking, audit, decimal math, deployment config) is real and secure.

## Intentionally not implemented yet

This is the **foundation**. The following are deliberately out of scope and are
**not** claimed to be complete; they are designed to be added without rework by
calling the existing contracts/schema:

- **Full Taksa DB restore / live connection.**
- **SVZT/BRVT/PSNT binary parsers** and **official PDF value extraction.**
- **Export serialization back to Taksa formats** (the workflow edge
  `EXPORT_READY → EXPORTED_TO_TAKSA` exists and is audited, but no serializer is
  implemented).
- **Full payment-certificate business UI** and the **full calculation
  business-rule engine** (only decimal-safe primitives/contracts exist).
- **Report export.**
- **Full project-creation workflow.** `/projects/setup` is currently an honest
  read-only placeholder (with a role-gated "no access" state) — it does **not**
  create or display project data yet.
- **User-management and audit-log admin screens** (surfaced in nav as honest
  "coming soon", disabled).
