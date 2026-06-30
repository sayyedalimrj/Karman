/**
 * Backup STRING audit — NO RESTORE (Phase 2, section I).
 *
 * Extracts ONLY safe candidate metadata from the two Taksa `.DB` backups
 * WITHOUT restoring them. It scans for printable ASCII runs and keeps only
 * whitelisted, table-name-like / domain-keyword candidates. It NEVER dumps the
 * full readable strings, writes giant raw files, brute-forces, or cracks the
 * backup. Sensitive patterns (passwords, connection strings, …) are REDACTED
 * and only counted, never stored.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { sha256OfFile, walkFiles, writeCsvFile, writeJsonFile } from "./io";

/** Whitelist patterns for table-name-like / domain candidates that may be kept. */
export const CANDIDATE_PATTERNS: readonly RegExp[] = [
  /^base_[A-Za-z0-9_]+$/,
  /^brv_[A-Za-z0-9_]+$/,
  /^svz_[A-Za-z0-9_]+$/,
  /^psn_[A-Za-z0-9_]+$/,
  /^shkh[A-Za-z0-9_]*$/,
  /^contract[A-Za-z0-9_]*$/,
  /^tadil[A-Za-z0-9_]*$/,
  /^rzmt[A-Za-z0-9_]*$/,
  /^fhbh[A-Za-z0-9_]*$/,
  /^unit[A-Za-z0-9_]*$/,
  /^sorc[A-Za-z0-9_]*$/,
  /^kosorat[A-Za-z0-9_]*$/,
  /^zarib[A-Za-z0-9_]*$/,
];

/** Domain keyword fragments counted (case-insensitive) across the backup. */
export const BACKUP_KEYWORDS = [
  "base_",
  "brv",
  "svz",
  "psn",
  "contract",
  "shkh",
  "tadil",
  "rzmt",
  "fhbh",
  "unit",
  "sorc",
  "kosorat",
  "zarib",
] as const;

/** Sensitive substrings — REDACTED and counted only, never stored verbatim. */
export const SENSITIVE_PATTERNS = [
  "password",
  "pwd",
  "user id",
  "uid",
  "connection string",
  "server=",
  "database=",
  "datasource",
  "data source",
] as const;

/** Cap on how many distinct candidates we keep per file (never a full dump). */
const MAX_CANDIDATES_PER_FILE = 500;

/** Extracts printable ASCII runs (>= minLen) from a buffer. */
export function extractAsciiRuns(buf: Buffer, minLen = 4): string[] {
  const runs: string[] = [];
  let cur = "";
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]!;
    if (b >= 0x20 && b < 0x7f) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length >= minLen) runs.push(cur);
      cur = "";
    }
  }
  if (cur.length >= minLen) runs.push(cur);
  return runs;
}

export interface BackupStringFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  /** Whitelisted table-name-like candidates (deduped, capped). */
  tableCandidates: string[];
  /** Domain keyword → hit count. */
  keywordHits: Record<string, number>;
  /** Sensitive pattern → REDACTED count (the strings themselves are discarded). */
  sensitiveHits: Record<string, number>;
}

/**
 * Pure audit of a single backup buffer. Returns whitelisted candidates +
 * keyword/sensitive counts. The sensitive matches are counted then DROPPED.
 */
export function auditBackupBuffer(
  buf: Buffer,
  fileName: string,
  relativePath: string,
  checksum: string,
): BackupStringFileResult {
  const runs = extractAsciiRuns(buf, 4);

  const candidateSet = new Set<string>();
  const keywordHits: Record<string, number> = {};
  for (const kw of BACKUP_KEYWORDS) keywordHits[kw] = 0;
  const sensitiveHits: Record<string, number> = {};
  for (const sp of SENSITIVE_PATTERNS) sensitiveHits[sp] = 0;

  for (const run of runs) {
    const lower = run.toLowerCase();

    // Count sensitive matches, then discard the run entirely (redaction).
    let isSensitive = false;
    for (const sp of SENSITIVE_PATTERNS) {
      if (lower.includes(sp)) {
        sensitiveHits[sp] = (sensitiveHits[sp] ?? 0) + 1;
        isSensitive = true;
      }
    }
    if (isSensitive) continue;

    for (const kw of BACKUP_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) keywordHits[kw] = (keywordHits[kw] ?? 0) + 1;
    }

    // Keep only whitelisted, table-name-like tokens within the run.
    for (const token of run.split(/[^A-Za-z0-9_]+/)) {
      if (token.length < 3 || candidateSet.size >= MAX_CANDIDATES_PER_FILE) continue;
      if (CANDIDATE_PATTERNS.some((re) => re.test(token))) candidateSet.add(token);
    }
  }

  return {
    relativePath,
    fileName,
    sizeBytes: buf.length,
    checksum,
    tableCandidates: Array.from(candidateSet).sort(),
    keywordHits,
    sensitiveHits,
  };
}

export interface BackupStringsAuditResult {
  incomingRelative: string;
  files: BackupStringFileResult[];
  totalFiles: number;
}

/** Audits the `db` folder backups for safe candidate strings (no restore). */
export function auditBackupStrings(dataRootOverride?: string): BackupStringsAuditResult {
  const dbDir = getTaksaIncomingCategoryDir("db", dataRootOverride);
  const walked = walkFiles(dbDir);
  const files = walked.map((f) => {
    const buf = readFileSync(f.absPath);
    return auditBackupBuffer(
      buf,
      f.fileName,
      toSafeRelativePath(f.absPath, dataRootOverride),
      sha256OfFile(f.absPath),
    );
  });
  return {
    incomingRelative: toSafeRelativePath(dbDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the four backup-strings outputs (candidates + counts; never a dump). */
export function writeBackupStringsOutputs(
  result: BackupStringsAuditResult,
  dataRootOverride?: string,
): string[] {
  const dir = getTaksaProcessedDir("backup-strings", dataRootOverride);
  // The JSON summary intentionally excludes raw strings — only counts + capped
  // whitelisted candidates.
  const json = writeJsonFile(dir, "backup_string_summary.json", result);

  const candidateRows = result.files.flatMap((f) =>
    f.tableCandidates.map((candidate) => ({ file: f.fileName, candidate })),
  );
  const candidates = writeCsvFile(
    dir,
    "backup_table_candidates.csv",
    ["file", "candidate"],
    candidateRows,
  );

  const keywordRows = result.files.flatMap((f) =>
    Object.entries(f.keywordHits).map(([keyword, count]) => ({ file: f.fileName, keyword, count })),
  );
  const keywords = writeCsvFile(dir, "backup_keyword_hits.csv", ["file", "keyword", "count"], keywordRows);

  const sensitiveRows = result.files.flatMap((f) =>
    Object.entries(f.sensitiveHits).map(([pattern, count]) => ({
      file: f.fileName,
      pattern,
      count,
      value: "[REDACTED]",
    })),
  );
  const sensitive = writeCsvFile(
    dir,
    "backup_sensitive_hits_summary.csv",
    ["file", "pattern", "count", "value"],
    sensitiveRows,
  );

  return [json, candidates, keywords, sensitive];
}
