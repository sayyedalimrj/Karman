/**
 * Builders that turn each analyzer's result into a normalized
 * {@link AnalysisPersistInput} for the staging tables. Used by the per-analyzer
 * CLIs so each command can persist its own `TaksaAnalysisRun` + children when a
 * database is reachable.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { getTaksaProcessedRoot, toSafeRelativePath } from "./data-root";
import type { AnalysisPersistInput } from "./analyze";
import type { DiscoveryResult } from "./source-discovery";
import type { DbBackupInspectionResult } from "./db-backup-inspector";
import type { ScriptXmlAuditResult } from "./scriptxml-parser";
import type { SqlStaticAuditResult } from "./sql-static-parser";
import type { BackupStringsAuditResult } from "./backup-strings-audit";
import type { MdbAuditResult } from "./mdb-audit";
import type { ExcelAuditResult } from "./excel-audit";
import type { DocsAuditResult } from "./docs-audit";
import type { PdfAuditResult } from "./pdf-audit";
import type { DtsAuditResult, RptAuditResult } from "./dts-rpt-audit";

function outputDir(dataRootOverride?: string): string {
  return toSafeRelativePath(getTaksaProcessedRoot(dataRootOverride), dataRootOverride);
}

export function buildDiscoveryPersist(d: DiscoveryResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "DISCOVERY",
    status: "COMPLETED",
    totalFiles: d.totalFiles,
    successCount: d.files.filter((f) => f.supportedForAnalysis).length,
    warningCount: d.missingCoreFiles.length,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { countsByType: d.countsByType, missingCoreFiles: d.missingCoreFiles.length },
    detectedEntities: d.files.map((f) => ({
      entityType: "SOURCE_FILE",
      sourceType: f.sourceType,
      sourceFile: f.relativePath,
      family: f.sourceFamily,
      name: f.fileName,
    })),
  };
}

export function buildDbInspectPersist(
  r: DbBackupInspectionResult,
  dataRootOverride?: string,
): AnalysisPersistInput {
  return {
    analyzerType: "DB_BACKUP",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.entries.filter((e) => e.hasTapeHeader).length,
    warningCount: r.totalFiles,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { restoreStatus: r.restoreStatus, restoreNote: r.restoreNote },
    detectedEntities: r.entries.map((e) => ({
      entityType: "DB_BACKUP",
      sourceType: "SQL_SERVER_BACKUP",
      sourceFile: e.relativePath,
      name: e.fileName,
      metadata: { classification: e.classification, restoreStatus: e.restoreStatus },
    })),
  };
}

export function buildScriptXmlPersist(
  r: ScriptXmlAuditResult,
  dataRootOverride?: string,
): AnalysisPersistInput {
  return {
    analyzerType: "SCRIPTXML",
    status: r.found ? "COMPLETED" : "SKIPPED",
    totalFiles: r.found ? 1 : 0,
    successCount: r.found ? 1 : 0,
    warningCount: r.found ? 0 : 1,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: {
      found: r.found,
      openXmlCount: r.summary?.openXmlCount ?? 0,
      knownPathsFound: r.summary?.knownPathsFound ?? [],
    },
    scriptXmlMappings: (r.summary?.mappings ?? []).map((m) => ({
      procedureName: m.procedureName,
      xmlPath: m.xmlPath,
      targetTable: m.targetTable,
      columns: m.columns,
    })),
  };
}

export function buildSqlPersist(r: SqlStaticAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "SQL_STATIC",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.totalFiles,
    warningCount: 0,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { tables: r.files.reduce((a, f) => a + f.tables.length, 0) },
    detectedEntities: r.files.flatMap((f) =>
      f.tables.map((t) => ({
        entityType: "SQL_TABLE",
        sourceType: "TAKSA_SQL_SCRIPT",
        sourceFile: f.relativePath,
        name: t.table,
        metadata: { columnCount: t.columns.length },
      })),
    ),
  };
}

export function buildBackupStringsPersist(
  r: BackupStringsAuditResult,
  dataRootOverride?: string,
): AnalysisPersistInput {
  return {
    analyzerType: "BACKUP_STRINGS",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.totalFiles,
    warningCount: 0,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: {
      candidates: r.files.reduce((a, f) => a + f.tableCandidates.length, 0),
    },
    detectedEntities: r.files.flatMap((f) =>
      f.tableCandidates.map((name) => ({
        entityType: "BACKUP_TABLE_CANDIDATE",
        sourceType: "SQL_SERVER_BACKUP",
        sourceFile: f.relativePath,
        name,
      })),
    ),
  };
}

export function buildMdbPersist(r: MdbAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "MDB",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.files.filter((f) => f.format !== "UNKNOWN").length,
    warningCount: r.files.filter((f) => f.format === "UNKNOWN").length,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { metadataExtractionAvailable: r.metadataExtractionAvailable },
    detectedEntities: r.files.map((f) => ({
      entityType: "MDB_FILE",
      sourceType: "ACCESS_MDB",
      sourceFile: f.relativePath,
      name: f.fileName,
      metadata: { format: f.format, status: f.status },
    })),
  };
}

export function buildExcelPersist(r: ExcelAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "EXCEL",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.files.filter((f) => f.sheets.length > 0).length,
    warningCount: r.files.filter((f) => f.sheets.length === 0).length,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { sheets: r.files.reduce((a, f) => a + f.sheets.length, 0) },
    detectedEntities: r.files.flatMap((f) =>
      f.sheets.map((sheet) => ({
        entityType: "EXCEL_SHEET",
        sourceType: "EXCEL_TEMPLATE",
        sourceFile: f.relativePath,
        family: f.templatePurpose,
        name: sheet,
      })),
    ),
  };
}

export function buildDocsPersist(r: DocsAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "DOCS",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.filesParsed.length,
    warningCount: 0,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { labels: r.gwsLabels.length, hints: r.behaviorHints.length },
    uiLabels: r.gwsLabels.map((l) => ({
      sourceFile: "gws.ini",
      label: l.label,
      formName: l.section || null,
      metadata: { key: l.key },
    })),
    behaviorHints: r.behaviorHints.map((h) => ({
      sourceFile: h.sourceFile,
      topic: h.topic,
      text: h.text,
      metadata: h.matchedTerms.length ? { matchedTerms: h.matchedTerms } : null,
    })),
  };
}

export function buildPdfPersist(r: PdfAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "PDF",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.files.filter((f) => f.isPdf).length,
    warningCount: r.files.filter((f) => !f.isPdf).length,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { files: r.totalFiles },
    detectedEntities: r.files.map((f) => ({
      entityType: "PDF_DOC",
      sourceType: "PDF_PROVENANCE_DOC",
      sourceFile: f.relativePath,
      name: f.fileName,
      metadata: { classifications: f.classifications, pageCount: f.pageCount },
    })),
  };
}

export function buildDtsPersist(r: DtsAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "DTS",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.totalFiles,
    warningCount: 0,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { files: r.totalFiles },
    detectedEntities: r.files.map((f) => ({
      entityType: "DTS_PACKAGE",
      sourceType: "DTS_IMPORTER",
      sourceFile: f.relativePath,
      name: f.fileName,
    })),
  };
}

export function buildRptPersist(r: RptAuditResult, dataRootOverride?: string): AnalysisPersistInput {
  return {
    analyzerType: "RPT",
    status: "COMPLETED",
    totalFiles: r.totalFiles,
    successCount: r.totalFiles,
    warningCount: 0,
    errorCount: 0,
    outputDir: outputDir(dataRootOverride),
    summaryJson: { files: r.totalFiles },
    detectedEntities: r.files.map((f) => ({
      entityType: "RPT_TEMPLATE",
      sourceType: "CRYSTAL_REPORT_TEMPLATE",
      sourceFile: f.relativePath,
      family: f.classification,
      name: f.fileName,
    })),
  };
}
