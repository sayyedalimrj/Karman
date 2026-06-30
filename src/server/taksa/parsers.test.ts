/**
 * Unit tests for the pure Taksa analyzer parse functions (DB-free, no files).
 *
 * Uses small SYNTHETIC, clearly-NON-official fixtures (dummy table/column names,
 * no real official numbers) to exercise the static parsers and metadata
 * detectors without any real Taksa data.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { describe, it, expect } from "vitest";
import { decodeTextBuffer } from "./io";
import { classifyByExtension } from "./source-discovery";
import { classifyBackupHeader } from "./db-backup-inspector";
import { parseScriptXml, KNOWN_NEWDATASET_PATHS } from "./scriptxml-parser";
import { parseStaticSql } from "./sql-static-parser";
import { auditBackupBuffer, extractAsciiRuns } from "./backup-strings-audit";
import { detectMdbSignature } from "./mdb-audit";
import { detectExcelFormat, classifyTemplatePurpose, extractXlsxMetadata, readZipEntries } from "./excel-audit";
import { parseGwsIni, parseTaksaXml, parseBehaviorHints } from "./docs-audit";
import { detectPdfPageCount, detectPdfTitle, classifyPdf } from "./pdf-audit";
import { extractReadableNames, classifyRpt } from "./dts-rpt-audit";

/**
 * Builds a minimal STORED-method (uncompressed) .xlsx zip in memory for tests —
 * a clearly SYNTHETIC workbook with the given sheet names and header rows. No
 * official values are used. Exercises the dependency-free xlsx reader.
 */
function buildStoredXlsx(sheets: string[], headerRows: string[][]): Buffer {
  const shared: string[] = [];
  const sharedIndex = (s: string): number => {
    const i = shared.indexOf(s);
    if (i >= 0) return i;
    shared.push(s);
    return shared.length - 1;
  };
  const files: Array<{ name: string; data: Buffer }> = [];
  const workbook =
    `<?xml version="1.0"?><workbook><sheets>` +
    sheets.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets></workbook>`;
  sheets.forEach((_, i) => {
    const headers = headerRows[i] ?? [];
    const cells = headers
      .map((h, c) => `<c r="${String.fromCharCode(65 + c)}1" t="s"><v>${sharedIndex(h)}</v></c>`)
      .join("");
    const sheetXml = `<?xml version="1.0"?><worksheet><sheetData><row r="1">${cells}</row></sheetData></worksheet>`;
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXml, "utf8") });
  });
  const sst = `<?xml version="1.0"?><sst>${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`;
  files.unshift({ name: "xl/sharedStrings.xml", data: Buffer.from(sst, "utf8") });
  files.unshift({ name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") });

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // method 0 (stored)
    local.writeUInt32LE(0, 14); // crc (ignored by reader)
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localEntry = Buffer.concat([local, nameBuf, f.data]);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10); // method 0
    central.writeUInt32LE(0, 16); // crc
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));

    locals.push(localEntry);
    offset += localEntry.length;
  }
  const localBlob = Buffer.concat(locals);
  const centralBlob = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBlob.length, 12);
  eocd.writeUInt32LE(localBlob.length, 16);
  return Buffer.concat([localBlob, centralBlob, eocd]);
}

describe("classifyByExtension — detects all folder types", () => {
  const cases: Array<[string, string]> = [
    ["db", "SQL_SERVER_BACKUP"],
    ["bak", "SQL_SERVER_BACKUP"],
    ["sql", "TAKSA_SQL_SCRIPT"],
    ["scp", "TAKSA_SQL_SCRIPT"],
    ["mdb", "ACCESS_MDB"],
    ["svzt", "SVZT_FILE"],
    ["brvt", "BRVT_FILE"],
    ["psnt", "PSNT_FILE"],
    ["dts", "DTS_IMPORTER"],
    ["xls", "EXCEL_TEMPLATE"],
    ["xlsx", "EXCEL_TEMPLATE"],
    ["csv", "TABULAR_CSV"],
    ["ini", "TAKSA_UI_CONFIG"],
    ["xml", "TAKSA_XML_CONFIG"],
    ["txt", "TAKSA_BEHAVIOR_TEXT"],
    ["pdf", "PDF_PROVENANCE_DOC"],
    ["rpt", "CRYSTAL_REPORT_TEMPLATE"],
    ["chm", "HELP_DOCUMENTATION"],
    ["bin", "UNSUPPORTED"],
  ];
  it.each(cases)("%s → %s", (ext, type) => {
    expect(classifyByExtension(ext).type).toBe(type);
  });
});

describe("classifyBackupHeader — TAPE detection", () => {
  it("classifies a TAPE header as SQL_SERVER_BACKUP", () => {
    const head = Buffer.concat([Buffer.from("TAPE"), Buffer.alloc(12)]);
    const info = classifyBackupHeader(head);
    expect(info.hasTapeHeader).toBe(true);
    expect(info.classification).toBe("SQL_SERVER_BACKUP");
  });
  it("classifies non-TAPE bytes as unknown binary", () => {
    expect(classifyBackupHeader(Buffer.from([1, 2, 3, 4])).classification).toBe("UNKNOWN_BINARY");
  });
});

describe("parseScriptXml — structure only, no execution", () => {
  const sql = `
    CREATE PROCEDURE dbo.ImportBaseUnit AS
    DECLARE @h int;
    EXEC sp_xml_preparedocument @h OUTPUT, @xml;
    INSERT INTO base_unit (code, name)
    SELECT code, name FROM OPENXML(@h, '/NewDataSet/base_unit', 2)
      WITH (code nvarchar(20), name nvarchar(100));
    INSERT INTO brv_fhbh (code) SELECT code FROM OPENXML(@h, '/NewDataSet/brv_fhbh', 2) WITH (code nvarchar(20));
  `;
  const s = parseScriptXml(sql);
  it("extracts procedure names", () => expect(s.procedureNames).toContain("ImportBaseUnit"));
  it("counts OPENXML", () => expect(s.openXmlCount).toBe(2));
  it("collects INSERT targets", () => expect(s.insertTargets).toEqual(expect.arrayContaining(["base_unit", "brv_fhbh"])));
  it("collects /NewDataSet paths", () =>
    expect(s.xmlPaths.map((p) => p.xmlPath)).toEqual(
      expect.arrayContaining(["/NewDataSet/base_unit", "/NewDataSet/brv_fhbh"]),
    ));
  it("flags known paths", () => {
    expect(s.knownPathsFound).toEqual(expect.arrayContaining(["base_unit", "brv_fhbh"]));
    expect(KNOWN_NEWDATASET_PATHS).toContain("base_unit");
  });
  it("maps insert targets to xml paths + columns", () => {
    const m = s.mappings.find((x) => x.targetTable === "base_unit");
    expect(m?.xmlPath).toBe("/NewDataSet/base_unit");
    expect(m?.columns).toEqual(["code", "name"]);
  });
});

describe("parseStaticSql — DDL + dangerous detection, no execution", () => {
  const sql = `
    CREATE TABLE base_unit (
      unit_id INT,
      code NVARCHAR(20),
      name NVARCHAR(100),
      PRIMARY KEY (unit_id)
    );
    ALTER TABLE brv_item ADD CONSTRAINT fk1 FOREIGN KEY (unit_id) REFERENCES base_unit(unit_id);
    CREATE VIEW v_units AS SELECT * FROM base_unit;
    CREATE PROCEDURE dbo.spDoThing AS DROP TABLE temp_x;
    DELETE FROM staging;
  `;
  const s = parseStaticSql(sql, "myscr.sql", "incoming/taksa/sql/myscr.sql");
  it("finds CREATE TABLE with columns", () => {
    const tbl = s.tables.find((t) => t.table === "base_unit");
    expect(tbl?.columns).toEqual(expect.arrayContaining(["unit_id", "code", "name"]));
  });
  it("finds ALTER/FK relationships", () => {
    expect(s.alterRelationships.some((r) => r.toTable === "base_unit")).toBe(true);
    expect(s.foreignKeyCandidates.some((f) => f.includes("base_unit"))).toBe(true);
  });
  it("finds PK candidates, views, procedures", () => {
    expect(s.primaryKeyCandidates).toContain("unit_id");
    expect(s.views).toContain("v_units");
    expect(s.procedures).toContain("spDoThing");
  });
  it("detects dangerous keywords (detection only)", () => {
    expect(s.dangerousHits.DROP).toBeGreaterThan(0);
    expect(s.dangerousHits.DELETE).toBeGreaterThan(0);
  });
  it("counts domain keyword hits", () => {
    expect(s.keywordHits.base_).toBeGreaterThan(0);
    expect(s.keywordHits.brv).toBeGreaterThan(0);
  });
});

describe("decodeTextBuffer — UTF-16 and UTF-8", () => {
  it("decodes UTF-16LE with BOM", () => {
    const buf = Buffer.from("\uFEFFCREATE TABLE t", "utf16le");
    const d = decodeTextBuffer(buf);
    expect(d.encoding).toBe("utf-16le");
    expect(d.text).toContain("CREATE TABLE t");
  });
  it("decodes UTF-8", () => {
    const d = decodeTextBuffer(Buffer.from("CREATE TABLE t", "utf8"));
    expect(d.encoding).toBe("utf-8");
    expect(d.text).toContain("CREATE TABLE t");
  });
});

describe("backup strings audit — whitelist only, redaction, no full dump", () => {
  it("keeps only whitelisted candidates and redacts sensitive matches", () => {
    const parts = [
      "base_unit\x00brv_contract\x00random_secret_table\x00",
      "Password=Secret123\x00Data Source=server;\x00",
      "shkh_index\x00",
    ].join("");
    const buf = Buffer.from(parts, "latin1");
    const r = auditBackupBuffer(buf, "x.DB", "incoming/taksa/db/x.DB", "deadbeef");
    expect(r.tableCandidates).toEqual(expect.arrayContaining(["base_unit", "brv_contract", "shkh_index"]));
    expect(r.tableCandidates).not.toContain("random_secret_table");
    // Sensitive matches are counted but never stored verbatim.
    expect(r.sensitiveHits.password).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toContain("Secret123");
  });
  it("extractAsciiRuns respects a minimum length", () => {
    const buf = Buffer.from("ab\x00abcd\x00x", "latin1");
    expect(extractAsciiRuns(buf, 4)).toEqual(["abcd"]);
  });
});

describe("detectMdbSignature — Jet/ACE/unknown", () => {
  it("detects Jet", () => {
    const head = Buffer.concat([Buffer.alloc(4), Buffer.from("Standard Jet DB")]);
    expect(detectMdbSignature(head).format).toBe("JET_MDB");
  });
  it("detects ACE", () => {
    const head = Buffer.concat([Buffer.alloc(4), Buffer.from("Standard ACE DB")]);
    expect(detectMdbSignature(head).format).toBe("ACE_ACCDB");
  });
  it("returns UNKNOWN otherwise", () => {
    expect(detectMdbSignature(Buffer.alloc(32)).format).toBe("UNKNOWN");
  });
});

describe("excel audit — format/classification + xlsx metadata (no numeric import)", () => {
  it("detects format and classifies templates by name", () => {
    expect(detectExcelFormat(Buffer.from([0x50, 0x4b, 3, 4]))).toBe("XLSX_ZIP");
    expect(detectExcelFormat(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]))).toBe("XLS_OLE");
    expect(classifyTemplatePurpose("Fosool.xls")).toBe("chapters/template");
    expect(classifyTemplatePurpose("resource_price.xlsx")).toBe("resource-price/template");
  });
  it("reads sheet names + headers from a synthetic stored-zip xlsx", () => {
    const xlsx = buildStoredXlsx(["Sheet1"], [["code", "name", "unit"]]);
    const entries = readZipEntries(xlsx);
    expect(entries.find((e) => e.name === "xl/workbook.xml")).toBeDefined();
    const meta = extractXlsxMetadata(xlsx);
    expect(meta.sheets).toEqual(["Sheet1"]);
    expect(meta.sheetMeta[0]?.headers).toEqual(["code", "name", "unit"]);
  });
});

describe("docs audit — ini labels, xml structure, behavior hints", () => {
  it("parses gws.ini labels + DataPropertyName-like keys", () => {
    const ini = "[Form1]\nLabel1=نام ردیف\nDataPropertyName=ItemCode\nWidth=120\n";
    const r = parseGwsIni(ini);
    expect(r.labels.some((l) => l.label === "نام ردیف")).toBe(true);
    expect(r.dataPropertyNames.some((d) => d.value === "ItemCode")).toBe(true);
  });
  it("summarizes TAKSA.xml structure (tag/attr names only)", () => {
    const xml = '<?xml version="1.0"?><Taksa><Form name="f1"><Grid col="c"/></Form></Taksa>';
    const s = parseTaksaXml(xml);
    expect(s.rootElement).toBe("Taksa");
    expect(s.attributeNames).toEqual(expect.arrayContaining(["name", "col"]));
  });
  it("extracts behavior hints and flags known terms (hints, not official rules)", () => {
    const hints = parseBehaviorHints("ریزمتره قابل ویرایش است\nصورت‌وضعیت قفل می‌شود", "tx_tips.txt");
    expect(hints).toHaveLength(2);
    expect(hints[0]?.matchedTerms).toContain("ریزمتره");
  });
});

describe("pdf audit — metadata only, no OCR", () => {
  it("detects page count and title from PDF structure", () => {
    const pdf = Buffer.from("%PDF-1.4\n/Type /Page\n/Type /Page\n/Title (Test Doc)\n", "latin1");
    expect(detectPdfPageCount(pdf)).toBe(2);
    expect(detectPdfTitle(pdf)).toBe("Test Doc");
  });
  it("classifies by filename keywords", () => {
    expect(classifyPdf("بخشنامه تعدیل.pdf")).toContain("adjustment");
  });
});

describe("dts/rpt audit — metadata only, no execution", () => {
  it("extracts readable names from a binary buffer", () => {
    const buf = Buffer.from("\x00\x01ImportTask\x00\x02Step_One\x00", "latin1");
    expect(extractReadableNames(buf)).toEqual(expect.arrayContaining(["ImportTask", "Step_One"]));
  });
  it("classifies RPT templates by prefix", () => {
    expect(classifyRpt("svz_estimate.rpt")).toBe("estimate-report");
    expect(classifyRpt("brv_boq.rpt")).toBe("boq-report");
  });
});
