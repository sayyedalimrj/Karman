/**
 * Health-check endpoint for deployment readiness.
 *
 *   GET /api/health
 *
 * Returns 200 with `{ status: "ok" }` when the process is up and the database
 * answers a trivial connectivity probe (`SELECT 1`). Returns 503 with
 * `{ status: "error" }` when the database check fails. The response never
 * includes connection strings, secrets, or internal error detail.
 *
 * Requirements: 1.5
 */
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Always evaluate at request time; never cache the readiness result.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "up", timestamp },
      { status: 200 },
    );
  } catch {
    // Do not surface the underlying error (may contain connection details).
    return NextResponse.json(
      { status: "error", db: "down", timestamp },
      { status: 503 },
    );
  }
}
