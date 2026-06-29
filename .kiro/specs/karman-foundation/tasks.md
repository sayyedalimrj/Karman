# Implementation Plan: Karman Foundation

## Overview

This plan converts the approved design into a series of incremental, production-minded coding steps that build the real architectural spine of Karman — typed Next.js App Router + TypeScript, RTL/Persian-first UI shell, centralized design tokens, a complete Prisma schema, server-enforced authorization, a formal workflow state machine with locking and revisioning, immutable audit logging, decimal-safe financial primitives, Taksa compatibility placeholders, and deploy-ready configuration.

Each task builds on prior tasks and ends with wiring things together so there is no orphaned code. Business screens render real empty states, but every underlying layer is real, secure, and typed. Tasks marked with `*` are optional test sub-tasks. Property-based tests (fast-check) validate the universal correctness properties CP3, CP6, and CP7; integration tests validate CP1, CP2, CP4, and CP5.

## Tasks

- [x] 1. Project scaffolding and RTL-first foundation
  - [x] 1.1 Initialize Next.js App Router + TypeScript project configuration
    - Create `package.json` (Next.js, React, TypeScript, scripts for `dev`, `build`, `start`, `seed`), `tsconfig.json` (strict mode, path aliases for `@/`), `next.config.js`, and `eslint`/`prettier` config
    - Establish the `src/` App Router directory layout (`src/app`, `src/server`, `src/lib`, `src/components`, `src/design`, `src/assets`) per the design's module structure
    - _Requirements: 1.1_

  - [x] 1.2 Create RTL/Persian-first root layout
    - Implement `src/app/layout.tsx` with `<html dir="rtl" lang="fa">`, font CSS variable slot, and base providers
    - Create initial `src/app/globals.css` with base RTL resets using logical properties (`margin-inline`, `padding-inline`, `inset-inline`)
    - _Requirements: 1.2, 1.3_

  - [x] 1.3 Add repository hygiene rules
    - Create `.gitignore` covering raw Taksa DB/source files (`*.DB`, `*.MDB`, `*.mdb`, `*.svzt`, `*.brvt`, `*.psnt`, `*.bak`, `*.backup`), recovered sensitive text (`readable_strings*`, `taksa_passwords_found*`, raw `sql_objects.txt`), binaries (`*.exe`, `*.dll`, `*.ocx`, `*.sys`), archives (`*.zip`, `*.rar`), `private-assets/`, environment files (`.env`, `.env.*` except `.env.example`), and standard build cruft (`node_modules/`, `.next/`, logs)
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 2. Build-time archive extraction steps
  - [x] 2.1 Extract research archive to docs map
    - Add a build/utility script that extracts ONLY safe documentation files from `docs/_incoming/taksa_web_research_all_docs_roadmap.zip` into `docs/taksa-map/`, excluding any sensitive/raw DB or credential material
    - _Requirements: 14.1, 13.2_

  - [x] 2.2 Extract brand assets and wire metadata
    - Add a build/utility script that produces `public/brand/logo.(png|svg)`, `icon-512.png`, `favicon.png`, and `og-image.png` from `public/brand/karman_brand_assets.zip`
    - Wire favicon and Open Graph image via Next.js metadata in the root layout/metadata module
    - _Requirements: 14.2_

  - [x] 2.3 Extract Persian font and wire via next/font/local
    - Add a build/utility script that produces IRANYekanX `.woff2` files under `src/assets/fonts/iranyekanx/` from `private-assets/fonts/IRANYekanX Pro.rar` (subject to licensing permission)
    - Wire the font in `src/app/layout.tsx` via `next/font/local` exposing `--font-iranyekanx`, with a documented permissively-licensed Persian fallback font
    - _Requirements: 1.3, 14.3_

  - [x] 2.4 Remove archives and sensitive intermediates from version control
    - Delete original archives and any sensitive intermediate files after extraction, ensuring `.gitignore` rules prevent re-tracking
    - _Requirements: 14.4, 12.2, 12.3_

- [x] 3. Centralized design-token system
  - [x] 3.1 Implement typed design tokens
    - Create `src/design/tokens.ts` as the single typed source of truth for the Karman palette and visual primitives (colors, status colors, surfaces, glass, borders, shadows, radius, spacing, z-index, focus ring, typography), matching the design's token object
    - _Requirements: 10.1, 10.2_

  - [x] 3.2 Surface tokens as CSS variables
    - Extend `src/app/globals.css` to declare CSS custom properties derived from the design tokens so components consume tokens/variables and never raw hex
    - _Requirements: 10.1, 10.2, 1.2_

- [x] 4. Core libraries
  - [x] 4.1 Implement typed domain errors
    - Create `src/lib/errors.ts` defining `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `WorkflowError`, `LockedError`, and `ValidationError` with consistent transport-mapping metadata (401/403/404/409/422)
    - _Requirements: 4.6_

  - [x] 4.2 Implement decimal-safe money helpers and rounding policy
    - Create `src/lib/money.ts` wrapping `Prisma.Decimal`/`decimal.js`, defining the `Money` type, a central rounding policy (ROUND_HALF_UP, scale 4), and a guard that throws when a JS `number` is supplied as a monetary operand
    - _Requirements: 1.4, 8.3_

  - [x] 4.3 Implement i18n string module
    - Create `src/lib/i18n/` centralizing Persian UI strings and locale/numeral/date formatting helpers so future locales need no component edits
    - _Requirements: 1.2_

- [x] 5. Data layer (Prisma)
  - [x] 5.1 Create Prisma singleton client
    - Implement `src/server/db.ts` exposing a singleton Prisma client as the only DB access path, configured for connection reuse
    - _Requirements: 3.1_

  - [x] 5.2 Define the full base Prisma schema
    - Create `prisma/schema.prisma` with PostgreSQL datasource and all models (User, Project, ProjectMember, Contract, ProjectParty, WorkflowCase, AuditLog, Attachment, TaksaArtifact, TaksaRawTable, TaksaRawRow) and all enums (Role with the 9 roles, ProjectStatus, the 16-value WorkflowState, PartyType, AuditAction, TaksaImportStatus, TaksaExportStatus)
    - Implement the named `ProjectCreatedBy` relation (`Project.createdBy` ↔ `User.createdProjects`), the `CaseCreatedBy` and `CaseRevision` relations, all monetary fields as `@db.Decimal(18,4)`, UUID PKs, timestamps, indexes on FKs/lookup columns, and uniqueness constraints (`@@unique([projectId, userId])`, `@@unique([rawTableId, rowOrder])`, etc.)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Enforce decimal-only monetary fields
    - Add a schema-validation/lint rule (e.g., a check script or custom ESLint/Prisma lint) that flags any monetary field declared as Integer or Float instead of `@db.Decimal(18,4)`
    - _Requirements: 3.4a_

  - [x] 5.4 Create the initial database migration
    - Generate the initial Prisma migration from the schema so the operational database can be provisioned via `prisma migrate deploy`
    - _Requirements: 3.1, 11.3_

  - [x] 5.5 Implement the seed routine
    - Create `prisma/seed.ts` that creates ONE initial SYSTEM_ADMIN user using the `Role` enum and the salted password-hash helper; do NOT seed role rows (roles are a Prisma enum)
    - _Requirements: 3.6_

- [x] 6. Checkpoint - Foundation builds and migrates
  - Ensure the project builds, the schema migrates, and the seed runs; ask the user if questions arise.

- [ ] 7. Authentication and session foundation
  - [ ] 7.1 Implement password hashing
    - Create `src/server/auth/password.ts` providing salted-hash creation (argon2/bcrypt) and a constant-time comparison function
    - _Requirements: 2.4_

  - [ ] 7.2 Implement session management
    - Create `src/server/auth/session.ts` establishing sessions via httpOnly, secure, sameSite cookies signed with `SESSION_SECRET`, plus `getCurrentUser`/`requireUser` resolution
    - _Requirements: 2.2_

  - [ ] 7.3 Implement auth route handler
    - Create `src/app/api/auth/route.ts` for login/logout: validate input, verify credentials with constant-time compare, set the session cookie on success, and reject invalid credentials without revealing which field was wrong and without establishing a session
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.4 Implement health-check endpoint
    - Create `src/app/api/health/route.ts` returning deployment readiness (including a basic DB connectivity check)
    - _Requirements: 1.5_

  - [ ]* 7.5 Write unit tests for auth
    - Test password hashing/constant-time compare, invalid-credential rejection (no field disclosure), and cookie attributes (httpOnly/secure)
    - _Requirements: 2.2, 2.3, 2.4_

- [ ] 8. Server-side permission service
  - [ ] 8.1 Implement permission helpers
    - Create `src/server/permissions/` implementing `canAccessProject`, `requireProjectAccess`, `requireRole`, and `assertNotLocked` with deny-by-default semantics and effective-role resolution (project role vs `systemRole`, SYSTEM_ADMIN override) per the formal specifications
    - Ensure denied access returns Unauthorized/Forbidden and prevents mutation, while granted access returns no auth error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 8.2 Implement route-protection middleware
    - Create `middleware.ts` that resolves the session and redirects unauthenticated requests for protected routes to the Login page (presentation/redirect only; not the authorization boundary)
    - _Requirements: 2.5, 4.5_

  - [ ]* 8.3 Write unit tests for permission helpers
    - Table-driven role/membership matrices for `canAccessProject`, `requireRole`, `assertNotLocked`, and deny-by-default behavior
    - _Requirements: 4.2, 4.5_

  - [ ]* 8.4 Write integration tests for project access and role gating
    - **Validates CP1: Project access requires membership or system admin** (Requirements 4.3)
    - **Validates CP2: Actions require a permitting role** (Requirements 4.4)
    - Exercise server-action/route flows against a test PostgreSQL: non-member non-admin denied; disallowed role denied; SYSTEM_ADMIN allowed
    - _Requirements: 4.3, 4.4_

- [ ] 9. Checkpoint - Auth and permissions enforce server-side
  - Ensure all tests pass and protected routes are server-enforced; ask the user if questions arise.

- [ ] 10. Workflow state machine
  - [ ] 10.1 Implement states, transition table, and transition guards
    - Create `src/server/workflow/transitions.ts` with the single `TRANSITIONS` table (rows 1–17: from, to, allowedRoles, locks, auditActions) and `src/server/workflow/engine.ts` exposing `allowedTransitions` and `assertCanTransition` (matching from/to with role gate or SYSTEM_ADMIN), reading only from the table
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 4.2_

  - [ ]* 10.2 Write property test for transition validity
    - **Property CP3: Only valid transitions are accepted**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - Use fast-check to generate random `(from, to, role)` triples and assert `assertCanTransition` succeeds iff a matching rule exists (or role is SYSTEM_ADMIN)
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 10.3 Implement the transition engine with lock and revision effects
    - Implement `transition(input)` to run guards, apply lock effects (set `isLocked`/`lockedAt` on reaching DOCUMENT_LOCKED), and create a new revision (`revision + 1`, `supersedesId`) for corrections after lock/approval instead of mutating the locked record; wire the same-transaction audit write
    - _Requirements: 5.5, 6.1, 6.2, 6.3_

  - [ ]* 10.4 Write unit tests for engine lock and revision behavior
    - Test every allowed transition row plus a sample of rejected ones; assert locked-case mutation throws LockedError and corrections create a superseding revision while preserving the locked original
    - _Requirements: 5.5, 6.1, 6.2, 6.3_

- [ ] 11. Audit service
  - [ ] 11.1 Implement append-only audit service
    - Create `src/server/audit/` exposing `record(entry, tx)` that writes immutable AuditLog rows inside the caller's transaction; never updates or deletes existing entries
    - _Requirements: 7.1, 7.3_

  - [ ]* 11.2 Write integration tests for audit atomicity and lock immutability
    - **Validates CP5: Every successful transition produces an AuditLog in the same transaction; audit-write failure rolls back the transition** (Requirements 7.1, 7.2)
    - **Validates CP4: Locked documents cannot be mutated silently** (Requirements 6.1)
    - Assert an AuditLog row exists for each successful transition with correct actor/from/to, that a simulated audit failure rolls back the state change, and that mutating a locked case is rejected
    - _Requirements: 7.1, 7.2, 6.1_

- [ ] 12. Decimal-safe calculation engine
  - [ ] 12.1 Implement calculation engine contracts
    - Create `src/server/calc/` implementing `sum`, `applyPercentage`, and `netAfterDeductions` operating exclusively on `Decimal`, applying the central ROUND_HALF_UP scale-4 policy, and throwing immediately when any operand is a JS `number`
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 12.2 Write property test for decimal-safe computation
    - **Property CP6: Financial values never use floating-point arithmetic**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - Use fast-check to generate random decimal money inputs and assert outputs equal decimal-computed expectations with the central rounding policy, and that supplying a JS `number` throws
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Taksa compatibility placeholder services
  - [ ] 13.1 Implement Taksa placeholder service contracts
    - Create `src/server/taksa/` with placeholder service contracts that preserve `rawTableName` verbatim, `tableOrder`/`rowOrder`, and `rawJson` unmodified, routing edits only to `patchJson`, with import/export status and checksum handling; no full import/export logic, and Taksa is reference/import-export only (never the runtime DB)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 13.2 Write property test for Taksa round-trip preservation
    - **Property CP7: Taksa raw rows preserve table name, row order, and raw JSON**
    - **Validates: Requirements 9.2, 9.3**
    - Use fast-check to generate random table/row sequences and assert persisted order and `rawJson` are byte-stable after a simulated load→store, with edits confined to `patchJson`
    - _Requirements: 9.2, 9.3_

  - [x] 13.3 Implement Taksa-derived reference master-data layer
    - Add normalized reference Prisma models + enums (ReferenceSource, ReferenceImportRun, ReferenceBook, ReferenceChapter, ReferenceUnit, ReferenceItem, ReferenceResource, ReferenceIndexPeriod, ReferenceCircular, ReferenceCoefficientRule, ReferenceDeductionRule, ReferenceMapping; ReferenceSourceType/ReferenceMappingStatus/ReferenceBookType) with provenance fields, Decimal(18,4) numerics, and the `add_reference_master_data` migration
    - Create `src/server/reference/` mapping contracts (`createReferenceSource`, `startReferenceImportRun`, `completeReferenceImportRun`, `mapReference*`, lookups) that carry provenance, set explicit mapping status, write a ReferenceMapping bridge from raw rows to normalized entities, and reject hard-coded/JS-number official values; no full Taksa parsing
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x]* 13.4 Write reference master-data tests
    - DB-free unit/property tests: Decimal-only numerics reject JS numbers; explicit mapping-status lifecycle; guard that no official values are hard-coded in service code
    - DB-backed (`*.int.test.ts`, RUN_DB_TESTS=1): provenance preserved through mapping; ReferenceMapping links raw source info to normalized entities with correct type/id
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

- [ ] 14. Checkpoint - Domain layer complete
  - Ensure all property and integration tests pass; ask the user if questions arise.

- [ ] 15. UI shell and pages
  - [ ] 15.1 Implement the AppShell and glass components
    - Create `src/components/shell/` (AppShell, GlassPanel, Sidebar, TopBar) and the authenticated `src/app/(app)/layout.tsx`, applying design tokens with glass/minimal/enterprise styling; navigation is presentation-only and never an authorization boundary
    - _Requirements: 10.3, 10.5_

  - [ ] 15.2 Implement UI and state primitives
    - Create `src/components/ui/` primitives and `src/components/states/` (EmptyState, ErrorState) consuming design tokens only (no raw hex)
    - _Requirements: 10.1, 10.2_

  - [ ] 15.3 Implement the Login page
    - Create `src/app/(auth)/login/page.tsx` posting to the auth route, using i18n strings and design tokens
    - _Requirements: 2.1_

  - [ ] 15.4 Implement the Project Dashboard empty state
    - Create `src/app/(app)/dashboard/page.tsx` rendering a real empty state within the AppShell
    - _Requirements: 10.4_

  - [ ] 15.5 Implement the Inbox empty state
    - Create `src/app/(app)/inbox/page.tsx` rendering a real empty state within the AppShell
    - _Requirements: 10.4_

  - [ ] 15.6 Implement the Project Setup placeholder
    - Create `src/app/(app)/projects/setup/page.tsx` rendering a real placeholder within the AppShell
    - _Requirements: 10.4_

- [ ] 16. Documentation and deployment configuration
  - [ ] 16.1 Create environment configuration
    - Create `.env.example` documenting `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, and `NODE_ENV`, with no hard-coded secrets anywhere in the codebase
    - _Requirements: 11.1, 11.2_

  - [ ] 16.2 Author foundational documentation
    - Create `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROLES_AND_PERMISSIONS.md`, `docs/WORKFLOW.md`, `docs/DEPLOYMENT.md` (migration/seed/build/start instructions), and `docs/TAKSA_COMPATIBILITY.md`
    - _Requirements: 13.1, 11.3, 11.4_

- [ ] 17. Final checkpoint - Deploy-ready verification
  - Ensure all tests pass and the application is server-deployable via environment variables; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP, though they validate the formal correctness properties and are recommended.
- Each task references specific requirements (and correctness properties where applicable) for traceability.
- Property-based tests use fast-check and validate universal properties CP3 (transitions), CP6 (decimal-safe math), and CP7 (Taksa round-trip).
- Integration tests validate CP1/CP2 (authorization), CP4 (lock immutability), and CP5 (audit atomicity) against a test PostgreSQL.
- Checkpoints ensure incremental validation at natural breaks.
- All authorization is enforced server-side; UI navigation visibility is presentation-only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1", "3.1", "4.1", "4.2", "4.3", "16.1"] },
    { "id": 1, "tasks": ["1.2", "5.2", "15.2"] },
    { "id": 2, "tasks": ["3.2", "5.1", "5.4", "2.2", "15.1"] },
    { "id": 3, "tasks": ["2.3", "5.3", "7.1", "7.2", "8.1", "11.1"] },
    { "id": 4, "tasks": ["5.5", "7.3", "7.4", "10.1", "12.1", "13.1", "15.3"] },
    { "id": 5, "tasks": ["2.4", "7.5", "8.2", "8.3", "10.2", "10.3", "12.2", "13.2", "15.4", "15.5", "15.6"] },
    { "id": 6, "tasks": ["8.4", "10.4", "11.2", "16.2"] }
  ]
}
```
