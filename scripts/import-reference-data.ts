/**
 * CLI for the canonical reference importer foundation.
 *
 * Usage:
 *   npm run import:reference -- --dry-run   # validate only, no DB writes
 *   npm run import:reference -- --apply     # BLOCKED in Phase 2 (see below)
 *
 * PHASE 2 GATING:
 *   - `--dry-run` validates canonical files (when present) and ALWAYS reports
 *     that reference import is blocked until the DB audit and mapping review
 *     are completed. It NEVER imports official data.
 *   - `--apply` is DISABLED until Phase 3 mapping approval and exits non-zero
 *     without touching the database. No ReferenceBook/Item/IndexPeriod official
 *     records are created in Phase 2.
 *
 * The dry-run is NEVER run at app startup and produces no fake/sample values.
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6 (+ Phase 2 reference-import gating)
 */
import {
  validateIncoming,
  NoReferenceFilesError,
  DEFAULT_INCOMING_DIR,
  type ValidationReport,
} from "../src/server/reference/importer";

const DRY_RUN_BLOCKED_MESSAGE =
  "Reference import is blocked until DB audit and mapping review are completed.";
const APPLY_BLOCKED_MESSAGE = "Reference apply is disabled until Phase 3 mapping approval.";

function printReport(report: ValidationReport): void {
  console.log(`Reference import report (dir: ${report.dir})`);
  for (const f of report.files) {
    console.log(
      `  - ${f.kind} [${f.format}]: ${f.valid}/${f.total} valid` +
        (f.errors.length ? `, ${f.errors.length} invalid` : ""),
    );
    for (const e of f.errors) {
      console.log(`      row ${e.row}: ${e.issues.join("; ")}`);
    }
  }
  console.log(
    `Totals: ${report.totalValid}/${report.totalRows} valid, ${report.totalErrors} error(s). ok=${report.ok}`,
  );
}

function main(): void {
  const apply = process.argv.includes("--apply");

  if (apply) {
    // Phase 2: apply is hard-blocked. Nothing is imported.
    console.error(APPLY_BLOCKED_MESSAGE);
    process.exitCode = 1;
    return;
  }

  // Dry-run: validate when files are present, then always report the block.
  try {
    const report = validateIncoming(DEFAULT_INCOMING_DIR);
    printReport(report);
  } catch (err) {
    if (err instanceof NoReferenceFilesError) {
      console.log(err.message);
    } else {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
      return;
    }
  }

  console.log("");
  console.log(DRY_RUN_BLOCKED_MESSAGE);
  console.log(
    "No official numbers are imported from Excel or PDF in Phase 2; complete the " +
      "controlled Taksa DB/script analysis and mapping review first.",
  );
  process.exitCode = 0;
}

main();
