# Workflow State Machine

Karman documents/projects move through a formal, role-gated state machine. The
**single source of truth** is the transition table in
`src/server/workflow/transitions.ts`; the engine
(`src/server/workflow/engine.ts`) reads **only** from that table and encodes no
transition logic anywhere else.

## States (16)

The `WorkflowState` enum defines 16 states spanning the project lifecycle,
document drafting, the contractor → consultant → employer review chain, locking,
and Taksa export:

```
PROJECT_DRAFT
PROJECT_ACTIVE
DOCUMENT_DRAFT
MEASUREMENT_IN_PROGRESS
CONTRACTOR_INTERNAL_CHECK
SUBMITTED_TO_CONSULTANT
CONSULTANT_REVIEWING
RETURNED_TO_CONTRACTOR
CONSULTANT_APPROVED
SUBMITTED_TO_EMPLOYER
EMPLOYER_REVIEWING
RETURNED_BY_EMPLOYER
EMPLOYER_APPROVED
DOCUMENT_LOCKED
EXPORT_READY
EXPORTED_TO_TAKSA
```

## Transition table (17 rows)

Each row defines the directed `from → to` edge, the roles permitted to perform
it, whether reaching `to` **locks** the case, and the audit action(s) recorded
in the same transaction. `SYSTEM_ADMIN` may perform any **existing** edge for
recovery (it overrides the role gate only — it cannot invent edges).

| # | From | To | Allowed roles | Lock | Audit actions |
|---|------|----|---------------|------|---------------|
| 1 | `PROJECT_DRAFT` | `PROJECT_ACTIVE` | `PROJECT_ADMIN` | — | `WORKFLOW_TRANSITION` |
| 2 | `PROJECT_ACTIVE` | `DOCUMENT_DRAFT` | `PROJECT_ADMIN`, `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 3 | `DOCUMENT_DRAFT` | `MEASUREMENT_IN_PROGRESS` | `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 4 | `MEASUREMENT_IN_PROGRESS` | `CONTRACTOR_INTERNAL_CHECK` | `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 5 | `CONTRACTOR_INTERNAL_CHECK` | `SUBMITTED_TO_CONSULTANT` | `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 6 | `SUBMITTED_TO_CONSULTANT` | `CONSULTANT_REVIEWING` | `CONSULTANT`, `REVIEWER` | — | `WORKFLOW_TRANSITION` |
| 7 | `CONSULTANT_REVIEWING` | `RETURNED_TO_CONTRACTOR` | `CONSULTANT`, `REVIEWER` | — | `WORKFLOW_TRANSITION` |
| 8 | `RETURNED_TO_CONTRACTOR` | `DOCUMENT_DRAFT` | `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 9 | `CONSULTANT_REVIEWING` | `CONSULTANT_APPROVED` | `CONSULTANT` | — | `WORKFLOW_TRANSITION` |
| 10 | `CONSULTANT_APPROVED` | `SUBMITTED_TO_EMPLOYER` | `CONSULTANT`, `PROJECT_ADMIN` | — | `WORKFLOW_TRANSITION` |
| 11 | `SUBMITTED_TO_EMPLOYER` | `EMPLOYER_REVIEWING` | `EMPLOYER`, `REVIEWER` | — | `WORKFLOW_TRANSITION` |
| 12 | `EMPLOYER_REVIEWING` | `RETURNED_BY_EMPLOYER` | `EMPLOYER`, `REVIEWER` | — | `WORKFLOW_TRANSITION` |
| 13 | `RETURNED_BY_EMPLOYER` | `DOCUMENT_DRAFT` | `CONTRACTOR` | — | `WORKFLOW_TRANSITION` |
| 14 | `EMPLOYER_REVIEWING` | `EMPLOYER_APPROVED` | `EMPLOYER` | — | `WORKFLOW_TRANSITION` |
| 15 | `EMPLOYER_APPROVED` | `DOCUMENT_LOCKED` | `FINANCIAL_CONTROLLER`, `PROJECT_ADMIN` | **LOCK** | `LOCK`, `WORKFLOW_TRANSITION` |
| 16 | `DOCUMENT_LOCKED` | `EXPORT_READY` | `FINANCIAL_CONTROLLER` | (stays locked) | `WORKFLOW_TRANSITION` |
| 17 | `EXPORT_READY` | `EXPORTED_TO_TAKSA` | `FINANCIAL_CONTROLLER`, `SYSTEM_ADMIN` | (stays locked) | `EXPORT`, `WORKFLOW_TRANSITION` |

Any `(from, to)` pair absent from this table is rejected for everyone.

## Transition validation — `assertCanTransition` (CP3)

`assertCanTransition(case_, to, role)` succeeds **iff** a rule exists for
`(case_.state → to)` **and** the role is in the rule's `allowedRoles` **or** is
`SYSTEM_ADMIN`. Otherwise it throws `WorkflowError`. It performs no I/O and no
mutation. `allowedTransitions(from)` returns the rules leaving a state (for
presentation only — never an authorization boundary).

## Lock effects

- States `DOCUMENT_LOCKED`, `EXPORT_READY`, and `EXPORTED_TO_TAKSA` are
  considered **locked** (`LOCKED_STATES` / `isLockedState`).
- Reaching `DOCUMENT_LOCKED` (row 15, `locks: true`) sets `isLocked = true` and
  stamps `lockedAt`.
- Once locked, the case stays locked through the export edges (rows 16/17).

## No silent mutation of locked records (CP4)

`transition()` calls `assertNotLocked` for any edge whose `from` is **not** a
locked state, so a normal (non-export) transition on a locked case throws
`LockedError`. The export-flow edges (rows 16/17) legitimately operate on a
locked case because they are performed **by the workflow engine itself**.
Ad-hoc mutation outside the engine is rejected.

## Revisioning — `reviseLockedCase` (CP4)

Corrections to a locked case **never** mutate the locked original. Instead,
`reviseLockedCase()` creates a **new** `WorkflowCase` that re-enters the workflow
at `DOCUMENT_DRAFT` with:

- `revision = prev.revision + 1`
- `supersedesId = prev.id`
- `isLocked = false`, `lockedAt = null`

The locked original is preserved unchanged as the historical source of truth.
Revising a case that is **not** locked throws `WorkflowError` (unlocked cases are
edited in place). The revision creation is audited (`CREATE`) in the same
transaction.

## Atomic transition + audit (CP5)

`transition()` runs inside a single Prisma `$transaction`:

1. load the case (`NotFoundError` if missing),
2. `assertCanTransition` (edge + role gate),
3. `assertNotLocked` for non-export edges,
4. update `state` (and apply lock effects on a locking edge),
5. write **one immutable `AuditLog` row per rule audit action**
   (`WORKFLOW_TRANSITION`, plus `LOCK`/`EXPORT` where applicable) in the **same**
   transaction, recording actor, `fromState`, `toState`, and the case.

If **any** step throws — including the audit write — the entire transaction
rolls back, so a state change and its audit record are all-or-nothing. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the append-only audit details and
secret-redaction policy.

## Correctness properties

- **CP3** — only valid transitions are accepted (`engine.test.ts`,
  property-based via fast-check).
- **CP4** — locked documents cannot be mutated silently; corrections create a
  superseding revision.
- **CP5** — every successful transition produces an `AuditLog` in the same
  transaction; an audit-write failure rolls back the transition.
