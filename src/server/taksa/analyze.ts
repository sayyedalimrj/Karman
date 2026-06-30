/**
 * Unified Taksa ANALYZE orchestrator + staging persistence (Phase 2, section D).
 *
 * Runs every SAFE analyzer (discovery, DB backup inspect, ScriptXML, SQL/SCP
 * static, backup strings, MDB, Excel templates, docs/tips/gws, PDF metadata,
 * DTS/RPT metadata), writes their JSON/CSV/MD outputs under
 * `data/processed/taksa/`, and — when the database is reachable and a
 * SYSTEM_ADMIN actor exists — persists analyzer summaries to PostgreSQL staging
 * (`TaksaAnalysisRun` + detected entities / ScriptXML mappings / UI labels /
 * behavior hints) plus an append-only AuditLog row for the run.
 *
 * It imports NO official data, works WITHOUT a SQL Server restore, and reports
 * the restore as blocked. It degrades gracefully (file outputs + message) when
 * no DB and/or no files are present.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { prisma } from "@/server/db";
import * as audit from "@/server/audit";
import type { AuditTx } from "@/server/audit";
import { getTaksaProcessedRoot, toSafeRelativePath } from "./data-root";
import { isDatabaseReachable, resolveCliActorUserId } from "./staging-db";
import { discoverTaksaSources, type DiscoveryResult } from "./source-discovery";
import { inspectDbBackups, writeDbBackupOutputs } from "./db-backup-inspector";
import { auditScriptXml, writeScriptXmlOutputs, type ScriptXmlAuditResult } from "./scriptxml-parser";
import { auditStaticSql, writeStaticSqlOutputs, type SqlStaticAuditResult } from "./sql-static-parser";
import { auditBackupStrings, writeBackupStringsOutputs } from "./backup-strings-audit";
import { auditMdb, writeMdbOutputs } from "./mdb-audit";
import { auditExcel, writeExcelOutputs, type ExcelAuditResult } from "./excel-audit";
import { auditDocs, writeDocsOutputs, type DocsAuditResult } from "./docs-audit";
import { auditPdf, writePdfOutputs } from "./pdf-audit";
import { auditDts, auditRpt, writeDtsOutputs, writeRptOutputs } from "./dts-rpt-audit";

// ---------------------------------------------------------------------------
// Normalized persistence input shared by the unified + per-analyzer runners.
// ---------------------------------------------------------------------------

export interface DetectedEntityInput {
  entityType: string;
  sourceType: string;
  sourceFile: string;
  family?: string | null;
  name: string;
  parentName?: string | null;
  metadata?: Record<string, unknown> | null;
  confidence?: number | null;
}

export interface ScriptXmlMappingInput {
  procedureName?: string | null;
  xmlPath?: string | null;
  targetTable: string;
  columns?: string[] | null;
  confidence?: number | null;
}

export interface UiLabelInput {
  sourceFile: string;
  label: string;
  dataPropertyName?: string | null;
  formName?: string | null;
  gridName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BehaviorHintInput {
  sourceFile: string;
  topic: string;
  text: string;
  metadata?: Record<string, unknown> | null;
}

export interface AnalysisPersistInput {
  analyzerType: string;
  status: string;
  totalFiles: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  outputDir: string;
  summaryJson: Record<string, unknown>;
  detectedEntities?: DetectedEntityInput[];
  scriptXmlMappings?: ScriptXmlMappingInput[];
  uiLabels?: UiLabelInput[];
  behaviorHints?: BehaviorHintInput[];
}

/**
 * Persists one analysis run + its children inside the caller's transaction and
 * writes an append-only AuditLog row. Returns the new run id.
 */
export async function persistAnalysisRun(
  input: AnalysisPersistInput,
  actorUserId: string,
  tx: AuditTx,
): Promise<string> {
  const run = await tx.taksaAnalysisRun.create({
    data: {
      analyzerType: input.analyzerType,
      status: input.status,
      finishedAt: new Date(),
      totalFiles: input.totalFiles,
      successCount: input.successCount,
      warningCount: input.warningCount,
      errorCount: input.errorCount,
      outputDir: input.outputDir,
      summaryJson: input.summaryJson as object,
      createdById: actorUserId,
    },
    select: { id: true },
  });

  if (input.detectedEntities?.length) {
    await tx.taksaDetectedEntity.createMany({
      data: input.detectedEntities.map((e) => ({
        runId: run.id,
        entityType: e.entityType,
        sourceType: e.sourceType,
        sourceFile: e.sourceFile,
        family: e.family ?? null,
        name: e.name,
        parentName: e.parentName ?? null,
        metadata: (e.metadata ?? undefined) as object | undefined,
        confidence: e.confidence ?? null,
      })),
    });
  }
  if (input.scriptXmlMappings?.length) {
    await tx.taksaScriptXmlMapping.createMany({
      data: input.scriptXmlMappings.map((m) => ({
        runId: run.id,
        procedureName: m.procedureName ?? null,
        xmlPath: m.xmlPath ?? null,
        targetTable: m.targetTable,
        columns: (m.columns ?? undefined) as object | undefined,
        confidence: m.confidence ?? null,
      })),
    });
  }
  if (input.uiLabels?.length) {
    await tx.taksaUiLabel.createMany({
      data: input.uiLabels.map((l) => ({
        runId: run.id,
        sourceFile: l.sourceFile,
        label: l.label,
        dataPropertyName: l.dataPropertyName ?? null,
        formName: l.formName ?? null,
        gridName: l.gridName ?? null,
        metadata: (l.metadata ?? undefined) as object | undefined,
      })),
    });
  }
  if (input.behaviorHints?.length) {
    await tx.taksaBehaviorHint.createMany({
      data: input.behaviorHints.map((h) => ({
        runId: run.id,
        sourceFile: h.sourceFile,
        topic: h.topic,
        text: h.text,
        metadata: (h.metadata ?? undefined) as object | undefined,
      })),
    });
  }

  await audit.record(
    {
      actorUserId,
      action: "IMPORT",
      entityType: "TaksaAnalysisRun",
      entityId: run.id,
      metadata: {
        analyzerType: input.analyzerType,
        status: input.status,
        totalFiles: input.totalFiles,
        outputDir: input.outputDir,
      },
    },
    tx,
  );
  return run.id;
}

export interface MaybePersistResult {
  persisted: boolean;
  runId?: string;
  message: string;
}

/**
 * Persists an analysis run only when the DB is reachable AND a SYSTEM_ADMIN
 * actor exists. Otherwise returns a clear message and persists nothing — the
 * caller will already have written file outputs.
 */
export async function maybePersistAnalysisRun(
  input: AnalysisPersistInput,
): Promise<MaybePersistResult> {
  if (!(await isDatabaseReachable())) {
    return { persisted: false, message: "Database not reachable; wrote file outputs only." };
  }
  const actorUserId = await resolveCliActorUserId();
  if (!actorUserId) {
    return {
      persisted: false,
      message: "No SYSTEM_ADMIN user found; wrote file outputs only (no audit actor).",
    };
  }
  const runId = await prisma.$transaction((tx) => persistAnalysisRun(input, actorUserId, tx));
  return { persisted: true, runId, message: `Persisted analysis run ${runId}.` };
}

// ---------------------------------------------------------------------------
// Mapping analyzer outputs → normalized persistence inputs.
// ---------------------------------------------------------------------------

function discoveryEntities(d: DiscoveryResult): DetectedEntityInput[] {
  return d.files.map((f) => ({
    entityType: "SOURCE_FILE",
    sourceType: f.sourceType,
    sourceFile: f.relativePath,
    family: f.sourceFamily,
    name: f.fileName,
  }));
}

function sqlEntities(s: SqlStaticAuditResult): DetectedEntityInput[] {
  return s.files.flatMap((f) =>
    f.tables.map((t) => ({
      entityType: "SQL_TABLE",
      sourceType: "TAKSA_SQL_SCRIPT",
      sourceFile: f.relativePath,
      name: t.table,
      metadata: { columnCount: t.columns.length },
    })),
  );
}

function backupCandidateEntities(
  files: ReadonlyArray<{ relativePath: string; tableCandidates: string[] }>,
): DetectedEntityInput[] {
  return files.flatMap((f) =>
    f.tableCandidates.map((name) => ({
      entityType: "BACKUP_TABLE_CANDIDATE",
      sourceType: "SQL_SERVER_BACKUP",
      sourceFile: f.relativePath,
      name,
    })),
  );
}

function excelEntities(e: ExcelAuditResult): DetectedEntityInput[] {
  return e.files.flatMap((f) =>
    f.sheets.map((sheet) => ({
      entityType: "EXCEL_SHEET",
      sourceType: "EXCEL_TEMPLATE",
      sourceFile: f.relativePath,
      family: f.templatePurpose,
      name: sheet,
    })),
  );
}

function scriptXmlMappings(sx: ScriptXmlAuditResult): ScriptXmlMappingInput[] {
  return (sx.summary?.mappings ?? []).map((m) => ({
    procedureName: m.procedureName,
    xmlPath: m.xmlPath,
    targetTable: m.targetTable,
    columns: m.columns,
  }));
}

function docsLabels(d: DocsAuditResult): UiLabelInput[] {
  return d.gwsLabels.map((l) => ({
    sourceFile: "gws.ini",
    label: l.label,
    dataPropertyName: null,
    formName: l.section || null,
    gridName: null,
    metadata: { key: l.key },
  }));
}

function docsHints(d: DocsAuditResult): BehaviorHintInput[] {
  return d.behaviorHints.map((h) => ({
    sourceFile: h.sourceFile,
    topic: h.topic,
    text: h.text,
    metadata: h.matchedTerms.length ? { matchedTerms: h.matchedTerms } : null,
  }));
}

// ---------------------------------------------------------------------------
// Unified analyze.
// ---------------------------------------------------------------------------

export interface UnifiedAnalyzeSummary {
  outputDirRelative: string;
  discovery: { totalFiles: number; missingCoreFiles: number };
  dbBackup: { totalFiles: number; restoreStatus: string };
  scriptXml: { found: boolean; openXmlCount: number; insertTargets: number };
  sqlStatic: { files: number; tables: number };
  backupStrings: { files: number; candidates: number };
  mdb: { files: number };
  excel: { files: number; sheets: number };
  docs: { labels: number; hints: number };
  pdf: { files: number };
  dts: { files: number };
  rpt: { files: number };
}

export interface UnifiedAnalyzeResult {
  summary: UnifiedAnalyzeSummary;
  outputs: string[];
  persistInput: AnalysisPersistInput;
}

/**
 * Runs all analyzers and writes their outputs. DB-free: returns a summary plus
 * a ready-to-persist `AnalysisPersistInput`. The caller decides whether to
 * persist (see {@link maybePersistAnalysisRun}).
 */
export function runAllAnalyzers(dataRootOverride?: string): UnifiedAnalyzeResult {
  const discovery = discoverTaksaSources(dataRootOverride);
  const dbBackup = inspectDbBackups(dataRootOverride);
  const scriptXml = auditScriptXml(dataRootOverride);
  const sqlStatic = auditStaticSql(dataRootOverride);
  const backupStrings = auditBackupStrings(dataRootOverride);
  const mdb = auditMdb(dataRootOverride);
  const excel = auditExcel(dataRootOverride);
  const docs = auditDocs(dataRootOverride);
  const pdf = auditPdf(dataRootOverride);
  const dts = auditDts(dataRootOverride);
  const rpt = auditRpt(dataRootOverride);

  const outputs = [
    ...writeDbBackupOutputs(dbBackup, dataRootOverride),
    ...writeScriptXmlOutputs(scriptXml, dataRootOverride),
    ...writeStaticSqlOutputs(sqlStatic, dataRootOverride),
    ...writeBackupStringsOutputs(backupStrings, dataRootOverride),
    ...writeMdbOutputs(mdb, dataRootOverride),
    ...writeExcelOutputs(excel, dataRootOverride),
    ...writeDocsOutputs(docs, dataRootOverride),
    ...writePdfOutputs(pdf, dataRootOverride),
    ...writeDtsOutputs(dts, dataRootOverride),
    ...writeRptOutputs(rpt, dataRootOverride),
  ];

  const outputDirRelative = toSafeRelativePath(getTaksaProcessedRoot(dataRootOverride), dataRootOverride);

  const summary: UnifiedAnalyzeSummary = {
    outputDirRelative,
    discovery: { totalFiles: discovery.totalFiles, missingCoreFiles: discovery.missingCoreFiles.length },
    dbBackup: { totalFiles: dbBackup.totalFiles, restoreStatus: dbBackup.restoreStatus },
    scriptXml: {
      found: scriptXml.found,
      openXmlCount: scriptXml.summary?.openXmlCount ?? 0,
      insertTargets: scriptXml.summary?.insertTargets.length ?? 0,
    },
    sqlStatic: { files: sqlStatic.totalFiles, tables: sqlStatic.files.reduce((a, f) => a + f.tables.length, 0) },
    backupStrings: {
      files: backupStrings.totalFiles,
      candidates: backupStrings.files.reduce((a, f) => a + f.tableCandidates.length, 0),
    },
    mdb: { files: mdb.totalFiles },
    excel: { files: excel.totalFiles, sheets: excel.files.reduce((a, f) => a + f.sheets.length, 0) },
    docs: { labels: docs.gwsLabels.length, hints: docs.behaviorHints.length },
    pdf: { files: pdf.totalFiles },
    dts: { files: dts.totalFiles },
    rpt: { files: rpt.totalFiles },
  };

  const detectedEntities = [
    ...discoveryEntities(discovery),
    ...sqlEntities(sqlStatic),
    ...backupCandidateEntities(backupStrings.files),
    ...excelEntities(excel),
  ];

  const persistInput: AnalysisPersistInput = {
    analyzerType: "UNIFIED",
    status: "COMPLETED",
    totalFiles: discovery.totalFiles,
    successCount: discovery.files.filter((f) => f.supportedForAnalysis).length,
    warningCount: discovery.missingCoreFiles.length,
    errorCount: 0,
    outputDir: outputDirRelative,
    summaryJson: summary as unknown as Record<string, unknown>,
    detectedEntities,
    scriptXmlMappings: scriptXmlMappings(scriptXml),
    uiLabels: docsLabels(docs),
    behaviorHints: docsHints(docs),
  };

  return { summary, outputs, persistInput };
}

/** CLI entry: run all analyzers, write outputs, then best-effort persist. */
export async function analyzeTaksa(dataRootOverride?: string): Promise<{
  result: UnifiedAnalyzeResult;
  persistence: MaybePersistResult;
}> {
  const result = runAllAnalyzers(dataRootOverride);
  const persistence = await maybePersistAnalysisRun(result.persistInput);
  return { result, persistence };
}
