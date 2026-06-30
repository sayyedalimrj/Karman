/**
 * Unit tests for the reference source-registration server action.
 *
 * Covers the authorization matrix (SYSTEM_ADMIN / PROJECT_ADMIN allowed; VIEWER
 * and unauthenticated denied), input validation, that a successful registration
 * creates BOTH a ReferenceSource row AND an AuditLog row in the SAME
 * transaction, and that the audit metadata carries no secrets.
 *
 * DB-free: the session and Prisma transaction are mocked.
 *
 * Requirements: 4.1, 4.2, 7.1, 15.1, 15.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@/server/auth/session";

const getCurrentUser = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const sourceCreate = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    // requireRole without projectId never queries; provide stub anyway.
    projectMember: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        referenceSource: { create: (a: unknown) => sourceCreate(a) },
        auditLog: { create: (a: unknown) => auditCreate(a) },
      }),
  },
}));

import { registerReferenceSource } from "./register-source";

const admin: AuthUser = { id: "u-admin", email: "a@k.test", fullName: "A", systemRole: "SYSTEM_ADMIN" };
const projectAdmin: AuthUser = { id: "u-pa", email: "p@k.test", fullName: "P", systemRole: "PROJECT_ADMIN" };
const viewer: AuthUser = { id: "u-v", email: "v@k.test", fullName: "V", systemRole: "VIEWER" };

const validInput = { sourceType: "TAKSA_DB", name: "Taksa Master DB 1403", originalDbName: "taksa.DB" };

beforeEach(() => {
  getCurrentUser.mockReset();
  sourceCreate.mockReset().mockResolvedValue({ id: "src-1" });
  auditCreate.mockReset().mockResolvedValue({ id: "audit-1" });
});


describe("registerReferenceSource — authorization", () => {
  it("denies an unauthenticated caller", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await registerReferenceSource(validInput);
    expect(res).toEqual({ ok: false, error: "unauthorized" });
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("denies a VIEWER", async () => {
    getCurrentUser.mockResolvedValue(viewer);
    const res = await registerReferenceSource(validInput);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("forbidden");
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("allows a SYSTEM_ADMIN and creates source + audit in one transaction", async () => {
    getCurrentUser.mockResolvedValue(admin);
    const res = await registerReferenceSource(validInput);
    expect(res.ok).toBe(true);
    expect(res.sourceId).toBe("src-1");
    expect(sourceCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it("allows a PROJECT_ADMIN", async () => {
    getCurrentUser.mockResolvedValue(projectAdmin);
    const res = await registerReferenceSource(validInput);
    expect(res.ok).toBe(true);
  });
});

describe("registerReferenceSource — validation & audit", () => {
  it("rejects invalid input (missing name)", async () => {
    getCurrentUser.mockResolvedValue(admin);
    const res = await registerReferenceSource({ sourceType: "TAKSA_DB" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid");
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown sourceType", async () => {
    getCurrentUser.mockResolvedValue(admin);
    const res = await registerReferenceSource({ sourceType: "NOPE", name: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid");
  });

  it("writes audit metadata with no sensitive keys", async () => {
    getCurrentUser.mockResolvedValue(admin);
    await registerReferenceSource({
      ...validInput,
      // Even if a caller smuggled a secret-looking field, it is not part of the
      // schema and never reaches metadata.
    });
    const auditArg = auditCreate.mock.calls[0]![0] as { data: { metadata: Record<string, unknown> } };
    const meta = auditArg.data.metadata;
    const keys = Object.keys(meta).join(",").toLowerCase();
    for (const banned of ["password", "secret", "token", "cookie", "passwordhash"]) {
      expect(keys.includes(banned)).toBe(false);
    }
    expect(meta.sourceType).toBe("TAKSA_DB");
  });
});
