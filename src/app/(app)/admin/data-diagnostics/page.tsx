/**
 * Admin data diagnostics (SERVER, SYSTEM_ADMIN-only) — /admin/data-diagnostics.
 *
 * This is the ONLY place technical detail is allowed to surface: server data
 * paths, the symlink, the data-root env var, internal command names, optional
 * SQL Server restore status, and the latest sync run's raw step log
 * (steps/warnings/errors + file counts). It is SEPARATE from the operational
 * import dashboard and is guarded server-side — non-admins are redirected.
 *
 * Normal users NEVER see any of this content (it lives only on this page,
 * which is excluded from the user-facing forbidden-strings scan).
 */
import * as React from "react";
import { requireSystemAdminPage } from "@/server/auth/page-guard";
import { loadDiagnostics } from "@/server/data-sync/queries";
import { Badge } from "@/components/ui";
import { ErrorState } from "@/components/states";
import { t, formatNumber, formatDate } from "@/lib/i18n";
import type { BadgeTone } from "@/components/ui";

function tone(status: string): BadgeTone {
  if (status === "COMPLETED") return "ok";
  if (status === "COMPLETED_WITH_WARNINGS" || status === "WARNING") return "warn";
  if (status === "FAILED") return "error";
  if (status === "SKIPPED") return "neutral";
  return "info";
}

export default async function DataDiagnosticsPage() {
  await requireSystemAdminPage("/admin/data-diagnostics");

  let data;
  try {
    data = await loadDiagnostics();
  } catch {
    return <ErrorState title={t.states.errorTitle} description={t.states.errorDescription} />;
  }

  const d = t.admin.diagnostics;
  const latest = data.latest;

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h1 className="workbench__title">{d.title}</h1>
        <p className="workbench__subtitle">{d.subtitle}</p>
      </header>

      <section className="panel-section">
        <h2 className="panel-section__title">{d.pathsTitle}</h2>
        <ul className="status-list">
          <li className="status-list__item">{d.appPath}</li>
          <li className="status-list__item">{d.realPath}</li>
          <li className="status-list__item">{d.symlink}</li>
          <li className="status-list__item">{d.envNote}</li>
        </ul>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{d.commandsTitle}</h2>
        <ul className="status-list">
          {d.commands.map((cmd) => (
            <li key={cmd} className="status-list__item">
              <code>{cmd}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section panel-section--warn">
        <h2 className="panel-section__title">{d.restoreTitle}</h2>
        <p className="panel-section__hint">{d.restoreOptional}</p>
      </section>

      <section className="panel-section">
        <h2 className="panel-section__title">{d.latestRunTitle}</h2>
        {!latest ? (
          <p className="panel-section__hint">{d.noRuns}</p>
        ) : (
          <>
            <p className="status-list__item">
              <Badge tone={tone(latest.status)}>{latest.status}</Badge>{" "}
              <span className="tabular-digits">{formatDate(latest.startedAt)}</span>
            </p>
            <p className="status-list__item">
              {d.sourceRoot}: <code>{latest.sourceRoot || "—"}</code>
            </p>

            <h3 className="panel-section__title">{d.fileCountsTitle}</h3>
            <ul className="status-list">
              {Object.entries(latest.fileCounts).map(([cat, n]) => (
                <li key={cat} className="status-list__item tabular-digits">
                  {cat}: {formatNumber(Number(n))}
                </li>
              ))}
            </ul>

            <h3 className="panel-section__title">{d.stepsTitle}</h3>
            <ul className="status-list">
              {latest.steps.map((s) => (
                <li key={s.stepKey} className="status-list__item">
                  <Badge tone={tone(s.status)}>{s.stepKey}</Badge> {s.message}
                </li>
              ))}
            </ul>

            {latest.warnings.length > 0 ? (
              <>
                <h3 className="panel-section__title">{d.warningsTitle}</h3>
                <ul className="status-list">
                  {latest.warnings.map((w, i) => (
                    <li key={i} className="status-list__item">
                      {w}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {latest.errors.length > 0 ? (
              <>
                <h3 className="panel-section__title">{d.errorsTitle}</h3>
                <ul className="status-list">
                  {latest.errors.map((e, i) => (
                    <li key={i} className="status-list__item">
                      {e}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
