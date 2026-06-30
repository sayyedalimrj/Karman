/**
 * Taksa UI labels & behavior hints (SERVER, protected) — /taksa/analyze/docs.
 *
 * Lists persisted `TaksaUiLabel` + `TaksaBehaviorHint` rows from PostgreSQL.
 * Hints are hints, not official rules.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadDocsAnalysis } from "@/server/taksa/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";

export default async function TaksaDocsAnalysisPage() {
  await requirePageUser("/taksa/analyze/docs");

  let data;
  try {
    data = await loadDocsAnalysis();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.analyze.docsTitle}</h1>
        <p className="workbench__subtitle">{t.taksa.analyze.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.analyze.docsEmpty} />
      ) : (
        <>
          <section className="panel-section">
            <h2 className="panel-section__title">{t.taksa.analyze.docsLabels}</h2>
            <ul className="record-list">
              {data.labels.map((l) => (
                <li key={l.id} className="record-list__item">
                  <div className="record-list__main">
                    <span className="record-list__title">{l.label}</span>
                    <span className="record-list__meta">{l.formName ?? l.sourceFile}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel-section">
            <h2 className="panel-section__title">{t.taksa.analyze.docsHints}</h2>
            <ul className="record-list">
              {data.hints.map((h) => (
                <li key={h.id} className="record-list__item">
                  <div className="record-list__main">
                    <span className="record-list__title">{h.text}</span>
                    <span className="record-list__meta">{h.sourceFile}</span>
                  </div>
                  <Badge tone="info">{h.topic}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
