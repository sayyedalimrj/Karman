# Design Document: Karman Foundation

## Overview

Karman is a production-grade, deploy-ready web platform for managing construction-project financial and review workflows (project setup, contracts, parties, payment certificates, measurement, multi-stage review, financial calculation, reporting, and future Taksa/Texsa-compatible import/export). This foundation establishes the **real** architectural spine of the system from day one — typed data models, server-enforced permissions, a formal workflow state machine, immutable audit logging, decimal-safe financial primitives, an RTL-first / Persian-first UI shell with a centralized design-token system, and correctly-shaped placeholder models for future Taksa round-trip compatibility.

This is explicitly **not** an MVP, demo, or mock. Business screens may render empty states, but every underlying layer (schema, permission enforcement, workflow transitions, locking, audit, deployment configuration) is real, secure, and built to scale. The foundation must result in an application that runs, is server-deployable via environment variables, and is architected for long-term incremental development without rework.

Because the project is greenfield, the only existing material is a set of committed input archives (research docs, brand assets, Persian font). These archives **cannot** be extracted during the design phase (no shell access) and their extraction is sequenced as explicit build-time steps in the implementation plan. This design describes their intended extracted outputs and the hygiene rules governing them.

## Goals and Non-Goals

### Goals
- Establish a typed, layered Next.js App Router + TypeScript codebase that is production-minded from the first commit.
- Define the complete operational data model in Prisma with decimal-safe financial fields, enums, relations, and indexes.
- Define a formal workflow state machine with explicit transitions, role gating, lock effects, and audit events.
- Enforce all authorization **server-side** (UI hiding is never sufficient) via reusable permission helpers.
- Provide an immutable `AuditLog` written on every workflow transition and sensitive mutation.
- Centralize brand identity in a formal design-token layer; never scatter raw hex in components.
- Wire RTL-first, Persian-first UI with locally-hosted IRANYekanX Pro via `next/font/local`.
- Provide correctly-shaped Taksa placeholder models that preserve original table names, row order, and raw JSON for future round-trip.
- Ship deploy-ready environment configuration (`.env.example`, migration/build/start docs, no hard-coded secrets).

### Non-Goals (for this foundation)
- Implementing full payment-certificate calculation business logic (only the engine contracts and decimal-safe primitives are defined).
- Implementing Taksa import/export parsing/round-trip logic (only placeholder models + preservation contract).
- Building populated dashboards or fake business data.
- Extracting/processing the committed archives at design time (sequenced as build steps).

---

## Architecture

### High-Level System Architecture

```mermaid
graph TD
    subgraph Client["Browser (RTL, Persian-first)"]
        UI[AppShell + Pages<br/>Login / Dashboard / Inbox / Project Setup]
    end

    subgraph Next["Next.js App Router (TypeScript)"]
        RSC[Server Components<br/>data fetching]
        SA[Server Actions]
        API[Route Handlers<br/>/api/*]
        MW[Middleware<br/>session + RTL/locale]
    end

    subgraph Domain["Domain / Service Layer"]
        AUTH[Auth Service]
        PERM[Permission Service<br/>canAccessProject / requireRole]
        WF[Workflow Engine<br/>assertCanTransition / lock]
        CALC[Calculation Engine<br/>Decimal-safe]
        AUDITSVC[Audit Service]
    end

    subgraph Data["Persistence"]
        PRISMA[Prisma Client]
        PG[(PostgreSQL<br/>operational DB)]
    end

    subgraph Future["Taksa Compatibility (placeholders)"]
        TAKSA[TaksaArtifact / RawTable / RawRow]
    end

    UI -->|HTTP| MW
    MW --> RSC
    MW --> SA
    MW --> API
    RSC --> PERM
    SA --> PERM
    API --> PERM
    PERM --> AUTH
    SA --> WF
    API --> WF
    WF --> AUDITSVC
    SA --> CALC
    PERM --> PRISMA
    WF --> PRISMA
    AUDITSVC --> PRISMA
    CALC --> PRISMA
    PRISMA --> PG
    PRISMA --> TAKSA
```

**Architectural principles:**
- **Server is the source of truth for authorization.** Every Server Action and Route Handler routes through the Permission Service before touching data. Client components never make authorization decisions; they only adapt presentation.
- **Thin transport, fat domain.** Route Handlers / Server Actions are thin adapters; business rules live in the domain/service layer so they are unit-testable and reusable.
- **Single Prisma access path.** A singleton Prisma client is the only DB gateway; financial fields are `Decimal`, never `Float`.
- **Append-only audit.** The Audit Service writes immutable records inside the same transaction as the mutation it describes.

### Sequence: Authenticated Workflow Transition (server-enforced)

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Server Action
    participant P as Permission Service
    participant W as Workflow Engine
    participant Au as Audit Service
    participant DB as PostgreSQL (tx)

    C->>A: transition(caseId, targetState)
    A->>P: requireRole + canAccessProject(user, projectId)
    P-->>A: ok / throw ForbiddenError
    A->>W: assertCanTransition(case, targetState, user.role)
    W->>W: validate transition table + role gate
    W->>W: assertNotLocked(case)
    W-->>A: ok / throw WorkflowError
    A->>DB: BEGIN tx
    A->>DB: update WorkflowCase.state (+ lock if terminal)
    A->>Au: record(transition event) within tx
    Au->>DB: insert AuditLog
    A->>DB: COMMIT
    A-->>C: new state
```

### Sequence: Login / Session Establishment

```mermaid
sequenceDiagram
    participant C as Client (Login Page)
    participant API as /api/auth (Route Handler)
    participant AUTH as Auth Service
    participant DB as PostgreSQL

    C->>API: POST credentials
    API->>AUTH: verify(email, password)
    AUTH->>DB: find User by email
    DB-->>AUTH: User (passwordHash)
    AUTH->>AUTH: constant-time hash compare
    AUTH-->>API: session payload / null
    API-->>C: Set-Cookie (httpOnly, secure) / 401
```

---

## Folder / Module Structure (Next.js App Router)

```text
Karman/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # root layout: <html dir="rtl" lang="fa">, font, providers
│  │  ├─ globals.css                # design tokens (CSS variables) + base RTL resets
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx          # Login page
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx              # AppShell (glass shell, nav, header)
│  │  │  ├─ dashboard/page.tsx      # Project Dashboard empty state
│  │  │  ├─ inbox/page.tsx          # Inbox empty state
│  │  │  └─ projects/
│  │  │     └─ setup/page.tsx       # Project Setup placeholder
│  │  └─ api/
│  │     ├─ auth/route.ts           # login/logout route handlers
│  │     └─ health/route.ts         # deployment health check
│  ├─ server/
│  │  ├─ db.ts                      # Prisma singleton
│  │  ├─ auth/                      # session, password hashing, getCurrentUser
│  │  ├─ permissions/               # permission helpers (canAccessProject, requireRole, ...)
│  │  ├─ workflow/                  # state machine: states, transition table, engine
│  │  ├─ audit/                     # audit helper
│  │  ├─ calc/                      # decimal-safe calculation engine contracts
│  │  ├─ taksa/                     # Taksa raw preservation service (round-trip)
│  │  └─ reference/                 # Taksa-derived reference master-data contracts
│  ├─ lib/
│  │  ├─ money.ts                   # Decimal helpers (decimal.js / Prisma.Decimal)
│  │  ├─ errors.ts                  # typed domain errors
│  │  └─ i18n/                      # Persian strings, locale helpers
│  ├─ components/
│  │  ├─ shell/                     # AppShell, GlassPanel, Sidebar, TopBar
│  │  ├─ ui/                        # primitive components consuming design tokens
│  │  └─ states/                    # EmptyState, ErrorState
│  ├─ design/
│  │  └─ tokens.ts                  # typed design-token source of truth
│  └─ assets/
│     └─ fonts/iranyekanx/          # *.woff2 (extracted build step)
├─ prisma/
│  ├─ schema.prisma                 # full schema (this design)
│  └─ seed.ts                       # one initial SYSTEM_ADMIN user (Role enum)
├─ public/brand/                    # logo.svg/png, icon-512.png, favicon.png, og-image.png
├─ docs/                            # ARCHITECTURE / DESIGN_SYSTEM / ROLES_AND_PERMISSIONS / WORKFLOW / DEPLOYMENT / TAKSA_COMPATIBILITY
│  └─ taksa-map/                    # extracted safe research docs (build step)
├─ .env.example
├─ .gitignore
└─ README.md
```

**Layering rule:** `app/*` (transport) → `server/*` (domain/services) → `prisma` (data). `components/*` and `design/*` are presentation-only and must never import from `server/*` except through serializable props passed by Server Components.

---

## Components and Interfaces

### Component: AppShell
**Purpose**: Enterprise-grade, RTL, glass-style application frame (top bar, side navigation, content slot) rendered for authenticated routes.
**Responsibilities**: Render navigation gated by the current user's effective permissions (presentation only), apply design tokens, host empty/error states. Never performs authorization decisions itself.

### Component: Permission Service
**Purpose**: Single authority for server-side authorization.
**Interface**:
```typescript
interface PermissionService {
  getCurrentUser(): Promise<AuthUser | null>;
  requireUser(): Promise<AuthUser>;                       // throws UnauthorizedError if absent
  canAccessProject(user: AuthUser, projectId: string): Promise<boolean>;
  requireProjectAccess(user: AuthUser, projectId: string): Promise<ProjectMembership>;
  requireRole(user: AuthUser, roles: Role[], projectId?: string): void; // throws ForbiddenError
  assertNotLocked(case_: WorkflowCase): void;             // throws LockedError
}
```

### Component: Workflow Engine
**Purpose**: Validate and execute state transitions per the formal state machine; apply lock effects; emit audit events.
**Interface**:
```typescript
interface WorkflowEngine {
  allowedTransitions(from: WorkflowState): TransitionRule[];
  assertCanTransition(case_: WorkflowCase, to: WorkflowState, role: Role): void; // throws WorkflowError
  transition(input: TransitionInput): Promise<WorkflowCase>; // atomic: update + lock + audit
}
```

### Component: Audit Service
**Purpose**: Append-only recording of workflow transitions and sensitive mutations, written inside the caller's DB transaction.
**Interface**:
```typescript
interface AuditService {
  record(entry: AuditEntryInput, tx: PrismaTransaction): Promise<void>;
}
```

### Component: Calculation Engine (contracts only in foundation)
**Purpose**: Decimal-safe financial computation primitives. No floating point.
**Interface**:
```typescript
interface CalculationEngine {
  sum(values: Money[]): Money;
  applyPercentage(base: Money, percent: Decimal): Money;
  netAfterDeductions(gross: Money, deductions: Money[]): Money;
}
```

---

## Data Models (Prisma Schema)

The schema below is the source of truth for the operational database. **All monetary fields use `Decimal` with explicit precision/scale** (`@db.Decimal(18, 4)`) — never `Float`/`Int` for currency. UUID primary keys, `createdAt`/`updatedAt` timestamps, and indexes on foreign keys and lookup columns are standard.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Enums ----------

enum Role {
  SYSTEM_ADMIN
  PROJECT_ADMIN
  EMPLOYER
  CONSULTANT
  CONTRACTOR
  FINANCIAL_CONTROLLER
  REVIEWER
  VIEWER
  SUPPORT_ADMIN
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum WorkflowState {
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
}

enum PartyType {
  EMPLOYER
  CONSULTANT
  CONTRACTOR
  OTHER
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  WORKFLOW_TRANSITION
  LOCK
  UNLOCK
  EXPORT
  IMPORT
}

enum TaksaImportStatus {
  NOT_IMPORTED
  PENDING
  IMPORTED
  FAILED
}

enum TaksaExportStatus {
  NOT_EXPORTED
  PENDING
  EXPORTED
  FAILED
}

// ---------- Core identity ----------

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  passwordHash  String
  fullName      String
  isActive      Boolean         @default(true)
  systemRole    Role            @default(VIEWER)   // global role (e.g. SYSTEM_ADMIN, SUPPORT_ADMIN)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  memberships     ProjectMember[]
  auditLogs       AuditLog[]
  createdProjects Project[]       @relation("ProjectCreatedBy")
  createdCases    WorkflowCase[]  @relation("CaseCreatedBy")

  @@index([email])
  @@index([systemRole])
}

// ---------- Projects & membership ----------

model Project {
  id           String         @id @default(uuid())
  code         String         @unique
  name         String
  description  String?
  status       ProjectStatus  @default(DRAFT)
  createdById  String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  createdBy       User           @relation("ProjectCreatedBy", fields: [createdById], references: [id])
  members         ProjectMember[]
  contracts       Contract[]
  parties         ProjectParty[]
  cases           WorkflowCase[]
  taksaArtifacts  TaksaArtifact[]
  auditLogs       AuditLog[]

  @@index([status])
  @@index([createdById])
}

model ProjectMember {
  id         String   @id @default(uuid())
  projectId  String
  userId     String
  role       Role                              // role scoped to this project
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
  @@index([role])
}

// ---------- Contracts & parties ----------

model Contract {
  id           String   @id @default(uuid())
  projectId    String
  code         String
  title        String
  // Decimal-safe monetary fields — NEVER Float.
  totalAmount  Decimal  @db.Decimal(18, 4)
  currency     String   @default("IRR")
  startDate    DateTime?
  endDate      DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, code])
  @@index([projectId])
}

model ProjectParty {
  id          String     @id @default(uuid())
  projectId   String
  partyType   PartyType
  name        String
  nationalId  String?
  contact     String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([partyType])
}

// ---------- Workflow ----------

model WorkflowCase {
  id           String        @id @default(uuid())
  projectId    String
  title        String
  state        WorkflowState @default(DOCUMENT_DRAFT)
  isLocked     Boolean       @default(false)
  lockedAt     DateTime?
  revision     Int           @default(1)        // bumped when a locked/approved doc is corrected via new version
  supersedesId String?                          // points to prior revision (versioning chain)
  createdById  String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy    User          @relation("CaseCreatedBy", fields: [createdById], references: [id])
  supersedes   WorkflowCase? @relation("CaseRevision", fields: [supersedesId], references: [id])
  revisions    WorkflowCase[] @relation("CaseRevision")
  auditLogs    AuditLog[]

  @@index([projectId])
  @@index([state])
  @@index([isLocked])
}

// ---------- Audit (append-only) ----------

model AuditLog {
  id            String       @id @default(uuid())
  actorUserId   String
  projectId     String?
  workflowCaseId String?
  action        AuditAction
  entityType    String                          // e.g. "WorkflowCase", "Contract"
  entityId      String
  fromState     WorkflowState?
  toState       WorkflowState?
  metadata      Json?                           // diff / context (no secrets)
  createdAt     DateTime     @default(now())

  actor         User          @relation(fields: [actorUserId], references: [id])
  project       Project?      @relation(fields: [projectId], references: [id])
  workflowCase  WorkflowCase? @relation(fields: [workflowCaseId], references: [id])

  @@index([actorUserId])
  @@index([projectId])
  @@index([workflowCaseId])
  @@index([entityType, entityId])
  @@index([createdAt])
}

// ---------- Attachment (placeholder) ----------

model Attachment {
  id          String   @id @default(uuid())
  entityType  String
  entityId    String
  fileName    String
  storageKey  String                            // pointer to object storage (future)
  contentType String?
  byteSize    Int?
  checksum    String?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
}

// ---------- Taksa compatibility (placeholders, shaped for round-trip) ----------

model TaksaArtifact {
  id            String            @id @default(uuid())
  projectId     String?
  sourceName    String                          // original Taksa source identifier
  importStatus  TaksaImportStatus @default(NOT_IMPORTED)
  exportStatus  TaksaExportStatus @default(NOT_EXPORTED)
  checksum      String?                          // artifact-level hash
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  project       Project?          @relation(fields: [projectId], references: [id])
  rawTables     TaksaRawTable[]

  @@index([projectId])
  @@index([importStatus])
  @@index([exportStatus])
}

model TaksaRawTable {
  id              String          @id @default(uuid())
  artifactId      String
  rawTableName    String                          // PRESERVE original Taksa table name verbatim
  tableOrder      Int                             // preserve original table ordering
  checksum        String?
  createdAt       DateTime        @default(now())

  artifact        TaksaArtifact   @relation(fields: [artifactId], references: [id], onDelete: Cascade)
  rawRows         TaksaRawRow[]

  @@unique([artifactId, rawTableName])
  @@index([artifactId])
}

model TaksaRawRow {
  id            String         @id @default(uuid())
  rawTableId    String
  rowOrder      Int                              // PRESERVE original row order
  rawJson       Json                             // PRESERVE original raw row content verbatim
  patchJson     Json?                            // non-destructive overlay/edits
  checksum      String?                          // per-row hash for round-trip verification
  createdAt     DateTime       @default(now())

  rawTable      TaksaRawTable  @relation(fields: [rawTableId], references: [id], onDelete: Cascade)

  @@unique([rawTableId, rowOrder])
  @@index([rawTableId])
}
```

**Schema design notes:**
- **Decimal-safe**: `Contract.totalAmount` (and all future money fields) use `@db.Decimal(18,4)`. The application layer maps these to `Prisma.Decimal` / `decimal.js`; floating-point math is forbidden.
- **Role model**: `User.systemRole` carries global roles (`SYSTEM_ADMIN`, `SUPPORT_ADMIN`); `ProjectMember.role` carries the per-project effective role. Permission checks consider both.
- **Versioning**: `WorkflowCase.revision` + `supersedesId` implement the revision chain so corrections after lock/approval create a new revision rather than mutating a locked record.
- **Taksa preservation**: `rawTableName`, `tableOrder`, `rowOrder`, and `rawJson` are immutable preservation columns; edits live in `patchJson`. `@@unique([rawTableId, rowOrder])` enforces stable ordering.
- **Project authorship relation**: `Project.createdBy` is an explicit named relation (`"ProjectCreatedBy"`) to `User.createdProjects`, distinct from the default unnamed `Project ↔ AuditLog` relation and the `Project ↔ User`-via-`ProjectMember` membership relation.

---

## Workflow State Machine

### States

The 16 states span project lifecycle, document drafting, the contractor → consultant → employer review chain, locking, and Taksa export.

### Transition Table

Each transition lists the **from → to** states, the roles permitted to perform it, whether it **locks** the case, and the **audit event** emitted. (Global `SYSTEM_ADMIN` may perform any transition for recovery, always audited.)

| # | From | To | Allowed Roles | Lock Effect | Audit Event |
|---|------|----|--------------|-------------|-------------|
| 1 | PROJECT_DRAFT | PROJECT_ACTIVE | PROJECT_ADMIN | — | WORKFLOW_TRANSITION |
| 2 | PROJECT_ACTIVE | DOCUMENT_DRAFT | PROJECT_ADMIN, CONTRACTOR | — | WORKFLOW_TRANSITION |
| 3 | DOCUMENT_DRAFT | MEASUREMENT_IN_PROGRESS | CONTRACTOR | — | WORKFLOW_TRANSITION |
| 4 | MEASUREMENT_IN_PROGRESS | CONTRACTOR_INTERNAL_CHECK | CONTRACTOR | — | WORKFLOW_TRANSITION |
| 5 | CONTRACTOR_INTERNAL_CHECK | SUBMITTED_TO_CONSULTANT | CONTRACTOR | — | WORKFLOW_TRANSITION |
| 6 | SUBMITTED_TO_CONSULTANT | CONSULTANT_REVIEWING | CONSULTANT, REVIEWER | — | WORKFLOW_TRANSITION |
| 7 | CONSULTANT_REVIEWING | RETURNED_TO_CONTRACTOR | CONSULTANT, REVIEWER | — | WORKFLOW_TRANSITION |
| 8 | RETURNED_TO_CONTRACTOR | DOCUMENT_DRAFT | CONTRACTOR | — | WORKFLOW_TRANSITION |
| 9 | CONSULTANT_REVIEWING | CONSULTANT_APPROVED | CONSULTANT | — | WORKFLOW_TRANSITION |
| 10 | CONSULTANT_APPROVED | SUBMITTED_TO_EMPLOYER | CONSULTANT, PROJECT_ADMIN | — | WORKFLOW_TRANSITION |
| 11 | SUBMITTED_TO_EMPLOYER | EMPLOYER_REVIEWING | EMPLOYER, REVIEWER | — | WORKFLOW_TRANSITION |
| 12 | EMPLOYER_REVIEWING | RETURNED_BY_EMPLOYER | EMPLOYER, REVIEWER | — | WORKFLOW_TRANSITION |
| 13 | RETURNED_BY_EMPLOYER | DOCUMENT_DRAFT | CONTRACTOR | — | WORKFLOW_TRANSITION |
| 14 | EMPLOYER_REVIEWING | EMPLOYER_APPROVED | EMPLOYER | — | WORKFLOW_TRANSITION |
| 15 | EMPLOYER_APPROVED | DOCUMENT_LOCKED | FINANCIAL_CONTROLLER, PROJECT_ADMIN | **LOCK** | LOCK + WORKFLOW_TRANSITION |
| 16 | DOCUMENT_LOCKED | EXPORT_READY | FINANCIAL_CONTROLLER | locked | WORKFLOW_TRANSITION |
| 17 | EXPORT_READY | EXPORTED_TO_TAKSA | FINANCIAL_CONTROLLER, SYSTEM_ADMIN | locked | EXPORT + WORKFLOW_TRANSITION |

```mermaid
stateDiagram-v2
    [*] --> PROJECT_DRAFT
    PROJECT_DRAFT --> PROJECT_ACTIVE
    PROJECT_ACTIVE --> DOCUMENT_DRAFT
    DOCUMENT_DRAFT --> MEASUREMENT_IN_PROGRESS
    MEASUREMENT_IN_PROGRESS --> CONTRACTOR_INTERNAL_CHECK
    CONTRACTOR_INTERNAL_CHECK --> SUBMITTED_TO_CONSULTANT
    SUBMITTED_TO_CONSULTANT --> CONSULTANT_REVIEWING
    CONSULTANT_REVIEWING --> RETURNED_TO_CONTRACTOR
    RETURNED_TO_CONTRACTOR --> DOCUMENT_DRAFT
    CONSULTANT_REVIEWING --> CONSULTANT_APPROVED
    CONSULTANT_APPROVED --> SUBMITTED_TO_EMPLOYER
    SUBMITTED_TO_EMPLOYER --> EMPLOYER_REVIEWING
    EMPLOYER_REVIEWING --> RETURNED_BY_EMPLOYER
    RETURNED_BY_EMPLOYER --> DOCUMENT_DRAFT
    EMPLOYER_REVIEWING --> EMPLOYER_APPROVED
    EMPLOYER_APPROVED --> DOCUMENT_LOCKED
    DOCUMENT_LOCKED --> EXPORT_READY
    EXPORT_READY --> EXPORTED_TO_TAKSA
    EXPORTED_TO_TAKSA --> [*]
```

### Lock Effects and Revision/Versioning

- Reaching `DOCUMENT_LOCKED` sets `isLocked = true` and `lockedAt`. Once locked, the case and its financial children are **immutable**. Any mutation attempt outside the workflow engine must fail (`assertNotLocked`).
- **Corrections after lock/approval never mutate the locked record.** Instead, a new `WorkflowCase` revision is created (`revision = prev.revision + 1`, `supersedesId = prev.id`) that re-enters the workflow at `DOCUMENT_DRAFT`. The locked original remains as the historical record of truth.
- Every transition — including LOCK and EXPORT — writes an `AuditLog` row inside the same transaction. A transition that cannot also write its audit record must roll back entirely (atomicity guarantees Correctness Property 5).

### Transition Rule Representation

```typescript
type TransitionRule = {
  from: WorkflowState;
  to: WorkflowState;
  allowedRoles: Role[];
  locks?: boolean;
  auditActions: AuditAction[];
};

// Single source of truth; the engine reads only from this table.
const TRANSITIONS: ReadonlyArray<TransitionRule> = [ /* rows 1..17 above */ ];
```

---

## Server-Side Permission Model

### Principles
- **Deny by default.** Absence of an explicit allow is a denial.
- **Layered checks** on every Server Action / Route Handler, in order: (1) authenticated user, (2) project membership or system-admin, (3) role permits the action, (4) workflow state permits the action, (5) document not locked (for mutations).
- UI may hide controls for UX, but hiding is never a security boundary.

### Helper Signatures with Formal Specifications

#### `canAccessProject(user, projectId)`
```typescript
function canAccessProject(user: AuthUser, projectId: string): Promise<boolean>
```
**Preconditions:** `user` is an authenticated `AuthUser`; `projectId` is a well-formed id.
**Postconditions:** Returns `true` iff `user.systemRole === SYSTEM_ADMIN` **or** a `ProjectMember` exists for `(projectId, user.id)`. No mutations. No throw (pure query).

#### `requireProjectAccess(user, projectId)`
```typescript
function requireProjectAccess(user: AuthUser, projectId: string): Promise<ProjectMembership>
```
**Preconditions:** as above.
**Postconditions:** Returns the membership (synthetic membership for system admin) when access is granted; otherwise throws `ForbiddenError`. No mutations.

#### `requireRole(user, roles, projectId?)`
```typescript
function requireRole(user: AuthUser, roles: Role[], projectId?: string): void
```
**Preconditions:** `roles` non-empty.
**Postconditions:** Returns normally iff the user's effective role (project role if `projectId` given, else `systemRole`) is in `roles`, or user is `SYSTEM_ADMIN`; otherwise throws `ForbiddenError`. No mutations.

#### `assertCanTransition(case_, to, role)`
```typescript
function assertCanTransition(case_: WorkflowCase, to: WorkflowState, role: Role): void
```
**Preconditions:** `case_` loaded with current `state` and `isLocked`.
**Postconditions:** Returns normally iff a `TransitionRule` exists with `from === case_.state`, `to`, and `role ∈ allowedRoles` (or `role === SYSTEM_ADMIN`); otherwise throws `WorkflowError`. No mutations.

#### `assertNotLocked(case_)`
```typescript
function assertNotLocked(case_: WorkflowCase): void
```
**Preconditions:** `case_` loaded with `isLocked`.
**Postconditions:** Returns normally iff `case_.isLocked === false`; otherwise throws `LockedError`. No mutations.

### Algorithmic Pseudocode — Guarded Transition

```pascal
ALGORITHM executeTransition(userCtx, caseId, targetState)
INPUT: authenticated userCtx, caseId, targetState
OUTPUT: updated WorkflowCase
BEGIN
  user ← requireUser(userCtx)                       // else UnauthorizedError

  case ← db.workflowCase.find(caseId)
  ASSERT case ≠ NULL                                // else NotFoundError

  requireProjectAccess(user, case.projectId)        // else ForbiddenError
  effectiveRole ← resolveEffectiveRole(user, case.projectId)
  assertCanTransition(case, targetState, effectiveRole)  // else WorkflowError

  IF transitionIsMutation(case.state, targetState) THEN
    assertNotLocked(case)                           // else LockedError
  END IF

  BEGIN TRANSACTION
    rule ← lookupRule(case.state, targetState)
    updated ← db.workflowCase.update(case.id, {
        state: targetState,
        isLocked: case.isLocked OR (rule.locks = true),
        lockedAt: IF rule.locks THEN now() ELSE case.lockedAt
    })
    audit.record({
        actorUserId: user.id, projectId: case.projectId,
        workflowCaseId: case.id, action: WORKFLOW_TRANSITION,
        fromState: case.state, toState: targetState
    }, tx)                                          // same tx -> CP5 atomicity
  COMMIT TRANSACTION

  RETURN updated
END
```

**Loop invariants:** N/A (no loops). **Atomicity invariant:** state change and audit insert succeed or fail together.

---

## Calculation Engine (Decimal-safe contracts)

```typescript
import { Decimal } from "decimal.js"; // or Prisma.Decimal

type Money = Decimal; // never `number`

function sum(values: Money[]): Money
// pre: every value is a valid Decimal
// post: result === Σ values, computed with decimal arithmetic; no float involved

function applyPercentage(base: Money, percent: Decimal): Money
// pre: percent expressed as e.g. 0.1 for 10%
// post: result === base * percent under decimal rules; deterministic rounding policy applied

function netAfterDeductions(gross: Money, deductions: Money[]): Money
// pre: gross >= 0
// post: result === gross - sum(deductions); decimal-only; rounding mode = ROUND_HALF_UP, scale 4
```

**Rounding policy:** A single, centrally-defined rounding mode (`ROUND_HALF_UP`, scale 4) is used across all financial computations to keep results deterministic and audit-reproducible. No `Number`, `parseFloat`, or `*`/`+` on JS numbers for money.

---

## Design-Token System and UI Composition

### Token Layer (formal, typed)

Brand identity is centralized in `src/design/tokens.ts` and surfaced as CSS variables in `globals.css`. Components consume tokens only — **no raw hex in components**.

```typescript
export const tokens = {
  color: {
    primaryNavy:   "#071E41",
    secondaryNavy: "#0B2A5B",
    goldAccent:    "#D6A21E",
    iceBackground: "#F8FAFC",
    textDark:      "#111827",
    softCyan:      "#22B8CF",
    success:       "#0F766E",
    warning:       "#F59E0B",
    danger:        "#DC2626",
  },
  status: { // semantic status colors mapped to palette
    ok: "#0F766E", warn: "#F59E0B", error: "#DC2626", info: "#22B8CF",
  },
  surface: {
    base: "#F8FAFC",
    panel: "rgba(255,255,255,0.72)",      // glass panel fill
    panelStrong: "rgba(255,255,255,0.85)",
  },
  glass: {
    blur: "16px",
    border: "1px solid rgba(255,255,255,0.35)",
    shadow: "0 8px 32px rgba(7,30,65,0.12)",
  },
  border: { subtle: "rgba(17,24,39,0.08)", strong: "rgba(17,24,39,0.16)" },
  shadow: { sm: "0 1px 2px rgba(7,30,65,0.06)", md: "0 4px 12px rgba(7,30,65,0.10)", lg: "0 8px 32px rgba(7,30,65,0.14)" },
  radius: { sm: "6px", md: "10px", lg: "16px", pill: "999px" },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px" },
  z: { base: 0, header: 100, sidebar: 90, overlay: 1000, modal: 1100, toast: 1200 },
  focus: { ring: "0 0 0 3px rgba(34,184,207,0.45)" },
  font: { sans: "var(--font-iranyekanx)", weights: { regular: 400, medium: 500, bold: 700 } },
} as const;
```

### UI Composition Strategy
- **Minimalism as base layer**: clean spacing, restrained color, high contrast for trust.
- **Liquid glass** for shells and major panels (AppShell frame, primary nav, top bar).
- **Glass morphism** for dashboard/inbox cards (translucent surface + subtle border/shadow).
- **Very subtle neomorphism** only for soft depth on a few elevated controls — never the dominant style.
- **Forbidden**: random gradients, excessive blur, low-contrast text, mobile-app visual noise, copying legacy Taksa UI.
- The aesthetic target is official, engineering-focused, enterprise-grade, premium, Persian-first, RTL-first.

---

## Font, RTL, and i18n Setup

- **RTL by default**: root `<html dir="rtl" lang="fa">`; logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`) preferred over left/right.
- **Persian-first**: UI copy authored in Persian; an i18n string module (`src/lib/i18n`) centralizes strings so future locales can be added without component edits. Numerals and dates use Persian-aware formatting helpers.
- **Font**: IRANYekanX Pro wired via `next/font/local` from `src/assets/fonts/iranyekanx/*.woff2`, exposed as `--font-iranyekanx`. The `.woff2` files are produced by the font-extraction build step (below). Inclusion is contingent on the owner's licensing permission; if not permitted, the design falls back to a permissively-licensed Persian web font with no code changes beyond the font import.

```typescript
// src/app/layout.tsx (excerpt)
import localFont from "next/font/local";
const iranYekanX = localFont({
  src: [
    { path: "../assets/fonts/iranyekanx/regular.woff2", weight: "400" },
    { path: "../assets/fonts/iranyekanx/medium.woff2",  weight: "500" },
    { path: "../assets/fonts/iranyekanx/bold.woff2",    weight: "700" },
  ],
  variable: "--font-iranyekanx",
  display: "swap",
});
```

---

## Taksa Compatibility (raw preservation + reference master data)

Karman treats Taksa sources (the Taksa database, SQL scripts, SVZT/BRVT/PSNT
files, Excel templates, official PDFs, and the extracted research package) as
**first-class source / reference / master-data inputs** — they are not ignored,
and they are not the live runtime operational database. The operational runtime
DB is, and remains, **PostgreSQL** via Prisma; Taksa-derived data is
imported/mapped *into* PostgreSQL as reference/master data that calculations,
reports, validation, and golden tests rely on.

This foundation ships the **shape** of that interoperability across two distinct
layers — the raw preservation layer (built) and the reference master-data
mapping layer (contracts built) — not the full parsers/importers.

### The reference-data pipeline

```text
Taksa sources (DB / SQL / SVZT / BRVT / PSNT / Excel / PDF / research)
   → staging / extraction
   → RAW PRESERVATION layer        (src/server/taksa; TaksaArtifact/RawTable/RawRow)
   → REFERENCE MAPPING layer       (src/server/reference; map* contracts)
   → normalized PostgreSQL tables  (Reference* models)
   → calculations / reports / validation / golden tests
```

### Operational vs reference data (the explicit distinction)

- **Operational runtime data** (User, Project, Contract, WorkflowCase, AuditLog,
  …) is the live transactional state of the application. PostgreSQL is its
  single source of truth.
- **Reference / master data** (فهرست‌بها items, units, resources, شاخص indices,
  بخشنامه circulars, ضرایب coefficients, کسورات deductions) is imported/mapped
  from Taksa/official sources into normalized PostgreSQL `Reference*` tables and
  consumed by the calculation/report/validation layers.
- **Raw preservation vs reference master data:** raw preservation
  (`src/server/taksa`) keeps every original Taksa row byte-for-byte for
  round-trip safety and is intentionally *not* usable business data; reference
  master data (`src/server/reference`) is the usable normalized form.
  `ReferenceMapping` bridges a raw preserved row to the normalized entity it
  produced.

### Raw preservation contract (Correctness Property CP7)

1. `TaksaRawTable.rawTableName` stores the original Taksa table name verbatim and
   is never normalized.
2. `TaksaRawTable.tableOrder` and `TaksaRawRow.rowOrder` preserve original
   ordering; `@@unique` constraints enforce stability.
3. `TaksaRawRow.rawJson` stores the original row content unmodified. Application
   edits go to `patchJson` (non-destructive overlay), so the raw source remains
   reconstructable.
4. `checksum` fields at artifact/table/row granularity enable integrity
   verification and round-trip equality checks.
5. `importStatus` / `exportStatus` track lifecycle without coupling to
   operational workflow state.

### Reference master-data layer (models + contracts)

New Prisma models normalize Taksa-derived reference data into PostgreSQL with
full provenance and an explicit mapping-status lifecycle:

- **Provenance roots:** `ReferenceSource` (the originating Taksa artifact, typed
  by `ReferenceSourceType`), `ReferenceImportRun` (one import execution).
- **Normalized reference entities:** `ReferenceBook` / `ReferenceChapter`
  (typed by `ReferenceBookType`), `ReferenceUnit`, `ReferenceItem` (فهرست‌بها),
  `ReferenceResource` (منابع), `ReferenceIndexPeriod` (شاخص),
  `ReferenceCircular` (بخشنامه), `ReferenceCoefficientRule` (ضرایب),
  `ReferenceDeductionRule` (کسورات).
- **Bridge:** `ReferenceMapping` links a raw source row (sourceType,
  rawTableName, rawRowId/rawRowOrder/rawCode, checksum) to the normalized entity
  (`normalizedEntityType`, `normalizedEntityId`) with a `mappingStatus`.

Every normalized entity carries provenance (sourceId/importRunId, rawTableName,
rawCode/rawRowOrder, rawJson, checksum) and a `ReferenceMappingStatus`
(`RAW → MAPPED → VERIFIED`, with `CONFLICT`/`DEPRECATED` reachable). All numeric
reference values (`unitPrice`, `indexValue`, `coefficientValue`, `rate`,
`fixedValue`) are `Decimal @db.Decimal(18,4)` — never Float/Int/number.

The service contracts live in `src/server/reference/` (`createReferenceSource`,
`startReferenceImportRun`, `completeReferenceImportRun`, `mapReference*`,
`getReferenceItemByCode`, `getIndexPeriod`, `getReferenceMapping`). They persist
the normalized shape and the mapping link, but do **not** perform a full Taksa DB
restore, SVZT/BRVT/PSNT parsing, or PDF parsing — those importers are future work
that will call these contracts.

**HARD RULE — no hard-coded official values:** official values (شاخص /
فهرست‌بها / ردیف / واحد / منبع / ضریب / کسورات / بخشنامه / تعدیل) must come from
imported/mapped reference data, never from code constants. Every `map*` helper
requires the caller to supply the value (sourced from a real import); none invent
or default a numeric reference value, and no sample official numbers are seeded.

Export to Taksa is only reachable through the workflow (`EXPORT_READY →
EXPORTED_TO_TAKSA`) and is fully audited. See `docs/REFERENCE_DATA.md` and
`docs/TAKSA_COMPATIBILITY.md` for the full model/lifecycle documentation.

---

## Error Handling

Typed domain errors in `src/lib/errors.ts`, mapped to HTTP/UX consistently:

| Error | Cause | Transport mapping | UX |
|-------|-------|-------------------|----|
| `UnauthorizedError` | No/invalid session | 401 | redirect to Login |
| `ForbiddenError` | Role/membership denies action | 403 | inline "no permission" state |
| `NotFoundError` | Entity missing or not visible | 404 | empty/not-found state |
| `WorkflowError` | Invalid from/to transition or role | 409 | actionable message |
| `LockedError` | Mutation of locked document | 409 | prompt to create revision |
| `ValidationError` | Bad input | 422 | field-level messages |

Errors never leak secrets or stack traces to clients in production; full detail is logged server-side. All authorization/workflow failures are also candidates for audit logging.

---

## Testing Strategy

### Unit Testing
- Permission helpers (`canAccessProject`, `requireRole`, `assertNotLocked`) with table-driven role/membership matrices.
- Workflow engine: every row of the transition table (allowed) plus a sample of disallowed transitions (rejected).
- Calculation engine: decimal correctness and rounding policy.

### Property-Based Testing
- **Library**: `fast-check` (TypeScript).
- Generate random `(from, to, role)` triples and assert `assertCanTransition` accepts **iff** a matching rule exists (Correctness Property 3).
- Generate random money inputs and assert engine outputs equal decimal-computed expectations and never involve float artifacts (Correctness Property 6).
- Generate random Taksa table/row sequences and assert persisted order + raw JSON are byte-stable after a simulated load/dump (Correctness Property 7).

### Integration Testing
- Server Actions / Route Handlers against a test PostgreSQL (Prisma migrations applied): auth → permission → transition → audit, asserting an `AuditLog` row exists for every successful transition and that locked cases reject mutations.

---

## Security Considerations
- Passwords stored as salted hashes (argon2/bcrypt); constant-time comparison.
- Sessions via httpOnly, secure, sameSite cookies; CSRF protection on mutating routes/actions.
- All secrets via environment variables; **no hard-coded secrets** anywhere (enforced by `.gitignore` + review).
- Deny-by-default authorization enforced server-side on every mutation and sensitive read.
- Append-only `AuditLog`; locked records immutable; corrections via revision.
- Input validation at the transport boundary (e.g., `zod`) before reaching the domain layer.

## Performance Considerations
- Indexed foreign keys and frequent lookup columns (state, role, email, audit timestamps).
- Server Components for data-heavy reads to minimize client payload; pagination for audit/inbox lists.
- Singleton Prisma client to avoid connection exhaustion; connection pooling configured for the deployment target.

## Deployment / Environment Configuration

Deploy-ready from day one; no hard-coded secrets.

**`.env.example` (documented):**
```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/karman?schema=public"
# Auth
SESSION_SECRET="replace-with-strong-random-value"
# App
NEXT_PUBLIC_APP_URL="https://your-domain.example"
NODE_ENV="production"
```

**Operational docs (in `docs/DEPLOYMENT.md`):**
- Provision PostgreSQL; set `DATABASE_URL`.
- `npx prisma migrate deploy` to apply migrations; `npm run seed` to create one initial SYSTEM_ADMIN user (roles are a Prisma enum, not seeded rows).
- `npm run build` then `npm run start` for production; health check at `/api/health`.
- Generate strong `SESSION_SECRET`; never commit `.env`.

## Documentation Plan
The implementation must produce (referenced from the design):
- `docs/ARCHITECTURE.md` — layers, modules, data flow.
- `docs/DESIGN_SYSTEM.md` — tokens, glass/minimal composition rules, RTL conventions.
- `docs/ROLES_AND_PERMISSIONS.md` — roles, server-side enforcement model, helper usage.
- `docs/WORKFLOW.md` — states, transition table, lock/revision rules, audit mapping.
- `docs/DEPLOYMENT.md` — env vars, migrations, build/start, production notes.
- `docs/TAKSA_COMPATIBILITY.md` — raw preservation + reference master data; the operational-vs-reference distinction.
- `docs/REFERENCE_DATA.md` — reference master-data models, enums, provenance fields, mapping-status lifecycle, and the no-hard-coded-official-values rule.
- `docs/taksa-map/` — only safe documentation files extracted from the research archive.

## Repository Hygiene / .gitignore Strategy

The final application commit must **not** contain sensitive/raw Taksa material or build cruft. `.gitignore` must cover:
- Raw Taksa DB/source files: `*.DB`, `*.MDB`, `*.mdb`, `*.svzt`, `*.brvt`, `*.psnt`, `*.bak`, `*.backup`
- Recovered/sensitive text: `readable_strings*`, `taksa_passwords_found*`, raw `sql_objects.txt`
- Binaries: `*.exe`, `*.dll`, `*.ocx`, `*.sys`
- Archives once no longer needed: `*.zip`, `*.rar` (including the original IRANYekanX `.rar` — not committed in the final app unless explicitly permitted)
- `private-assets/`
- Environment files: `.env`, `.env.*` (except `.env.example`)
- Standard: `node_modules/`, `.next/`, build output, logs

**Rule:** Do not commit sensitive/raw Taksa files, DB backups, passwords, readable strings, EXE/DLL/OCX/SYS/MDB, or sensitive SVZT files in the final app commit.

## Archive Extraction (build-time steps, NOT design-time)

The committed archives are processed during implementation, sequenced as explicit tasks. Their intended extracted outputs:

| Archive | Extraction target | Notes |
|---------|-------------------|-------|
| `docs/_incoming/taksa_web_research_all_docs_roadmap.zip` | `docs/taksa-map/` | Only safe documentation files; exclude any sensitive/raw DB/credential material |
| `public/brand/karman_brand_assets.zip` | `public/brand/logo.(png\|svg)`, `icon-512.png`, `favicon.png`, `og-image.png` | Wire favicon/OG via metadata |
| `private-assets/fonts/IRANYekanX Pro.rar` | `src/assets/fonts/iranyekanx/*.woff2` | Convert to `.woff2`, wire via `next/font/local`; subject to licensing permission |

After extraction, the original archives and any sensitive intermediate files are removed from version control per the hygiene rules above.

---

## Correctness Properties

These are formal, testable properties that later property-based and integration tests must verify. Notation: `∀` = for all.

**CP1 — Project access requires membership or system admin.**
`∀ user u, project p: canAccessProject(u, p) = true ⟺ (u.systemRole = SYSTEM_ADMIN ∨ ∃ ProjectMember m: m.projectId = p ∧ m.userId = u.id)`

**CP2 — Actions require permitting role.**
`∀ user u, action a: performed(u, a) ⟹ effectiveRole(u, a.projectId) ∈ allowedRoles(a) ∨ u.systemRole = SYSTEM_ADMIN`. No action executes when authorization fails.

**CP3 — Only valid transitions are accepted.**
`∀ case c, state t, role r: assertCanTransition(c, t, r) succeeds ⟺ ∃ rule ∈ TRANSITIONS: rule.from = c.state ∧ rule.to = t ∧ (r ∈ rule.allowedRoles ∨ r = SYSTEM_ADMIN)`. Invalid from/to combinations are always rejected.

**CP4 — Locked documents cannot be mutated silently.**
`∀ case c: c.isLocked = true ⟹ every mutation path either throws LockedError or routes through a new revision (revision' = revision + 1 ∧ supersedesId = c.id)`. The locked record is never altered in place.

**CP5 — Every transition produces an audit log.**
`∀ successful transition of case c from s to t by user u: ∃ AuditLog L created in the same transaction with L.action = WORKFLOW_TRANSITION ∧ L.fromState = s ∧ L.toState = t ∧ L.actorUserId = u.id ∧ L.workflowCaseId = c.id`. If the audit write fails, the transition rolls back.

**CP6 — Financial values never use floating-point arithmetic.**
`∀ monetary computation: operands and results are Decimal (Prisma.Decimal / decimal.js); no JS number/Float is used for amounts, and storage uses @db.Decimal(18,4)`.

**CP7 — Taksa raw rows preserve table name, row order, and raw JSON.**
`∀ TaksaRawRow row after load→store: row.rawTable.rawTableName, row.rowOrder, and row.rawJson are byte-identical to the source; edits exist only in patchJson`, guaranteeing round-trip reconstructability.
