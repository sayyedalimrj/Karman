/**
 * Operational Workbench (SERVER, protected) — «میز کار عملیاتی کارمان».
 *
 * Re-validates the session server-side, then loads the REAL operational status
 * via Prisma (`loadWorkbenchData`): reference master-data counts, raw Taksa
 * counts, scoped project/contract counts, scoped workflow counts, and a
 * data-readiness assessment. Every number comes from a real query — no fake
 * stats, charts, or sample projects. When required reference groups are missing
 * the view shows the exact readiness warning.
 *
 * Requirements: 10.4, 4.3, 15.1
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadWorkbenchData } from "@/server/workbench/dashboard";
import { ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { WorkbenchView } from "./WorkbenchView";

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");

  let data;
  try {
    data = await loadWorkbenchData(user);
  } catch {
    return (
      <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />
    );
  }

  return <WorkbenchView data={data} />;
}
