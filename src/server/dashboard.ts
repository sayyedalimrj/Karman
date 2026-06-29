/**
 * Dashboard data loader — REAL Prisma queries only.
 *
 * Returns the projects the user can actually see (SYSTEM_ADMIN sees all; every
 * other user sees only projects where they hold a membership) plus counts
 * derived entirely from the database. There are NO invented numbers, sample
 * projects, or placeholder statistics — when the user has no projects the
 * result is genuinely empty and the UI shows a real empty state.
 *
 * Requirements: 10.4, 4.3 (visibility scoped to membership / system admin)
 */
import { Role } from "@prisma/client";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import type { AuthUser } from "@/server/auth/session";

export interface DashboardProject {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
}

export interface DashboardStats {
  projectCount: number;
  activeCaseCount: number;
  lockedCaseCount: number;
}

export interface DashboardData {
  projects: DashboardProject[];
  stats: DashboardStats;
}

/** Builds the project visibility filter for the given user. */
function projectScope(user: AuthUser): Prisma.ProjectWhereInput {
  if (user.systemRole === Role.SYSTEM_ADMIN) return {};
  return { members: { some: { userId: user.id } } };
}

/** Builds the workflow-case visibility filter (scoped to accessible projects). */
function caseScope(user: AuthUser): Prisma.WorkflowCaseWhereInput {
  if (user.systemRole === Role.SYSTEM_ADMIN) return {};
  return { project: { members: { some: { userId: user.id } } } };
}

export async function loadDashboardData(user: AuthUser): Promise<DashboardData> {
  const where = projectScope(user);
  const caseWhere = caseScope(user);

  const [projects, projectCount, activeCaseCount, lockedCaseCount] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, code: true, name: true, status: true },
    }),
    prisma.project.count({ where }),
    prisma.workflowCase.count({ where: { ...caseWhere, isLocked: false } }),
    prisma.workflowCase.count({ where: { ...caseWhere, isLocked: true } }),
  ]);

  return {
    projects,
    stats: { projectCount, activeCaseCount, lockedCaseCount },
  };
}
