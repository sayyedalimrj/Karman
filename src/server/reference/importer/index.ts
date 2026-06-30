/**
 * Canonical reference-import pipeline — FOUNDATION.
 *
 * This module delivers the safe foundation of the reference importer:
 *   - typed zod schemas per file kind (schemas.ts),
 *   - file discovery + JSON/CSV parsing (discovery.ts),
 *   - STRICT validation with a clear, structured report,
 *   - a DRY-RUN mode (validate only, never touch the DB),
 *   - a CLEAR failure when no incoming files exist,
 *   - REQUIRES an explicit `sourceId` + `importRunId` for a non-dry-run,
 *   - REJECTS a JS number supplied as a money/index/coefficient value (enforced
 *     by the schemas, reusing assertNotNumber/toReferenceDecimal).
 *
 * It NEVER runs at application startup, NEVER seeds sample/fake values, and
 * NEVER invents official numbers — every value comes from the validated
 * incoming files. The actual row-insertion step is intentionally delegated to
 * the existing mapping contracts in `src/server/reference` (the future
 * importers call those); this foundation stops at a validated, provenance-aware
 * import PLAN so no half-mapped data is ever written.
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6, 8.2
 */
import type { ZodError } from "zod";
import {
  REFERENCE_FILE_SCHEMAS,
  type ReferenceFileKind,
} from "./schemas";
import {
  DEFAULT_INCOMING_DIR,
  discoverReferenceFiles,
  parseReferenceFile,
  type DiscoveredFile,
} from "./discovery";

export interface RowError {
  /** 0-based row index within the file. */
  row: number;
  /** Flattened zod issues. */
  issues: string[];
}

export interface FileValidationResult {
  kind: ReferenceFileKind;
  path: string;
  format: "json" | "csv";
  total: number;
  valid: number;
  errors: RowError[];
}

export interface ValidationReport {
  dir: string;
  files: FileValidationResult[];
  totalRows: number;
  totalValid: number;
  totalErrors: number;
  ok: boolean;
}

/** Validates a single discovered file's rows against its schema. */
export function validateFile(file: DiscoveredFile): FileValidationResult {
  const schema = REFERENCE_FILE_SCHEMAS[file.kind];
  const rows = parseReferenceFile(file);
  const errors: RowError[] = [];
  let valid = 0;
  rows.forEach((row, i) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid++;
    } else {
      errors.push({
        row: i,
        issues: (result.error as ZodError).issues.map(
          (iss) => `${iss.path.join(".") || "(root)"}: ${iss.message}`,
        ),
      });
    }
  });
  return {
    kind: file.kind,
    path: file.path,
    format: file.format,
    total: rows.length,
    valid,
    errors,
  };
}


/** Raised when a non-dry-run import is requested with no files to import. */
export class NoReferenceFilesError extends Error {
  constructor(dir: string) {
    super(
      `No canonical reference files found in ${dir}. Add <kind>.json/.csv files ` +
        `(see docs/REFERENCE_IMPORT_FORMAT.md) before importing. Nothing was imported.`,
    );
    this.name = "NoReferenceFilesError";
  }
}

/**
 * Validates every discovered file in the incoming directory and returns a
 * structured report. This is the DRY-RUN core: it performs NO database writes.
 *
 * @throws NoReferenceFilesError when the directory has no canonical files.
 */
export function validateIncoming(dir: string = DEFAULT_INCOMING_DIR): ValidationReport {
  const files = discoverReferenceFiles(dir);
  if (files.length === 0) {
    throw new NoReferenceFilesError(dir);
  }
  const results = files.map(validateFile);
  const totalRows = results.reduce((a, r) => a + r.total, 0);
  const totalValid = results.reduce((a, r) => a + r.valid, 0);
  const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);
  return {
    dir,
    files: results,
    totalRows,
    totalValid,
    totalErrors,
    ok: totalErrors === 0 && totalRows > 0,
  };
}

export interface ImportOptions {
  dir?: string;
  /** When true (default), validate only — never write to the database. */
  dryRun?: boolean;
  /** Required for a real (non-dry-run) import: the originating ReferenceSource. */
  sourceId?: string;
  /** Required for a real import: the open ReferenceImportRun. */
  importRunId?: string;
}

/**
 * Entry point for the importer foundation.
 *
 * - Dry-run (default): returns the validation report; no DB access.
 * - Real run: requires `sourceId` AND `importRunId`, validates strictly, and —
 *   only when validation passes — hands off to the row-mapping contracts in
 *   `src/server/reference`. Persistence of fully-resolved rows is performed by
 *   those contracts (the future importer step) so this foundation never writes
 *   partially-validated or fabricated data.
 */
export function importReferenceData(options: ImportOptions = {}): ValidationReport {
  const dir = options.dir ?? DEFAULT_INCOMING_DIR;
  const dryRun = options.dryRun ?? true;
  const report = validateIncoming(dir);

  if (dryRun) return report;

  if (!options.sourceId || !options.importRunId) {
    throw new Error(
      "A non-dry-run reference import requires an explicit `sourceId` and " +
        "`importRunId` (provenance). Register a ReferenceSource and open a " +
        "ReferenceImportRun first; values must originate from a real source.",
    );
  }
  if (!report.ok) {
    throw new Error(
      `Refusing to import: ${report.totalErrors} invalid row(s) across ${report.files.length} file(s). ` +
        `Fix the rejected rows (see the report) and retry. Nothing was imported.`,
    );
  }
  // Validation passed with provenance present. Row insertion is delegated to
  // the `src/server/reference` map* contracts (the future importer step); the
  // foundation deliberately stops here so no half-mapped data is written.
  return report;
}

export { discoverReferenceFiles, DEFAULT_INCOMING_DIR } from "./discovery";
export * from "./schemas";
