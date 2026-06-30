/**
 * Presentational label helpers that map real count objects to localized
 * {label, value} entries for the CountGrid, plus readiness-group labels.
 *
 * These are pure mapping helpers (no data invention): they only attach Persian
 * labels to numbers that the caller computed from real Prisma queries.
 *
 * Requirements: 1.2, 10.4
 */
import { t } from "./index";
import type { CountEntry } from "@/components/ui";
import type {
  ReferenceCounts,
  ReadinessGroup,
  TaksaRawCounts,
} from "@/server/workbench/dashboard";
import type { ReferenceLibraryCounts } from "@/server/reference/queries";

function readinessLabel(group: ReadinessGroup): string {
  const map: Record<ReadinessGroup, string> = {
    hasReferenceSource: t.workbench.groupHasReferenceSource,
    hasReferenceBook: t.workbench.groupHasReferenceBook,
    hasReferenceItem: t.workbench.groupHasReferenceItem,
    hasReferenceUnit: t.workbench.groupHasReferenceUnit,
    hasReferenceIndexPeriod: t.workbench.groupHasReferenceIndexPeriod,
    hasReferenceCircular: t.workbench.groupHasReferenceCircular,
    hasReferenceMapping: t.workbench.groupHasReferenceMapping,
  };
  return map[group];
}

function referenceCountEntries(c: ReferenceCounts): CountEntry[] {
  return [
    { label: t.workbench.referenceSource, value: c.sources },
    { label: t.workbench.referenceImportRun, value: c.importRuns },
    { label: t.workbench.referenceBook, value: c.books },
    { label: t.workbench.referenceChapter, value: c.chapters },
    { label: t.workbench.referenceItem, value: c.items },
    { label: t.workbench.referenceUnit, value: c.units },
    { label: t.workbench.referenceResource, value: c.resources },
    { label: t.workbench.referenceIndexPeriod, value: c.indexPeriods },
    { label: t.workbench.referenceCircular, value: c.circulars },
    { label: t.workbench.referenceCoefficientRule, value: c.coefficientRules },
    { label: t.workbench.referenceDeductionRule, value: c.deductionRules },
    { label: t.workbench.referenceMapping, value: c.mappings },
  ];
}

function libraryCountEntries(c: ReferenceLibraryCounts): CountEntry[] {
  return [
    { label: t.workbench.referenceBook, value: c.books },
    { label: t.workbench.referenceChapter, value: c.chapters },
    { label: t.workbench.referenceItem, value: c.items },
    { label: t.workbench.referenceUnit, value: c.units },
    { label: t.workbench.referenceResource, value: c.resources },
    { label: t.workbench.referenceIndexPeriod, value: c.indexPeriods },
    { label: t.workbench.referenceCircular, value: c.circulars },
    { label: t.workbench.referenceCoefficientRule, value: c.coefficientRules },
    { label: t.workbench.referenceDeductionRule, value: c.deductionRules },
    { label: t.workbench.referenceMapping, value: c.mappings },
  ];
}

function taksaCountEntries(c: TaksaRawCounts): CountEntry[] {
  return [
    { label: t.workbench.taksaArtifact, value: c.artifacts },
    { label: t.workbench.taksaRawTable, value: c.rawTables },
    { label: t.workbench.taksaRawRow, value: c.rawRows },
  ];
}

export const workbench = {
  readinessLabel,
  referenceCountEntries,
  libraryCountEntries,
  taksaCountEntries,
};
