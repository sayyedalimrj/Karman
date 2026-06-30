/**
 * Unit tests for discovery + the unified analyzer file-output runner (DB-free).
 *
 * Builds a SYNTHETIC temporary data root (clearly non-official dummy files) and
 * verifies: all folder types are detected, checksums are computed, the missing-
 * core-files report works, an empty root is safe, no absolute path leaks, and
 * the unified runner writes its JSON/CSV/MD outputs.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverTaksaSources } from "./source-discovery";
import { isSafeRelativePath } from "./data-root";
import { runAllAnalyzers } from "./analyze";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "karman-taksa-"));
  const base = join(root, "incoming", "taksa");
  const write = (cat: string, name: string, content: string | Buffer) => {
    const dir = join(base, cat);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), content);
  };
  // Synthetic, clearly non-official fixtures.
  write("db", "Faragamara_Taksa.DB", Buffer.concat([Buffer.from("TAPE"), Buffer.from("base_unit\x00brv_item\x00Password=x\x00")]));
  write("sql", "ScriptXML.sql", "CREATE PROC dbo.Imp AS INSERT INTO base_unit SELECT * FROM OPENXML(@h,'/NewDataSet/base_unit',2) WITH (code int);");
  write("sql", "myscr.sql", "CREATE TABLE base_unit (id INT, code NVARCHAR(20));");
  write("mdb", "SVZT.MDB", Buffer.concat([Buffer.alloc(4), Buffer.from("Standard Jet DB")]));
  write("excel", "Fosool.xls", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]));
  write("docs", "gws.ini", "[F]\nLabel=نام\nDataPropertyName=Code\n");
  write("pdf", "تعدیل.pdf", "%PDF-1.4\n/Type /Page\n");
  write("dts", "import.dts", Buffer.from("\x00TaskName\x00"));
  write("rpt", "svz_report.rpt", Buffer.from("\x00report\x00"));
  write("svzt", "a.svzt", Buffer.from([1, 2, 3]));
  write("unknown", "mystery.bin", Buffer.from([9, 9, 9]));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("discoverTaksaSources", () => {
  it("detects files across folder types with checksums and safe relative paths", () => {
    const d = discoverTaksaSources(root);
    expect(d.totalFiles).toBeGreaterThanOrEqual(11);
    for (const f of d.files) {
      expect(f.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(isSafeRelativePath(f.relativePath)).toBe(true);
      expect(f.relativePath.startsWith("/")).toBe(false);
    }
    expect(d.countsByType.SQL_SERVER_BACKUP).toBe(1);
    expect(d.countsByType.TAKSA_SQL_SCRIPT).toBe(2);
    expect(d.countsByType.UNSUPPORTED).toBe(1);
  });

  it("reports missing expected core files", () => {
    const d = discoverTaksaSources(root);
    const missing = d.missingCoreFiles.map((m) => m.fileName);
    // We created Faragamara_Taksa.DB but not _Str.DB or ScriptConst.sql.
    expect(missing).toContain("Faragamara_Taksa_Str.DB");
    expect(missing).toContain("ScriptConst.sql");
  });

  it("is safe on an empty/nonexistent root", () => {
    const empty = mkdtempSync(join(tmpdir(), "karman-empty-"));
    const d = discoverTaksaSources(empty);
    expect(d.totalFiles).toBe(0);
    expect(d.files).toEqual([]);
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("runAllAnalyzers — writes JSON/CSV/MD outputs", () => {
  it("produces output files and a coherent summary without touching the DB", () => {
    const { summary, outputs } = runAllAnalyzers(root);
    expect(outputs.length).toBeGreaterThan(10);
    for (const out of outputs) expect(existsSync(out)).toBe(true);
    // Spot-check a couple of known outputs.
    expect(existsSync(join(root, "processed", "taksa", "db-audit", "db_restore_status.md"))).toBe(true);
    expect(existsSync(join(root, "processed", "taksa", "scriptxml", "scriptxml_summary.json"))).toBe(true);
    expect(summary.dbBackup.restoreStatus).toBe("RESTORE_BLOCKED_PASSWORD_REQUIRED");
    expect(summary.scriptXml.found).toBe(true);
    expect(summary.sqlStatic.tables).toBeGreaterThanOrEqual(1);
  });
});
