/**
 * Unit tests for the operational workbench loader.
 *
 * Confirms the workbench derives ALL counts from real Prisma `count()` queries
 * (mocked here to return specific values / scope assertions) rather than
 * constants, that zero counts produce the readiness warning state, and that
 * project/case scoping differs for SYSTEM_ADMIN vs a project member.
 *
 * Requirements: 10.4, 4.3, 15.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/** A count mock per Prisma model used by the loader. */
const counts = {
  referenceSource: vi.fn(),
  referenceImportRun: vi.fn(),
  referenceBook: vi.fn(),
  referenceChapter: vi.fn(),
  referenceItem: vi.fn(),
  referenceUnit: vi.fn(),
  referenceResource: vi.fn(),
  referenceIndexPeriod: vi.fn(),
  referenceCircular: vi.fn(),
  referenceCoefficientRule: vi.fn(),
  referenceDeductionRule: vi.fn(),
  referenceMapping: vi.fn(),
  taksaArtifact: vi.fn(),
  taksaRawTable: vi.fn(),
  taksaRawRow: vi.fn(),
  project: vi.fn(),
  contract: vi.fn(),
  projectParty: vi.fn(),
  projectMember: vi.fn(),
  workflowCase: vi.fn(),
};

vi.mock("@/server/db", () => ({
  prisma: new Proxy(
    {},
    {
      get(_t, model: string) {
        const fn = (counts as Record<string, ReturnType<typeof vi.fn>>)[model];
        return { count: (arg: unknown) => fn!(arg) };
      },
    },
  ),
}));

import { loadWorkbenchData, computeReadiness } from "./dashboard";
import type { AuthUser } from "@/server/auth/session";


const admin: AuthUser = {
  id: "u-admin",
  email: "a@karman.test",
  fullName: "Admin",
  systemRole: "SYSTEM_ADMIN",
};

const member: AuthUser = {
  id: "u-member",
  email: "m@karman.test",
  fullName: "Member",
  systemRole: "CONTRACTOR",
};

/** Sets every count mock to the same value (default 0). */
function setAllCounts(value: number): void {
  for (const fn of Object.values(counts)) {
    fn.mockReset();
    fn.mockResolvedValue(value);
  }
}

beforeEach(() => setAllCounts(0));

describe("computeReadiness", () => {
  it("flags every group missing at zero counts (percent 0, warning state)", () => {
    const readiness = computeReadiness({
      sources: 0, importRuns: 0, books: 0, chapters: 0, items: 0, units: 0,
      resources: 0, indexPeriods: 0, circulars: 0, coefficientRules: 0,
      deductionRules: 0, mappings: 0,
    });
    expect(readiness.percent).toBe(0);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingGroups).toHaveLength(7);
  });

  it("is fully ready only when all required groups have data", () => {
    const readiness = computeReadiness({
      sources: 1, importRuns: 0, books: 2, chapters: 0, items: 5, units: 3,
      resources: 0, indexPeriods: 1, circulars: 1, coefficientRules: 0,
      deductionRules: 0, mappings: 4,
    });
    expect(readiness.isReady).toBe(true);
    expect(readiness.percent).toBe(100);
    expect(readiness.missingGroups).toEqual([]);
  });
});

describe("loadWorkbenchData", () => {
  it("returns zero counts and the readiness warning state from an empty DB", async () => {
    const data = await loadWorkbenchData(admin);
    expect(data.referenceCounts.sources).toBe(0);
    expect(data.taksaRawCounts.rawRows).toBe(0);
    expect(data.projectCounts.projects).toBe(0);
    expect(data.workflowCounts.total).toBe(0);
    expect(data.readiness.isReady).toBe(false);
    expect(data.readiness.missingGroups.length).toBe(7);
  });


  it("reflects the exact counts returned by Prisma (not constants)", async () => {
    setAllCounts(0);
    counts.referenceSource.mockResolvedValue(3);
    counts.referenceBook.mockResolvedValue(2);
    counts.referenceItem.mockResolvedValue(40);
    counts.referenceUnit.mockResolvedValue(7);
    counts.referenceIndexPeriod.mockResolvedValue(5);
    counts.referenceCircular.mockResolvedValue(1);
    counts.referenceMapping.mockResolvedValue(40);
    counts.taksaRawRow.mockResolvedValue(999);

    const data = await loadWorkbenchData(admin);
    expect(data.referenceCounts.items).toBe(40);
    expect(data.taksaRawCounts.rawRows).toBe(999);
    // All seven required groups now have data → ready.
    expect(data.readiness.isReady).toBe(true);
    expect(data.readiness.percent).toBe(100);
  });

  it("does NOT scope project/case queries for a SYSTEM_ADMIN", async () => {
    await loadWorkbenchData(admin);
    expect(counts.project.mock.calls[0]![0]).toEqual({ where: {} });
    expect(counts.workflowCase.mock.calls[0]![0]).toEqual({ where: {} });
  });

  it("scopes project/case queries to memberships for a non-admin", async () => {
    await loadWorkbenchData(member);
    const projWhere = counts.project.mock.calls[0]![0].where;
    expect(projWhere).toEqual({ members: { some: { userId: "u-member" } } });
    const caseWhere = counts.workflowCase.mock.calls[0]![0].where;
    expect(caseWhere).toEqual({ project: { members: { some: { userId: "u-member" } } } });
  });
});
