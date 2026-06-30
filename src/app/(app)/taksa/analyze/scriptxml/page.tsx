/**
 * Taksa ScriptXML mappings (SERVER, protected) — /taksa/analyze/scriptxml.
 *
 * Lists persisted `TaksaScriptXmlMapping` rows from PostgreSQL (no file scan).
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadScriptXmlMappings } from "@/server/taksa/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t } from "@/lib/i18n";

export default async function TaksaScriptXmlPage() {
  await requirePageUser("/taksa/analyze/scriptxml");

  let data;
  try {
    data = await loadScriptXmlMappings();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.analyze.scriptXmlTitle}</h1>
        <p className="workbench__subtitle">{t.taksa.analyze.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.analyze.scriptXmlEmpty} />
      ) : (
        <section className="panel-section">
          <ul className="record-list">
            {data.mappings.map((m) => (
              <li key={m.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title">{m.targetTable}</span>
                  <span className="record-list__meta">{m.xmlPath ?? "—"}</span>
                </div>
                <Badge tone="info">{m.procedureName ?? "—"}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
