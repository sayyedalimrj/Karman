/**
 * Reference overview (SERVER, protected) — /reference.
 *
 * Real readiness overview for the Taksa-derived reference master data: counts
 * for each Reference* table, the missing required groups, and an honest
 * explanation that reference data must come from Taksa DB/scripts/files/docs
 * (never code constants). Links to /reference/sources and /reference/library.
 * When no reference data exists it shows the exact empty message.
 *
 * Requirements: 15.1, 15.2, 15.5, 10.4
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadReferenceOverview } from "@/server/reference/queries";
import { CountGrid, Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { workbench as wb } from "@/lib/i18n/labels";

export default async function ReferencePage() {
  await requirePageUser("/reference");

  let overview;
  try {
    overview = await loadReferenceOverview();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  const { counts, readiness, isEmpty } = overview;

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.reference.title}</h1>
        <p className="workbench__subtitle">{t.reference.overviewSubtitle}</p>
      </header>

      {isEmpty ? <EmptyState title={t.reference.empty} /> : null}

      <section className="panel-section panel-section--warn">
        <p className="readiness__warning" role="alert">
          {t.reference.importBlockedPhase2}
        </p>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.reference.mustComeFromTitle}</h2>
        <p className="panel-section__hint">{t.reference.mustComeFrom}</p>
        <div className="link-row">
          <Link href={"/reference/sources" as Route} className="btn btn--primary">
            {t.reference.goToSources}
          </Link>
          <Link href={"/reference/library" as Route} className="btn btn--ghost">
            {t.reference.goToLibrary}
          </Link>
        </div>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.reference.requiredDataTitle}</h2>
        <ul className="chip-list">
          {t.reference.requiredData.map((d) => (
            <li key={d} className="chip">
              {d}
            </li>
          ))}
        </ul>
      </section>

      {readiness.missingGroups.length > 0 ? (
        <section className="panel-section">
          <h2 className="panel-section__title">{t.reference.missingGroupsTitle}</h2>
          <ul className="chip-list">
            {readiness.missingGroups.map((g) => (
              <li key={g}>
                <Badge tone="warn">{wb.readinessLabel(g)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel-section">
        <h2 className="panel-section__title">{t.reference.countsTitle}</h2>
        <CountGrid entries={wb.referenceCountEntries(counts)} />
      </section>
    </div>
  );
}
