/**
 * Read-only loaders for the data-sync dashboard, the update-packages page, and
 * the admin diagnostics page.
 *
 * Every value comes from real Prisma queries against persisted metadata — the
 * website NEVER scans raw server files at request time. Empty tables yield
 * genuinely empty results that drive product-language empty states (never a
 * "data missing" message). No fabricated counts.
 */
import { prisma } from "@/server/db";

export interface SyncStatusCard {
  /** Total registered discovered sources (TaksaDiscoveredFile). */
  registeredSources: number;
  /** Discovered files reported by the latest sync run (DB-backed). */
  discoveredFiles: number;
  /** Detected update packages. */
  updatePackages: number;
  /** Total analysis runs recorded. */
  analysisRuns: number;
  /** Latest analysis finished/started timestamp, if any. */
  lastAnalysisAt: Date | null;
  /** Latest sync run finished timestamp, if any. */
  lastSyncAt: Date | null;
  /** Latest sync run status (RUNNING / COMPLETED / COMPLETED_WITH_WARNINGS). */
  lastSyncStatus: string | null;
  /** Reference-data readiness: number of populated reference groups (0..n). */
  referenceReadyGroups: number;
  referenceTotalGroups: number;
}

export interface SyncRunListItem {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  discoveredSources: number;
  warningsCount: number;
}

export interface SyncDashboardData {
  cards: SyncStatusCard;
  history: SyncRunListItem[];
  hasAnySync: boolean;
}

const REFERENCE_GROUP_COUNTERS = [
  () => prisma.referenceSource.count(),
  () => prisma.referenceBook.count(),
  () => prisma.referenceItem.count(),
  () => prisma.referenceUnit.count(),
  () => prisma.referenceIndexPeriod.count(),
  () => prisma.referenceCircular.count(),
  () => prisma.referenceMapping.count(),
];

/** Loads the operational sync dashboard (cards + last-sync history). */
export async function loadSyncDashboard(): Promise<SyncDashboardData> {
  const [
    registeredSources,
    updatePackages,
    analysisRuns,
    latestAnalysis,
    latestSync,
    history,
    refCounts,
  ] = await Promise.all([
    prisma.taksaDiscoveredFile.count(),
    prisma.referenceUpdatePackage.count(),
    prisma.taksaAnalysisRun.count(),
    prisma.taksaAnalysisRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, finishedAt: true },
    }),
    prisma.dataSyncRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, finishedAt: true, status: true, discoveredSources: true },
    }),
    prisma.dataSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        discoveredSources: true,
        warnings: true,
      },
    }),
    Promise.all(REFERENCE_GROUP_COUNTERS.map((fn) => fn())),
  ]);

  const referenceReadyGroups = refCounts.filter((c) => c > 0).length;

  const cards: SyncStatusCard = {
    registeredSources,
    discoveredFiles: latestSync?.discoveredSources ?? registeredSources,
    updatePackages,
    analysisRuns,
    lastAnalysisAt: latestAnalysis?.finishedAt ?? latestAnalysis?.startedAt ?? null,
    lastSyncAt: latestSync?.finishedAt ?? latestSync?.startedAt ?? null,
    lastSyncStatus: latestSync?.status ?? null,
    referenceReadyGroups,
    referenceTotalGroups: REFERENCE_GROUP_COUNTERS.length,
  };

  return {
    cards,
    history: history.map((h) => ({
      id: h.id,
      status: h.status,
      startedAt: h.startedAt,
      finishedAt: h.finishedAt,
      discoveredSources: h.discoveredSources,
      warningsCount: Array.isArray(h.warnings) ? (h.warnings as unknown[]).length : 0,
    })),
    hasAnySync: latestSync !== null,
  };
}

export interface UpdatePackageRow {
  id: string;
  packageName: string;
  status: string;
  affectedTables: string[];
  insertIntentCount: number;
  deleteIntentCount: number;
  pendingRows: number;
  detectedAt: Date;
}

export interface UpdatePackagesData {
  packages: UpdatePackageRow[];
  isEmpty: boolean;
}

/** Loads the «بسته‌های بروزرسانی» page (DB-backed; staging-only). */
export async function loadUpdatePackages(): Promise<UpdatePackagesData> {
  const rows = await prisma.referenceUpdatePackage.findMany({
    orderBy: { detectedAt: "desc" },
    take: 200,
    select: {
      id: true,
      packageName: true,
      status: true,
      affectedTables: true,
      insertIntentCount: true,
      deleteIntentCount: true,
      detectedAt: true,
      _count: { select: { stagingRows: true } },
    },
  });
  return {
    packages: rows.map((r) => ({
      id: r.id,
      packageName: r.packageName,
      status: r.status,
      affectedTables: Array.isArray(r.affectedTables) ? (r.affectedTables as string[]) : [],
      insertIntentCount: r.insertIntentCount,
      deleteIntentCount: r.deleteIntentCount,
      pendingRows: r._count.stagingRows,
      detectedAt: r.detectedAt,
    })),
    isEmpty: rows.length === 0,
  };
}

export interface DiagnosticsRunStep {
  stepKey: string;
  status: string;
  message: string | null;
}

export interface DiagnosticsRun {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  sourceRoot: string;
  discoveredSources: number;
  fileCounts: Record<string, number>;
  warnings: string[];
  errors: string[];
  steps: DiagnosticsRunStep[];
}

export interface DiagnosticsData {
  latest: DiagnosticsRun | null;
  recentRuns: Array<{ id: string; status: string; startedAt: Date; discoveredSources: number }>;
}

/** Loads the latest run detail + recent runs for the admin diagnostics page. */
export async function loadDiagnostics(): Promise<DiagnosticsData> {
  const [latest, recentRuns] = await Promise.all([
    prisma.dataSyncRun.findFirst({
      orderBy: { startedAt: "desc" },
      include: { steps: { orderBy: { startedAt: "asc" } } },
    }),
    prisma.dataSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 25,
      select: { id: true, status: true, startedAt: true, discoveredSources: true },
    }),
  ]);

  return {
    latest: latest
      ? {
          id: latest.id,
          status: latest.status,
          startedAt: latest.startedAt,
          finishedAt: latest.finishedAt,
          sourceRoot: latest.sourceRoot,
          discoveredSources: latest.discoveredSources,
          fileCounts: (latest.fileCounts as Record<string, number>) ?? {},
          warnings: Array.isArray(latest.warnings) ? (latest.warnings as string[]) : [],
          errors: Array.isArray(latest.errors) ? (latest.errors as string[]) : [],
          steps: latest.steps.map((s) => ({
            stepKey: s.stepKey,
            status: s.status,
            message: s.message,
          })),
        }
      : null,
    recentRuns,
  };
}

/** Loads a single sync run's steps/logs by id (admin diagnostics drill-down). */
export async function loadSyncRunById(id: string): Promise<DiagnosticsRun | null> {
  const run = await prisma.dataSyncRun.findUnique({
    where: { id },
    include: { steps: { orderBy: { startedAt: "asc" } } },
  });
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    sourceRoot: run.sourceRoot,
    discoveredSources: run.discoveredSources,
    fileCounts: (run.fileCounts as Record<string, number>) ?? {},
    warnings: Array.isArray(run.warnings) ? (run.warnings as string[]) : [],
    errors: Array.isArray(run.errors) ? (run.errors as string[]) : [],
    steps: run.steps.map((s) => ({ stepKey: s.stepKey, status: s.status, message: s.message })),
  };
}
