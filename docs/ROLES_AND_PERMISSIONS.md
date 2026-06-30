# Roles and Permissions

Karman enforces **all** authorization on the server. UI hiding is a UX
convenience and is **never** a security boundary. This document describes the
roles, how an effective role is resolved, the permission helpers, and the
enforcement model as actually implemented in `src/server/permissions` and
`src/server/auth`.

## Roles

Roles are a Prisma `Role` enum (not seeded rows). There are **9** roles:

| Role | Typical responsibility |
|------|------------------------|
| `SYSTEM_ADMIN` | Global administrator; can access any project and override the role gate on workflow transitions (for recovery). |
| `PROJECT_ADMIN` | Manages a project: activation, project setup, submitting to employer, locking. |
| `EMPLOYER` | Employer-side review and approval. |
| `CONSULTANT` | Consultant-side review, return, and approval. |
| `CONTRACTOR` | Drafts documents, performs measurement, internal checks, resubmits returns. |
| `FINANCIAL_CONTROLLER` | Locks approved documents and drives the export-to-Taksa flow. |
| `REVIEWER` | Review participation alongside consultant/employer stages. |
| `VIEWER` | Read-only participation (default global role for new users). |
| `SUPPORT_ADMIN` | Support/operations global role. |

## Global role vs per-project role

There are two role dimensions:

- **`User.systemRole`** — the user's **global** role. `SYSTEM_ADMIN` grants
  access everywhere; the default for a new user is `VIEWER`.
- **`ProjectMember.role`** — the user's role **scoped to a single project**.
  A user may hold different roles in different projects.

### Effective-role resolution (`resolveEffectiveRole`)

`resolveEffectiveRole(user, projectId?)`:

- **Without `projectId`** → the user's global `systemRole`.
- **With `projectId`** → the `ProjectMember.role` for that project; if no
  membership row exists but the user is `SYSTEM_ADMIN`, the effective role is
  `SYSTEM_ADMIN`; otherwise `null` (no role in the project).

## Deny-by-default

Authorization is **deny-by-default**: the absence of an explicit allow is a
denial. Every sensitive read and every mutation must pass through the helpers
below on the server.

## Permission helpers (`src/server/permissions/index.ts`)

| Helper | Behavior |
|--------|----------|
| `canAccessProject(user, projectId)` | Pure query (no throw, no mutation). Returns `true` iff the user is `SYSTEM_ADMIN` **or** a `ProjectMember` row exists for `(projectId, user.id)`. (CP1) |
| `requireProjectAccess(user, projectId)` | Returns the membership, or a **synthetic** membership for a `SYSTEM_ADMIN`; throws `ForbiddenError` when denied. |
| `resolveEffectiveRole(user, projectId?)` | Resolves the effective role as described above. |
| `requireRole(user, roles, projectId?)` | Passes iff the effective role is in `roles` **or** the user is `SYSTEM_ADMIN`; throws `ForbiddenError` otherwise. An empty `roles` list denies (deny-by-default). (CP2) |
| `assertNotLocked(case_)` | Throws `LockedError` when `case_.isLocked` is true; returns normally otherwise. |

Workflow-specific authorization (`assertCanTransition`) lives in the workflow
engine (`src/server/workflow/engine.ts`) — see [`WORKFLOW.md`](./WORKFLOW.md).

### Errors (`src/lib/errors.ts`)

| Error | Transport |
|-------|-----------|
| `UnauthorizedError` | 401 — no/invalid session (redirect to login) |
| `ForbiddenError` | 403 — role/membership denies the action |
| `LockedError` | 409 — mutation of a locked document |
| `NotFoundError` | 404 — entity missing/not visible |
| `WorkflowError` | 409 — invalid transition / role |
| `ValidationError` | 422 — bad input |

## Authentication and sessions (`src/server/auth`)

- **Passwords** (`password.ts`): salted `scrypt` hashes encoded as
  `scrypt$<saltHex>$<hashHex>`, verified with a constant-time comparison.
  A per-process `dummyHash` equalizes work for unknown accounts to defeat
  user-enumeration via timing.
- **Sessions** (`session.ts`): a stateless, HMAC-signed token
  (`<base64url(payload)>.<base64url(sig)>`) stored in an **httpOnly**,
  `sameSite=lax`, `path=/` cookie named `karman_session`; `secure` is set in
  every non-development environment. The payload carries only the user id and
  an issued-at timestamp — never the password hash or any secret. The current
  user is always re-resolved from the database, so deactivated/removed users
  lose access immediately. `SESSION_SECRET` is read from the environment and
  the app fails fast if it is missing.

## Two layers: middleware (presentation) vs server (boundary)

- **`middleware.ts`** is a **redirect-only convenience**. It is edge-safe and
  only inspects the structural shape of the session cookie to redirect clearly
  unauthenticated visitors of `(app)` routes to `/login`. It imports no Prisma
  or Node-only code and **grants no access**. It also forwards the current
  pathname via the `x-karman-pathname` header as presentation metadata only.
- **Page guards** (`src/server/auth/page-guard.ts`): `requirePageUser` performs
  a real `redirect()` to `/login?next=…` when there is no valid session;
  `redirectIfAuthenticated` bounces already-authenticated users away from
  `/login`. Guards always re-resolve the user server-side.
- **The permission service** (`src/server/permissions`) is the **real
  authorization boundary** for every sensitive read and mutation.

## UI hiding is not authorization

Navigation is permission-**aware** for UX only (`src/components/shell/nav.ts`):
everyone authenticated sees Dashboard and Inbox; Project Setup is surfaced only
to roles that can manage projects (`canManageProjects`: `SYSTEM_ADMIN` or
`PROJECT_ADMIN`); the system-administration section is shown only to
`SYSTEM_ADMIN` and is rendered as an honest, intentionally-disabled
"coming soon" group (no fake page). Hiding or showing a control **never**
substitutes for a server-side check — the server pages and actions are the
boundary. For example, the Project Setup page re-checks the role server-side and
renders an honest "no access" state for users whose global role cannot manage
projects.

## Correctness properties

- **CP1** — Project access requires membership or system admin
  (`canAccessProject`).
- **CP2** — Actions require a permitting role (`requireRole`).

These are validated by `src/server/permissions/permissions.test.ts` (and the
DB-backed integration tests where applicable).
