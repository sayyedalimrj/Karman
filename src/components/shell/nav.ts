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
  const projectsChildren: NavItem[] = [];
  if (canManageProjects(systemRole)) {
    projectsChildren.push({
      key: "project-setup",
      label: t.nav.projectSetup,
      href: "/projects/setup",
    });
  }

  const main: NavItem[] = [
    { key: "workbench", label: t.nav.workbench, href: "/dashboard" },
    { key: "inbox", label: t.nav.inboxReview, href: "/inbox" },
    {
      key: "taksa",
      label: t.nav.taksaIntake,
      children: [
        { key: "taksa-overview", label: t.nav.taksaOverview, href: "/taksa" },
        { key: "taksa-imports", label: t.nav.taksaImports, href: "/taksa/imports" },
        { key: "taksa-raw", label: t.nav.taksaRaw, href: "/taksa/raw" },
      ],
    },
    {
      key: "reference",
      label: t.nav.referenceLibrary,
      children: [
        { key: "reference-overview", label: t.nav.referenceOverview, href: "/reference" },
        { key: "reference-sources", label: t.nav.referenceSources, href: "/reference/sources" },
        { key: "reference-library", label: t.nav.referenceLibraryItems, href: "/reference/library" },
      ],
    },
  ];


  main.push({
    key: "projects",
    label: t.nav.projectsContracts,
    // The group surfaces real project routes only; when the user cannot manage
    // projects there is no buildable child route, so the group links to setup
    // is omitted and the parent is shown as a non-link group header.
    href: projectsChildren.length > 0 ? "/projects/setup" : undefined,
    children: projectsChildren.length > 0 ? projectsChildren : undefined,
    disabled: projectsChildren.length === 0,
    note: projectsChildren.length === 0 ? t.projectSetup.forbiddenDescription : undefined,
  });

  // Future operational modules — honest DISABLED states with a real reason.
  main.push(
    {
      key: "statements",
      label: t.nav.statements,
      disabled: true,
      note: t.nav.statementsReason,
    },
    {
      key: "metering",
      label: t.nav.metering,
      disabled: true,
      note: t.nav.meteringReason,
    },
    // Index/adjustment/coefficients point at the REAL reference library focus.
    {
      key: "index-adjustment",
      label: t.nav.indexAdjustment,
      href: "/reference/library",
    },
    {
      key: "reports",
      label: t.nav.reportsExports,
      disabled: true,
      note: t.nav.reportsReason,
    },
  );

  const sections: NavSection[] = [{ key: "main", title: t.nav.workspace, items: main }];


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
          note: t.nav.comingSoon,
        },
        {
          key: "admin-audit",
          label: t.nav.auditLog,
          adminOnly: true,
          disabled: true,
          note: t.nav.comingSoon,
        },
      ],
    });
  }

  return sections;
}
