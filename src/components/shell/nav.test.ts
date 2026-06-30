/**
 * Unit tests for the product, permission-aware navigation (presentation-only).
 *
 * Verifies the operational product structure:
 *  - فضای کاری, داده‌های مرجع, پروژه‌ها و قراردادها, شاخص/تعدیل/ضرایب, گزارش‌ها,
 *    and (SYSTEM_ADMIN-only) مدیریت سامانه,
 *  - every enabled href points to an implemented route (NO dead links),
 *  - disabled items carry an honest Persian note,
 *  - the admin section (incl. the real diagnostics page) is SYSTEM_ADMIN-only,
 *  - project-setup visibility tracks the project-management roles.
 *
 * Visibility is UX only — the server remains the authorization boundary.
 *
 * Requirements: 4.2, 10.3, 10.5
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { buildNavSections, adminOnlyKeys, allItems, canManageProjects } from "./nav";
import { t } from "@/lib/i18n";

/** Routes that are actually implemented and may be linked from the nav. */
const IMPLEMENTED_ROUTES = new Set<string>([
  "/dashboard",
  "/inbox",
  "/taksa/imports",
  "/taksa/updates",
  "/reference/library",
  "/projects/setup",
  "/admin/data-diagnostics",
]);

describe("buildNavSections — product structure", () => {
  it("surfaces the real top-level section labels", () => {
    const sections = buildNavSections(Role.SYSTEM_ADMIN);
    const titles = sections.map((s) => s.title);
    expect(titles).toContain(t.nav.workspace); // فضای کاری
    expect(titles).toContain(t.nav.dataReference); // داده‌های مرجع
    expect(titles).toContain(t.nav.projectsContracts); // پروژه‌ها و قراردادها
    expect(titles).toContain(t.nav.indexAdjustment); // شاخص، تعدیل و ضرایب
    expect(titles).toContain(t.nav.reportsExports); // گزارش‌ها
    expect(titles).toContain(t.nav.administration); // مدیریت سامانه
  });

  it("links the data-reference items to their real routes", () => {
    const items = allItems(buildNavSections(Role.SYSTEM_ADMIN));
    const byKey = (k: string) => items.find((i) => i.key === k);
    expect(byKey("workbench")?.href).toBe("/dashboard");
    expect(byKey("inbox")?.href).toBe("/inbox");
    expect(byKey("sources-sync")?.href).toBe("/taksa/imports");
    expect(byKey("update-packages")?.href).toBe("/taksa/updates");
    expect(byKey("reference-library")?.href).toBe("/reference/library");
  });

  it("points index/adjustment/coefficients at the real reference library", () => {
    const items = allItems(buildNavSections(Role.VIEWER));
    for (const key of ["indices", "coefficients", "adjustment"]) {
      expect(items.find((i) => i.key === key)?.href).toBe("/reference/library");
    }
  });

  it("renders disabled items WITH a note and no href (no fake pages)", () => {
    const items = allItems(buildNavSections(Role.SYSTEM_ADMIN));
    for (const key of [
      "validation-mapping",
      "contracts",
      "statements",
      "metering",
      "reports",
      "exports",
      "admin-users",
      "admin-audit",
    ]) {
      const item = items.find((i) => i.key === key);
      expect(item).toBeDefined();
      expect(item!.disabled).toBe(true);
      expect(item!.href).toBeUndefined();
      expect(item!.note && item!.note.length).toBeGreaterThan(0);
    }
  });

  it("never produces a dead link — every enabled href is an implemented route", () => {
    for (const role of Object.values(Role)) {
      const items = allItems(buildNavSections(role));
      for (const item of items) {
        if (item.href && !item.disabled) {
          expect(IMPLEMENTED_ROUTES.has(item.href)).toBe(true);
        }
      }
    }
  });
});

describe("permission-aware visibility (presentation only)", () => {
  it("never exposes admin-only items to a VIEWER", () => {
    const sections = buildNavSections(Role.VIEWER);
    expect(adminOnlyKeys(sections)).toEqual([]);
    expect(sections.some((s) => s.key === "admin")).toBe(false);
  });

  it("exposes the administration section to a SYSTEM_ADMIN with a real diagnostics page", () => {
    const sections = buildNavSections(Role.SYSTEM_ADMIN);
    const admin = sections.find((s) => s.key === "admin");
    expect(admin).toBeDefined();
    expect(adminOnlyKeys(sections).length).toBeGreaterThan(0);
    const diag = admin!.items.find((i) => i.key === "admin-diagnostics");
    expect(diag?.href).toBe("/admin/data-diagnostics");
    expect(diag?.adminOnly).toBe(true);
  });

  it("shows the project-setup link only to project managers", () => {
    const viewerKeys = allItems(buildNavSections(Role.VIEWER)).map((i) => i.key);
    const adminKeys = allItems(buildNavSections(Role.PROJECT_ADMIN)).map((i) => i.key);
    expect(viewerKeys).not.toContain("project-setup");
    expect(adminKeys).toContain("project-setup");
  });

  it("always shows the operational desk and review inbox to any authenticated role", () => {
    const keys = allItems(buildNavSections(Role.CONTRACTOR)).map((i) => i.key);
    expect(keys).toContain("workbench");
    expect(keys).toContain("inbox");
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
