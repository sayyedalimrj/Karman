/**
 * Shared helpers for persisting Taksa staging/analysis metadata to PostgreSQL.
 *
 * The CLIs must degrade GRACEFULLY when no database connection is available
 * (e.g. an empty local checkout / CI without DB): instead of crashing they
 * write JSON/CSV outputs and print a clear message. {@link isDatabaseReachable}
 * lets each runner decide whether to attempt persistence, and
 * {@link resolveCliActorUserId} attributes CLI-driven persistence to a real
 * SYSTEM_ADMIN user when one exists (so AuditLog rows always have an actor).
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";

/** Returns true when the operational PostgreSQL is reachable right now. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a SYSTEM_ADMIN user id to attribute CLI-driven persistence to, or
 * `null` when none exists (in which case the CLI persists nothing and only
 * writes file outputs — never a fabricated/anonymous audit actor).
 */
export async function resolveCliActorUserId(): Promise<string | null> {
  try {
    const admin = await prisma.user.findFirst({
      where: { systemRole: Role.SYSTEM_ADMIN, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return admin?.id ?? null;
  } catch {
    return null;
  }
}
