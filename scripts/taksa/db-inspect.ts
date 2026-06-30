/**
 * CLI: `npm run taksa:db:inspect`
 *
 * Inspects `incoming/taksa/db` backups (header/metadata only — no restore,
 * no brute force), writes db-audit outputs, and best-effort persists the run.
 * Records the restore status as blocked (SQL Server Msg 3279).
 */
import { inspectDbBackups, writeDbBackupOutputs } from "../../src/server/taksa/db-backup-inspector";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildDbInspectPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = inspectDbBackups();
  const outputs = writeDbBackupOutputs(result);
  console.log(`\nDB backups inspected: ${result.totalFiles}`);
  console.log(`Restore status: ${result.restoreStatus}`);
  console.log(result.restoreNote);
  for (const e of result.entries) {
    console.log(`  ${e.relativePath}: ${e.classification} (TAPE=${e.hasTapeHeader})`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildDbInspectPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
