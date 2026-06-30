/**
 * Unit tests for the reference workbench read loaders (DB-free, mocked Prisma).
 *
 * Confirms the overview/library/setup-readiness loaders reflect the exact
 * counts returned by Prisma (not constants), that an empty DB is reported as
 * empty (driving the Taksa-specific empty messages), and that project-setup
 * readiness gates on real counts.
 *
 * Requirements: 15.1, 15.2, 15.5
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const c = {
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
};

vi.mock("@/server/db", () => ({
  prisma: new Proxy(
    {},
    {
      get(_t, model: string) {
        return { count: () => (c as Record<string, ReturnType<typeof vi.fn>>)[model]!() };
      },
    },
  ),
}));

import {
  loadReferenceOverview,
  loadReferenceLibrary,
  loadProjectSetupReadiness,
} from "./queries";

function setAll(v: number) {
  for (const fn of Object.values(c)) fn.mockReset().mockResolvedValue(v);
}

beforeEach(() => setAll(0));

describe("loadReferenceOverview", () => {
  it("reports empty when every reference table is empty", async () => {
    const o = await loadReferenceOverview();
    expect(o.isEmpty).toBe(true);
    expect(o.readiness.isReady).toBe(false);
    expect(o.readiness.missingGroups.length).toBe(7);
  });

  it("reflects real counts and is not empty when data exists", async () => {
    setAll(0);
    c.referenceSource.mockResolvedValue(2);
    c.referenceItem.mockResolvedValue(11);
    const o = await loadReferenceOverview();
    expect(o.isEmpty).toBe(false);
    expect(o.counts.items).toBe(11);
    expect(o.counts.sources).toBe(2);
  });
});

describe("loadReferenceLibrary", () => {
  it("is empty at zero and reflects counts otherwise", async () => {
    expect((await loadReferenceLibrary()).isEmpty).toBe(true);
    setAll(0);
    c.referenceBook.mockResolvedValue(3);
    const lib = await loadReferenceLibrary();
    expect(lib.isEmpty).toBe(false);
    expect(lib.counts.books).toBe(3);
  });
});

describe("loadProjectSetupReadiness", () => {
  it("blocks (not ready) when any gating group is missing", async () => {
    setAll(0);
    c.referenceSource.mockResolvedValue(1);
    c.referenceBook.mockResolvedValue(1);
    c.referenceItem.mockResolvedValue(1);
    c.referenceUnit.mockResolvedValue(1);
    c.referenceIndexPeriod.mockResolvedValue(1);
    // circular still 0 → blocked
    const r = await loadProjectSetupReadiness();
    expect(r.isReady).toBe(false);
    expect(r.checks.hasReferenceCircular).toBe(false);
  });

  it("is ready only when all gating groups have data", async () => {
    setAll(1);
    const r = await loadProjectSetupReadiness();
    expect(r.isReady).toBe(true);
  });
});
