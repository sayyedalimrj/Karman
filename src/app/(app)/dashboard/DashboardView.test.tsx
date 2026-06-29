// @vitest-environment jsdom
/**
 * Component tests for DashboardView.
 *
 * Confirms the empty state «هنوز پروژه‌ای ثبت نشده است.» is shown ONLY when the
 * (real, DB-derived) project list is empty, and is NOT shown when the data
 * contains projects — i.e. the empty state is derived from data, not hard-coded.
 *
 * Requirements: 10.4
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import { t } from "@/lib/i18n";
import type { DashboardData } from "@/server/dashboard";

afterEach(cleanup);

const emptyData: DashboardData = {
  projects: [],
  stats: { projectCount: 0, activeCaseCount: 0, lockedCaseCount: 0 },
};

const populatedData: DashboardData = {
  projects: [{ id: "p1", code: "P-1", name: "پروژه نمونه", status: "ACTIVE" }],
  stats: { projectCount: 1, activeCaseCount: 3, lockedCaseCount: 0 },
};

describe("DashboardView", () => {
  it("shows the real empty state when there are no projects", () => {
    render(<DashboardView data={emptyData} canManageProjects={false} />);
    expect(screen.getByText(t.dashboard.noProjects)).toBeDefined();
    expect(screen.getByText("هنوز پروژه‌ای ثبت نشده است.")).toBeDefined();
  });

  it("does NOT show the empty state when projects exist", () => {
    render(<DashboardView data={populatedData} canManageProjects={false} />);
    expect(screen.queryByText(t.dashboard.noProjects)).toBeNull();
    // Real data is rendered instead.
    expect(screen.getByText("پروژه نمونه")).toBeDefined();
    expect(screen.getByText("P-1")).toBeDefined();
  });
});
