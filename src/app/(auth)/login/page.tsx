/**
 * Login page (SERVER wrapper + client form).
 *
 * Server-side it sanitizes the `next` query param (same-origin relative paths
 * only) and, if the visitor is ALREADY authenticated, redirects away from the
 * login page to that target (default /dashboard). Otherwise it renders the
 * client `LoginForm`.
 *
 * Requirements: 2.1
 */
import * as React from "react";
import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth/page-guard";
import { sanitizeNextPath } from "@/lib/next-path";
import { t } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: t.auth.loginTitle,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawNext = Array.isArray(sp?.next) ? sp.next[0] : sp?.next;
  const next = sanitizeNextPath(rawNext);

  // Already signed in → don't show the form; bounce to the target.
  await redirectIfAuthenticated(next);

  return <LoginForm next={next} />;
}
