"use client";
/**
 * SyncActionPanel — the primary «همگام‌سازی داده‌های سرور» action (client).
 *
 * Calls the REAL API (POST /api/admin/data-sync/run) — it NEVER shows a shell
 * command. While running it shows an in-progress state; on completion it shows
 * a product result summary (status, counts, per-step outcomes, warnings). The
 * button is only rendered for SYSTEM_ADMIN (server also enforces this).
 *
 * Product language only: no server paths, commands, env vars, or restore
 * errors are ever displayed here.
 */
import * as React from "react";
import { Button, Badge } from "@/components/ui";
import { t, formatNumber } from "@/lib/i18n";
import type { BadgeTone } from "@/components/ui";

interface SyncStep {
  stepKey: string;
  status: string;
  message: string;
}

interface SyncResult {
  status: string;
  discoveredSources: number;
  steps: SyncStep[];
  warnings: string[];
}

function statusTone(status: string): BadgeTone {
  if (status === "COMPLETED") return "ok";
  if (status === "COMPLETED_WITH_WARNINGS" || status === "WARNING") return "warn";
  if (status === "FAILED") return "error";
  if (status === "SKIPPED") return "neutral";
  return "info";
}

export function SyncActionPanel({ isAdmin }: { isAdmin: boolean }) {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<SyncResult | null>(null);
  const [failed, setFailed] = React.useState(false);

  async function runSync() {
    setRunning(true);
    setFailed(false);
    setResult(null);
    try {
      const res = await fetch("/api/admin/data-sync/run", { method: "POST" });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const data = (await res.json()) as SyncResult;
      setResult(data);
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  if (!isAdmin) {
    return (
      <section className="panel-section">
        <p className="panel-section__hint">{t.taksa.imports.adminOnlyNote}</p>
      </section>
    );
  }

  const resultMessage =
    result?.status === "COMPLETED"
      ? t.taksa.imports.resultCompleted
      : result?.status === "COMPLETED_WITH_WARNINGS"
        ? t.taksa.imports.resultCompletedWarnings
        : t.taksa.imports.resultFailed;

  return (
    <section className="panel-section sync-action">
      <Button variant="primary" onClick={runSync} disabled={running} aria-busy={running}>
        {running ? t.taksa.imports.running : t.taksa.imports.runSync}
      </Button>
      <p className="panel-section__hint">{t.taksa.imports.runHint}</p>

      {running ? (
        <p className="sync-action__progress" role="status">
          {t.taksa.imports.running}
        </p>
      ) : null}

      {failed ? (
        <p className="form-error" role="alert">
          {t.taksa.imports.resultFailed}
        </p>
      ) : null}

      {result ? (
        <div className="sync-result">
          <p className="sync-result__headline" role="status">
            <Badge tone={statusTone(result.status)}>{resultMessage}</Badge>
            <span className="tabular-digits">
              {t.taksa.imports.cardDiscoveredFiles}: {formatNumber(result.discoveredSources)}
            </span>
          </p>

          <h3 className="panel-section__title">{t.taksa.imports.stepsTitle}</h3>
          <ul className="status-list">
            {result.steps.map((s) => (
              <li key={s.stepKey} className="status-list__item">
                <Badge tone={statusTone(s.status)}>{s.stepKey}</Badge> {s.message}
              </li>
            ))}
          </ul>

          {result.warnings.length > 0 ? (
            <>
              <h3 className="panel-section__title">{t.taksa.imports.warningsTitle}</h3>
              <ul className="status-list">
                {result.warnings.map((w, i) => (
                  <li key={i} className="status-list__item">
                    {w}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="panel-section__hint">{t.taksa.imports.pendingApprovalNote}</p>
        </div>
      ) : null}
    </section>
  );
}
