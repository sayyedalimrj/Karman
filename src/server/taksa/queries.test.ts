/**
 * Unit tests for the Taksa raw-data read loaders (DB-free, mocked Prisma).
 *
 * Confirms raw counts come from real Prisma `count()` calls and that an empty
 * DB is reported as empty (driving the «هنوز داده خام تکسا وارد نشده است.»
 * empty message). No fabricated rows.
 *
 * Requirements: 9.1, 9.2, 10.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const artifactCount = vi.fn();
const tableCount = vi.fn();
const rowCount = vi.fn();
const artifactFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    taksaArtifact: { count: () => artifactCount(), findMany: () => artifactFindMany() },
    taksaRawTable: { count: () => tableCount() },
    taksaRawRow: { count: () => rowCount() },
  },
}));

import { loadTaksaRawCounts, loadTaksaRawData } from "./queries";

beforeEach(() => {
  artifactCount.mockReset().mockResolvedValue(0);
  tableCount.mockReset().mockResolvedValue(0);
  rowCount.mockReset().mockResolvedValue(0);
  artifactFindMany.mockReset().mockResolvedValue([]);
});

describe("loadTaksaRawCounts", () => {
  it("returns the exact counts from Prisma", async () => {
    artifactCount.mockResolvedValue(2);
    tableCount.mockResolvedValue(5);
    rowCount.mockResolvedValue(120);
    const counts = await loadTaksaRawCounts();
    expect(counts).toEqual({ artifacts: 2, rawTables: 5, rawRows: 120 });
  });
});

describe("loadTaksaRawData", () => {
  it("is empty when nothing has been ingested", async () => {
    const data = await loadTaksaRawData();
    expect(data.isEmpty).toBe(true);
    expect(data.artifacts).toEqual([]);
  });

  it("maps artifact rows with table counts when data exists", async () => {
    artifactCount.mockResolvedValue(1);
    tableCount.mockResolvedValue(3);
    rowCount.mockResolvedValue(10);
    artifactFindMany.mockResolvedValue([
      {
        id: "a1",
        sourceName: "taksa.DB",
        importStatus: "IMPORTED",
        exportStatus: "NOT_EXPORTED",
        createdAt: new Date(),
        _count: { rawTables: 3 },
      },
    ]);
    const data = await loadTaksaRawData();
    expect(data.isEmpty).toBe(false);
    expect(data.artifacts[0]!.tableCount).toBe(3);
    expect(data.artifacts[0]!.sourceName).toBe("taksa.DB");
  });
});
