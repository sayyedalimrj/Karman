/**
 * Table-driven unit tests for the permission helpers and deny-by-default
 * behavior. The Prisma client is mocked so these run without a database.
 *
 * Requirements: 4.2, 4.5
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const memberFindUnique = vi.fn();
vi.mock("@/server/db", () => ({
  prisma: {
    projectMember: { findUnique: (args: unknown) => memberFindUnique(args) },
  },
}));

import { Role } from "@prisma/client";
import {
  canAccessProject,
  requireProjectAccess,
  requireRole,
  resolveEffectiveRole,
  assertNotLocked,
} from "./index";
import { ForbiddenError, LockedError } from "@/lib/errors";
import type { AuthUser } from "@/server/auth/session";

const PROJECT_ID = "proj-1";

function user(systemRole: Role, id = "u1"): AuthUser {
  return { id, email: `${id}@x.test`, fullName: id, systemRole };
}

/** Configure the mocked ProjectMember lookup to return a role (or none). */
function withMembership(role: Role | null): void {
  memberFindUnique.mockResolvedValue(
    role === null ? null : { projectId: PROJECT_ID, userId: "u1", role },
  );
}

beforeEach(() => {
  memberFindUnique.mockReset();
});

describe("canAccessProject", () => {
  const cases: Array<{ name: string; systemRole: Role; member: Role | null; expected: boolean }> = [
    { name: "SYSTEM_ADMIN with no membership → allowed", systemRole: Role.SYSTEM_ADMIN, member: null, expected: true },
    { name: "member (CONTRACTOR) → allowed", systemRole: Role.VIEWER, member: Role.CONTRACTOR, expected: true },
    { name: "non-member non-admin → denied", systemRole: Role.VIEWER, member: null, expected: false },
  ];

  for (const c of cases) {
    it(c.name, async () => {
      withMembership(c.member);
      await expect(canAccessProject(user(c.systemRole), PROJECT_ID)).resolves.toBe(c.expected);
    });
  }

  it("does not query membership for SYSTEM_ADMIN (short-circuit)", async () => {
    await canAccessProject(user(Role.SYSTEM_ADMIN), PROJECT_ID);
    expect(memberFindUnique).not.toHaveBeenCalled();
  });
});

describe("requireProjectAccess", () => {
  it("returns a real membership for a member", async () => {
    withMembership(Role.CONSULTANT);
    const m = await requireProjectAccess(user(Role.VIEWER), PROJECT_ID);
    expect(m).toMatchObject({ role: Role.CONSULTANT, synthetic: false });
  });

  it("returns a synthetic membership for SYSTEM_ADMIN", async () => {
    withMembership(null);
    const m = await requireProjectAccess(user(Role.SYSTEM_ADMIN), PROJECT_ID);
    expect(m).toMatchObject({ role: Role.SYSTEM_ADMIN, synthetic: true });
  });

  it("throws ForbiddenError for a non-member non-admin", async () => {
    withMembership(null);
    await expect(requireProjectAccess(user(Role.VIEWER), PROJECT_ID)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("resolveEffectiveRole", () => {
  it("uses systemRole when no projectId is given", async () => {
    await expect(resolveEffectiveRole(user(Role.FINANCIAL_CONTROLLER))).resolves.toBe(
      Role.FINANCIAL_CONTROLLER,
    );
    expect(memberFindUnique).not.toHaveBeenCalled();
  });

  it("uses the project role when a membership exists", async () => {
    withMembership(Role.EMPLOYER);
    await expect(resolveEffectiveRole(user(Role.VIEWER), PROJECT_ID)).resolves.toBe(Role.EMPLOYER);
  });

  it("returns SYSTEM_ADMIN for a global admin with no project row", async () => {
    withMembership(null);
    await expect(resolveEffectiveRole(user(Role.SYSTEM_ADMIN), PROJECT_ID)).resolves.toBe(
      Role.SYSTEM_ADMIN,
    );
  });

  it("returns null for a non-member non-admin in a project", async () => {
    withMembership(null);
    await expect(resolveEffectiveRole(user(Role.VIEWER), PROJECT_ID)).resolves.toBeNull();
  });
});

describe("requireRole (deny-by-default)", () => {
  const matrix: Array<{
    name: string;
    systemRole: Role;
    member: Role | null;
    roles: Role[];
    projectId?: string;
    allowed: boolean;
  }> = [
    {
      name: "SYSTEM_ADMIN overrides any role gate",
      systemRole: Role.SYSTEM_ADMIN,
      member: null,
      roles: [Role.CONTRACTOR],
      projectId: PROJECT_ID,
      allowed: true,
    },
    {
      name: "project role in allowed set → allowed",
      systemRole: Role.VIEWER,
      member: Role.CONSULTANT,
      roles: [Role.CONSULTANT, Role.REVIEWER],
      projectId: PROJECT_ID,
      allowed: true,
    },
    {
      name: "project role not in allowed set → denied",
      systemRole: Role.VIEWER,
      member: Role.CONTRACTOR,
      roles: [Role.CONSULTANT],
      projectId: PROJECT_ID,
      allowed: false,
    },
    {
      name: "non-member non-admin → denied",
      systemRole: Role.VIEWER,
      member: null,
      roles: [Role.CONTRACTOR],
      projectId: PROJECT_ID,
      allowed: false,
    },
    {
      name: "global role check (no projectId) in set → allowed",
      systemRole: Role.SUPPORT_ADMIN,
      member: null,
      roles: [Role.SUPPORT_ADMIN],
      allowed: true,
    },
    {
      name: "global role check (no projectId) not in set → denied",
      systemRole: Role.VIEWER,
      member: null,
      roles: [Role.SUPPORT_ADMIN],
      allowed: false,
    },
  ];

  for (const c of matrix) {
    it(c.name, async () => {
      withMembership(c.member);
      const u = user(c.systemRole);
      if (c.allowed) {
        await expect(requireRole(u, c.roles, c.projectId)).resolves.toBeUndefined();
      } else {
        await expect(requireRole(u, c.roles, c.projectId)).rejects.toBeInstanceOf(ForbiddenError);
      }
    });
  }

  it("denies when the allowed-roles list is empty (deny-by-default)", async () => {
    await expect(requireRole(user(Role.VIEWER), [])).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("assertNotLocked", () => {
  it("returns normally for an unlocked case", () => {
    expect(() => assertNotLocked({ isLocked: false })).not.toThrow();
  });

  it("throws LockedError for a locked case", () => {
    expect(() => assertNotLocked({ isLocked: true })).toThrow(LockedError);
  });
});
