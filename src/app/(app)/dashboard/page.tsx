/**
 * Project Dashboard (SERVER, protected).
 *
 * Re-validates the session server-side, then loads REAL data via Prisma
 * (`loadDashboardData`). With no accessible projects it renders the real empty
 * state; otherwise it renders DB-derived counts and the project list. No fake
 * stats, charts, or sample projects are produced.
 *
 * Requirements: 10.4, 4.3
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadDashboardData } from "@/server/dashboard";
import { canManageProjects } from "@/components/shell/nav";
import { ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { DashboardView } from "./DashboardView";

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");

  let data;
  try {
    data = await loadDashboardData(user);
  } catch {
    return (
      <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />
    );
  }

  return (
    <DashboardView data={data} canManageProjects={canManageProjects(user.systemRole)} />
  );
}
