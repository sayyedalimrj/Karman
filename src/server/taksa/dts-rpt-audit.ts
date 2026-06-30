/**
 * DTS / RPT metadata audit (Phase 2, section N).
 *
 * DTS (legacy SQL Server import packages): registers files and extracts safe
 * readable text names when present — NEVER executes or imports.
 * RPT (Crystal Reports templates): lists templates and classifies them by name
 * prefix / folder — NEVER runs Crystal or generates a report.
 *
 * Both are metadata-only audits; no values are extracted and nothing is run.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { fileSize, sha256OfFile, walkFiles, writeCsvFile, writeJsonFile } from "./io";

/** Extracts readable ASCII identifier-like tokens from a binary buffer (safe). */
export function extractReadableNames(buf: Buffer, minLen = 4, max = 200): string[] {
  const names = new Set<string>();
  let cur = "";
  for (let i = 0; i < buf.length && names.size < max; i++) {
    const b = buf[i]!;
    if ((b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || (b >= 0x30 && b <= 0x39) || b === 0x5f) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length >= minLen && /[A-Za-z]/.test(cur)) names.add(cur);
      cur = "";
    }
  }
  if (cur.length >= minLen && /[A-Za-z]/.test(cur)) names.add(cur);
  return Array.from(names).sort();
}

export interface DtsFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  readableNames: string[];
}

export interface DtsAuditResult {
  incomingRelative: string;
  files: DtsFileResult[];
  totalFiles: number;
}

/** Audits the `dts` folder (safe readable names; no execution). */
export function auditDts(dataRootOverride?: string): DtsAuditResult {
  const dtsDir = getTaksaIncomingCategoryDir("dts", dataRootOverride);
  const walked = walkFiles(dtsDir);
  const files = walked.map((f) => {
    const buf = readFileSync(f.absPath);
    return {
      relativePath: toSafeRelativePath(f.absPath, dataRootOverride),
      fileName: f.fileName,
      sizeBytes: fileSize(f.absPath),
      checksum: sha256OfFile(f.absPath),
      readableNames: extractReadableNames(buf).slice(0, 100),
    };
  });
  return {
    incomingRelative: toSafeRelativePath(dtsDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the DTS outputs. */
export function writeDtsOutputs(result: DtsAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("dts", dataRootOverride);
  const json = writeJsonFile(dir, "dts_summary.json", result);
  const inventory = writeCsvFile(
    dir,
    "dts_inventory.csv",
    ["relativePath", "fileName", "sizeBytes", "checksum", "readableNameCount"],
    result.files.map((f) => ({ ...f, readableNameCount: f.readableNames.length })),
  );
  return [json, inventory];
}

/** Classifies an RPT template by its name prefix. */
export function classifyRpt(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.startsWith("svz")) return "estimate-report";
  if (n.startsWith("brv")) return "boq-report";
  if (n.startsWith("psn")) return "proposal-report";
  if (n.includes("tadil")) return "adjustment-report";
  if (n.includes("mali")) return "financial-report";
  return "report-template";
}

export interface RptFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  classification: string;
  folder: string;
}

export interface RptAuditResult {
  incomingRelative: string;
  files: RptFileResult[];
  totalFiles: number;
}

/** Audits the `rpt` folder (template metadata + classification; no execution). */
export function auditRpt(dataRootOverride?: string): RptAuditResult {
  const rptDir = getTaksaIncomingCategoryDir("rpt", dataRootOverride);
  const walked = walkFiles(rptDir);
  const files = walked.map((f) => ({
    relativePath: toSafeRelativePath(f.absPath, dataRootOverride),
    fileName: f.fileName,
    sizeBytes: fileSize(f.absPath),
    checksum: sha256OfFile(f.absPath),
    classification: classifyRpt(f.fileName),
    folder: f.parentFolder,
  }));
  return {
    incomingRelative: toSafeRelativePath(rptDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the RPT outputs. */
export function writeRptOutputs(result: RptAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("rpt", dataRootOverride);
  const json = writeJsonFile(dir, "rpt_summary.json", result);
  const inventory = writeCsvFile(
    dir,
    "rpt_inventory.csv",
    ["relativePath", "fileName", "sizeBytes", "checksum", "classification", "folder"],
    result.files,
  );
  return [json, inventory];
}
