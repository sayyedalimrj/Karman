/**
 * Sidebar — brand mark + Taksa-first, permission-aware navigation (presentation
 * only).
 *
 * The sections are computed server-side from the user's role via
 * `buildNavSections`; this component only renders them. Disabled/future items
 * render as a clear unavailable state WITH their reason instead of a dead link
 * or a fake page. Grouped items render a group label with nested sub-links.
 *
 * Requirements: 10.3, 10.5, 4.2
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import type { NavItem, NavSection } from "./nav";
import { t } from "@/lib/i18n";

export interface SidebarProps {
  sections: NavSection[];
  /** Current path, used only to highlight the active link. */
  activePath?: string;
}

function isActive(activePath: string | undefined, href: string): boolean {
  if (!activePath) return false;
  return activePath === href || activePath.startsWith(`${href}/`);
}

function NavLeaf({ item, activePath }: { item: NavItem; activePath?: string }) {
  if (item.href && !item.disabled) {
    return (
      <Link
        href={item.href as Route}
        className={`nav-item${isActive(activePath, item.href) ? " nav-item--active" : ""}`}
        aria-current={isActive(activePath, item.href) ? "page" : undefined}
      >
        <span className="nav-item__label">{item.label}</span>
      </Link>
    );
  }
  return (
    <span className="nav-item nav-item--disabled" aria-disabled="true" title={item.note}>
      <span className="nav-item__label">{item.label}</span>
      {item.note ? <span className="nav-item__note">{item.note}</span> : null}
    </span>
  );
}


function NavEntry({ item, activePath }: { item: NavItem; activePath?: string }) {
  if (item.children && item.children.length > 0) {
    return (
      <li className="nav-group">
        <span className="nav-group__label">{item.label}</span>
        <ul className="nav-list nav-list--nested">
          {item.children.map((child) => (
            <li key={child.key}>
              <NavLeaf item={child} activePath={activePath} />
            </li>
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li>
      <NavLeaf item={item} activePath={activePath} />
    </li>
  );
}

export function Sidebar({ sections, activePath }: SidebarProps) {
  return (
    <aside className="sidebar glass-panel glass-panel--strong" aria-label={t.nav.workspace}>
      <div className="sidebar__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sidebar__brand-mark" src="/brand/logo.png" alt={t.app.name} />
      </div>

      <nav className="sidebar__nav">
        {sections.map((section) => (
          <div key={section.key} className="nav-section">
            <p className="nav-section__title">{section.title}</p>
            <ul className="nav-list">
              {section.items.map((item) => (
                <NavEntry key={item.key} item={item} activePath={activePath} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
