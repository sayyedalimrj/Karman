/**
 * Authenticated application layout (SERVER component).
 *
 * This is a real server-side authorization checkpoint: it resolves the current
 * user from the session via `getCurrentUser()` (inside `requirePageUser`) and
 * redirects unauthenticated visitors to `/login?next=...`. The middleware
 * redirect is only a presentation convenience; this server check is the one
 * that actually runs before any protected page renders.
 *
 * Only serializable user fields are passed to the (partly client) AppShell.
 *
 * Requirements: 2.5, 4.5, 10.3
 */
import * as React from "react";
import { headers } from "next/headers";
import { requirePageUser } from "@/server/auth/page-guard";
import { AppShell } from "@/components/shell";
import { t } from "@/lib/i18n";

/** Derives the top-bar / section title from the current path. */
function titleForPath(pathname: string): string {
  if (pathname.startsWith("/inbox")) return t.inbox.title;
  if (pathname.startsWith("/taksa/imports")) return t.taksa.imports.title;
  if (pathname.startsWith("/taksa/updates")) return t.taksa.updates.title;
  if (pathname.startsWith("/taksa/raw")) return t.taksa.raw.title;
  if (pathname.startsWith("/taksa")) return t.taksa.title;
  if (pathname.startsWith("/reference/sources")) return t.reference.sources.title;
  if (pathname.startsWith("/reference/library")) return t.reference.library.title;
  if (pathname.startsWith("/reference")) return t.reference.title;
  if (pathname.startsWith("/projects/setup")) return t.projectSetup.title;
  if (pathname.startsWith("/admin/data-diagnostics")) return t.admin.diagnostics.title;
  if (pathname.startsWith("/dashboard")) return t.dashboard.title;
  return t.app.name;
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerList = await headers();
  const pathname = headerList.get("x-karman-pathname") ?? "/dashboard";

  // Server-enforced auth: redirects to /login when there is no valid session.
  const user = await requirePageUser(pathname);

  return (
    <AppShell
      user={{ fullName: user.fullName, email: user.email, systemRole: user.systemRole }}
      title={titleForPath(pathname)}
      activePath={pathname}
    >
      {children}
    </AppShell>
  );
}
