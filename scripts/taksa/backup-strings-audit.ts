/**
 * CLI: `npm run taksa:backup-strings:audit`
 *
 * Extracts only safe, whitelisted candidate strings from the `.DB` backups
 * (no restore, no full dump, sensitive matches redacted), writes the four
 * backup-strings outputs, and best-effort persists table candidates.
 */
import { auditBackupStrings, writeBackupStringsOutputs } from "../../src/server/taksa/backup-strings-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildBackupStringsPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditBackupStrings();
  const outputs = writeBackupStringsOutputs(result);
  console.log(`\nBackups scanned: ${result.totalFiles}`);
  for (const f of result.files) {
    const sensitive = Object.values(f.sensitiveHits).reduce((a, b) => a + b, 0);
    console.log(`  ${f.relativePath}: ${f.tableCandidates.length} candidate(s), ${sensitive} sensitive match(es) [REDACTED]`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildBackupStringsPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
