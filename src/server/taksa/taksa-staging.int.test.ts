/**
 * Integration tests for the Taksa staging/analysis persistence (DB-backed).
 *
 * Gated by RUN_DB_TESTS=1. Verifies that discovered files, analysis runs, and
 * their children (detected entities, ScriptXML mappings, UI labels, behavior
 * hints) persist to PostgreSQL with an append-only AuditLog row, and that
 * discovered-file registration is idempotent by (checksum, relativePath).
 *
 * **Validates: Phase 2 — server-aware Taksa ingestion + analysis infrastructure**
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { prisma } from "@/server/db";
import { persistDiscoveredFiles } from "./register-discovered-sources";
import { persistAnalysisRun } from "./analyze";
import type { DiscoveredTaksaFile } from "./source-discovery";

let actorId: string;

async function cleanup(): Promise<void> {
  await prisma.taksaDetectedEntity.deleteMany({});
  await prisma.taksaScriptXmlMapping.deleteMany({});
  await prisma.taksaUiLabel.deleteMany({});
  await prisma.taksaBehaviorHint.deleteMany({});
  await prisma.taksaAnalysisRun.deleteMany({});
  await prisma.taksaDiscoveredFile.deleteMany({});
  await prisma.auditLog.deleteMany({ where: { entityType: { in: ["TaksaDiscoveredFile", "TaksaAnalysisRun"] } } });
  await prisma.user.deleteMany({ where: { email: "taksa-staging@karman.test" } });
}

beforeAll(async () => {
  await cleanup();
  const user = await prisma.user.create({
    data: {
      email: "taksa-staging@karman.test",
      passwordHash: "x",
      fullName: "Staging Admin",
      systemRole: "SYSTEM_ADMIN",
    },
    select: { id: true },
  });
  actorId = user.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const file: DiscoveredTaksaFile = {
  relativePath: "incoming/taksa/db/Faragamara_Taksa.DB",
  fileName: "Faragamara_Taksa.DB",
  extension: "db",
  category: "db",
  sourceType: "SQL_SERVER_BACKUP",
  sourceFamily: "DATABASE_BACKUP",
  sizeBytes: 1234,
  checksum: "abc123",
  modifiedAt: null,
  supportedForAnalysis: true,
  supportedForIngestion: true,
  reason: "ok",
};

describe("persistDiscoveredFiles", () => {
  it("persists safe metadata + audit, and is idempotent", async () => {
    const first = await prisma.$transaction((tx) => persistDiscoveredFiles([file], actorId, tx));
    expect(first).toEqual({ created: 1, existing: 0 });

    const second = await prisma.$transaction((tx) => persistDiscoveredFiles([file], actorId, tx));
    expect(second).toEqual({ created: 0, existing: 1 });

    const rows = await prisma.taksaDiscoveredFile.findMany({ where: { checksum: "abc123" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sourceType).toBe("SQL_SERVER_BACKUP");

    const audits = await prisma.auditLog.findMany({ where: { entityType: "TaksaDiscoveredFile" } });
    expect(audits.length).toBe(1);
  });
});

describe("persistAnalysisRun", () => {
  it("persists a run with detected entities, scriptxml mappings, labels and hints", async () => {
    const runId = await prisma.$transaction((tx) =>
      persistAnalysisRun(
        {
          analyzerType: "UNIFIED",
          status: "COMPLETED",
          totalFiles: 3,
          successCount: 2,
          warningCount: 1,
          errorCount: 0,
          outputDir: "processed/taksa",
          summaryJson: { ok: true },
          detectedEntities: [
            { entityType: "SQL_TABLE", sourceType: "TAKSA_SQL_SCRIPT", sourceFile: "incoming/taksa/sql/myscr.sql", name: "base_unit" },
          ],
          scriptXmlMappings: [
            { procedureName: "Imp", xmlPath: "/NewDataSet/base_unit", targetTable: "base_unit", columns: ["code"] },
          ],
          uiLabels: [{ sourceFile: "gws.ini", label: "نام", formName: "F1" }],
          behaviorHints: [{ sourceFile: "tx_tips.txt", topic: "general", text: "ریزمتره" }],
        },
        actorId,
        tx,
      ),
    );

    const run = await prisma.taksaAnalysisRun.findUniqueOrThrow({ where: { id: runId } });
    expect(run.analyzerType).toBe("UNIFIED");
    expect(await prisma.taksaDetectedEntity.count({ where: { runId } })).toBe(1);
    expect(await prisma.taksaScriptXmlMapping.count({ where: { runId } })).toBe(1);
    expect(await prisma.taksaUiLabel.count({ where: { runId } })).toBe(1);
    expect(await prisma.taksaBehaviorHint.count({ where: { runId } })).toBe(1);
    const audit = await prisma.auditLog.findFirst({ where: { entityType: "TaksaAnalysisRun", entityId: runId } });
    expect(audit).not.toBeNull();
  });
});
