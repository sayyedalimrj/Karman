/**
 * Taksa intake overview (SERVER, protected) — /taksa.
 *
 * Explains the raw-preservation (round-trip) guarantee, shows REAL counts for
 * the preservation tables, and links to /taksa/imports and /taksa/raw. Taksa is
 * a reference/master-data source, never the operational runtime DB.
 *
 * Requirements: 9.1, 9.2, 9.4, 10.4
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadTaksaRawCounts } from "@/server/taksa/queries";
import { CountGrid } from "@/components/ui";
import { ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";
import { workbench as wb } from "@/lib/i18n/labels";

export default async function TaksaPage() {
  await requirePageUser("/taksa");

  let counts;
  try {
    counts = await loadTaksaRawCounts();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.title}</h1>
        <p className="workbench__subtitle">{t.taksa.overviewSubtitle}</p>
      </header>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.preservationTitle}</h2>
        <p className="panel-section__hint">{t.taksa.preservation}</p>
        <div className="link-row">
          <Link href={"/taksa/imports" as Route} className="btn btn--primary">
            {t.taksa.goToImports}
          </Link>
          <Link href={"/taksa/raw" as Route} className="btn btn--ghost">
            {t.taksa.goToRaw}
          </Link>
        </div>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.countsTitle}</h2>
        <CountGrid entries={wb.taksaCountEntries(counts)} />
      </section>
    </div>
  );
}
