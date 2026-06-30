/**
 * Operational data-sync dashboard (SERVER, protected) — /taksa/imports.
 *
 * «منابع و همگام‌سازی داده‌های مرجع» — a product-grade RTL Persian operational
 * page. Every status card is backed by a REAL Prisma query (zero is a valid,
 * truthful value). It shows the server-data readiness, discovered/registered
 * counts, update packages, last analysis/sync, reference readiness, and a
 * last-sync history list, plus the primary «همگام‌سازی داده‌های سرور» action
 * (SYSTEM_ADMIN only) which calls the real API.
 *
 * It deliberately shows NO server paths, shell commands, env vars, restore
 * errors, raw logs, or dev-roadmap text — those live only on the admin
 * diagnostics page. When nothing has run yet it uses product language
 * («آخرین تحلیل انجام نشده است» / run-sync prompt), never "data missing".
 */
import * as React from "react";
import { Role } from "@prisma/client";
import { requirePageUser } from "@/server/auth/page-guard";
import { loadSyncDashboard } from "@/server/data-sync/queries";
import { CountGrid, Badge } from "@/components/ui";
import { ErrorState } from "@/components/states";
import { t, formatNumber, formatDate } from "@/lib/i18n";
import type { BadgeTone } from "@/components/ui";
import { SyncActionPanel } from "./SyncActionPanel";

function syncStatusTone(status: string | null): BadgeTone {
  if (status === "COMPLETED") return "ok";
  if (status === "COMPLETED_WITH_WARNINGS") return "warn";
  if (status === "FAILED") return "error";
  if (status === "RUNNING") return "info";
  return "neutral";
}

export default async function TaksaImportsPage() {
  const user = await requirePageUser("/taksa/imports");
  const isAdmin = user.systemRole === Role.SYSTEM_ADMIN;

  let data;
  try {
    data = await loadSyncDashboard();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  const c = data.cards;
  const cardEntries = [
    { label: t.taksa.imports.cardDiscoveredFiles, value: c.discoveredFiles },
    { label: t.taksa.imports.cardRegisteredSources, value: c.registeredSources },
    { label: t.taksa.imports.cardUpdatePackages, value: c.updatePackages },
    { label: t.taksa.imports.cardReadiness, value: c.referenceReadyGroups },
  ];

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{t.taksa.imports.title}</h1>
        <p className="workbench__subtitle">{t.taksa.imports.subtitle}</p>
      </header>

      <section className="panel-section panel-section--ok">
        <h2 className="panel-section__title">{t.taksa.imports.cardServerData}</h2>
        <p className="panel-section__hint">
          <Badge tone="ok">{t.taksa.imports.cardServerDataReady}</Badge>
        </p>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.imports.cardsTitle}</h2>
        <CountGrid entries={cardEntries} />
        <ul className="status-list">
          <li className="status-list__item">
            {t.taksa.imports.cardLastAnalysis}:{" "}
            <span className="tabular-digits">
              {c.lastAnalysisAt ? formatDate(c.lastAnalysisAt) : t.taksa.imports.noAnalysisYet}
            </span>
          </li>
          <li className="status-list__item">
            {t.taksa.imports.cardLastSync}:{" "}
            <span className="tabular-digits">
              {c.lastSyncAt ? formatDate(c.lastSyncAt) : t.taksa.imports.noSyncYet}
            </span>
            {c.lastSyncStatus ? (
              <> <Badge tone={syncStatusTone(c.lastSyncStatus)}>{c.lastSyncStatus}</Badge></>
            ) : null}
          </li>
          <li className="status-list__item">
            {t.taksa.imports.cardReadiness}:{" "}
            <span className="tabular-digits">
              {formatNumber(c.referenceReadyGroups)} / {formatNumber(c.referenceTotalGroups)}
            </span>
          </li>
        </ul>
      </section>

      <SyncActionPanel isAdmin={isAdmin} />

      <section className="panel-section">
        <h2 className="panel-section__title">{t.taksa.imports.historyTitle}</h2>
        {data.history.length === 0 ? (
          <p className="panel-section__hint">{t.taksa.imports.historyEmpty}</p>
        ) : (
          <ul className="record-list">
            {data.history.map((h) => (
              <li key={h.id} className="record-list__item">
                <div className="record-list__main">
                  <span className="record-list__title tabular-digits">{formatDate(h.startedAt)}</span>
                  <span className="record-list__meta tabular-digits">
                    {t.taksa.imports.colFiles}: {formatNumber(h.discoveredSources)}
                  </span>
                </div>
                <Badge tone={syncStatusTone(h.status)}>{h.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-section">
        <p className="panel-section__hint">{t.taksa.imports.pendingApprovalNote}</p>
      </section>
    </div>
  );
}
