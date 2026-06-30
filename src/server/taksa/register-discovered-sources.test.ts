/**
 * Unit tests for discovered-source registration (DB-free, mocked).
 *
 * Covers Phase 2 authorization (SYSTEM_ADMIN only; PROJECT_ADMIN, VIEWER and
 * unauthenticated denied) and idempotent persistence (no duplicates; an
 * AuditLog row per NEWLY created source; safe metadata only).
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@/server/auth/session";
import type { DiscoveredTaksaFile } from "./source-discovery";

const getCurrentUser = vi.fn();
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));

const txFindUnique = vi.fn();
const txCreate = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    projectMember: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        taksaDiscoveredFile: { findUnique: (a: unknown) => txFindUnique(a), create: (a: unknown) => txCreate(a) },
        auditLog: { create: (a: unknown) => auditCreate(a) },
      }),
  },
}));

import { registerDiscoveredSourcesAction, persistDiscoveredFiles } from "./register-discovered-sources";

const admin: AuthUser = { id: "u-a", email: "a@k.t", fullName: "A", systemRole: "SYSTEM_ADMIN" };
const projectAdmin: AuthUser = { id: "u-p", email: "p@k.t", fullName: "P", systemRole: "PROJECT_ADMIN" };
const viewer: AuthUser = { id: "u-v", email: "v@k.t", fullName: "V", systemRole: "VIEWER" };

beforeEach(() => {
  getCurrentUser.mockReset();
  txFindUnique.mockReset();
  txCreate.mockReset().mockResolvedValue({ id: "row-1" });
  auditCreate.mockReset().mockResolvedValue({ id: "audit-1" });
});

describe("registerDiscoveredSourcesAction — authorization (Phase 2)", () => {
  it("denies unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await registerDiscoveredSourcesAction()).toEqual({ ok: false, error: "unauthorized" });
  });
  it("denies VIEWER", async () => {
    getCurrentUser.mockResolvedValue(viewer);
    expect((await registerDiscoveredSourcesAction()).error).toBe("forbidden");
  });
  it("denies PROJECT_ADMIN in Phase 2", async () => {
    getCurrentUser.mockResolvedValue(projectAdmin);
    expect((await registerDiscoveredSourcesAction()).error).toBe("forbidden");
  });
  it("allows SYSTEM_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(admin);
    const res = await registerDiscoveredSourcesAction();
    expect(res.ok).toBe(true);
  });
});

describe("persistDiscoveredFiles — idempotent + audited + safe metadata", () => {
  const files: DiscoveredTaksaFile[] = [
    {
      relativePath: "incoming/taksa/db/a.DB",
      fileName: "a.DB",
      extension: "db",
      category: "db",
      sourceType: "SQL_SERVER_BACKUP",
      sourceFamily: "DATABASE_BACKUP",
      sizeBytes: 10,
      checksum: "c1",
      modifiedAt: null,
      supportedForAnalysis: true,
      supportedForIngestion: true,
      reason: "ok",
    },
    {
      relativePath: "incoming/taksa/sql/b.sql",
      fileName: "b.sql",
      extension: "sql",
      category: "sql",
      sourceType: "TAKSA_SQL_SCRIPT",
      sourceFamily: "SQL_SCRIPT",
      sizeBytes: 20,
      checksum: "c2",
      modifiedAt: null,
      supportedForAnalysis: true,
      supportedForIngestion: true,
      reason: "ok",
    },
  ];

  it("creates new rows and skips existing ones (no duplicates)", async () => {
    // First file does not exist; second already exists.
    txFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing" });
    const tx = {
      taksaDiscoveredFile: { findUnique: txFindUnique, create: txCreate },
      auditLog: { create: auditCreate },
    } as never;
    const result = await persistDiscoveredFiles(files, "u-a", tx);
    expect(result).toEqual({ created: 1, existing: 1 });
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledTimes(1);
    // Audit metadata carries only safe, non-sensitive descriptors.
    const meta = (auditCreate.mock.calls[0]![0] as { data: { metadata: Record<string, unknown> } }).data.metadata;
    const keys = Object.keys(meta).join(",").toLowerCase();
    for (const banned of ["password", "secret", "token", "content"]) {
      expect(keys.includes(banned)).toBe(false);
    }
    expect(meta.checksum).toBe("c1");
  });
});
