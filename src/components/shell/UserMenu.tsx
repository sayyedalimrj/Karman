"use client";

/**
 * UserMenu — shows the current user's name/email and a real logout control.
 *
 * Logout calls the REAL auth route (DELETE /api/auth) which clears the session
 * cookie, then navigates to /login. Only serializable user fields are accepted
 * as props (no server objects cross the client boundary).
 *
 * Requirements: 10.3, 2.5
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";

export interface UserMenuProps {
  fullName: string;
  email: string;
}

export function UserMenu({ fullName, email }: UserMenuProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleLogout(): Promise<void> {
    setBusy(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // Even if the network call fails, fall through to navigation; the server
      // session cookie is httpOnly and will be re-validated on the next request.
    } finally {
      router.replace("/login" as Route);
      router.refresh();
    }
  }

  return (
    <div className="user-menu">
      <div className="user-menu__identity">
        <span className="user-menu__name">{fullName}</span>
        <span className="user-menu__email tabular-digits">{email}</span>
      </div>
      <Button variant="ghost" onClick={handleLogout} disabled={busy} aria-label={t.nav.logout}>
        {t.nav.logout}
      </Button>
    </div>
  );
}
