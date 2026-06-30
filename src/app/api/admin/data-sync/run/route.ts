/**
 * POST /api/admin/data-sync/run — trigger a server-aware reference data-sync.
 *
 * SYSTEM_ADMIN only (enforced server-side). Runs the Karman data-sync
 * orchestrator (discover → register → analyze → detect/parse update packages →
 * persist metadata + staging rows → update status) and returns a JSON result
 * summary (counts, warnings, per-step outcomes). It NEVER returns shell
 * commands, server paths, or restore errors.
 *
 * Requirements: admin data-sync, server-side authorization, audit.
 */
import { NextResponse } from "next/server";
import { runDataSyncAction } from "@/server/data-sync/karmanDataSync";
import { toTransport } from "@/lib/errors";

export async function POST(): Promise<NextResponse> {
  try {
    const state = await runDataSyncAction();
    if (!state.ok) {
      const status = state.error === "unauthorized" ? 401 : 403;
      return NextResponse.json({ error: { code: state.error } }, { status });
    }
    const r = state.result!;
    return NextResponse.json(
      {
        ok: true,
        status: r.status,
        persisted: r.persisted,
        runId: r.runId ?? null,
        discoveredSources: r.discoveredSources,
        fileCounts: r.fileCounts,
        steps: r.steps,
        warnings: r.warnings,
        updatePackages: r.updatePackages.map((p) => ({
          packageName: p.packageName,
          affectedTables: p.affectedTables,
          insertIntentCount: p.insertIntentCount,
          deleteIntentCount: p.deleteIntentCount,
          recognizedOfficialPackage: p.recognizedOfficialPackage,
        })),
      },
      { status: 200 },
    );
  } catch (err) {
    const { status, body } = toTransport(err);
    return NextResponse.json(body, { status });
  }
}
