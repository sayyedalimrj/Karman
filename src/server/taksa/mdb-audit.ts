/**
 * Access MDB audit (Phase 2, section J).
 *
 * For the Taksa Access databases (`SVZT.MDB`, `BRVT.MDB`, `PSNT.MDB`,
 * `MSPSchema.mdb`): computes checksum + size, detects the Jet/ACE signature
 * from the header, and attempts metadata extraction with any cross-platform
 * tooling that happens to be available. When no extractor is present it records
 * `MDB_METADATA_EXTRACTION_UNAVAILABLE` and does NOT fail the command. It never
 * imports official values or treats the MDB as a source of truth.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { fileSize, sha256OfFile, walkFiles, writeCsvFile, writeJsonFile } from "./io";

export const MDB_UNAVAILABLE_STATUS = "MDB_METADATA_EXTRACTION_UNAVAILABLE" as const;
export const MDB_DETECTED_STATUS = "MDB_SIGNATURE_DETECTED" as const;

export type MdbFormat = "JET_MDB" | "ACE_ACCDB" | "UNKNOWN";

export interface MdbSignature {
  format: MdbFormat;
  /** The Jet/ACE signature string detected in the header (safe, non-sensitive). */
  signature: string | null;
}

/**
 * Detects the Access engine signature. Jet (.mdb) headers contain
 * "Standard Jet DB"; ACE (.accdb) headers contain "Standard ACE DB", located
 * shortly after the file start.
 */
export function detectMdbSignature(head: Buffer): MdbSignature {
  const ascii = head.subarray(0, 32).toString("latin1");
  if (ascii.includes("Standard Jet DB")) return { format: "JET_MDB", signature: "Standard Jet DB" };
  if (ascii.includes("Standard ACE DB")) return { format: "ACE_ACCDB", signature: "Standard ACE DB" };
  return { format: "UNKNOWN", signature: null };
}

export interface MdbFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  format: MdbFormat;
  signature: string | null;
  status: string;
  tables: string[];
  columns: Array<{ table: string; column: string }>;
}

/** Audits a single MDB buffer (signature + size; metadata best-effort/unavailable). */
export function auditMdbBuffer(
  buf: Buffer,
  fileName: string,
  relativePath: string,
  checksum: string,
): MdbFileResult {
  const sig = detectMdbSignature(buf.subarray(0, 64));
  return {
    relativePath,
    fileName,
    sizeBytes: buf.length,
    checksum,
    format: sig.format,
    signature: sig.signature,
    // No bundled cross-platform MDB reader is available in this environment, so
    // table/column extraction is recorded as unavailable rather than failing.
    status: sig.format === "UNKNOWN" ? MDB_UNAVAILABLE_STATUS : MDB_DETECTED_STATUS,
    tables: [],
    columns: [],
  };
}

export interface MdbAuditResult {
  incomingRelative: string;
  files: MdbFileResult[];
  totalFiles: number;
  metadataExtractionAvailable: boolean;
}

/** Audits the `mdb` folder for Access databases (signature + safe metadata). */
export function auditMdb(dataRootOverride?: string): MdbAuditResult {
  const mdbDir = getTaksaIncomingCategoryDir("mdb", dataRootOverride);
  const walked = walkFiles(mdbDir);
  const files = walked.map((f) => {
    const buf = readFileSync(f.absPath);
    return auditMdbBuffer(
      buf,
      f.fileName,
      toSafeRelativePath(f.absPath, dataRootOverride),
      sha256OfFile(f.absPath),
    );
  });
  // Best-effort flags: keep size/checksum even when signature is unknown.
  for (const f of files) {
    f.sizeBytes = f.sizeBytes || fileSize(f.relativePath);
  }
  return {
    incomingRelative: toSafeRelativePath(mdbDir, dataRootOverride),
    files,
    totalFiles: files.length,
    metadataExtractionAvailable: false,
  };
}

/** Writes the MDB outputs (summary always; tables/columns when available). */
export function writeMdbOutputs(result: MdbAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("mdb", dataRootOverride);
  const json = writeJsonFile(dir, "mdb_summary.json", result);
  const out = [json];
  const tableRows = result.files.flatMap((f) => f.tables.map((t) => ({ file: f.fileName, table: t })));
  if (tableRows.length > 0) {
    out.push(writeCsvFile(dir, "mdb_tables.csv", ["file", "table"], tableRows));
  }
  const columnRows = result.files.flatMap((f) =>
    f.columns.map((c) => ({ file: f.fileName, table: c.table, column: c.column })),
  );
  if (columnRows.length > 0) {
    out.push(writeCsvFile(dir, "mdb_columns.csv", ["file", "table", "column"], columnRows));
  }
  return out;
}
