/**
 * Shared server-side guard for the admin data-sync API routes.
 *
 * Every data-sync API (run / status / runs) is SYSTEM_ADMIN-only and enforced
 * HERE on the server — deny-by-default. PROJECT_ADMIN, VIEWER, and
 * unauthenticated callers are rejected with 401/403 before any handler logic
 * runs. UI hiding is never the boundary; this is.
 */
import { Role } from "@prisma/client";
import { getCurrentUser, type AuthUser } from "@/server/auth/session";
import { requireRole } from "@/server/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type AdminGuardResult =
  | { ok: true; user: AuthUser }
  | { ok: false; status: 401 | 403 };

/** Resolves the current user and asserts SYSTEM_ADMIN. No throw for authz. */
export async function requireSystemAdmin(): Promise<AdminGuardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  try {
    await requireRole(user, [Role.SYSTEM_ADMIN]);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthorizedError) {
      return { ok: false, status: 403 };
    }
    throw e;
  }
  return { ok: true, user };
}
