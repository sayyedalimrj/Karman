/**
 * Taksa-first, permission-aware navigation model (presentation-only).
 *
 * IMPORTANT: Navigation visibility is a UX convenience, NOT an authorization
 * boundary. The real boundary is the server-side permission service
 * (`src/server/permissions`) which every protected page/action passes through.
 * This module only decides which links to *show* (or show as intentionally
 * disabled, with a reason) based on the user's global role.
 *
 * The Karman product is a Taksa/Texsa-inspired construction FINANCIAL WORKFLOW
 * system, so the navigation is organised around the real operational pipeline:
 * operational desk → review inbox → Taksa intake → reference library →
 * projects/contracts → (future) statements/metering/index/reports → admin.
 *
 * Pure and dependency-free so it can be unit-tested without a database or DOM.
 *
 * Requirements: 4.2, 10.3, 10.5
 */
import { Role } from "@prisma/client";
import { t } from "@/lib/i18n";

/** A single navigation entry rendered in the sidebar. */
export interface NavItem {
  /** Stable key for React lists / tests. */
  key: string;
  /** Persian label. */
  label: string;
  /** Target route when implemented; omitted for groups and future sections. */
  href?: string;
  /** True when the section exists in the product map but is not yet built. */
  disabled?: boolean;
  /** Short Persian note shown for disabled/future items (the honest reason). */
  note?: string;
  /** True when the item is only relevant to global administrators. */
  adminOnly?: boolean;
  /** Nested links for grouped sections (e.g. Taksa intake, Reference). */
  children?: NavItem[];
}

/** A labelled group of navigation entries. */
export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}


/**
 * Returns true when the user's GLOBAL role permits initiating project setup.
 * Project-scoped authorization is still enforced server-side by the project
 * setup action; this only governs whether the nav link / CTA is surfaced.
 */
export function canManageProjects(systemRole: Role): boolean {
  return systemRole === Role.SYSTEM_ADMIN || systemRole === Role.PROJECT_ADMIN;
}

/** Returns true when the user is a global system administrator. */
export function isSystemAdmin(systemRole: Role): boolean {
  return systemRole === Role.SYSTEM_ADMIN;
}

/** Flattens nav items (including nested children) into a single list. */
export function flattenItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenItems(item.children) : [])]);
}

/** Flat list of every nav item across all sections (including children). */
export function allItems(sections: NavSection[]): NavItem[] {
  return flattenItems(sections.flatMap((s) => s.items));
}

/** Flat list of admin-only nav keys (used by tests/visibility checks). */
export function adminOnlyKeys(sections: NavSection[]): string[] {
  return allItems(sections)
    .filter((i) => i.adminOnly)
    .map((i) => i.key);
}


/**
 * Builds the Taksa-first navigation sections for a user with the given global
 * role.
 *
 * Rules enforced here:
 * - NO dead links and NO fake pages: every `href` points to a route that is
 *   actually implemented in this phase (/dashboard, /inbox, /taksa*,
 *   /reference*, /projects/setup).
 * - Future modules (statements, metering, reports) are surfaced as clearly
 *   DISABLED items WITH an honest Persian reason — never a fake page.
 * - The system-administration section is surfaced only to SYSTEM_ADMIN; its
 *   future sub-items are marked disabled.
 * - Visibility is presentation only; the server remains the real boundary.
 */
export function buildNavSections(systemRole: Role): NavSection[] {
  // 1) Workspace
  const workspace: NavItem[] = [
    { key: "workbench", label: t.nav.workbench, href: "/dashboard" },
    { key: "inbox", label: t.nav.inboxReview, href: "/inbox" },
  ];

  // 2) Reference data — sync dashboard, update packages, validation/mapping
  //    (disabled until built), and the reference library.
  const dataReference: NavItem[] = [
    { key: "sources-sync", label: t.nav.sourcesSync, href: "/taksa/imports" },
    { key: "update-packages", label: t.nav.updatePackages, href: "/taksa/updates" },
    {
      key: "validation-mapping",
      label: t.nav.validationMapping,
      disabled: true,
      note: t.nav.validationMappingNote,
    },
    { key: "reference-library", label: t.nav.referenceLibraryNav, href: "/reference/library" },
  ];

  // 3) Projects & contracts — real project setup (role-gated) + disabled future
  //    operational modules with honest reasons.
  const projects: NavItem[] = [];
  if (canManageProjects(systemRole)) {
    projects.push({ key: "project-setup", label: t.nav.projectSetup, href: "/projects/setup" });
  }
  projects.push(
    { key: "contracts", label: t.nav.contracts, disabled: true, note: t.nav.contractsReason },
    { key: "statements", label: t.nav.statements, disabled: true, note: t.nav.statementsReason },
    { key: "metering", label: t.nav.metering, disabled: true, note: t.nav.meteringReason },
  );

  // 4) Index / adjustment / coefficients — focused views of the real reference
  //    library (no dedicated pages yet → no dead links).
  const indices: NavItem[] = [
    { key: "indices", label: t.nav.indices, href: "/reference/library" },
    { key: "coefficients", label: t.nav.coefficients, href: "/reference/library" },
    { key: "adjustment", label: t.nav.adjustment, href: "/reference/library" },
  ];

  // 5) Reports — disabled future modules with reasons.
  const reports: NavItem[] = [
    { key: "reports", label: t.nav.reports, disabled: true, note: t.nav.reportsReason },
    { key: "exports", label: t.nav.exports, disabled: true, note: t.nav.exportsReason },
  ];

  const sections: NavSection[] = [
    { key: "workspace", title: t.nav.workspace, items: workspace },
    { key: "data-reference", title: t.nav.dataReference, items: dataReference },
    { key: "projects", title: t.nav.projectsContracts, items: projects },
    { key: "index-adjustment", title: t.nav.indexAdjustment, items: indices },
    { key: "reports", title: t.nav.reportsExports, items: reports },
  ];

  // 6) System administration — SYSTEM_ADMIN only. Real diagnostics page +
  //    disabled-with-note future admin items.
  if (isSystemAdmin(systemRole)) {
    sections.push({
      key: "admin",
      title: t.nav.administration,
      items: [
        {
          key: "admin-users",
          label: t.nav.userManagement,
          adminOnly: true,
          disabled: true,
          note: t.nav.usersReason,
        },
        {
          key: "admin-audit",
          label: t.nav.auditLog,
          adminOnly: true,
          disabled: true,
          note: t.nav.auditReason,
        },
        {
          key: "admin-diagnostics",
          label: t.nav.technicalDiagnostics,
          href: "/admin/data-diagnostics",
          adminOnly: true,
        },
      ],
    });
  }

  return sections;
}
