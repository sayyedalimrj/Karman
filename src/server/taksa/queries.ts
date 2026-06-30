/**
 * Read-only loaders for the Taksa workbench routes (/taksa, /taksa/raw).
 *
 * Real Prisma counts/rows for the raw-preservation layer. No fabricated data;
 * an empty database yields genuinely empty results that drive the real empty
 * states.
 *
 * Requirements: 9.1, 9.2, 10.4
 */
import type { TaksaExportStatus, TaksaImportStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import type { TaksaRawCounts } from "@/server/workbench/dashboard";

/** Counts of the raw-preservation tables (real `count()` queries). */
export async function loadTaksaRawCounts(): Promise<TaksaRawCounts> {
  const [artifacts, rawTables, rawRows] = await Promise.all([
    prisma.taksaArtifact.count(),
    prisma.taksaRawTable.count(),
    prisma.taksaRawRow.count(),
  ]);
  return { artifacts, rawTables, rawRows };
}

export interface TaksaArtifactRow {
  id: string;
  sourceName: string;
  importStatus: TaksaImportStatus;
  exportStatus: TaksaExportStatus;
  tableCount: number;
  createdAt: Date;
}

export interface TaksaRawData {
  counts: TaksaRawCounts;
  artifacts: TaksaArtifactRow[];
  isEmpty: boolean;
}

/** Loads /taksa/raw: counts plus the real artifact list (with table counts). */
export async function loadTaksaRawData(): Promise<TaksaRawData> {
  const counts = await loadTaksaRawCounts();
  const artifacts = await prisma.taksaArtifact.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      sourceName: true,
      importStatus: true,
      exportStatus: true,
      createdAt: true,
      _count: { select: { rawTables: true } },
    },
  });
  return {
    counts,
    artifacts: artifacts.map((a) => ({
      id: a.id,
      sourceName: a.sourceName,
      importStatus: a.importStatus,
      exportStatus: a.exportStatus,
      tableCount: a._count.rawTables,
      createdAt: a.createdAt,
    })),
    isEmpty: counts.artifacts === 0 && counts.rawTables === 0 && counts.rawRows === 0,
  };
}



// ============================================================================
// Phase 2 — Taksa staging/analysis read loaders.
// ----------------------------------------------------------------------------
// Every loader below reads ONLY persisted PostgreSQL metadata. The website
// never scans raw Taksa files at request time — it renders these rows. Empty
// tables yield genuinely empty results (no fabricated counts/rows).
// ============================================================================

export interface DiscoveredSourceRow {
  id: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sourceType: string;
  sourceFamily: string | null;
  category: string;
  sizeBytes: number;
  supportedForAnalysis: boolean;
  supportedForIngestion: boolean;
  status: string;
  createdAt: Date;
}

export interface DiscoveredSourcesData {
  files: DiscoveredSourceRow[];
  countsByType: Record<string, number>;
  total: number;
  isEmpty: boolean;
}

/** Loads /taksa/sources: registered discovered files (DB metadata only). */
export async function loadDiscoveredSources(): Promise<DiscoveredSourcesData> {
  const rows = await prisma.taksaDiscoveredFile.findMany({
    orderBy: [{ category: "asc" }, { fileName: "asc" }],
    take: 1000,
    select: {
      id: true,
      relativePath: true,
      fileName: true,
      extension: true,
      sourceType: true,
      sourceFamily: true,
      category: true,
      sizeBytes: true,
      supportedForAnalysis: true,
      supportedForIngestion: true,
      status: true,
      createdAt: true,
    },
  });
  const countsByType: Record<string, number> = {};
  for (const r of rows) countsByType[r.sourceType] = (countsByType[r.sourceType] ?? 0) + 1;
  return { files: rows, countsByType, total: rows.length, isEmpty: rows.length === 0 };
}

export interface AnalysisRunRow {
  id: string;
  analyzerType: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  totalFiles: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  outputDir: string | null;
}

export interface AnalysisRunsData {
  runs: AnalysisRunRow[];
  isEmpty: boolean;
}

/** Loads /taksa/analyze and /taksa/analyze/runs: analyzer run summaries. */
export async function loadAnalysisRuns(): Promise<AnalysisRunsData> {
  const runs = await prisma.taksaAnalysisRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
    select: {
      id: true,
      analyzerType: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      totalFiles: true,
      successCount: true,
      warningCount: true,
      errorCount: true,
      outputDir: true,
    },
  });
  return { runs, isEmpty: runs.length === 0 };
}

export interface ScriptXmlMappingRow {
  id: string;
  procedureName: string | null;
  xmlPath: string | null;
  targetTable: string;
}

/** Loads /taksa/analyze/scriptxml: persisted ScriptXML mappings (latest first). */
export async function loadScriptXmlMappings(): Promise<{
  mappings: ScriptXmlMappingRow[];
  isEmpty: boolean;
}> {
  const mappings = await prisma.taksaScriptXmlMapping.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, procedureName: true, xmlPath: true, targetTable: true },
  });
  return { mappings, isEmpty: mappings.length === 0 };
}

export interface DetectedEntityRow {
  id: string;
  entityType: string;
  sourceType: string;
  sourceFile: string;
  family: string | null;
  name: string;
}

/** Loads detected entities of a given type (e.g. SQL_TABLE, EXCEL_SHEET). */
export async function loadDetectedEntities(entityType: string): Promise<{
  entities: DetectedEntityRow[];
  isEmpty: boolean;
}> {
  const entities = await prisma.taksaDetectedEntity.findMany({
    where: { entityType },
    orderBy: { name: "asc" },
    take: 1000,
    select: {
      id: true,
      entityType: true,
      sourceType: true,
      sourceFile: true,
      family: true,
      name: true,
    },
  });
  return { entities, isEmpty: entities.length === 0 };
}

export interface DocsAnalysisData {
  labels: Array<{ id: string; sourceFile: string; label: string; formName: string | null }>;
  hints: Array<{ id: string; sourceFile: string; topic: string; text: string }>;
  isEmpty: boolean;
}

/** Loads /taksa/analyze/docs: persisted UI labels + behavior hints. */
export async function loadDocsAnalysis(): Promise<DocsAnalysisData> {
  const [labels, hints] = await Promise.all([
    prisma.taksaUiLabel.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, sourceFile: true, label: true, formName: true },
    }),
    prisma.taksaBehaviorHint.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, sourceFile: true, topic: true, text: true },
    }),
  ]);
  return { labels, hints, isEmpty: labels.length === 0 && hints.length === 0 };
}
