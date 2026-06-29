/**
 * Workflow transition table — the SINGLE source of truth for the Karman
 * document/project state machine.
 *
 * The engine (`engine.ts`) reads ONLY from this table; there is no transition
 * logic encoded anywhere else. Each rule names the `from`/`to` states, the
 * roles permitted to perform the transition, whether reaching `to` LOCKS the
 * case, and the audit actions emitted inside the transition's transaction.
 *
 * The 17 rows below mirror the approved transition table in design.md exactly.
 * Global `SYSTEM_ADMIN` may perform recovery transitions (the engine overrides
 * the role gate for admins) but the from/to edge must still exist in this
 * table — admins do NOT get to invent edges.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 4.2 (and Correctness Property CP3)
 */
import { AuditAction, Role, WorkflowState } from "@prisma/client";

/**
 * A single transition rule. Immutable by construction (see `TRANSITIONS`).
 *
 * - `from` / `to`: the directed edge in the state machine.
 * - `allowedRoles`: effective roles permitted to perform the transition
 *   (SYSTEM_ADMIN is always additionally allowed by the engine for recovery).
 * - `locks`: when `true`, reaching `to` sets `isLocked = true` / `lockedAt`.
 * - `auditActions`: the audit action(s) recorded for the transition. Every row
 *   includes `WORKFLOW_TRANSITION`; lock/export rows add `LOCK` / `EXPORT`.
 */
export type TransitionRule = {
  readonly from: WorkflowState;
  readonly to: WorkflowState;
  readonly allowedRoles: readonly Role[];
  readonly locks?: boolean;
  readonly auditActions: readonly AuditAction[];
};

/**
 * The approved transition table (rows 1–17). The engine treats this as the
 * exhaustive set of legal edges; any (from, to) pair absent here is invalid.
 */
export const TRANSITIONS: readonly TransitionRule[] = [
  // 1
  {
    from: WorkflowState.PROJECT_DRAFT,
    to: WorkflowState.PROJECT_ACTIVE,
    allowedRoles: [Role.PROJECT_ADMIN],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 2
  {
    from: WorkflowState.PROJECT_ACTIVE,
    to: WorkflowState.DOCUMENT_DRAFT,
    allowedRoles: [Role.PROJECT_ADMIN, Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 3
  {
    from: WorkflowState.DOCUMENT_DRAFT,
    to: WorkflowState.MEASUREMENT_IN_PROGRESS,
    allowedRoles: [Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 4
  {
    from: WorkflowState.MEASUREMENT_IN_PROGRESS,
    to: WorkflowState.CONTRACTOR_INTERNAL_CHECK,
    allowedRoles: [Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 5
  {
    from: WorkflowState.CONTRACTOR_INTERNAL_CHECK,
    to: WorkflowState.SUBMITTED_TO_CONSULTANT,
    allowedRoles: [Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 6
  {
    from: WorkflowState.SUBMITTED_TO_CONSULTANT,
    to: WorkflowState.CONSULTANT_REVIEWING,
    allowedRoles: [Role.CONSULTANT, Role.REVIEWER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 7
  {
    from: WorkflowState.CONSULTANT_REVIEWING,
    to: WorkflowState.RETURNED_TO_CONTRACTOR,
    allowedRoles: [Role.CONSULTANT, Role.REVIEWER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 8
  {
    from: WorkflowState.RETURNED_TO_CONTRACTOR,
    to: WorkflowState.DOCUMENT_DRAFT,
    allowedRoles: [Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 9
  {
    from: WorkflowState.CONSULTANT_REVIEWING,
    to: WorkflowState.CONSULTANT_APPROVED,
    allowedRoles: [Role.CONSULTANT],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 10
  {
    from: WorkflowState.CONSULTANT_APPROVED,
    to: WorkflowState.SUBMITTED_TO_EMPLOYER,
    allowedRoles: [Role.CONSULTANT, Role.PROJECT_ADMIN],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 11
  {
    from: WorkflowState.SUBMITTED_TO_EMPLOYER,
    to: WorkflowState.EMPLOYER_REVIEWING,
    allowedRoles: [Role.EMPLOYER, Role.REVIEWER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 12
  {
    from: WorkflowState.EMPLOYER_REVIEWING,
    to: WorkflowState.RETURNED_BY_EMPLOYER,
    allowedRoles: [Role.EMPLOYER, Role.REVIEWER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 13
  {
    from: WorkflowState.RETURNED_BY_EMPLOYER,
    to: WorkflowState.DOCUMENT_DRAFT,
    allowedRoles: [Role.CONTRACTOR],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 14
  {
    from: WorkflowState.EMPLOYER_REVIEWING,
    to: WorkflowState.EMPLOYER_APPROVED,
    allowedRoles: [Role.EMPLOYER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 15 — LOCK
  {
    from: WorkflowState.EMPLOYER_APPROVED,
    to: WorkflowState.DOCUMENT_LOCKED,
    allowedRoles: [Role.FINANCIAL_CONTROLLER, Role.PROJECT_ADMIN],
    locks: true,
    auditActions: [AuditAction.LOCK, AuditAction.WORKFLOW_TRANSITION],
  },
  // 16 — case remains locked
  {
    from: WorkflowState.DOCUMENT_LOCKED,
    to: WorkflowState.EXPORT_READY,
    allowedRoles: [Role.FINANCIAL_CONTROLLER],
    auditActions: [AuditAction.WORKFLOW_TRANSITION],
  },
  // 17 — EXPORT (case remains locked)
  {
    from: WorkflowState.EXPORT_READY,
    to: WorkflowState.EXPORTED_TO_TAKSA,
    allowedRoles: [Role.FINANCIAL_CONTROLLER, Role.SYSTEM_ADMIN],
    auditActions: [AuditAction.EXPORT, AuditAction.WORKFLOW_TRANSITION],
  },
] as const;

/**
 * States in which a case is considered locked/immutable. A normal transition
 * that mutates a case already in one of these states (i.e. an edge whose `from`
 * is locked, such as rows 16 and 17) is still permitted because it is performed
 * BY the workflow engine itself; ad-hoc mutation outside the engine is rejected
 * via `assertNotLocked`. Corrections to a locked case must create a new
 * revision rather than mutate the locked record in place.
 */
export const LOCKED_STATES: readonly WorkflowState[] = [
  WorkflowState.DOCUMENT_LOCKED,
  WorkflowState.EXPORT_READY,
  WorkflowState.EXPORTED_TO_TAKSA,
] as const;

/** True when reaching `state` implies the case becomes locked. */
export function isLockedState(state: WorkflowState): boolean {
  return LOCKED_STATES.includes(state);
}
