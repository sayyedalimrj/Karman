/**
 * CLI for the canonical reference importer foundation.
 *
 * Usage:
 *   npm run import:reference            # dry-run (validate only, no DB writes)
 *   npm run import:reference -- --apply --source-id <id> --import-run-id <id>
 *
 * The dry-run validates every canonical file in data/incoming/reference and
 * prints a structured report. It fails clearly when no files exist and rejects
 * JS-number numeric values (decimals must be strings). It is NEVER run at app
 * startup. No fake/sample values are ever produced.
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6
 */
import {
  importReferenceData,
  NoReferenceFilesError,
  type ValidationReport,
} from "../src/server/reference/importer";

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

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
  try {
    const report = importReferenceData({
      dryRun: !apply,
      sourceId: getFlag("source-id"),
      importRunId: getFlag("import-run-id"),
    });
    printReport(report);
    process.exitCode = report.ok ? 0 : 1;
  } catch (err) {
    if (err instanceof NoReferenceFilesError) {
      console.error(err.message);
      process.exitCode = 2;
      return;
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
