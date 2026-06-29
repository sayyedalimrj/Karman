/**
 * Integration tests for the workflow engine + audit service against a REAL
 * PostgreSQL database (Prisma migrations applied).
 *
 * Validates CP5: Every successful transition produces an AuditLog in the SAME
 *   transaction; an audit-write failure rolls back the transition. (Req 7.1, 7.2)
 * Validates CP4: Locked documents cannot be mutated silently; corrections route
 *   through a new revision while the locked original is preserved. (Req 6.1, 6.2, 6.3)
 *
 * Only runs when RUN_DB_TESTS=1 (see vitest.config.ts).
 *
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AuditAction, Role, WorkflowState } from "@prisma/client";
import { prisma } from "@/server/db";
import { transition, reviseLockedCase } from "@/server/workflow/engine";
import { LockedError, WorkflowError } from "@/lib/errors";

const SUFFIX = `wf-${Date.now()}`;
const NON_EXISTENT_USER_ID = "00000000-0000-0000-0000-000000000000";

let actorId: string;
let projectId: string;
const createdUserIds: string[] = [];

async function makeCase(
  state: WorkflowState,
  opts: { isLocked?: boolean; revision?: number } = {},
): Promise<string> {
  const c = await prisma.workflowCase.create({
    data: {
      projectId,
      title: `case-${state}`,
      state,
      isLocked: opts.isLocked ?? false,
      lockedAt: opts.isLocked ? new Date() : null,
      revision: opts.revision ?? 1,
      createdById: actorId,
    },
    select: { id: true },
  });
  return c.id;
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      email: `actor-${SUFFIX}@karman.test`,
      fullName: "actor",
      passwordHash: "scrypt$00$00",
      systemRole: Role.SYSTEM_ADMIN,
    },
    select: { id: true },
  });
  actorId = admin.id;
  createdUserIds.push(admin.id);

  const project = await prisma.project.create({
    data: { code: `P-${SUFFIX}`, name: "Workflow Project", createdById: actorId },
    select: { id: true },
  });
  projectId = project.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { projectId } });
  // Delete revisions (which reference originals) before originals.
  await prisma.workflowCase.deleteMany({ where: { projectId, supersedesId: { not: null } } });
  await prisma.workflowCase.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("CP5 — transition + audit are atomic", () => {
  it("writes a WORKFLOW_TRANSITION audit row in the same transaction", async () => {
    const caseId = await makeCase(WorkflowState.DOCUMENT_DRAFT);
    const updated = await transition({
      caseId,
      to: WorkflowState.MEASUREMENT_IN_PROGRESS,
      actor: { userId: actorId, role: Role.CONTRACTOR },
    });
    expect(updated.state).toBe(WorkflowState.MEASUREMENT_IN_PROGRESS);

    const logs = await prisma.auditLog.findMany({
      where: { workflowCaseId: caseId, action: AuditAction.WORKFLOW_TRANSITION },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorUserId: actorId,
      fromState: WorkflowState.DOCUMENT_DRAFT,
      toState: WorkflowState.MEASUREMENT_IN_PROGRESS,
      entityType: "WorkflowCase",
    });
  });

  it("emits LOCK + WORKFLOW_TRANSITION and locks the case on the locking edge", async () => {
    const caseId = await makeCase(WorkflowState.EMPLOYER_APPROVED);
    const updated = await transition({
      caseId,
      to: WorkflowState.DOCUMENT_LOCKED,
      actor: { userId: actorId, role: Role.FINANCIAL_CONTROLLER },
    });
    expect(updated.state).toBe(WorkflowState.DOCUMENT_LOCKED);
    expect(updated.isLocked).toBe(true);
    expect(updated.lockedAt).not.toBeNull();

    const actions = (
      await prisma.auditLog.findMany({ where: { workflowCaseId: caseId } })
    ).map((l) => l.action);
    expect(actions).toContain(AuditAction.LOCK);
    expect(actions).toContain(AuditAction.WORKFLOW_TRANSITION);
  });

  it("rolls back the state change when the audit write fails", async () => {
    const caseId = await makeCase(WorkflowState.DOCUMENT_DRAFT);
    // A non-existent actor id makes the AuditLog FK insert fail inside the tx,
    // which must roll back the WorkflowCase.update performed earlier in the tx.
    await expect(
      transition({
        caseId,
        to: WorkflowState.MEASUREMENT_IN_PROGRESS,
        actor: { userId: NON_EXISTENT_USER_ID, role: Role.CONTRACTOR },
      }),
    ).rejects.toBeTruthy();

    const after = await prisma.workflowCase.findUniqueOrThrow({ where: { id: caseId } });
    expect(after.state).toBe(WorkflowState.DOCUMENT_DRAFT); // unchanged
    const logs = await prisma.auditLog.findMany({ where: { workflowCaseId: caseId } });
    expect(logs).toHaveLength(0); // no orphan audit row
  });
});

describe("CP4 — locked documents cannot be mutated silently", () => {
  it("rejects an invalid corrective edge out of a locked state", async () => {
    const caseId = await makeCase(WorkflowState.DOCUMENT_LOCKED, { isLocked: true });
    await expect(
      transition({
        caseId,
        to: WorkflowState.DOCUMENT_DRAFT,
        actor: { userId: actorId, role: Role.SYSTEM_ADMIN },
      }),
    ).rejects.toBeInstanceOf(WorkflowError);
  });

  it("throws LockedError when a normal edge would mutate a locked record, leaving it unchanged", async () => {
    // Simulate a record that is already locked while still in EMPLOYER_APPROVED.
    const caseId = await makeCase(WorkflowState.EMPLOYER_APPROVED, { isLocked: true });
    await expect(
      transition({
        caseId,
        to: WorkflowState.DOCUMENT_LOCKED,
        actor: { userId: actorId, role: Role.FINANCIAL_CONTROLLER },
      }),
    ).rejects.toBeInstanceOf(LockedError);

    const after = await prisma.workflowCase.findUniqueOrThrow({ where: { id: caseId } });
    expect(after.state).toBe(WorkflowState.EMPLOYER_APPROVED); // unchanged
    expect(after.isLocked).toBe(true);
  });

  it("revises a locked case into a NEW revision and preserves the locked original", async () => {
    const originalId = await makeCase(WorkflowState.DOCUMENT_LOCKED, {
      isLocked: true,
      revision: 1,
    });

    const revision = await reviseLockedCase({
      caseId: originalId,
      actor: { userId: actorId, role: Role.PROJECT_ADMIN },
    });

    expect(revision.id).not.toBe(originalId);
    expect(revision.revision).toBe(2);
    expect(revision.supersedesId).toBe(originalId);
    expect(revision.state).toBe(WorkflowState.DOCUMENT_DRAFT);
    expect(revision.isLocked).toBe(false);

    // Locked original is untouched.
    const original = await prisma.workflowCase.findUniqueOrThrow({ where: { id: originalId } });
    expect(original.state).toBe(WorkflowState.DOCUMENT_LOCKED);
    expect(original.isLocked).toBe(true);
    expect(original.revision).toBe(1);

    // The revision creation is audited.
    const createLog = await prisma.auditLog.findFirst({
      where: { workflowCaseId: revision.id, action: AuditAction.CREATE },
    });
    expect(createLog).not.toBeNull();
  });
});
