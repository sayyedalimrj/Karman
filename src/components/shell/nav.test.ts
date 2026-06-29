/**
 * Unit tests for permission-aware navigation (presentation-only).
 *
 * Verifies that admin-only sections/links are surfaced to a SYSTEM_ADMIN but
 * NOT to a normal (VIEWER) user, and that project-setup visibility tracks the
 * project-management roles. (Visibility is UX only — the server remains the
 * authorization boundary.)
 *
 * Requirements: 4.2, 10.3, 10.5
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { buildNavSections, adminOnlyKeys, canManageProjects } from "./nav";

describe("buildNavSections", () => {
  it("never exposes admin-only items to a VIEWER", () => {
    const sections = buildNavSections(Role.VIEWER);
    expect(adminOnlyKeys(sections)).toEqual([]);
    expect(sections.some((s) => s.key === "admin")).toBe(false);
  });

  it("exposes the administration section to a SYSTEM_ADMIN", () => {
    const sections = buildNavSections(Role.SYSTEM_ADMIN);
    expect(sections.some((s) => s.key === "admin")).toBe(true);
    expect(adminOnlyKeys(sections).length).toBeGreaterThan(0);
  });

  it("shows the project-setup link only to project managers", () => {
    const viewerKeys = buildNavSections(Role.VIEWER)
      .flatMap((s) => s.items)
      .map((i) => i.key);
    const adminKeys = buildNavSections(Role.PROJECT_ADMIN)
      .flatMap((s) => s.items)
      .map((i) => i.key);

    expect(viewerKeys).not.toContain("project-setup");
    expect(adminKeys).toContain("project-setup");
  });

  it("always shows dashboard and inbox to any authenticated role", () => {
    const keys = buildNavSections(Role.CONTRACTOR)
      .flatMap((s) => s.items)
      .map((i) => i.key);
    expect(keys).toContain("dashboard");
    expect(keys).toContain("inbox");
  });

  it("renders admin-only nav items as a clear disabled/unavailable state", () => {
    const adminSection = buildNavSections(Role.SYSTEM_ADMIN).find((s) => s.key === "admin");
    expect(adminSection).toBeDefined();
    for (const item of adminSection!.items) {
      // Not-yet-built sections must be disabled (no dead links, no fake pages).
      expect(item.disabled).toBe(true);
      expect(item.href).toBeUndefined();
    }
  });
});

describe("canManageProjects", () => {
  it("permits SYSTEM_ADMIN and PROJECT_ADMIN only", () => {
    expect(canManageProjects(Role.SYSTEM_ADMIN)).toBe(true);
    expect(canManageProjects(Role.PROJECT_ADMIN)).toBe(true);
    expect(canManageProjects(Role.VIEWER)).toBe(false);
    expect(canManageProjects(Role.CONTRACTOR)).toBe(false);
  });
});
