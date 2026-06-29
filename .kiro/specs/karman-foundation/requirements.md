# Requirements Document

## Introduction

Karman is a production-grade, deploy-ready web platform for managing construction-project financial and review workflows, compatible with Taksa/Texsa concepts and architected for future Taksa import/export. This document specifies the requirements for the **foundation** release: the real architectural spine of the system — typed data models, server-enforced authorization, a formal workflow state machine with locking and revisioning, immutable audit logging, decimal-safe financial primitives, an RTL-first / Persian-first UI shell backed by a centralized design-token system, correctly-shaped Taksa compatibility placeholders, and deploy-ready environment configuration.

This is explicitly not an MVP, demo, or mock. Business screens may render empty states, but every underlying layer must be real, secure, typed, and built for long-term incremental development. These requirements are derived from the approved technical design (`design.md`) and its seven formal correctness properties.

The implementation stack is fixed: Next.js (App Router) + TypeScript, PostgreSQL as the operational database, Prisma ORM with Decimal-safe numeric handling, server-side permission enforcement, RTL/Persian-first UI, and audit logging from day one.

## Requirements

### Requirement 1: Application Foundation and Runtime

**User Story:** As a developer, I want a typed Next.js App Router application that runs and is server-deployable from day one, so that the team can build production features without re-architecting later.

#### Acceptance Criteria
1. WHEN the application is built and started THEN the system SHALL run successfully using the Next.js App Router with TypeScript.
2. WHEN any page renders THEN the system SHALL apply right-to-left (RTL) layout by default with Persian as the primary UI language.
3. THE system SHALL load IRANYekanX Pro as the Persian UI font via `next/font/local` using locally hosted `.woff2` files, subject to licensing permission, with a documented fallback Persian web font.
4. WHERE financial amounts are represented THE system SHALL use Decimal-safe types and SHALL NOT use JavaScript floating-point arithmetic.
5. THE system SHALL expose a health-check endpoint usable for deployment readiness verification.

### Requirement 2: Authentication and Session Management

**User Story:** As a user, I want to log in securely, so that only authenticated users can access the application.

#### Acceptance Criteria
1. THE system SHALL provide a Login page through which a user authenticates with credentials.
2. WHEN a user submits valid credentials THEN the system SHALL establish a session using an httpOnly, secure cookie.
3. WHEN a user submits invalid credentials THEN the system SHALL reject the request without establishing a session and SHALL NOT reveal which field was incorrect.
4. THE system SHALL store passwords only as salted hashes and SHALL compare them using a constant-time comparison.
5. WHEN an unauthenticated user requests a protected route THEN the system SHALL deny access and redirect to the Login page.

### Requirement 3: Operational Data Model

**User Story:** As a developer, I want a complete, typed Prisma schema, so that all foundational entities and relationships exist correctly from the start.

#### Acceptance Criteria
1. THE system SHALL define Prisma models for User, Project, ProjectMember, Contract, ProjectParty, WorkflowCase, AuditLog, Attachment, TaksaArtifact, TaksaRawTable, and TaksaRawRow.
2. THE system SHALL define a `Role` enum containing SYSTEM_ADMIN, PROJECT_ADMIN, EMPLOYER, CONSULTANT, CONTRACTOR, FINANCIAL_CONTROLLER, REVIEWER, VIEWER, and SUPPORT_ADMIN.
3. THE system SHALL define a `WorkflowState` enum containing all sixteen defined workflow states.
4. WHERE a model field stores a monetary amount THE system SHALL declare it as a Decimal column with explicit precision and scale (`@db.Decimal(18,4)`), including whole-currency amounts, and SHALL NOT permit monetary fields to be stored as Integer or Float types.
4a. THE system SHALL enforce decimal-only monetary fields through schema validation or linting rules so that a monetary field accidentally declared as Integer or Float is flagged.
5. THE system SHALL define indexes on foreign keys and frequent lookup columns, and SHALL enforce uniqueness constraints (e.g., unique project-user membership, unique Taksa row order within a table).
6. THE system SHALL provide a seed routine that creates one initial SYSTEM_ADMIN user using the Role enum.

### Requirement 4: Server-Side Authorization

**User Story:** As a security stakeholder, I want all authorization enforced on the server, so that hiding UI elements is never relied upon as a security boundary.

#### Acceptance Criteria
1. THE system SHALL enforce authorization on every API route handler and server action that reads sensitive data or performs a mutation.
2. THE system SHALL provide reusable permission helpers including `canAccessProject`, `requireProjectAccess`, `requireRole`, `assertCanTransition`, and `assertNotLocked`.
3. WHEN a user who is neither a project member nor a SYSTEM_ADMIN requests access to a project THEN the system SHALL deny access. (Derived from CP1)
4. WHEN a user attempts an action whose required roles do not include the user's effective role AND the user is not SYSTEM_ADMIN THEN the system SHALL deny the action. (Derived from CP2)
5. THE system SHALL deny by default, treating the absence of an explicit allow as a denial.
6. WHEN authorization is denied THEN the system SHALL return the appropriate error (Unauthorized or Forbidden) AND SHALL prevent the requested mutation from being performed; WHEN access is granted THEN the system SHALL NOT return an authorization error response.

### Requirement 5: Workflow State Machine

**User Story:** As a project administrator, I want a formal workflow with explicit, role-gated transitions, so that documents move through review predictably and invalid changes are impossible.

#### Acceptance Criteria
1. THE system SHALL represent allowed transitions in a single transition table specifying from-state, to-state, allowed roles, lock effect, and audit events.
2. WHEN a transition is requested for a from/to pair that has no matching rule THEN the system SHALL reject the transition. (Derived from CP3)
3. WHEN a transition is requested by a user whose effective role is not allowed for that transition AND the user is not SYSTEM_ADMIN THEN the system SHALL reject the transition. (Derived from CP3)
4. WHEN a transition rule with matching from/to and an allowed role is requested THEN the system SHALL accept and execute the transition. (Derived from CP3)
5. WHEN a case reaches the DOCUMENT_LOCKED state THEN the system SHALL set the case as locked and record the lock timestamp.

### Requirement 6: Document Locking and Revisioning

**User Story:** As a financial controller, I want locked documents to be immutable and corrections to use versioning, so that approved records are never silently changed.

#### Acceptance Criteria
1. WHEN a mutation is attempted on a locked case THEN the system SHALL reject the mutation with a Locked error and SHALL NOT alter the locked record. (Derived from CP4)
2. WHEN a locked or approved document requires correction THEN the system SHALL create a new revision (incremented revision number, referencing the prior record via supersedes) rather than mutating the original. (Derived from CP4)
3. THE system SHALL preserve the locked original record as the historical source of truth after a revision is created.

### Requirement 7: Audit Logging

**User Story:** As an auditor, I want every workflow transition and sensitive mutation recorded immutably, so that the full history is reconstructable.

#### Acceptance Criteria
1. WHEN a workflow transition completes successfully THEN the system SHALL create an AuditLog entry recording actor, from-state, to-state, action, and workflow case, within the same database transaction as the state change. (Derived from CP5)
2. IF the audit record cannot be written THEN the system SHALL roll back the entire transition so no state change persists without its audit entry. (Derived from CP5)
3. THE system SHALL treat AuditLog as append-only and SHALL NOT update or delete existing audit entries.

### Requirement 8: Decimal-Safe Financial Computation

**User Story:** As a financial controller, I want all monetary computation to be decimal-exact, so that amounts are never corrupted by floating-point error.

#### Acceptance Criteria
1. THE system SHALL provide calculation primitives (sum, applyPercentage, netAfterDeductions) that operate exclusively on Decimal values. (Derived from CP6)
2. THE system SHALL NOT use JavaScript `number`/`Float` types for any monetary operand, intermediate value, or result, including whole-currency amounts. WHEN a monetary computation receives a JavaScript `number` (e.g., from legacy code or a third-party library) THEN the system SHALL reject the computation by throwing an error immediately rather than coercing the value. (Derived from CP6)
3. THE system SHALL apply a single, centrally defined rounding policy (ROUND_HALF_UP, scale 4) across all financial computations.

### Requirement 9: Taksa Compatibility Placeholders and Round-Trip Preservation

**User Story:** As an integration engineer, I want correctly-shaped Taksa placeholder models, so that future import/export can faithfully reproduce Taksa sources.

#### Acceptance Criteria
1. THE system SHALL provide TaksaArtifact, TaksaRawTable, and TaksaRawRow models with import status, export status, and checksum fields.
2. THE system SHALL preserve the original Taksa table name verbatim, the original table order, and the original row order. (Derived from CP7)
3. THE system SHALL store the original raw row content unmodified in a raw JSON field, and SHALL record any edits in a separate patch JSON field without altering the raw content. (Derived from CP7)
4. THE system SHALL NOT implement full Taksa import/export logic in this foundation, and SHALL treat Taksa sources as reference/import-export only — never the runtime operational database.

### Requirement 10: Design System and UI Shell

**User Story:** As a designer, I want a centralized design-token system and an enterprise-grade UI shell, so that the brand is consistent and no raw hex values are scattered across components.

#### Acceptance Criteria
1. THE system SHALL centralize the Karman palette and visual primitives (colors, surfaces, glass panels, borders, shadows, radius, spacing, typography, z-index, status colors, focus states) in a single design-token layer.
2. THE system SHALL NOT hard-code raw hex color values inside individual components.
3. THE system SHALL provide an AppShell that is official, minimal, glass-styled, and enterprise-grade, rendered for authenticated routes.
4. THE system SHALL provide a Project Dashboard empty state, an Inbox empty state, and a Project Setup placeholder.
5. WHERE navigation controls are shown or hidden in the UI THE system SHALL treat this as presentation only and SHALL NOT rely on it for authorization.

### Requirement 11: Deployment and Environment Configuration

**User Story:** As an operator, I want deploy-ready configuration with no hard-coded secrets, so that the application can be deployed to a server using environment variables.

#### Acceptance Criteria
1. THE system SHALL provide an `.env.example` documenting all required environment variables (database URL, session secret, app URL, node environment).
2. THE system SHALL NOT contain hard-coded secrets anywhere in the codebase.
3. THE system SHALL provide documented instructions for database migration, seeding, build, and start.
4. WHEN all required environment variables are provided THEN the system SHALL be deployable to a server without code changes; environment variables are necessary but not sufficient for deployment, and the system SHALL still require other prerequisites (installed dependencies, applied migrations, correct build configuration) to be satisfied.

### Requirement 12: Repository Hygiene

**User Story:** As a maintainer, I want strict ignore rules, so that sensitive Taksa material and build cruft never enter version control.

#### Acceptance Criteria
1. THE system SHALL provide a `.gitignore` that actually prevents the following from being tracked: raw Taksa DB/source files (`*.DB`, `*.MDB`, `*.mdb`, `*.svzt`, `*.brvt`, `*.psnt`, `*.bak`, `*.backup`), recovered sensitive text (`readable_strings*`, `taksa_passwords_found*`, raw `sql_objects.txt`), binaries (`*.exe`, `*.dll`, `*.ocx`, `*.sys`), archives no longer needed, `private-assets/`, and environment files except `.env.example`.
2. THE system SHALL NOT commit sensitive or raw Taksa files, database backups, passwords, readable strings, or executable binaries in the final application commit.
3. THE system SHALL NOT commit the original IRANYekanX `.rar` font archive in the final application commit unless explicitly permitted by the owner.

### Requirement 13: Documentation

**User Story:** As a new team member, I want foundational documentation, so that I can understand architecture, design, permissions, workflow, deployment, and Taksa compatibility.

#### Acceptance Criteria
1. THE system SHALL provide documentation files: `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROLES_AND_PERMISSIONS.md`, `docs/WORKFLOW.md`, `docs/DEPLOYMENT.md`, and `docs/TAKSA_COMPATIBILITY.md`.
2. THE system SHALL place only safe documentation files extracted from the research archive into `docs/taksa-map/`.

### Requirement 14: Archive Extraction (Build-Time Sequencing)

**User Story:** As a build engineer, I want archive extraction sequenced as explicit build steps, so that research, brand, and font assets are produced safely and not at design time.

#### Acceptance Criteria
1. THE system SHALL extract only safe documentation files from the research archive into `docs/taksa-map/`.
2. THE system SHALL produce brand assets (`logo.png`/`logo.svg`, `icon-512.png`, `favicon.png`, `og-image.png`) under `public/brand/` from the brand archive.
3. THE system SHALL produce IRANYekanX `.woff2` files under `src/assets/fonts/iranyekanx/` from the font archive and wire them via `next/font/local`.
4. WHEN extraction is complete THEN the system SHALL remove original archives and sensitive intermediate files from version control per repository hygiene rules.
