/**
 * Taksa source DISCOVERY (Phase 2, section B).
 *
 * Scans `${KARMAN_DATA_ROOT}/incoming/taksa` across the known folder categories
 * and classifies every file by extension into a detected `sourceType` and
 * `sourceFamily`, computing a SAFE relative path, checksum, size, and analysis/
 * ingestion support flags. It NEVER opens files for value extraction and NEVER
 * emits an absolute path — only data-root-relative paths leave this module, so
 * the result is safe to persist and to surface in the UI.
 *
 * On an empty local checkout (no real Taksa files) discovery returns zero files
 * gracefully; the CLI prints production-path instructions instead of failing.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { extname } from "node:path";
import {
  TAKSA_INCOMING_CATEGORIES,
  getTaksaIncomingRoot,
  toSafeRelativePath,
  type TaksaIncomingCategory,
} from "./data-root";
import { fileModifiedAt, fileSize, sha256OfFile, walkFiles } from "./io";

/** Detected logical source type (drives which analyzer can read a file). */
export type TaksaSourceType =
  | "SQL_SERVER_BACKUP"
  | "TAKSA_SQL_SCRIPT"
  | "ACCESS_MDB"
  | "SVZT_FILE"
  | "BRVT_FILE"
  | "PSNT_FILE"
  | "DTS_IMPORTER"
  | "EXCEL_TEMPLATE"
  | "TABULAR_CSV"
  | "TAKSA_UI_CONFIG"
  | "TAKSA_XML_CONFIG"
  | "TAKSA_BEHAVIOR_TEXT"
  | "PDF_PROVENANCE_DOC"
  | "CRYSTAL_REPORT_TEMPLATE"
  | "HELP_DOCUMENTATION"
  | "UNSUPPORTED";

/** Coarse family grouping for reporting/UI. */
export type TaksaSourceFamily =
  | "DATABASE_BACKUP"
  | "SQL_SCRIPT"
  | "ACCESS_DATABASE"
  | "ROUNDTRIP_FILE"
  | "IMPORTER"
  | "SPREADSHEET"
  | "TABULAR"
  | "CONFIG"
  | "BEHAVIOR"
  | "DOCUMENT"
  | "REPORT"
  | "HELP"
  | "UNKNOWN";

export interface DiscoveredTaksaFile {
  /** SAFE relative path from the data root (never absolute). */
  relativePath: string;
  fileName: string;
  /** Lower-case extension WITHOUT the leading dot (e.g. "sql"). */
  extension: string;
  /** Folder category the file was found under (db, sql, …). */
  category: string;
  sourceType: TaksaSourceType;
  sourceFamily: TaksaSourceFamily;
  sizeBytes: number;
  checksum: string;
  modifiedAt: string | null;
  supportedForAnalysis: boolean;
  supportedForIngestion: boolean;
  /** Human-readable reason for the support decision. */
  reason: string;
}

export interface ExpectedCoreFile {
  category: TaksaIncomingCategory;
  fileName: string;
  note: string;
}

/**
 * The known core Taksa files Phase 2 expects on the server. Used to report what
 * is MISSING from a given data root (never to fabricate their contents).
 */
export const EXPECTED_CORE_FILES: readonly ExpectedCoreFile[] = [
  { category: "db", fileName: "Faragamara_Taksa.DB", note: "Primary Taksa data backup" },
  { category: "db", fileName: "Faragamara_Taksa_Str.DB", note: "Taksa structure/string backup" },
  { category: "sql", fileName: "ScriptXML.sql", note: "Critical OPENXML import mapping" },
  { category: "sql", fileName: "myscr.sql", note: "Schema/static SQL" },
  { category: "sql", fileName: "ScriptConst.sql", note: "Constants/static SQL" },
  { category: "mdb", fileName: "SVZT.MDB", note: "Estimate template (candidate)" },
  { category: "mdb", fileName: "BRVT.MDB", note: "Bill-of-quantities template (candidate)" },
  { category: "mdb", fileName: "PSNT.MDB", note: "Proposal template (candidate)" },
  { category: "mdb", fileName: "MSPSchema.mdb", note: "MS Project schema (candidate)" },
  { category: "docs", fileName: "gws.ini", note: "UI labels / DataPropertyName config" },
  { category: "docs", fileName: "TAKSA.xml", note: "UI/behavior config" },
] as const;

interface TypeRule {
  type: TaksaSourceType;
  family: TaksaSourceFamily;
  analysis: boolean;
  ingestion: boolean;
  reason: string;
}

const RULES: Record<string, TypeRule> = {
  db: { type: "SQL_SERVER_BACKUP", family: "DATABASE_BACKUP", analysis: true, ingestion: true, reason: "Header/metadata + safe string audit only (no restore)." },
  bak: { type: "SQL_SERVER_BACKUP", family: "DATABASE_BACKUP", analysis: true, ingestion: true, reason: "Header/metadata + safe string audit only (no restore)." },
  sql: { type: "TAKSA_SQL_SCRIPT", family: "SQL_SCRIPT", analysis: true, ingestion: true, reason: "Static text parsing only (no execution)." },
  scp: { type: "TAKSA_SQL_SCRIPT", family: "SQL_SCRIPT", analysis: true, ingestion: true, reason: "Static text parsing only (no execution)." },
  mdb: { type: "ACCESS_MDB", family: "ACCESS_DATABASE", analysis: true, ingestion: true, reason: "Signature + best-effort metadata (no value import)." },
  accdb: { type: "ACCESS_MDB", family: "ACCESS_DATABASE", analysis: true, ingestion: true, reason: "Signature + best-effort metadata (no value import)." },
  svzt: { type: "SVZT_FILE", family: "ROUNDTRIP_FILE", analysis: false, ingestion: true, reason: "Round-trip binary parsing deferred to a later phase." },
  brvt: { type: "BRVT_FILE", family: "ROUNDTRIP_FILE", analysis: false, ingestion: true, reason: "Round-trip binary parsing deferred to a later phase." },
  psnt: { type: "PSNT_FILE", family: "ROUNDTRIP_FILE", analysis: false, ingestion: true, reason: "Round-trip binary parsing deferred to a later phase." },
  dts: { type: "DTS_IMPORTER", family: "IMPORTER", analysis: true, ingestion: true, reason: "Safe text-name metadata only (no execution)." },
  xls: { type: "EXCEL_TEMPLATE", family: "SPREADSHEET", analysis: true, ingestion: true, reason: "Template metadata only (no numeric value import)." },
  xlsx: { type: "EXCEL_TEMPLATE", family: "SPREADSHEET", analysis: true, ingestion: true, reason: "Template metadata only (no numeric value import)." },
  csv: { type: "TABULAR_CSV", family: "TABULAR", analysis: true, ingestion: true, reason: "Header/shape metadata only." },
  ini: { type: "TAKSA_UI_CONFIG", family: "CONFIG", analysis: true, ingestion: true, reason: "UI label/config parsing." },
  xml: { type: "TAKSA_XML_CONFIG", family: "CONFIG", analysis: true, ingestion: true, reason: "Safe config metadata parsing." },
  txt: { type: "TAKSA_BEHAVIOR_TEXT", family: "BEHAVIOR", analysis: true, ingestion: true, reason: "Behavior-hint text parsing (not official rules)." },
  pdf: { type: "PDF_PROVENANCE_DOC", family: "DOCUMENT", analysis: true, ingestion: true, reason: "Metadata only (no OCR / no numeric extraction)." },
  rpt: { type: "CRYSTAL_REPORT_TEMPLATE", family: "REPORT", analysis: true, ingestion: true, reason: "Template metadata only (no report execution)." },
  chm: { type: "HELP_DOCUMENTATION", family: "HELP", analysis: false, ingestion: true, reason: "Help documentation; no analyzer in Phase 2." },
};

const UNSUPPORTED_RULE: TypeRule = {
  type: "UNSUPPORTED",
  family: "UNKNOWN",
  analysis: false,
  ingestion: false,
  reason: "Unrecognized extension; not supported for analysis or ingestion.",
};

/** Pure extension → classification rule (case-insensitive). */
export function classifyByExtension(extension: string): TypeRule {
  const ext = extension.replace(/^\./, "").toLowerCase();
  return RULES[ext] ?? UNSUPPORTED_RULE;
}

export interface DiscoveryResult {
  /** Effective Taksa incoming root, as a safe relative path from the data root. */
  incomingRelative: string;
  files: DiscoveredTaksaFile[];
  /** Count of files keyed by detected sourceType. */
  countsByType: Record<string, number>;
  /** Count of files keyed by folder category. */
  countsByCategory: Record<string, number>;
  /** Expected core files that were NOT found. */
  missingCoreFiles: ExpectedCoreFile[];
  totalFiles: number;
}

/**
 * Runs discovery against the effective (or overridden) data root. Pure with
 * respect to the database — it only reads file metadata + checksums and returns
 * safe, relative-path results.
 */
export function discoverTaksaSources(dataRootOverride?: string): DiscoveryResult {
  const incomingRoot = getTaksaIncomingRoot(dataRootOverride);
  const walked = walkFiles(incomingRoot);

  const files: DiscoveredTaksaFile[] = walked.map((w) => {
    const ext = extname(w.fileName).replace(/^\./, "").toLowerCase();
    const rule = classifyByExtension(ext);
    return {
      relativePath: toSafeRelativePath(w.absPath, dataRootOverride),
      fileName: w.fileName,
      extension: ext,
      category: w.parentFolder,
      sourceType: rule.type,
      sourceFamily: rule.family,
      sizeBytes: fileSize(w.absPath),
      checksum: sha256OfFile(w.absPath),
      modifiedAt: fileModifiedAt(w.absPath),
      supportedForAnalysis: rule.analysis,
      supportedForIngestion: rule.ingestion,
      reason: rule.reason,
    };
  });

  const countsByType: Record<string, number> = {};
  const countsByCategory: Record<string, number> = {};
  for (const c of TAKSA_INCOMING_CATEGORIES) countsByCategory[c] = 0;
  for (const f of files) {
    countsByType[f.sourceType] = (countsByType[f.sourceType] ?? 0) + 1;
    countsByCategory[f.category] = (countsByCategory[f.category] ?? 0) + 1;
  }

  const presentByCategory = new Map<string, Set<string>>();
  for (const f of files) {
    const set = presentByCategory.get(f.category) ?? new Set<string>();
    set.add(f.fileName.toLowerCase());
    presentByCategory.set(f.category, set);
  }
  const missingCoreFiles = EXPECTED_CORE_FILES.filter((core) => {
    const set = presentByCategory.get(core.category);
    return !set || !set.has(core.fileName.toLowerCase());
  });

  return {
    incomingRelative: toSafeRelativePath(incomingRoot, dataRootOverride),
    files,
    countsByType,
    countsByCategory,
    missingCoreFiles,
    totalFiles: files.length,
  };
}
