/**
 * Project Setup (SERVER, protected) — REFERENCE-GATED — /projects/setup.
 *
 * This is NOT a generic project form. It presents the two Taksa-aware init
 * modes and a REAL reference-readiness checklist (from Prisma). In Phase 1,
 * project creation REMAINS DISABLED unless the minimum reference readiness
 * exists — so no Project records are created here yet. When data is missing it
 * shows the exact gating message and links to register/import reference data.
 *
 * Visibility of this page is presentation-only; the real creation boundary is
 * (and will remain) enforced server-side. Users who cannot manage projects see
 * an honest "no access" state.
 *
 * Requirements: 10.4, 4.2, 15.5
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { requirePageUser } from "@/server/auth/page-guard";
import { canManageProjects } from "@/components/shell/nav";
import { loadProjectSetupReadiness } from "@/server/reference/queries";
import { Badge } from "@/components/ui";
import { ErrorState } from "@/components/states";
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

  let readiness;
  try {
    readiness = await loadProjectSetupReadiness();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  const checklist: Array<{ key: keyof typeof readiness.checks; label: string }> = [
    { key: "hasReferenceSource", label: t.projectSetup.checkReferenceSource },
    { key: "hasReferenceBook", label: t.projectSetup.checkReferenceBook },
    { key: "hasReferenceItem", label: t.projectSetup.checkReferenceItem },
    { key: "hasReferenceUnit", label: t.projectSetup.checkReferenceUnit },
    { key: "hasReferenceIndexPeriod", label: t.projectSetup.checkReferenceIndexPeriod },
    { key: "hasReferenceCircular", label: t.projectSetup.checkReferenceCircular },
  ];


  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.projectSetup.title}</h1>
        <p className="workbench__subtitle">{t.projectSetup.subtitle}</p>
      </header>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.projectSetup.modesTitle}</h2>
        <ul className="mode-list">
          <li className="mode-card">
            <span className="mode-card__title">{t.projectSetup.mode1Title}</span>
            <span className="mode-card__desc">{t.projectSetup.mode1Description}</span>
          </li>
          <li className="mode-card">
            <span className="mode-card__title">{t.projectSetup.mode2Title}</span>
            <span className="mode-card__desc">{t.projectSetup.mode2Description}</span>
          </li>
        </ul>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.projectSetup.checklistTitle}</h2>
        <ul className="readiness__groups">
          {checklist.map((c) => (
            <li key={c.key} className="readiness__group">
              <span className="readiness__group-label">{c.label}</span>
              <Badge tone={readiness.checks[c.key] ? "ok" : "warn"}>
                {readiness.checks[c.key] ? t.common.yes : t.common.no}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {readiness.isReady ? (
        <section className="panel-section panel-section--ok">
          <h2 className="panel-section__title">{t.projectSetup.readyTitle}</h2>
          <p className="panel-section__hint">{t.projectSetup.readyNote}</p>
        </section>
      ) : (
        <section className="panel-section panel-section--warn">
          <h2 className="panel-section__title">{t.projectSetup.blockedTitle}</h2>
          <p className="readiness__warning" role="alert">
            {t.projectSetup.blocked}
          </p>
          <div className="link-row">
            <Link href={"/reference/sources" as Route} className="btn btn--primary">
              {t.projectSetup.linkSources}
            </Link>
            <Link href={"/reference" as Route} className="btn btn--ghost">
              {t.projectSetup.linkReference}
            </Link>
            <Link href={"/taksa/imports" as Route} className="btn btn--ghost">
              {t.projectSetup.linkTaksaImports}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
