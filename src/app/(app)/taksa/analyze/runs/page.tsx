/**
 * Taksa analysis runs (SERVER, protected) — /taksa/analyze/runs.
 *
 * Detailed list of `TaksaAnalysisRun` rows from PostgreSQL. No runtime file scan,
 * no fabricated data.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadAnalysisRuns } from "@/server/taksa/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatNumber, formatDate } from "@/lib/i18n";

export default async function TaksaAnalyzeRunsPage() {
  await requirePageUser("/taksa/analyze/runs");

  let data;
  try {
    data = await loadAnalysisRuns();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.analyze.runsTitle}</h1>
        <p className="workbench__subtitle">{t.taksa.analyze.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.analyze.empty} />
      ) : (
        <section className="panel-section">
          <ul className="record-list">
            {data.runs.map((r) => (
              <li key={r.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title">{r.analyzerType}</span>
                  <span className="record-list__meta tabular-digits">
                    {t.taksa.analyze.colFiles}: {formatNumber(r.totalFiles)} · ✓{" "}
                    {formatNumber(r.successCount)} · ⚠ {formatNumber(r.warningCount)} · ✕{" "}
                    {formatNumber(r.errorCount)} · {formatDate(r.startedAt)}
                  </span>
                  {r.outputDir ? (
                    <span className="record-list__meta">{r.outputDir}</span>
                  ) : null}
                </div>
                <Badge tone={r.status === "COMPLETED" ? "ok" : "info"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
