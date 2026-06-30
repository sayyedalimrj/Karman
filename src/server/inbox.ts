/**
 * Inbox data loader — REAL Prisma queries only.
 *
 * Returns the in-flight workflow cases for projects the user can access
 * (SYSTEM_ADMIN sees all; others see only cases in projects where they hold a
 * membership). Locked/terminal cases are excluded — these are the items that
 * still need attention. No fabricated tasks or cards are ever produced; an
 * empty result yields a real empty state.
 *
 * Requirements: 10.4, 4.3
 */
import { Role } from "@prisma/client";
import type { Prisma, WorkflowState } from "@prisma/client";
import { prisma } from "@/server/db";
import type { AuthUser } from "@/server/auth/session";

export interface InboxItem {
  id: string;
  title: string;
  state: WorkflowState;
  projectName: string;
  updatedAt: Date;
}

function caseScope(user: AuthUser): Prisma.WorkflowCaseWhereInput {
  if (user.systemRole === Role.SYSTEM_ADMIN) return { isLocked: false };
  return {
    isLocked: false,
    project: { members: { some: { userId: user.id } } },
  };
}

export async function loadInboxItems(user: AuthUser): Promise<InboxItem[]> {
  const cases = await prisma.workflowCase.findMany({
    where: caseScope(user),
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      state: true,
      updatedAt: true,
      project: { select: { name: true } },
    },
  });

  return cases.map((c) => ({
    id: c.id,
    title: c.title,
    state: c.state,
    projectName: c.project.name,
    updatedAt: c.updatedAt,
  }));
}
