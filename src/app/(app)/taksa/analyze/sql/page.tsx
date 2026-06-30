/**
 * Taksa detected SQL tables (SERVER, protected) — /taksa/analyze/sql.
 *
 * Lists `TaksaDetectedEntity` rows of type SQL_TABLE from PostgreSQL.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadDetectedEntities } from "@/server/taksa/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";

export default async function TaksaSqlEntitiesPage() {
  await requirePageUser("/taksa/analyze/sql");

  let data;
  try {
    data = await loadDetectedEntities("SQL_TABLE");
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.analyze.sqlTitle}</h1>
        <p className="workbench__subtitle">{t.taksa.analyze.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.analyze.sqlEmpty} />
      ) : (
        <section className="panel-section">
          <ul className="record-list">
            {data.entities.map((e) => (
              <li key={e.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title">{e.name}</span>
                  <span className="record-list__meta">{e.sourceFile}</span>
                </div>
                <Badge tone="info">{e.sourceType}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
