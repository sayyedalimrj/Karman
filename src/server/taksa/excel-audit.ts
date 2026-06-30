/**
 * Excel TEMPLATE audit (Phase 2, section K).
 *
 * For Taksa Excel templates (`Fosool.xls`, `Mali.xls`, `Rizmertreh.xls`,
 * `kholaseh_metreh.xls`, `rzmt_act.xls`, `resource_price.xlsx`): detects the
 * workbook format, lists sheet names + header rows WHEN detectable (modern
 * `.xlsx` only, via a tiny dependency-free OOXML/zip reader), counts used rows,
 * and classifies the template purpose by file name.
 *
 * Excel files are TEMPLATES, not master data: NO numeric values are imported
 * and NO Reference* rows are created. Legacy `.xls` (OLE) metadata is recorded
 * as unavailable rather than failing.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { sha256OfFile, walkFiles, writeCsvFile, writeJsonFile } from "./io";

export const EXCEL_UNAVAILABLE_STATUS = "EXCEL_METADATA_EXTRACTION_UNAVAILABLE" as const;
export const EXCEL_PARSED_STATUS = "EXCEL_METADATA_PARSED" as const;

export type ExcelFormat = "XLSX_ZIP" | "XLS_OLE" | "UNKNOWN";

/** Detects the workbook container format from the leading bytes. */
export function detectExcelFormat(head: Buffer): ExcelFormat {
  if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b) return "XLSX_ZIP"; // PK..
  if (
    head.length >= 8 &&
    head[0] === 0xd0 &&
    head[1] === 0xcf &&
    head[2] === 0x11 &&
    head[3] === 0xe0
  ) {
    return "XLS_OLE"; // OLE compound file (legacy .xls)
  }
  return "UNKNOWN";
}

/** Classifies a template's purpose from its file name (deterministic, safe). */
export function classifyTemplatePurpose(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.includes("fosool") || n.includes("fasl")) return "chapters/template";
  if (n.includes("mali")) return "financial-sheet/template";
  if (n.includes("rzmt_act") || n.includes("act")) return "activity-rizmetreh/template";
  if (n.includes("rizmertreh") || n.includes("rizmetreh") || n.includes("rzmt")) return "rizmetreh/template";
  if (n.includes("kholaseh") || n.includes("metreh")) return "measurement-summary/template";
  if (n.includes("resource_price") || n.includes("price") || n.includes("resource")) return "resource-price/template";
  return "unknown/template";
}

// ---------------------------------------------------------------------------
// Minimal, dependency-free ZIP reader (central-directory based) for .xlsx.
// Supports STORED (0) and DEFLATE (8) entries — enough for OOXML workbooks.
// ---------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  data: Buffer;
}

/** Reads all entries from a ZIP buffer via its End-Of-Central-Directory record. */
export function readZipEntries(buf: Buffer): ZipEntry[] {
  const EOCD_SIG = 0x06054b50;
  // Scan backwards for the EOCD signature (allows a trailing comment).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];
  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");

    // Jump to the local header to find the actual data offset.
    if (buf.readUInt32LE(localOffset) === 0x04034b50) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(dataStart, dataStart + compSize);
      let data: Buffer;
      try {
        data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
      } catch {
        data = Buffer.alloc(0);
      }
      entries.push({ name, data });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export interface ExcelSheetMeta {
  sheet: string;
  headers: string[];
  usedRows: number;
}

export interface ExcelWorkbookMeta {
  sheets: string[];
  sheetMeta: ExcelSheetMeta[];
}

/**
 * Extracts safe workbook metadata from an `.xlsx` buffer: sheet names (from
 * `xl/workbook.xml`) and, best-effort, the first row of each sheet as a header
 * list with a used-row count. NO numeric cell values are interpreted as data.
 */
export function extractXlsxMetadata(buf: Buffer): ExcelWorkbookMeta {
  const entries = readZipEntries(buf);
  const byName = new Map(entries.map((e) => [e.name, e.data]));

  const workbookXml = byName.get("xl/workbook.xml")?.toString("utf8") ?? "";
  const sheets = Array.from(workbookXml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)).map(
    (m) => m[1]!,
  );

  // Shared strings (header text is usually stored here, referenced by index).
  const sharedXml = byName.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = Array.from(sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((m) =>
    Array.from(m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
      .map((t) => t[1]!)
      .join(""),
  );

  const sheetMeta: ExcelSheetMeta[] = sheets.map((sheet, i) => {
    const sheetXml = byName.get(`xl/worksheets/sheet${i + 1}.xml`)?.toString("utf8") ?? "";
    const rowCount = (sheetXml.match(/<row\b/g) ?? []).length;
    const headers = extractFirstRowHeaders(sheetXml, shared);
    return { sheet, headers, usedRows: rowCount };
  });

  return { sheets, sheetMeta };
}

/** Reads the first `<row>`'s cell text values as header labels (text only). */
function extractFirstRowHeaders(sheetXml: string, shared: string[]): string[] {
  const firstRow = /<row\b[^>]*>([\s\S]*?)<\/row>/.exec(sheetXml);
  if (!firstRow) return [];
  const cells = Array.from(firstRow[1]!.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g));
  const headers: string[] = [];
  for (const c of cells) {
    const attrs = c[1]!;
    const body = c[2]!;
    const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
    if (!valueMatch) continue;
    const value = valueMatch[1]!;
    if (/\bt="s"/.test(attrs)) {
      const idx = Number(value);
      headers.push(shared[idx] ?? "");
    } else if (/\bt="str"/.test(attrs) || /\bt="inlineStr"/.test(attrs)) {
      headers.push(value);
    } else {
      // Numeric/other header cell — keep the label position but not as data.
      headers.push(value);
    }
  }
  return headers;
}

export interface ExcelFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  format: ExcelFormat;
  templatePurpose: string;
  status: string;
  sheets: string[];
  sheetMeta: ExcelSheetMeta[];
}

/** Audits a single workbook buffer (metadata only — never numeric values). */
export function auditExcelBuffer(
  buf: Buffer,
  fileName: string,
  relativePath: string,
  checksum: string,
): ExcelFileResult {
  const format = detectExcelFormat(buf.subarray(0, 8));
  let sheets: string[] = [];
  let sheetMeta: ExcelSheetMeta[] = [];
  let status: string = EXCEL_UNAVAILABLE_STATUS;
  if (format === "XLSX_ZIP") {
    const meta = extractXlsxMetadata(buf);
    sheets = meta.sheets;
    sheetMeta = meta.sheetMeta;
    status = EXCEL_PARSED_STATUS;
  }
  return {
    relativePath,
    fileName,
    sizeBytes: buf.length,
    checksum,
    format,
    templatePurpose: classifyTemplatePurpose(fileName),
    status,
    sheets,
    sheetMeta,
  };
}

export interface ExcelAuditResult {
  incomingRelative: string;
  files: ExcelFileResult[];
  totalFiles: number;
}

/** Audits the `excel` folder for workbook templates. */
export function auditExcel(dataRootOverride?: string): ExcelAuditResult {
  const excelDir = getTaksaIncomingCategoryDir("excel", dataRootOverride);
  const walked = walkFiles(excelDir);
  const files = walked.map((f) => {
    const buf = readFileSync(f.absPath);
    return auditExcelBuffer(
      buf,
      f.fileName,
      toSafeRelativePath(f.absPath, dataRootOverride),
      sha256OfFile(f.absPath),
    );
  });
  return {
    incomingRelative: toSafeRelativePath(excelDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the Excel template outputs. */
export function writeExcelOutputs(result: ExcelAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("excel", dataRootOverride);
  const json = writeJsonFile(dir, "excel_template_summary.json", result);

  const sheetRows = result.files.flatMap((f) =>
    f.sheetMeta.length > 0
      ? f.sheetMeta.map((s) => ({
          file: f.fileName,
          sheet: s.sheet,
          usedRows: s.usedRows,
          purpose: f.templatePurpose,
        }))
      : f.sheets.map((s) => ({ file: f.fileName, sheet: s, usedRows: 0, purpose: f.templatePurpose })),
  );
  const sheets = writeCsvFile(dir, "excel_sheets.csv", ["file", "sheet", "usedRows", "purpose"], sheetRows);

  const headerRows = result.files.flatMap((f) =>
    f.sheetMeta.flatMap((s) =>
      s.headers.map((header, i) => ({ file: f.fileName, sheet: s.sheet, position: i, header })),
    ),
  );
  const headers = writeCsvFile(
    dir,
    "excel_headers.csv",
    ["file", "sheet", "position", "header"],
    headerRows,
  );

  return [json, sheets, headers];
}
