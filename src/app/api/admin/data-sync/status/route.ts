/**
 * GET /api/admin/data-sync/status — latest sync run + dashboard counts.
 *
 * SYSTEM_ADMIN only (enforced server-side). Returns DB-backed status cards and
 * the recent run history. Never exposes raw file content or server paths.
 */
import { NextResponse } from "next/server";
import { requireSystemAdmin } from "@/server/data-sync/api-guard";
import { loadSyncDashboard } from "@/server/data-sync/queries";
import { toTransport } from "@/lib/errors";

export async function GET(): Promise<NextResponse> {
  const guard = await requireSystemAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: { code: guard.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } }, { status: guard.status });
  }
  try {
    const data = await loadSyncDashboard();
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (err) {
    const { status, body } = toTransport(err);
    return NextResponse.json(body, { status });
  }
}
