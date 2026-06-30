/**
 * Unit tests for the Phase 2 staging read loaders (DB-free, mocked Prisma).
 *
 * Confirms the UI loaders read persisted PostgreSQL metadata (never scanning raw
 * files) and that empty tables yield genuinely empty results.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const discoveredFindMany = vi.fn();
const runFindMany = vi.fn();
const scriptXmlFindMany = vi.fn();
const entityFindMany = vi.fn();
const labelFindMany = vi.fn();
const hintFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    taksaDiscoveredFile: { findMany: () => discoveredFindMany() },
    taksaAnalysisRun: { findMany: () => runFindMany() },
    taksaScriptXmlMapping: { findMany: () => scriptXmlFindMany() },
    taksaDetectedEntity: { findMany: () => entityFindMany() },
    taksaUiLabel: { findMany: () => labelFindMany() },
    taksaBehaviorHint: { findMany: () => hintFindMany() },
  },
}));

import {
  loadDiscoveredSources,
  loadAnalysisRuns,
  loadScriptXmlMappings,
  loadDetectedEntities,
  loadDocsAnalysis,
} from "./queries";

beforeEach(() => {
  for (const fn of [discoveredFindMany, runFindMany, scriptXmlFindMany, entityFindMany, labelFindMany, hintFindMany]) {
    fn.mockReset().mockResolvedValue([]);
  }
});

describe("empty database yields empty results", () => {
  it("discovered sources", async () => {
    const d = await loadDiscoveredSources();
    expect(d.isEmpty).toBe(true);
    expect(d.total).toBe(0);
  });
  it("analysis runs", async () => {
    expect((await loadAnalysisRuns()).isEmpty).toBe(true);
  });
  it("scriptxml mappings", async () => {
    expect((await loadScriptXmlMappings()).isEmpty).toBe(true);
  });
  it("detected entities", async () => {
    expect((await loadDetectedEntities("SQL_TABLE")).isEmpty).toBe(true);
  });
  it("docs analysis", async () => {
    expect((await loadDocsAnalysis()).isEmpty).toBe(true);
  });
});

describe("loaders map persisted rows + compute counts", () => {
  it("counts discovered files by type", async () => {
    discoveredFindMany.mockResolvedValue([
      { id: "1", relativePath: "incoming/taksa/db/a.DB", fileName: "a.DB", extension: "db", sourceType: "SQL_SERVER_BACKUP", sourceFamily: "DATABASE_BACKUP", category: "db", sizeBytes: 1, supportedForAnalysis: true, supportedForIngestion: true, status: "REGISTERED", createdAt: new Date() },
      { id: "2", relativePath: "incoming/taksa/sql/b.sql", fileName: "b.sql", extension: "sql", sourceType: "TAKSA_SQL_SCRIPT", sourceFamily: "SQL_SCRIPT", category: "sql", sizeBytes: 2, supportedForAnalysis: true, supportedForIngestion: true, status: "REGISTERED", createdAt: new Date() },
    ]);
    const d = await loadDiscoveredSources();
    expect(d.isEmpty).toBe(false);
    expect(d.countsByType.SQL_SERVER_BACKUP).toBe(1);
    expect(d.countsByType.TAKSA_SQL_SCRIPT).toBe(1);
  });

  it("maps docs labels + hints", async () => {
    labelFindMany.mockResolvedValue([{ id: "l1", sourceFile: "gws.ini", label: "نام", formName: "F" }]);
    hintFindMany.mockResolvedValue([{ id: "h1", sourceFile: "tx_tips.txt", topic: "general", text: "ریزمتره" }]);
    const d = await loadDocsAnalysis();
    expect(d.isEmpty).toBe(false);
    expect(d.labels[0]!.label).toBe("نام");
    expect(d.hints[0]!.topic).toBe("general");
  });
});
