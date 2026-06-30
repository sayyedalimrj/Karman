/**
 * SQL Server backup INSPECTOR (Phase 2, section E).
 *
 * Reads ONLY safe header/metadata from the Taksa `.DB` backups
 * (`Faragamara_Taksa.DB`, `Faragamara_Taksa_Str.DB`). It detects the Microsoft
 * Tape Format ("TAPE") header, classifies the file as a SQL_SERVER_BACKUP,
 * computes a checksum + size, and records a restore status. It NEVER parses the
 * full binary, NEVER restores, and NEVER attempts to discover/guess a password.
 *
 * Full restore is blocked by a SQL Server backup-password failure (Msg 3279);
 * Phase 2 deliberately proceeds from SQL/SCP, ScriptXML, MDB, Excel templates,
 * docs, and safe backup-string extraction instead.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import {
  fileSize,
  sha256OfFile,
  walkFiles,
  writeCsvFile,
  writeJsonFile,
  writeTextFile,
} from "./io";

export const RESTORE_BLOCKED_STATUS = "RESTORE_BLOCKED_PASSWORD_REQUIRED" as const;

export const RESTORE_BLOCKED_NOTE =
  "Full restore is blocked by SQL Server Msg 3279 password failure; continue " +
  "Phase 2 analysis from SQL/SCP, ScriptXML, MDB, Excel templates, docs, and " +
  "safe backup string extraction.";

export interface BackupHeaderInfo {
  /** True when the first bytes are the MTF "TAPE" marker. */
  hasTapeHeader: boolean;
  classification: "SQL_SERVER_BACKUP" | "UNKNOWN_BINARY";
  /** First 16 bytes rendered as printable ASCII (dots for non-printable). */
  headerAscii: string;
}

/** Pure header classification over the leading bytes of a backup file. */
export function classifyBackupHeader(head: Buffer): BackupHeaderInfo {
  const marker = head.subarray(0, 4).toString("latin1");
  const hasTapeHeader = marker === "TAPE";
  let headerAscii = "";
  for (let i = 0; i < Math.min(head.length, 16); i++) {
    const b = head[i]!;
    headerAscii += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".";
  }
  return {
    hasTapeHeader,
    classification: hasTapeHeader ? "SQL_SERVER_BACKUP" : "UNKNOWN_BINARY",
    headerAscii,
  };
}

/** Reads only the first `n` bytes of a file (default 16) — never the full binary. */
export function readHeadBytes(absPath: string, n = 16): Buffer {
  const fd = readFileSync(absPath);
  return fd.subarray(0, n);
}

export interface BackupInventoryEntry {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  hasTapeHeader: boolean;
  classification: string;
  headerAscii: string;
  restoreStatus: string;
}

export interface DbBackupInspectionResult {
  incomingRelative: string;
  entries: BackupInventoryEntry[];
  restoreStatus: string;
  restoreNote: string;
  totalFiles: number;
}

/** Inspects the `incoming/taksa/db` folder (headers + safe metadata only). */
export function inspectDbBackups(dataRootOverride?: string): DbBackupInspectionResult {
  const dbDir = getTaksaIncomingCategoryDir("db", dataRootOverride);
  const files = walkFiles(dbDir);
  const entries: BackupInventoryEntry[] = files.map((f) => {
    const head = readHeadBytes(f.absPath, 16);
    const info = classifyBackupHeader(head);
    return {
      relativePath: toSafeRelativePath(f.absPath, dataRootOverride),
      fileName: f.fileName,
      sizeBytes: fileSize(f.absPath),
      checksum: sha256OfFile(f.absPath),
      hasTapeHeader: info.hasTapeHeader,
      classification: info.classification,
      headerAscii: info.headerAscii,
      restoreStatus: RESTORE_BLOCKED_STATUS,
    };
  });
  return {
    incomingRelative: toSafeRelativePath(dbDir, dataRootOverride),
    entries,
    restoreStatus: RESTORE_BLOCKED_STATUS,
    restoreNote: RESTORE_BLOCKED_NOTE,
    totalFiles: entries.length,
  };
}

/** Writes db-audit outputs (JSON inventory, CSV inventory, restore-status MD). */
export function writeDbBackupOutputs(
  result: DbBackupInspectionResult,
  dataRootOverride?: string,
): string[] {
  const dir = getTaksaProcessedDir("db-audit", dataRootOverride);
  const json = writeJsonFile(dir, "db_backup_inventory.json", result);
  const csv = writeCsvFile(
    dir,
    "db_backup_inventory.csv",
    [
      "relativePath",
      "fileName",
      "sizeBytes",
      "checksum",
      "hasTapeHeader",
      "classification",
      "restoreStatus",
    ],
    result.entries,
  );
  const md = writeTextFile(
    dir,
    "db_restore_status.md",
    [
      "# Taksa DB backup — restore status",
      "",
      `Status: \`${result.restoreStatus}\``,
      "",
      result.restoreNote,
      "",
      `Backup files inspected: ${result.totalFiles}`,
      "",
      ...result.entries.map(
        (e) => `- ${e.relativePath} (${e.classification}, TAPE=${e.hasTapeHeader})`,
      ),
    ].join("\n"),
  );
  return [json, csv, md];
}
