/**
 * Unit tests for the data-sync orchestrator (DB-free where possible).
 *
 * Verifies that the sync:
 *  - orchestrates the expected ordered steps,
 *  - on an empty local checkout produces a CLEAN run (zero counts) with NO
 *    user-facing "missing"/path/restore-error wording in the returned data,
 *  - tolerates a missing database (no throw; persisted=false; full summary),
 *  - records a run + steps when the DB is reachable (mocked transaction).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const isDatabaseReachable = vi.fn();
const resolveCliActorUserId = vi.fn();
vi.mock("@/server/taksa/staging-db", () => ({
  isDatabaseReachable: () => isDatabaseReachable(),
  resolveCliActorUserId: () => resolveCliActorUserId(),
}));

const txStub = {
  dataSyncRun: { create: vi.fn(async () => ({ id: "run-1" })) },
  dataSyncStep: { createMany: vi.fn(async (a: { data: unknown[] }) => ({ count: a.data.length })) },
  taksaDiscoveredFile: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "f" })) },
  taksaAnalysisRun: { create: vi.fn(async () => ({ id: "ar" })) },
  taksaDetectedEntity: { createMany: vi.fn() },
  taksaScriptXmlMapping: { createMany: vi.fn() },
  taksaUiLabel: { createMany: vi.fn() },
  taksaBehaviorHint: { createMany: vi.fn() },
  referenceUpdatePackage: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: "p" })),
    update: vi.fn(async () => ({ id: "p" })),
  },
  referenceUpdateStagingRow: { deleteMany: vi.fn(), createMany: vi.fn() },
  auditLog: { create: vi.fn(async () => ({ id: "a" })) },
};
vi.mock("@/server/db", () => ({
  prisma: { $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(txStub) },
}));

import { analyzeForSync, runDataSync } from "./karmanDataSync";

/** Creates an empty but well-formed Taksa data root in a temp dir. */
function emptyDataRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "karman-sync-"));
  mkdirSync(join(root, "incoming", "taksa"), { recursive: true });
  return root;
}

const FORBIDDEN_WORDING = ["موجود نیست", "Msg 3279", "KARMAN_DATA_ROOT", "/opt/"];

beforeEach(() => {
  isDatabaseReachable.mockReset();
  resolveCliActorUserId.mockReset();
  for (const ns of Object.values(txStub)) {
    for (const fn of Object.values(ns)) (fn as { mockClear?: () => void }).mockClear?.();
  }
});

describe("analyzeForSync — pure, resilient analysis", () => {
  it("produces a clean empty run with the expected ordered steps", () => {
    const analysis = analyzeForSync(emptyDataRoot());
    expect(analysis.discoveredSources).toBe(0);
    expect(analysis.warnings).toEqual([]);
    expect(analysis.updatePackages).toEqual([]);

    const keys = analysis.steps.map((s) => s.stepKey);
    expect(keys).toEqual([
      "discover",
      "register-sources",
      "analyze-sql",
      "analyze-scriptxml",
      "analyze-mdb",
      "analyze-excel",
      "analyze-pdf-docs",
      "analyze-gws-tips",
      "backup-strings-audit",
      "detect-update-packages",
      "parse-update-packages",
    ]);
    expect(analysis.steps.every((s) => s.status === "COMPLETED")).toBe(true);
  });

  it("returns NO user-facing missing/path/restore wording", () => {
    const analysis = analyzeForSync(emptyDataRoot());
    const blob = JSON.stringify({
      sourceRoot: analysis.sourceRoot,
      steps: analysis.steps,
      warnings: analysis.warnings,
    });
    for (const term of FORBIDDEN_WORDING) {
      expect(blob.includes(term)).toBe(false);
    }
  });
});

describe("runDataSync — DB tolerance + recording", () => {
  it("tolerates a missing database (no throw; persisted=false; full summary)", async () => {
    isDatabaseReachable.mockResolvedValue(false);
    const result = await runDataSync("admin-1", emptyDataRoot());
    expect(result.persisted).toBe(false);
    expect(result.status).toBe("COMPLETED");
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("records a run + steps when the DB is reachable", async () => {
    isDatabaseReachable.mockResolvedValue(true);
    const result = await runDataSync("admin-1", emptyDataRoot());
    expect(result.persisted).toBe(true);
    expect(result.runId).toBe("run-1");
    expect(txStub.dataSyncRun.create).toHaveBeenCalledTimes(1);
    expect(txStub.dataSyncStep.createMany).toHaveBeenCalledTimes(1);
    // Audit row written for the sync run (safe metadata only).
    expect(txStub.auditLog.create).toHaveBeenCalled();
  });
});
