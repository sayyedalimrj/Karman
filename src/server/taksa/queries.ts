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
