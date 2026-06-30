/**
 * Server-side page guards for App Router pages/layouts.
 *
 * These complement (and do NOT replace) the permission service. Unlike
 * `requireUser` (which throws `UnauthorizedError` for the API transport), page
 * guards perform a real `redirect()` so unauthenticated visitors land on the
 * login page, and already-authenticated visitors are bounced away from /login.
 *
 * The guard always re-resolves the user from the session server-side; preview
 * or middleware presence is never trusted as authorization.
 *
 * Requirements: 2.5, 4.5
 */
import { redirect } from "next/navigation";
import type { Route } from "next";
import { Role } from "@prisma/client";
import { getCurrentUser, type AuthUser } from "@/server/auth/session";
import { sanitizeNextPath, DEFAULT_NEXT_PATH } from "@/lib/next-path";

/**
 * Requires an authenticated session for a protected page. Redirects to
 * `/login?next=<path>` when there is no valid session. Returns the user
 * otherwise.
 */
export async function requirePageUser(nextPath?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const safe = sanitizeNextPath(nextPath, DEFAULT_NEXT_PATH);
    redirect(`/login?next=${encodeURIComponent(safe)}` as Route);
  }
  return user;
}

/**
 * Requires an authenticated SYSTEM_ADMIN for an admin-only page. Redirects
 * unauthenticated visitors to `/login?next=<path>` and non-admin authenticated
 * users to the dashboard (forbidden → bounce). Returns the admin user
 * otherwise. This is a real server-side authorization checkpoint.
 */
export async function requireSystemAdminPage(nextPath?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const safe = sanitizeNextPath(nextPath, DEFAULT_NEXT_PATH);
    redirect(`/login?next=${encodeURIComponent(safe)}` as Route);
  }
  if (user.systemRole !== Role.SYSTEM_ADMIN) {
    redirect(DEFAULT_NEXT_PATH as Route);
  }
  return user;
}
export async function redirectIfAuthenticated(nextPath?: string): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    redirect(sanitizeNextPath(nextPath, DEFAULT_NEXT_PATH) as Route);
  }
}
