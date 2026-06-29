/**
 * Project Setup (SERVER, protected).
 *
 * A REAL read-only placeholder for the future project-creation flow. It is an
 * honest "coming next" state — it does NOT create or display any fake project
 * data. Visibility of the entry point is presentation-only; the real boundary
 * for future creation will be enforced server-side by the project-creation
 * action (PROJECT_ADMIN / SYSTEM_ADMIN).
 *
 * Users whose global role cannot manage projects see a clear, honest
 * "no access" state rather than the placeholder form skeleton.
 *
 * Requirements: 10.4, 4.2
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { canManageProjects } from "@/components/shell/nav";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";

export default async function ProjectSetupPage() {
  const user = await requirePageUser("/projects/setup");

  if (!canManageProjects(user.systemRole)) {
    return (
      <ErrorState
        title={t.projectSetup.forbiddenTitle}
        description={t.projectSetup.forbiddenDescription}
      />
    );
  }

  return (
    <EmptyState
      title={t.projectSetup.placeholderTitle}
      description={t.projectSetup.placeholderDescription}
    />
  );
}
