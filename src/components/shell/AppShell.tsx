/**
 * AppShell — the enterprise, RTL, glass application frame: a brand sidebar with
 * permission-aware navigation, a top bar with the current user + logout, and a
 * content slot. Token-driven, Persian-first, RTL-first.
 *
 * The shell receives ONLY serializable user data (resolved by the server-side
 * `(app)/layout.tsx`). It performs no authorization itself — navigation
 * visibility is presentation only; the server pages remain the boundary.
 *
 * Requirements: 10.3, 10.5
 */
import * as React from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { buildNavSections } from "./nav";

export interface ShellUser {
  fullName: string;
  email: string;
  systemRole: Role;
}

export interface AppShellProps {
  user: ShellUser;
  title: string;
  activePath?: string;
  children: React.ReactNode;
}

export function AppShell({ user, title, activePath, children }: AppShellProps) {
  const sections = buildNavSections(user.systemRole);

  return (
    <div className="app-shell">
      <Sidebar sections={sections} activePath={activePath} />
      <div className="app-shell__main">
        <TopBar title={title} user={{ fullName: user.fullName, email: user.email }} />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}
