/**
 * Taksa discovered sources (SERVER, protected) — /taksa/sources.
 *
 * Lists registered `TaksaDiscoveredFile` rows from PostgreSQL metadata ONLY —
 * the page never scans raw files at render time. When nothing has been
 * registered it shows the exact empty message pointing to the admin CLI.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadDiscoveredSources } from "@/server/taksa/queries";
import { CountGrid, Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatNumber } from "@/lib/i18n";

export default async function TaksaSourcesPage() {
  await requirePageUser("/taksa/sources");

  let data;
  try {
    data = await loadDiscoveredSources();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.sources.title}</h1>
        <p className="workbench__subtitle">{t.taksa.sources.subtitle}</p>
      </header>

      <section className="panel-section">
        <p className="panel-section__hint">{t.taksa.sources.adminNote}</p>
      </section>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.sources.empty} />
      ) : (
        <>
          <section className="panel-section">
            <h2 className="panel-section__title">{t.taksa.sources.countsTitle}</h2>
            <CountGrid
              entries={Object.entries(data.countsByType).map(([label, value]) => ({ label, value }))}
            />
          </section>
          <section className="panel-section">
            <ul className="record-list">
              {data.files.map((f) => (
                <li key={f.id} className="record-list__item">
                  <div className="record-list__main">
                    <span className="record-list__title">{f.relativePath}</span>
                    <span className="record-list__meta tabular-digits">
                      {t.taksa.sources.colCategory}: {f.category} · {t.taksa.sources.colSize}:{" "}
                      {formatNumber(f.sizeBytes)}
                    </span>
                  </div>
                  <Badge tone={f.supportedForAnalysis ? "ok" : "warn"}>{f.sourceType}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
