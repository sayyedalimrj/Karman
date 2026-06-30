/**
 * Update packages (SERVER, protected) — /taksa/updates.
 *
 * Lists detected reference-data update packages from PostgreSQL metadata ONLY
 * (DB-backed; no raw-file scan at render time). Values shown are exactly what
 * the parser extracted from the real Script.sql — never invented. Parsed rows
 * are PENDING staging rows; final apply requires SYSTEM_ADMIN approval.
 *
 * When nothing has been synced yet it shows product language
 * («آخرین تحلیل انجام نشده است» + run-sync prompt), never "data missing".
 */
import * as React from "react";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadUpdatePackages } from "@/server/data-sync/queries";
import { Badge } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { t, formatNumber } from "@/lib/i18n";

export default async function TaksaUpdatesPage() {
  await requirePageUser("/taksa/updates");

  let data;
  try {
    data = await loadUpdatePackages();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.updates.title}</h1>
        <p className="workbench__subtitle">{t.taksa.updates.subtitle}</p>
      </header>

      {data.isEmpty ? (
        <EmptyState title={t.taksa.updates.empty} description={t.taksa.updates.emptyHint} />
      ) : (
        <>
          <section className="panel-section">
            <ul className="record-list">
              {data.packages.map((p) => (
                <li key={p.id} className="record-list__item">
                  <div className="record-list__main">
                    <span className="record-list__title">{p.packageName}</span>
                    <span className="record-list__meta tabular-digits">
                      {t.taksa.updates.colInserts}: {formatNumber(p.insertIntentCount)} ·{" "}
                      {t.taksa.updates.colDeletes}: {formatNumber(p.deleteIntentCount)} ·{" "}
                      {t.taksa.updates.colPending}: {formatNumber(p.pendingRows)}
                    </span>
                    <span className="record-list__meta">
                      {t.taksa.updates.colTables}: {p.affectedTables.join("، ") || "—"}
                    </span>
                  </div>
                  <Badge tone="info">{p.status}</Badge>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel-section">
            <p className="panel-section__hint">{t.taksa.updates.pendingNote}</p>
          </section>
        </>
      )}
    </div>
  );
}
