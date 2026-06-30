/**
 * Authorization tests for the admin data-sync API routes.
 *
 * All three routes are SYSTEM_ADMIN-only, enforced server-side (deny-by-default).
 * PROJECT_ADMIN, VIEWER, and unauthenticated callers receive 403/401 and never
 * reach the handler logic. SYSTEM_ADMIN is allowed.
 *
 * The real permission service (`requireRole`) is used; only the session
 * resolver and the DB-touching loaders/analyzers are mocked, so these tests
 * exercise the genuine authorization path without a database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@/server/auth/session";

const getCurrentUser = vi.fn();
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));

// Keep the sync orchestrator side-effect-free + DB-free for the allowed case.
vi.mock("@/server/taksa/staging-db", () => ({
  isDatabaseReachable: async () => false,
  resolveCliActorUserId: async () => null,
}));
vi.mock("@/server/taksa/source-discovery", () => ({
  discoverTaksaSources: () => ({
    incomingRelative: "incoming/taksa",
    files: [],
    countsByType: {},
    countsByCategory: {},
    missingCoreFiles: [],
    totalFiles: 0,
  }),
}));
vi.mock("@/server/taksa/analyze", () => ({
  runAllAnalyzers: () => ({
    summary: {
      outputDirRelative: "",
      discovery: { totalFiles: 0, missingCoreFiles: 0 },
      dbBackup: { totalFiles: 0, restoreStatus: "OPTIONAL_SKIPPED" },
      scriptXml: { found: false, openXmlCount: 0, insertTargets: 0 },
      sqlStatic: { files: 0, tables: 0 },
      backupStrings: { files: 0, candidates: 0 },
      mdb: { files: 0 },
      excel: { files: 0, sheets: 0 },
      docs: { labels: 0, hints: 0 },
      pdf: { files: 0 },
      dts: { files: 0 },
      rpt: { files: 0 },
    },
    outputs: [],
    persistInput: {
      analyzerType: "UNIFIED",
      status: "COMPLETED",
      totalFiles: 0,
      successCount: 0,
      warningCount: 0,
      errorCount: 0,
      outputDir: "",
      summaryJson: {},
    },
  }),
  persistAnalysisRun: vi.fn(),
}));
vi.mock("@/server/data-sync/update-package-parser", () => ({
  detectUpdatePackages: () => [],
}));
vi.mock("@/server/data-sync/queries", () => ({
  loadSyncDashboard: async () => ({ cards: {}, history: [], hasAnySync: false }),
  loadSyncRunById: async (id: string) => (id === "known" ? { id, steps: [] } : null),
}));

import { POST as runPost } from "./run/route";
import { GET as statusGet } from "./status/route";
import { GET as runsGet } from "./runs/[id]/route";

const admin: AuthUser = { id: "a", email: "a@k.t", fullName: "A", systemRole: "SYSTEM_ADMIN" };
const projectAdmin: AuthUser = { id: "p", email: "p@k.t", fullName: "P", systemRole: "PROJECT_ADMIN" };
const viewer: AuthUser = { id: "v", email: "v@k.t", fullName: "V", systemRole: "VIEWER" };

const runsCtx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => getCurrentUser.mockReset());

describe("POST /api/admin/data-sync/run", () => {
  it("401 for unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await runPost()).status).toBe(401);
  });
  it("403 for VIEWER", async () => {
    getCurrentUser.mockResolvedValue(viewer);
    expect((await runPost()).status).toBe(403);
  });
  it("403 for PROJECT_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(projectAdmin);
    expect((await runPost()).status).toBe(403);
  });
  it("200 for SYSTEM_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(admin);
    const res = await runPost();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("GET /api/admin/data-sync/status", () => {
  it("401 for unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await statusGet()).status).toBe(401);
  });
  it("403 for VIEWER", async () => {
    getCurrentUser.mockResolvedValue(viewer);
    expect((await statusGet()).status).toBe(403);
  });
  it("403 for PROJECT_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(projectAdmin);
    expect((await statusGet()).status).toBe(403);
  });
  it("200 for SYSTEM_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(admin);
    expect((await statusGet()).status).toBe(200);
  });
});

describe("GET /api/admin/data-sync/runs/:id", () => {
  it("401 for unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await runsGet(new Request("http://localhost/x"), runsCtx("known"))).status).toBe(401);
  });
  it("403 for VIEWER", async () => {
    getCurrentUser.mockResolvedValue(viewer);
    expect((await runsGet(new Request("http://localhost/x"), runsCtx("known"))).status).toBe(403);
  });
  it("404 for SYSTEM_ADMIN when the run is unknown", async () => {
    getCurrentUser.mockResolvedValue(admin);
    expect((await runsGet(new Request("http://localhost/x"), runsCtx("missing"))).status).toBe(404);
  });
  it("200 for SYSTEM_ADMIN with a known run", async () => {
    getCurrentUser.mockResolvedValue(admin);
    expect((await runsGet(new Request("http://localhost/x"), runsCtx("known"))).status).toBe(200);
  });
});
