/**
 * Permission-aware navigation model (presentation-only).
 *
 * IMPORTANT: Navigation visibility is a UX convenience, NOT an authorization
 * boundary. The real boundary is the server-side permission service
 * (`src/server/permissions`) which every protected page/action passes through.
 * This module only decides which links to *show* (or show as intentionally
 * disabled) based on the user's global role.
 *
 * Pure and dependency-free so it can be unit-tested without a database or a DOM.
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
  /** Target route when implemented; omitted for not-yet-built sections. */
  href?: string;
  /** True when the section exists in the product map but is not yet built. */
  disabled?: boolean;
  /** Short Persian note shown for disabled/coming-soon items. */
  note?: string;
  /** True when the item is only relevant to global administrators. */
  adminOnly?: boolean;
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

/**
 * Builds the navigation sections visible to a user with the given global role.
 *
 * - Everyone authenticated sees Dashboard and Inbox.
 * - Project setup is surfaced only to roles permitted to manage projects.
 * - The system-administration section is surfaced only to SYSTEM_ADMIN and is
 *   marked as an intentionally-disabled "coming soon" section (the route is not
 *   built yet) — an honest unavailable state rather than a fake page.
 */
export function buildNavSections(systemRole: Role): NavSection[] {
  const main: NavItem[] = [
    { key: "dashboard", label: t.nav.dashboard, href: "/dashboard" },
    { key: "inbox", label: t.nav.inbox, href: "/inbox" },
  ];

  if (canManageProjects(systemRole)) {
    main.push({
      key: "project-setup",
      label: t.nav.projectSetup,
      href: "/projects/setup",
    });
  }

  const sections: NavSection[] = [
    { key: "main", title: t.nav.workspace, items: main },
  ];

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

/** Flat list of admin-only nav keys (used by tests/visibility checks). */
export function adminOnlyKeys(sections: NavSection[]): string[] {
  return sections.flatMap((s) => s.items.filter((i) => i.adminOnly).map((i) => i.key));
}
