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
