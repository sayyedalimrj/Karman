/**
 * Unit tests for the data-sync dashboard loader (DB mocked).
 *
 * Verifies the operational dashboard cards are derived from REAL Prisma queries
 * (count/findFirst/findMany), that reference readiness counts populated groups,
 * and that an entirely empty database yields a truthful all-zero snapshot (no
 * fabricated counts) with `hasAnySync=false`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  taksaDiscoveredFile: { count: vi.fn() },
  referenceUpdatePackage: { count: vi.fn() },
  taksaAnalysisRun: { count: vi.fn(), findFirst: vi.fn() },
  dataSyncRun: { findFirst: vi.fn(), findMany: vi.fn() },
  referenceSource: { count: vi.fn() },
  referenceBook: { count: vi.fn() },
  referenceItem: { count: vi.fn() },
  referenceUnit: { count: vi.fn() },
  referenceIndexPeriod: { count: vi.fn() },
  referenceCircular: { count: vi.fn() },
  referenceMapping: { count: vi.fn() },
}));
vi.mock("@/server/db", () => ({ prisma: prismaMock }));

import { loadSyncDashboard } from "./queries";

beforeEach(() => {
  for (const ns of Object.values(prismaMock)) {
    for (const fn of Object.values(ns)) (fn as { mockReset: () => void }).mockReset();
  }
});

describe("loadSyncDashboard", () => {
  it("computes cards from real queries", async () => {
    prismaMock.taksaDiscoveredFile.count.mockResolvedValue(42);
    prismaMock.referenceUpdatePackage.count.mockResolvedValue(2);
    prismaMock.taksaAnalysisRun.count.mockResolvedValue(3);
    prismaMock.taksaAnalysisRun.findFirst.mockResolvedValue({
      startedAt: new Date("2025-01-01"),
      finishedAt: new Date("2025-01-02"),
    });
    prismaMock.dataSyncRun.findFirst.mockResolvedValue({
      startedAt: new Date("2025-02-01"),
      finishedAt: new Date("2025-02-02"),
      status: "COMPLETED_WITH_WARNINGS",
      discoveredSources: 40,
    });
    prismaMock.dataSyncRun.findMany.mockResolvedValue([
      {
        id: "r1",
        status: "COMPLETED",
        startedAt: new Date("2025-02-01"),
        finishedAt: new Date("2025-02-02"),
        discoveredSources: 40,
        warnings: ["w1"],
      },
    ]);
    // 4 of 7 reference groups populated.
    prismaMock.referenceSource.count.mockResolvedValue(1);
    prismaMock.referenceBook.count.mockResolvedValue(1);
    prismaMock.referenceItem.count.mockResolvedValue(1);
    prismaMock.referenceUnit.count.mockResolvedValue(1);
    prismaMock.referenceIndexPeriod.count.mockResolvedValue(0);
    prismaMock.referenceCircular.count.mockResolvedValue(0);
    prismaMock.referenceMapping.count.mockResolvedValue(0);

    const data = await loadSyncDashboard();
    expect(data.cards.registeredSources).toBe(42);
    expect(data.cards.discoveredFiles).toBe(40);
    expect(data.cards.updatePackages).toBe(2);
    expect(data.cards.analysisRuns).toBe(3);
    expect(data.cards.lastSyncStatus).toBe("COMPLETED_WITH_WARNINGS");
    expect(data.cards.referenceReadyGroups).toBe(4);
    expect(data.cards.referenceTotalGroups).toBe(7);
    expect(data.hasAnySync).toBe(true);
    expect(data.history[0]!.warningsCount).toBe(1);
  });

  it("yields a truthful all-zero snapshot on an empty database", async () => {
    for (const ns of Object.values(prismaMock)) {
      for (const [name, fn] of Object.entries(ns)) {
        if (name === "count") (fn as ReturnType<typeof vi.fn>).mockResolvedValue(0);
        if (name === "findFirst") (fn as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        if (name === "findMany") (fn as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      }
    }
    const data = await loadSyncDashboard();
    expect(data.cards.registeredSources).toBe(0);
    expect(data.cards.referenceReadyGroups).toBe(0);
    expect(data.cards.lastSyncAt).toBeNull();
    expect(data.hasAnySync).toBe(false);
    expect(data.history).toEqual([]);
  });
});
