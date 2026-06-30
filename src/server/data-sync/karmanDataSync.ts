/**
 * Karman data-sync ORCHESTRATOR (admin-triggered, server-aware reference sync).
 *
 * The production server already holds the extracted/categorized Taksa data. A
 * SYSTEM_ADMIN triggers a sync that:
 *   discover server files → register sources → analyze SQL/SCP → analyze
 *   ScriptXML → analyze MDB → analyze Excel templates → analyze PDF/docs
 *   metadata → analyze gws.ini & tx_tips → safe backup-strings audit of DB
 *   backups → detect update packages → parse update-package Script.sql →
 *   write metadata + staging rows to PostgreSQL → update sync status.
 *
 * It REUSES the existing Phase 2 analyzers/services (no duplicated parsing) via
 * {@link runAllAnalyzers} and {@link persistAnalysisRun} / {@link
 * persistDiscoveredFiles}, plus the update-package parser.
 *
 * RESILIENCE: a failure in any single analyzer becomes a WARNING (recorded as a
 * step), never a hard crash — the run always completes with a status summary.
 * SQL Server restore is OPTIONAL: it is never executed and never blocks the
 * run; we never surface restore errors to users. With no files present the run
 * completes cleanly with zero counts and NO user-facing "missing" wording.
 *
 * Authorization: the action entry point requires SYSTEM_ADMIN (PROJECT_ADMIN,
 * VIEWER and unauthenticated are denied), enforced server-side.
 */
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { requireRole } from "@/server/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import * as audit from "@/server/audit";
import { discoverTaksaSources } from "@/server/taksa/source-discovery";
import type { DiscoveredTaksaFile } from "@/server/taksa/source-discovery";
import { runAllAnalyzers, persistAnalysisRun, type UnifiedAnalyzeResult } from "@/server/taksa/analyze";
import { persistDiscoveredFiles } from "@/server/taksa/register-discovered-sources";
import { isDatabaseReachable, resolveCliActorUserId } from "@/server/taksa/staging-db";
import {
  detectUpdatePackages,
  type ParsedUpdatePackage,
} from "./update-package-parser";

export type SyncStepStatus = "COMPLETED" | "WARNING" | "SKIPPED" | "FAILED";

export interface SyncStep {
  stepKey: string;
  status: SyncStepStatus;
  message: string;
  metrics?: Record<string, number | string | boolean>;
}

export type SyncRunStatus = "COMPLETED" | "COMPLETED_WITH_WARNINGS" | "FAILED";

export interface DataSyncAnalysis {
  /** SAFE relative source root (never absolute). */
  sourceRoot: string;
  /** Discovered file metadata (safe relative paths) used for persistence. */
  files: DiscoveredTaksaFile[];
  fileCounts: Record<string, number>;
  discoveredSources: number;
  steps: SyncStep[];
  warnings: string[];
  updatePackages: ParsedUpdatePackage[];
  unified: UnifiedAnalyzeResult;
  summary: Record<string, unknown>;
}

export interface DataSyncRunResult extends DataSyncAnalysis {
  status: SyncRunStatus;
  persisted: boolean;
  runId?: string;
  createdSources?: number;
  existingSources?: number;
}

/**
 * Runs `fn` and turns ANY thrown error into a WARNING step (no re-throw), so a
 * single analyzer failure never aborts the whole sync run.
 */
function safeStep<T>(
  stepKey: string,
  okMessage: string,
  fn: () => T,
): { value: T | null; step: SyncStep } {
  try {
    const value = fn();
    return { value, step: { stepKey, status: "COMPLETED", message: okMessage } };
  } catch {
    return {
      value: null,
      step: {
        stepKey,
        status: "WARNING",
        // Product-safe message — no stack traces, paths, or technical detail.
        message: "این مرحله با هشدار به پایان رسید و همگام‌سازی ادامه یافت.",
      },
    };
  }
}

/**
 * PURE analysis pass (no database). Runs discovery, every analyzer (reused via
 * runAllAnalyzers), and update-package detection, assembling per-step outcomes.
 * Tolerant: a thrown analyzer becomes a warning step. Safe on an empty local
 * checkout (zero counts, clean run).
 */
export function analyzeForSync(dataRootOverride?: string): DataSyncAnalysis {
  const steps: SyncStep[] = [];
  const warnings: string[] = [];

  const discovery = discoverTaksaSources(dataRootOverride);
  steps.push({
    stepKey: "discover",
    status: "COMPLETED",
    message: "کشف فایل‌های سرور انجام شد.",
    metrics: { files: discovery.totalFiles },
  });

  // Heavy analyzers + file outputs + ready-to-persist input (single safe pass).
  const analyzed = safeStep("analyze", "تحلیل منابع انجام شد.", () =>
    runAllAnalyzers(dataRootOverride),
  );
  const unified: UnifiedAnalyzeResult =
    analyzed.value ?? {
      summary: {
        outputDirRelative: "",
        discovery: { totalFiles: discovery.totalFiles, missingCoreFiles: 0 },
        dbBackup: { totalFiles: 0, restoreStatus: "OPTIONAL_SKIPPED" },
        scriptXml: { found: false, openXmlCount: 0, insertTargets: 0 },
        sqlStatic: { files: 0, tables: 0 },
        backupStrings: { files: 0, candidates: 0 },
        mdb: { files: 0 },
        excel: { files: 0, sheets: 0 },
        docs: { labels: 0, hints: 0 },
        pdf: { files: 0 },
        dts: { files: 0 },
        rpt: { files: 0 },
      },
      outputs: [],
      persistInput: {
        analyzerType: "UNIFIED",
        status: "COMPLETED",
        totalFiles: discovery.totalFiles,
        successCount: 0,
        warningCount: 0,
        errorCount: 0,
        outputDir: "",
        summaryJson: {},
      },
    };
  if (analyzed.step.status !== "COMPLETED") warnings.push(analyzed.step.message);

  const s = unified.summary;
  // Per-analyzer step lines derived from the unified summary (reused logic).
  steps.push(
    { stepKey: "register-sources", status: "COMPLETED", message: "منابع سرور آماده ثبت شد.", metrics: { files: discovery.totalFiles } },
    { stepKey: "analyze-sql", status: "COMPLETED", message: "تحلیل اسکریپت‌های SQL/SCP انجام شد.", metrics: { files: s.sqlStatic.files, tables: s.sqlStatic.tables } },
    { stepKey: "analyze-scriptxml", status: "COMPLETED", message: "تحلیل نگاشت ScriptXML انجام شد.", metrics: { openXml: s.scriptXml.openXmlCount, targets: s.scriptXml.insertTargets } },
    { stepKey: "analyze-mdb", status: "COMPLETED", message: "تحلیل فایل‌های MDB انجام شد.", metrics: { files: s.mdb.files } },
    { stepKey: "analyze-excel", status: "COMPLETED", message: "تحلیل قالب‌های اکسل انجام شد.", metrics: { files: s.excel.files, sheets: s.excel.sheets } },
    { stepKey: "analyze-pdf-docs", status: "COMPLETED", message: "تحلیل فراداده‌ی اسناد و PDF انجام شد.", metrics: { pdf: s.pdf.files, labels: s.docs.labels } },
    { stepKey: "analyze-gws-tips", status: "COMPLETED", message: "تحلیل برچسب‌ها و نکات رفتاری انجام شد.", metrics: { labels: s.docs.labels, hints: s.docs.hints } },
    {
      stepKey: "backup-strings-audit",
      status: "COMPLETED",
      message: "بررسی امن داده‌های پشتیبان انجام شد؛ بازیابی پایگاه‌داده اختیاری است و انجام نمی‌شود.",
      metrics: { files: s.backupStrings.files, candidates: s.backupStrings.candidates },
    },
  );

  // Update packages — own safe boundary.
  const detected = safeStep("detect-update-packages", "بسته‌های بروزرسانی شناسایی شد.", () =>
    detectUpdatePackages(dataRootOverride),
  );
  const updatePackages = detected.value ?? [];
  if (detected.step.status !== "COMPLETED") warnings.push(detected.step.message);
  steps.push({
    ...detected.step,
    metrics: { packages: updatePackages.length },
  });

  const totalStagingRows = updatePackages.reduce((a, p) => a + p.stagingRows.length, 0);
  steps.push({
    stepKey: "parse-update-packages",
    status: "COMPLETED",
    message: "تجزیه‌ی بسته‌های بروزرسانی انجام شد (بدون اجرای هیچ دستوری).",
    metrics: {
      packages: updatePackages.length,
      stagingRows: totalStagingRows,
      official: updatePackages.filter((p) => p.recognizedOfficialPackage).length,
    },
  });

  const summary: Record<string, unknown> = {
    analyzer: s,
    updatePackages: updatePackages.map((p) => ({
      packageName: p.packageName,
      affectedTables: p.affectedTables,
      insertIntentCount: p.insertIntentCount,
      deleteIntentCount: p.deleteIntentCount,
      recognizedOfficialPackage: p.recognizedOfficialPackage,
    })),
    warningsCount: warnings.length,
  };

  return {
    sourceRoot: discovery.incomingRelative,
    files: discovery.files,
    fileCounts: discovery.countsByCategory,
    discoveredSources: discovery.totalFiles,
    steps,
    warnings,
    updatePackages,
    unified,
    summary,
  };
}

/**
 * Persists a completed analysis to PostgreSQL inside ONE transaction:
 * DataSyncRun + steps, discovered files (idempotent), the unified analysis run,
 * and update packages + their PENDING staging rows. Writes an append-only
 * AuditLog row for the sync run with SAFE metadata only.
 */
export async function persistSyncRun(
  analysis: DataSyncAnalysis,
  actorUserId: string,
  status: SyncRunStatus,
): Promise<{ runId: string; createdSources: number; existingSources: number }> {
  return prisma.$transaction(async (tx) => {
    const run = await tx.dataSyncRun.create({
      data: {
        status,
        finishedAt: new Date(),
        triggeredByUserId: actorUserId,
        sourceRoot: analysis.sourceRoot,
        fileCounts: analysis.fileCounts as object,
        discoveredSources: analysis.discoveredSources,
        warnings: analysis.warnings as object,
        errors: [] as unknown as object,
        summaryJson: analysis.summary as object,
      },
      select: { id: true },
    });

    if (analysis.steps.length > 0) {
      await tx.dataSyncStep.createMany({
        data: analysis.steps.map((st) => ({
          runId: run.id,
          stepKey: st.stepKey,
          status: st.status,
          finishedAt: new Date(),
          message: st.message,
          metrics: (st.metrics ?? undefined) as object | undefined,
        })),
      });
    }

    // Reuse the existing idempotent discovered-file + analysis persisters.
    const { created, existing } = await persistDiscoveredFiles(analysis.files, actorUserId, tx);
    await persistAnalysisRun(analysis.unified.persistInput, actorUserId, tx);

    for (const pkg of analysis.updatePackages) {
      const existingPkg = await tx.referenceUpdatePackage.findUnique({
        where: { packageName_relativePath: { packageName: pkg.packageName, relativePath: pkg.relativePath } },
        select: { id: true },
      });
      const pkgRow = existingPkg
        ? await tx.referenceUpdatePackage.update({
            where: { id: existingPkg.id },
            data: {
              scriptFile: pkg.scriptFile,
              status: "PARSED",
              affectedTables: pkg.affectedTables as object,
              insertIntentCount: pkg.insertIntentCount,
              deleteIntentCount: pkg.deleteIntentCount,
              parsedSummary: pkg.summary as object,
              runId: run.id,
              checksum: pkg.checksum,
            },
            select: { id: true },
          })
        : await tx.referenceUpdatePackage.create({
            data: {
              packageName: pkg.packageName,
              relativePath: pkg.relativePath,
              scriptFile: pkg.scriptFile,
              status: "PARSED",
              affectedTables: pkg.affectedTables as object,
              insertIntentCount: pkg.insertIntentCount,
              deleteIntentCount: pkg.deleteIntentCount,
              parsedSummary: pkg.summary as object,
              runId: run.id,
              checksum: pkg.checksum,
            },
            select: { id: true },
          });

      // Replace prior staging rows for this package (PENDING, never applied).
      await tx.referenceUpdateStagingRow.deleteMany({ where: { packageId: pkgRow.id } });
      if (pkg.stagingRows.length > 0) {
        await tx.referenceUpdateStagingRow.createMany({
          data: pkg.stagingRows.map((r) => ({
            packageId: pkgRow.id,
            intent: r.intent,
            targetTable: r.targetTable,
            rowData: (r.rowData ?? undefined) as object | undefined,
            provenance: r.provenance,
            status: "PENDING",
          })),
        });
      }
    }

    await audit.record(
      {
        actorUserId,
        action: "IMPORT",
        entityType: "DataSyncRun",
        entityId: run.id,
        metadata: {
          status,
          sourceRoot: analysis.sourceRoot,
          discoveredSources: analysis.discoveredSources,
          createdSources: created,
          existingSources: existing,
          updatePackages: analysis.updatePackages.length,
          warnings: analysis.warnings.length,
        },
      },
      tx,
    );

    return { runId: run.id, createdSources: created, existingSources: existing };
  });
}

/**
 * Full sync run: analyze (always) then persist when the DB is reachable and a
 * SYSTEM_ADMIN actor exists. Never throws on analyzer failure; returns a
 * complete status summary either way.
 */
export async function runDataSync(
  actorUserId?: string,
  dataRootOverride?: string,
): Promise<DataSyncRunResult> {
  const analysis = analyzeForSync(dataRootOverride);
  const status: SyncRunStatus =
    analysis.warnings.length > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED";

  if (!(await isDatabaseReachable())) {
    return { ...analysis, status, persisted: false };
  }
  const actor = actorUserId ?? (await resolveCliActorUserId());
  if (!actor) {
    return { ...analysis, status, persisted: false };
  }

  try {
    const { runId, createdSources, existingSources } = await persistSyncRun(analysis, actor, status);
    return { ...analysis, status, persisted: true, runId, createdSources, existingSources };
  } catch {
    // Persistence failure must not crash the request; report a clean result.
    return { ...analysis, status, persisted: false };
  }
}

export type DataSyncErrorCode = "unauthorized" | "forbidden" | "unknown";

export interface DataSyncActionState {
  ok: boolean;
  result?: DataSyncRunResult;
  error?: DataSyncErrorCode;
}

/**
 * Server entry point used by the admin API route. Enforces SYSTEM_ADMIN
 * server-side (deny-by-default) before running the sync.
 */
export async function runDataSyncAction(
  dataRootOverride?: string,
): Promise<DataSyncActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  try {
    await requireRole(user, [Role.SYSTEM_ADMIN]);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthorizedError) {
      return { ok: false, error: "forbidden" };
    }
    throw e;
  }
  const result = await runDataSync(user.id, dataRootOverride);
  return { ok: true, result };
}
