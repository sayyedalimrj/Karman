/**
 * Root route ("/") — SERVER-SIDE redirect only. There is no marketing/landing
 * page: authenticated visitors go to the dashboard, everyone else to login.
 *
 * Requirements: 2.1, 2.5
 */
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUser } from "@/server/auth/session";

export default async function RootPage(): Promise<never> {
  const user = await getCurrentUser();
  redirect((user ? "/dashboard" : "/login") as Route);
}
