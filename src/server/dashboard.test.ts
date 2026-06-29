/**
 * Unit tests for the dashboard data loader.
 *
 * Confirms the dashboard derives its content from REAL Prisma queries: when the
 * query returns no projects, the loader returns an empty list (which the UI
 * renders as the real empty state) — there is no fabricated fallback data.
 *
 * Requirements: 10.4
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const projectCount = vi.fn();
const caseCount = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    project: {
      findMany: (a: unknown) => findMany(a),
      count: (a: unknown) => projectCount(a),
    },
    workflowCase: {
      count: (a: unknown) => caseCount(a),
    },
  },
}));

import { loadDashboardData } from "./dashboard";
import type { AuthUser } from "@/server/auth/session";

const viewer: AuthUser = {
  id: "u-viewer",
  email: "v@karman.test",
  fullName: "Viewer",
  systemRole: "VIEWER",
};

beforeEach(() => {
  findMany.mockReset();
  projectCount.mockReset();
  caseCount.mockReset();
});

describe("loadDashboardData", () => {
  it("returns an empty projects list (no fake fallback) when the DB has none", async () => {
    findMany.mockResolvedValueOnce([]);
    projectCount.mockResolvedValueOnce(0);
    caseCount.mockResolvedValue(0);

    const data = await loadDashboardData(viewer);

    expect(data.projects).toEqual([]);
    expect(data.stats).toEqual({ projectCount: 0, activeCaseCount: 0, lockedCaseCount: 0 });
  });

  it("returns the real rows and counts when the DB has data", async () => {
    findMany.mockResolvedValueOnce([
      { id: "p1", code: "P-1", name: "پروژه یک", status: "ACTIVE" },
    ]);
    projectCount.mockResolvedValueOnce(1);
    caseCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const data = await loadDashboardData(viewer);

    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({ id: "p1", code: "P-1" });
    expect(data.stats.projectCount).toBe(1);
  });

  it("scopes non-admin queries to the user's memberships", async () => {
    findMany.mockResolvedValueOnce([]);
    projectCount.mockResolvedValueOnce(0);
    caseCount.mockResolvedValue(0);

    await loadDashboardData(viewer);

    const where = findMany.mock.calls[0]![0].where;
    expect(where).toEqual({ members: { some: { userId: "u-viewer" } } });
  });
});
