/**
 * Workflow engine — validates and executes state transitions against the single
 * source-of-truth transition table (`transitions.ts`).
 *
 * Guarantees:
 * - Only edges present in `TRANSITIONS` are accepted; invalid from/to pairs are
 *   rejected even for SYSTEM_ADMIN (admins override the ROLE gate, not the
 *   existence of an edge). (CP3)
 * - A locked case is never silently mutated: a normal (non-export) transition
 *   on a locked case throws `LockedError`; corrections must go through
 *   `reviseLockedCase`, which creates a NEW revision and preserves the locked
 *   original unchanged. (CP4)
 * - State change and audit write are atomic: both happen inside one Prisma
 *   `$transaction`; if the audit write throws, the whole transition rolls back.
 *   (CP5)
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.1, 7.2, 4.2
 */
import { AuditAction, Role, WorkflowState, type WorkflowCase } from "@prisma/client";
import { prisma } from "@/server/db";
import { record as recordAudit } from "@/server/audit";
import { assertNotLocked } from "@/server/permissions";
import { NotFoundError, WorkflowError } from "@/lib/errors";
import { TRANSITIONS, isLockedState, type TransitionRule } from "./transitions";

/** Minimal shape the guards need — just the current state. */
export interface CaseState {
  state: WorkflowState;
}

/** The actor performing a transition; carries the audit identity + role gate. */
export interface TransitionActor {
  /** Authenticated user id recorded on the audit row. */
  userId: string;
  /** Effective role used for the transition's role gate. */
  role: Role;
}

/** Input to {@link transition}. */
export interface TransitionInput {
  caseId: string;
  to: WorkflowState;
  actor: TransitionActor;
  /** Optional, non-sensitive context recorded with the audit entry. */
  metadata?: Record<string, unknown>;
}

/** Input to {@link reviseLockedCase}. */
export interface ReviseInput {
  caseId: string;
  actor: TransitionActor;
  /** Optional, non-sensitive context recorded with the audit entry. */
  metadata?: Record<string, unknown>;
}

/**
 * Returns every transition rule whose `from` matches the given state. Pure; no
 * I/O. Useful for presenting available actions (presentation only — never an
 * authorization boundary).
 */
export function allowedTransitions(from: WorkflowState): TransitionRule[] {
  return TRANSITIONS.filter((rule) => rule.from === from);
}

/**
 * Looks up the unique rule for a directed edge, or `undefined` when the edge is
 * not in the table.
 */
export function lookupRule(
  from: WorkflowState,
  to: WorkflowState,
): TransitionRule | undefined {
  return TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}

/**
 * Asserts a transition is permitted: a rule must exist for `(case.state → to)`
 * AND `role` must be in the rule's `allowedRoles` OR be `SYSTEM_ADMIN`.
 *
 * SYSTEM_ADMIN overrides only the ROLE gate (for recovery); a non-existent edge
 * is rejected for everyone. Throws {@link WorkflowError} on failure. No I/O,
 * no mutation. (CP3)
 */
export function assertCanTransition(
  case_: CaseState,
  to: WorkflowState,
  role: Role,
): void {
  const rule = lookupRule(case_.state, to);
  if (!rule) {
    throw new WorkflowError(undefined, { from: case_.state, to });
  }
  const roleAllowed = role === Role.SYSTEM_ADMIN || rule.allowedRoles.includes(role);
  if (!roleAllowed) {
    throw new WorkflowError(undefined, { from: case_.state, to, role });
  }
}

/**
 * Executes a state transition atomically:
 *   1. validate the edge + role gate (`assertCanTransition`),
 *   2. reject silent mutation of a locked case on a non-export edge
 *      (`assertNotLocked` → `LockedError`),
 *   3. update the case state (and apply lock effects on reaching a locking
 *      state),
 *   4. write the audit row(s) (`WORKFLOW_TRANSITION` plus any rule actions such
 *      as `LOCK`/`EXPORT`) inside the SAME transaction,
 *   5. return the updated case.
 *
 * If any step throws — including the audit write — the entire transaction rolls
 * back, so the state change and its audit record are all-or-nothing. (CP5)
 */
export async function transition(input: TransitionInput): Promise<WorkflowCase> {
  const { caseId, to, actor, metadata } = input;

  return prisma.$transaction(async (tx) => {
    const case_ = await tx.workflowCase.findUnique({ where: { id: caseId } });
    if (!case_) {
      throw new NotFoundError();
    }

    assertCanTransition(case_, to, actor.role);
    // Non-null: assertCanTransition guarantees the rule exists.
    const rule = lookupRule(case_.state, to) as TransitionRule;

    // Export-flow edges (rows 16/17) legitimately operate on a locked case.
    // Any other edge must not mutate a locked record in place — corrections go
    // through reviseLockedCase instead. (CP4)
    if (!isLockedState(rule.from)) {
      assertNotLocked(case_);
    }

    const willLock = case_.isLocked || rule.locks === true;
    const updated = await tx.workflowCase.update({
      where: { id: case_.id },
      data: {
        state: to,
        isLocked: willLock,
        lockedAt: rule.locks === true ? new Date() : case_.lockedAt,
      },
    });

    // One immutable audit row per action the rule emits, in the same tx.
    for (const action of rule.auditActions) {
      await recordAudit(
        {
          actorUserId: actor.userId,
          projectId: case_.projectId,
          workflowCaseId: case_.id,
          action,
          entityType: "WorkflowCase",
          entityId: case_.id,
          fromState: case_.state,
          toState: to,
          metadata,
        },
        tx,
      );
    }

    return updated;
  });
}

/**
 * Creates a NEW revision of a locked case for corrections, preserving the
 * locked original unchanged. The new case re-enters the workflow at
 * `DOCUMENT_DRAFT` with `revision = prev.revision + 1` and
 * `supersedesId = prev.id`. The creation is audited inside the same
 * transaction. (CP4, revision/versioning)
 *
 * Throws {@link NotFoundError} when the case is missing, and
 * {@link WorkflowError} when the case is not locked (unlocked cases are edited
 * in place rather than revised).
 */
export async function reviseLockedCase(input: ReviseInput): Promise<WorkflowCase> {
  const { caseId, actor, metadata } = input;

  return prisma.$transaction(async (tx) => {
    const prev = await tx.workflowCase.findUnique({ where: { id: caseId } });
    if (!prev) {
      throw new NotFoundError();
    }
    if (!prev.isLocked) {
      throw new WorkflowError("فقط سند قفل‌شده را می‌توان به نسخهٔ جدید اصلاح کرد.", {
        caseId,
      });
    }

    const revision = await tx.workflowCase.create({
      data: {
        projectId: prev.projectId,
        title: prev.title,
        state: WorkflowState.DOCUMENT_DRAFT,
        isLocked: false,
        lockedAt: null,
        revision: prev.revision + 1,
        supersedesId: prev.id,
        createdById: actor.userId,
      },
    });

    await recordAudit(
      {
        actorUserId: actor.userId,
        projectId: prev.projectId,
        workflowCaseId: revision.id,
        action: AuditAction.CREATE,
        entityType: "WorkflowCase",
        entityId: revision.id,
        fromState: prev.state,
        toState: WorkflowState.DOCUMENT_DRAFT,
        metadata: { ...metadata, supersedesId: prev.id, revision: revision.revision },
      },
      tx,
    );

    // The locked original (`prev`) is intentionally never modified here.
    return revision;
  });
}
