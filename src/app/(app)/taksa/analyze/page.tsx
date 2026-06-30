/**
 * Taksa analyze overview (SERVER, protected) — /taksa/analyze.
 *
 * Shows analyzer run summaries read from PostgreSQL (`TaksaAnalysisRun`). No
 * fake counts/rows/success and no runtime file scan — an empty table yields the
 * exact empty message pointing at the admin `taksa:analyze` command.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadAnalysisRuns } from "@/server/taksa/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatNumber, formatDate } from "@/lib/i18n";

const SUBPAGES: Array<{ href: Route; key: keyof typeof t.taksa.analyze }> = [
  { href: "/taksa/analyze/runs" as Route, key: "runsTitle" },
  { href: "/taksa/analyze/scriptxml" as Route, key: "scriptXmlTitle" },
  { href: "/taksa/analyze/sql" as Route, key: "sqlTitle" },
  { href: "/taksa/analyze/backup-strings" as Route, key: "backupStringsTitle" },
  { href: "/taksa/analyze/templates" as Route, key: "templatesTitle" },
  { href: "/taksa/analyze/docs" as Route, key: "docsTitle" },
];

export default async function TaksaAnalyzePage() {
  await requirePageUser("/taksa/analyze");

  let data;
  try {
    data = await loadAnalysisRuns();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.analyze.title}</h1>
        <p className="workbench__subtitle">{t.taksa.analyze.subtitle}</p>
      </header>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.analyze.links}</h2>
        <div className="link-row">
          {SUBPAGES.map((p) => (
            <Link key={p.href} href={p.href} className="btn btn--ghost">
              {t.taksa.analyze[p.key] as string}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.analyze.runsTitle}</h2>
        {data.isEmpty ? (
          <EmptyState title={t.taksa.analyze.empty} />
        ) : (
          <ul className="record-list">
            {data.runs.map((r) => (
              <li key={r.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title">{r.analyzerType}</span>
                  <span className="record-list__meta tabular-digits">
                    {t.taksa.analyze.colFiles}: {formatNumber(r.totalFiles)} · {formatDate(r.startedAt)}
                  </span>
                </div>
                <Badge tone={r.status === "COMPLETED" ? "ok" : "info"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
