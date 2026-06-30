/**
 * Taksa raw data (SERVER, protected) — /taksa/raw.
 *
 * Real list/counts of TaksaArtifact / TaksaRawTable / TaksaRawRow. When nothing
 * has been ingested it shows the exact empty message. No fabricated rows.
 *
 * Requirements: 9.1, 9.2, 10.4
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadTaksaRawData } from "@/server/taksa/queries";
import { CountGrid, Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatDate, formatNumber } from "@/lib/i18n";
import { workbench as wb } from "@/lib/i18n/labels";

export default async function TaksaRawPage() {
  await requirePageUser("/taksa/raw");

  let data;
  try {
    data = await loadTaksaRawData();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.raw.title}</h1>
        <p className="workbench__subtitle">{t.taksa.raw.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.raw.empty} />
      ) : (
        <>
          <section className="panel-section">
            <CountGrid entries={wb.taksaCountEntries(data.counts)} />
          </section>
          <section className="panel-section">
            <ul className="record-list">
              {data.artifacts.map((a) => (
                <li key={a.id} className="record-list__item">
                  <div className="record-list__main">
                    <span className="record-list__title">{a.sourceName}</span>
                    <span className="record-list__meta tabular-digits">
                      {t.taksa.raw.colTables}: {formatNumber(a.tableCount)} · {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <Badge tone="info">{a.importStatus}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
