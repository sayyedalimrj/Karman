/**
 * TopBar — page title + current-user area (with logout). Token-driven glass
 * header; no raw hex.
 *
 * Requirements: 10.3
 */
import * as React from "react";
import { UserMenu } from "./UserMenu";

export interface TopBarUser {
  fullName: string;
  email: string;
}

export interface TopBarProps {
  title: string;
  user: TopBarUser;
}

export function TopBar({ title, user }: TopBarProps) {
  return (
    <header className="topbar glass-panel">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__spacer" />
      <UserMenu fullName={user.fullName} email={user.email} />
    </header>
  );
}
