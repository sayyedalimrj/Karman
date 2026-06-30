/**
 * Read-only loaders for the Reference workbench routes (/reference,
 * /reference/sources, /reference/library).
 *
 * Every value is a REAL Prisma query result. Reference master data is
 * system-wide reference input (not project-scoped); pages still enforce
 * authentication via the page guard. No fake rows, no sample official values.
 *
 * Requirements: 15.1, 15.2, 10.4
 */
import type { ReferenceSourceType } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  computeReadiness,
  type ReferenceCounts,
  type Readiness,
} from "@/server/workbench/dashboard";

/** Counts of every Reference* table (real `count()` queries). */
export async function getReferenceCounts(): Promise<ReferenceCounts> {
  const [
    sources, importRuns, books, chapters, items, units, resources,
    indexPeriods, circulars, coefficientRules, deductionRules, mappings,
  ] = await Promise.all([
    prisma.referenceSource.count(),
    prisma.referenceImportRun.count(),
    prisma.referenceBook.count(),
    prisma.referenceChapter.count(),
    prisma.referenceItem.count(),
    prisma.referenceUnit.count(),
    prisma.referenceResource.count(),
    prisma.referenceIndexPeriod.count(),
    prisma.referenceCircular.count(),
    prisma.referenceCoefficientRule.count(),
    prisma.referenceDeductionRule.count(),
    prisma.referenceMapping.count(),
  ]);
  return {
    sources, importRuns, books, chapters, items, units, resources,
    indexPeriods, circulars, coefficientRules, deductionRules, mappings,
  };
}

export interface ReferenceOverview {
  counts: ReferenceCounts;
  readiness: Readiness;
  /** True when NO reference data of any kind exists yet. */
  isEmpty: boolean;
}

/** Loads the /reference overview: counts + readiness + empty flag. */
export async function loadReferenceOverview(): Promise<ReferenceOverview> {
  const counts = await getReferenceCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, readiness: computeReadiness(counts), isEmpty: total === 0 };
}


export interface ReferenceSourceRow {
  id: string;
  sourceType: ReferenceSourceType;
  name: string;
  originalFileName: string | null;
  originalDbName: string | null;
  originalScriptName: string | null;
  checksum: string | null;
  createdAt: Date;
}

/** Lists registered reference sources (real rows, most recent first). */
export async function loadReferenceSources(): Promise<ReferenceSourceRow[]> {
  return prisma.referenceSource.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      sourceType: true,
      name: true,
      originalFileName: true,
      originalDbName: true,
      originalScriptName: true,
      checksum: true,
      createdAt: true,
    },
  });
}

export interface ReferenceLibraryCounts {
  books: number;
  chapters: number;
  items: number;
  units: number;
  resources: number;
  indexPeriods: number;
  circulars: number;
  coefficientRules: number;
  deductionRules: number;
  mappings: number;
}

export interface ReferenceLibrary {
  counts: ReferenceLibraryCounts;
  isEmpty: boolean;
}

/** Loads /reference/library: real summaries/counts of the normalized entities. */
export async function loadReferenceLibrary(): Promise<ReferenceLibrary> {
  const c = await getReferenceCounts();
  const counts: ReferenceLibraryCounts = {
    books: c.books,
    chapters: c.chapters,
    items: c.items,
    units: c.units,
    resources: c.resources,
    indexPeriods: c.indexPeriods,
    circulars: c.circulars,
    coefficientRules: c.coefficientRules,
    deductionRules: c.deductionRules,
    mappings: c.mappings,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, isEmpty: total === 0 };
}


/** The reference groups that gate real project creation (Phase 1). */
export interface ProjectSetupReadiness {
  checks: {
    hasReferenceSource: boolean;
    hasReferenceBook: boolean;
    hasReferenceItem: boolean;
    hasReferenceUnit: boolean;
    hasReferenceIndexPeriod: boolean;
    hasReferenceCircular: boolean;
  };
  /** True only when every gating group has data. */
  isReady: boolean;
}

/**
 * Computes whether the minimum reference readiness for real project creation is
 * satisfied. Until it is, project creation remains DISABLED (Phase 1 gate).
 */
export async function loadProjectSetupReadiness(): Promise<ProjectSetupReadiness> {
  const c = await getReferenceCounts();
  const checks = {
    hasReferenceSource: c.sources > 0,
    hasReferenceBook: c.books > 0,
    hasReferenceItem: c.items > 0,
    hasReferenceUnit: c.units > 0,
    hasReferenceIndexPeriod: c.indexPeriods > 0,
    hasReferenceCircular: c.circulars > 0,
  };
  return { checks, isReady: Object.values(checks).every(Boolean) };
}
