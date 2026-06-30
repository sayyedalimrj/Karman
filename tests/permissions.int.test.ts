/**
 * Integration tests for the permission service against a REAL PostgreSQL
 * database (Prisma migrations applied).
 *
 * Validates CP1: Project access requires membership or SYSTEM_ADMIN. (Req 4.3)
 * Validates CP2: Actions require a permitting role. (Req 4.4)
 *
 * These tests are intentionally separated as `*.int.test.ts` and only run when
 * RUN_DB_TESTS=1 (see vitest.config.ts) so the unit suite stays DB-free.
 *
 * Requirements: 4.3, 4.4
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  canAccessProject,
  requireProjectAccess,
  requireRole,
} from "@/server/permissions";
import { ForbiddenError } from "@/lib/errors";
import type { AuthUser } from "@/server/auth/session";

const SUFFIX = `it-${Date.now()}`;

let adminUser: AuthUser;
let memberUser: AuthUser;
let outsiderUser: AuthUser;
let projectId: string;

const createdUserIds: string[] = [];

async function makeUser(systemRole: Role, label: string): Promise<AuthUser> {
  const u = await prisma.user.create({
    data: {
      email: `${label}-${SUFFIX}@karman.test`,
      fullName: label,
      passwordHash: "scrypt$00$00",
      systemRole,
    },
    select: { id: true, email: true, fullName: true, systemRole: true },
  });
  createdUserIds.push(u.id);
  return u;
}

beforeAll(async () => {
  adminUser = await makeUser(Role.SYSTEM_ADMIN, "admin");
  memberUser = await makeUser(Role.VIEWER, "member");
  outsiderUser = await makeUser(Role.VIEWER, "outsider");

  const project = await prisma.project.create({
    data: {
      code: `P-${SUFFIX}`,
      name: "Integration Project",
      createdById: adminUser.id,
    },
    select: { id: true },
  });
  projectId = project.id;

  // memberUser has the CONSULTANT role within the project.
  await prisma.projectMember.create({
    data: { projectId, userId: memberUser.id, role: Role.CONSULTANT },
  });
});

afterAll(async () => {
  await prisma.projectMember.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("CP1 — project access requires membership or SYSTEM_ADMIN", () => {
  it("allows a SYSTEM_ADMIN even without a membership row", async () => {
    await expect(canAccessProject(adminUser, projectId)).resolves.toBe(true);
    await expect(requireProjectAccess(adminUser, projectId)).resolves.toMatchObject({
      synthetic: true,
    });
  });

  it("allows a project member", async () => {
    await expect(canAccessProject(memberUser, projectId)).resolves.toBe(true);
    await expect(requireProjectAccess(memberUser, projectId)).resolves.toMatchObject({
      role: Role.CONSULTANT,
      synthetic: false,
    });
  });

  it("denies a non-member, non-admin user", async () => {
    await expect(canAccessProject(outsiderUser, projectId)).resolves.toBe(false);
    await expect(requireProjectAccess(outsiderUser, projectId)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("CP2 — actions require a permitting role", () => {
  it("permits the action when the effective project role is allowed", async () => {
    await expect(
      requireRole(memberUser, [Role.CONSULTANT, Role.REVIEWER], projectId),
    ).resolves.toBeUndefined();
  });

  it("denies the action when the effective role is not permitted", async () => {
    await expect(
      requireRole(memberUser, [Role.FINANCIAL_CONTROLLER], projectId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies a non-member, non-admin regardless of requested role", async () => {
    await expect(
      requireRole(outsiderUser, [Role.CONSULTANT], projectId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("permits a SYSTEM_ADMIN to override the role gate", async () => {
    await expect(
      requireRole(adminUser, [Role.FINANCIAL_CONTROLLER], projectId),
    ).resolves.toBeUndefined();
  });
});
