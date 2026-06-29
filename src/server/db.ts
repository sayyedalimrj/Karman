/**
 * Singleton Prisma client — the ONLY database access path in Karman.
 *
 * In development, Next.js hot-reload can repeatedly re-evaluate modules; caching
 * the client on `globalThis` prevents connection exhaustion from many client
 * instances. In production a single module-scope instance is used.
 *
 * Requirements: 3.1 (single Prisma access path; connection reuse)
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "@prisma/client";
