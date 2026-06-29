/**
 * Server-side permission service — the authorization boundary for Karman.
 *
 * IMPORTANT: UI hiding is NOT authorization. Navigation may show or hide
 * controls for UX, but every sensitive read and every mutation MUST pass
 * through these helpers on the server. These functions are the real boundary;
 * `middleware.ts` only performs presentation-level redirects.
 *
 * Authorization is DENY-BY-DEFAULT: the absence of an explicit allow is a
 * denial. A global `SYSTEM_ADMIN` (`User.systemRole`) overrides project checks.
 * The per-project effective role comes from `ProjectMember.role`.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { ForbiddenError, LockedError } from "@/lib/errors";
import type { AuthUser } from "@/server/auth/session";

/** Membership granting a role within a project. */
export interface ProjectMembership {
  projectId: string;
  userId: string;
  role: Role;
  /** True when synthesized for a SYSTEM_ADMIN (no real ProjectMember row). */
  synthetic: boolean;
}

/** Minimal lockable shape; avoids coupling to the full WorkflowCase type. */
export interface Lockable {
  isLocked: boolean;
}

/**
 * Pure access query (no throw, no mutation).
 *
 * @returns `true` iff the user is a SYSTEM_ADMIN OR a ProjectMember row exists
 * for `(projectId, user.id)`.
 */
export async function canAccessProject(user: AuthUser, projectId: string): Promise<boolean> {
  if (user.systemRole === Role.SYSTEM_ADMIN) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true },
  });
  return membership !== null;
}

/**
 * Returns the user's project membership, or a synthetic membership for a
 * SYSTEM_ADMIN. Throws {@link ForbiddenError} when access is denied.
 */
export async function requireProjectAccess(
  user: AuthUser,
  projectId: string,
): Promise<ProjectMembership> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { projectId: true, userId: true, role: true },
  });

  if (membership) {
    return { ...membership, synthetic: false };
  }

  if (user.systemRole === Role.SYSTEM_ADMIN) {
    return {
      projectId,
      userId: user.id,
      role: Role.SYSTEM_ADMIN,
      synthetic: true,
    };
  }

  throw new ForbiddenError();
}

/**
 * Resolves the user's effective role for an authorization decision.
 *
 * - With `projectId`: the `ProjectMember.role` for that project, or
 *   `SYSTEM_ADMIN` if the user is a global admin with no project row, or `null`
 *   when the user has no role in the project.
 * - Without `projectId`: the user's global `systemRole`.
 */
export async function resolveEffectiveRole(
  user: AuthUser,
  projectId?: string,
): Promise<Role | null> {
  if (projectId === undefined) {
    return user.systemRole;
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  });
  if (membership) return membership.role;
  if (user.systemRole === Role.SYSTEM_ADMIN) return Role.SYSTEM_ADMIN;
  return null;
}

/**
 * Asserts the user's effective role is permitted. Passes iff the effective role
 * is in `roles` OR the user is a SYSTEM_ADMIN. Throws {@link ForbiddenError}
 * otherwise (deny-by-default).
 *
 * @param roles non-empty list of permitted roles.
 */
export async function requireRole(
  user: AuthUser,
  roles: Role[],
  projectId?: string,
): Promise<void> {
  if (user.systemRole === Role.SYSTEM_ADMIN) return;
  if (roles.length === 0) throw new ForbiddenError();

  const effective = await resolveEffectiveRole(user, projectId);
  if (effective === null || !roles.includes(effective)) {
    throw new ForbiddenError();
  }
}

/**
 * Guards against mutating a locked document. Throws {@link LockedError} when
 * `case_.isLocked` is true; returns normally otherwise.
 *
 * Note: this is only the lock guard. Workflow transition logic lives in the
 * workflow engine (a later task) and is intentionally not implemented here.
 */
export function assertNotLocked(case_: Lockable): void {
  if (case_.isLocked) {
    throw new LockedError();
  }
}
