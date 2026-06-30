/**
 * Unit tests for the Taksa-first, permission-aware navigation
 * (presentation-only).
 *
 * Verifies that:
 *  - the real Taksa-first labels/routes are present (میز کار, کارتابل رسیدگی,
 *    ورود اطلاعات تکسا, کتابخانه فنی و مرجع, ...),
 *  - future modules are surfaced as clearly DISABLED items WITH a reason and no
 *    href (no dead links, no fake pages),
 *  - admin-only items are surfaced to SYSTEM_ADMIN but not to a VIEWER,
 *  - project-setup visibility tracks the project-management roles,
 *  - every enabled link points to an implemented route (no dead links).
 *
 * Visibility is UX only — the server remains the authorization boundary.
 *
 * Requirements: 4.2, 10.3, 10.5
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  buildNavSections,
  adminOnlyKeys,
  allItems,
  canManageProjects,
} from "./nav";
import { t } from "@/lib/i18n";

/** Routes that are actually implemented in Phase 1. */
const IMPLEMENTED_ROUTES = new Set<string>([
  "/dashboard",
  "/inbox",
  "/taksa",
  "/taksa/imports",
  "/taksa/raw",
  "/reference",
  "/reference/sources",
  "/reference/library",
  "/projects/setup",
]);


describe("buildNavSections — Taksa-first structure", () => {
  it("surfaces the real Taksa-first top-level labels", () => {
    const items = allItems(buildNavSections(Role.SYSTEM_ADMIN));
    const labels = items.map((i) => i.label);
    expect(labels).toContain(t.nav.workbench); // میز کار
    expect(labels).toContain(t.nav.inboxReview); // کارتابل رسیدگی
    expect(labels).toContain(t.nav.taksaIntake); // ورود اطلاعات تکسا
    expect(labels).toContain(t.nav.referenceLibrary); // کتابخانه فنی و مرجع
    expect(labels).toContain(t.nav.projectsContracts); // پروژه‌ها و قراردادها
    expect(labels).toContain(t.nav.indexAdjustment); // شاخص، تعدیل و ضرایب
  });

  it("links Taksa intake and reference groups to their real routes", () => {
    const items = allItems(buildNavSections(Role.SYSTEM_ADMIN));
    const byKey = (k: string) => items.find((i) => i.key === k);
    expect(byKey("taksa-overview")?.href).toBe("/taksa");
    expect(byKey("taksa-imports")?.href).toBe("/taksa/imports");
    expect(byKey("taksa-raw")?.href).toBe("/taksa/raw");
    expect(byKey("reference-overview")?.href).toBe("/reference");
    expect(byKey("reference-sources")?.href).toBe("/reference/sources");
    expect(byKey("reference-library")?.href).toBe("/reference/library");
  });

  it("points index/adjustment/coefficients at the real reference library", () => {
    const items = allItems(buildNavSections(Role.VIEWER));
    expect(items.find((i) => i.key === "index-adjustment")?.href).toBe("/reference/library");
  });

  it("renders future modules as DISABLED with a reason and no href (no fake pages)", () => {
    const items = allItems(buildNavSections(Role.SYSTEM_ADMIN));
    for (const key of ["statements", "metering", "reports"]) {
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

  it("exposes the administration section (disabled future items) to a SYSTEM_ADMIN", () => {
    const sections = buildNavSections(Role.SYSTEM_ADMIN);
    const admin = sections.find((s) => s.key === "admin");
    expect(admin).toBeDefined();
    expect(adminOnlyKeys(sections).length).toBeGreaterThan(0);
    for (const item of admin!.items) {
      expect(item.disabled).toBe(true);
      expect(item.href).toBeUndefined();
    }
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
