/**
 * Operational workbench loader — «میز کار عملیاتی کارمان».
 *
 * Returns the REAL operational status of Karman computed entirely from Prisma
 * queries: reference master-data counts, raw Taksa counts, project/contract
 * counts (scoped), workflow/inbox counts (scoped), and a data-readiness
 * assessment derived from the required reference groups.
 *
 * ABSOLUTE RULE — NOTHING FAKE: every number here comes from a real `count()`
 * query. Zero is a valid, truthful result (it drives the readiness warning);
 * no fabricated stats, sample projects, or placeholder values are ever
 * produced.
 *
 * Scoping (Requirement 4.3): SYSTEM_ADMIN sees all projects/cases; every other
 * user sees only projects where they hold a ProjectMember row (and the
 * contracts/parties/members/cases within those projects). Reference and raw
 * Taksa master data are system-wide reference inputs and are not project-scoped.
 *
 * Requirements: 10.4, 4.3, 15.1, 15.2
 */
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { AuthUser } from "@/server/auth/session";

export interface ReferenceCounts {
  sources: number;
  importRuns: number;
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

export interface TaksaRawCounts {
  artifacts: number;
  rawTables: number;
  rawRows: number;
}

export interface ProjectCounts {
  projects: number;
  contracts: number;
  parties: number;
  members: number;
}

export interface WorkflowCounts {
  total: number;
  locked: number;
  open: number;
}


/** The required reference data groups that gate operational readiness. */
export const READINESS_GROUPS = [
  "hasReferenceSource",
  "hasReferenceBook",
  "hasReferenceItem",
  "hasReferenceUnit",
  "hasReferenceIndexPeriod",
  "hasReferenceCircular",
  "hasReferenceMapping",
] as const;

export type ReadinessGroup = (typeof READINESS_GROUPS)[number];

export interface Readiness {
  /** Per-group readiness flags, each derived from a real count > 0. */
  groups: Record<ReadinessGroup, boolean>;
  /** Group keys that are still missing (count === 0). */
  missingGroups: ReadinessGroup[];
  /** Number of satisfied groups. */
  readyCount: number;
  /** Total number of required groups. */
  totalGroups: number;
  /** Integer percentage (0–100) computed from real required groups only. */
  percent: number;
  /** True iff every required group is satisfied. */
  isReady: boolean;
}

export interface WorkbenchData {
  isSystemAdmin: boolean;
  referenceCounts: ReferenceCounts;
  taksaRawCounts: TaksaRawCounts;
  projectCounts: ProjectCounts;
  workflowCounts: WorkflowCounts;
  readiness: Readiness;
}

/** Project visibility filter for the given user (membership or system admin). */
function projectScope(user: AuthUser): Prisma.ProjectWhereInput {
  if (user.systemRole === Role.SYSTEM_ADMIN) return {};
  return { members: { some: { userId: user.id } } };
}

/** Workflow-case visibility filter (scoped to accessible projects). */
function caseScope(user: AuthUser): Prisma.WorkflowCaseWhereInput {
  if (user.systemRole === Role.SYSTEM_ADMIN) return {};
  return { project: { members: { some: { userId: user.id } } } };
}

/** Filter for child rows that belong to accessible projects. */
function projectChildScope(user: AuthUser): { project: Prisma.ProjectWhereInput } | object {
  if (user.systemRole === Role.SYSTEM_ADMIN) return {};
  return { project: { members: { some: { userId: user.id } } } };
}


/** Builds the readiness assessment from the real reference counts. */
export function computeReadiness(counts: ReferenceCounts): Readiness {
  const groups: Record<ReadinessGroup, boolean> = {
    hasReferenceSource: counts.sources > 0,
    hasReferenceBook: counts.books > 0,
    hasReferenceItem: counts.items > 0,
    hasReferenceUnit: counts.units > 0,
    hasReferenceIndexPeriod: counts.indexPeriods > 0,
    hasReferenceCircular: counts.circulars > 0,
    hasReferenceMapping: counts.mappings > 0,
  };
  const missingGroups = READINESS_GROUPS.filter((g) => !groups[g]);
  const totalGroups: number = READINESS_GROUPS.length;
  const readyCount = totalGroups - missingGroups.length;
  const percent = totalGroups === 0 ? 0 : Math.round((readyCount / totalGroups) * 100);
  return {
    groups,
    missingGroups,
    readyCount,
    totalGroups,
    percent,
    isReady: missingGroups.length === 0,
  };
}

/**
 * Loads the full operational workbench snapshot for the user. All values are
 * real Prisma counts; readiness is computed from them. No fabricated data.
 */
export async function loadWorkbenchData(user: AuthUser): Promise<WorkbenchData> {
  const pScope = projectScope(user);
  const cScope = caseScope(user);
  const childScope = projectChildScope(user);

  const [
    sources,
    importRuns,
    books,
    chapters,
    items,
    units,
    resources,
    indexPeriods,
    circulars,
    coefficientRules,
    deductionRules,
    mappings,
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


  const [artifacts, rawTables, rawRows] = await Promise.all([
    prisma.taksaArtifact.count(),
    prisma.taksaRawTable.count(),
    prisma.taksaRawRow.count(),
  ]);

  const [projects, contracts, parties, members, total, locked, open] = await Promise.all([
    prisma.project.count({ where: pScope }),
    prisma.contract.count({ where: childScope as Prisma.ContractWhereInput }),
    prisma.projectParty.count({ where: childScope as Prisma.ProjectPartyWhereInput }),
    prisma.projectMember.count({
      where:
        user.systemRole === Role.SYSTEM_ADMIN
          ? {}
          : { project: { members: { some: { userId: user.id } } } },
    }),
    prisma.workflowCase.count({ where: cScope }),
    prisma.workflowCase.count({ where: { ...cScope, isLocked: true } }),
    prisma.workflowCase.count({ where: { ...cScope, isLocked: false } }),
  ]);

  const referenceCounts: ReferenceCounts = {
    sources,
    importRuns,
    books,
    chapters,
    items,
    units,
    resources,
    indexPeriods,
    circulars,
    coefficientRules,
    deductionRules,
    mappings,
  };

  return {
    isSystemAdmin: user.systemRole === Role.SYSTEM_ADMIN,
    referenceCounts,
    taksaRawCounts: { artifacts, rawTables, rawRows },
    projectCounts: { projects, contracts, parties, members },
    workflowCounts: { total, locked, open },
    readiness: computeReadiness(referenceCounts),
  };
}
