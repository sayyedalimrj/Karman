/**
 * GET /api/admin/data-sync/runs/:id — a single sync run's steps/logs.
 *
 * SYSTEM_ADMIN only (enforced server-side). Returns the run's step outcomes,
 * warnings, and safe file-count metadata for the admin diagnostics drill-down.
 */
import { NextResponse } from "next/server";
import { requireSystemAdmin } from "@/server/data-sync/api-guard";
import { loadSyncRunById } from "@/server/data-sync/queries";
import { toTransport } from "@/lib/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireSystemAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: { code: guard.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } }, { status: guard.status });
  }
  try {
    const { id } = await context.params;
    const run = await loadSyncRunById(id);
    if (!run) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, run }, { status: 200 });
  } catch (err) {
    const { status, body } = toTransport(err);
    return NextResponse.json(body, { status });
  }
}
