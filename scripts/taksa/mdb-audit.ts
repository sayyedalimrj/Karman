/**
 * CLI: `npm run taksa:mdb:audit`
 *
 * Detects the Jet/ACE signature of Access databases and records metadata; when
 * extraction is unavailable it records the unavailable status WITHOUT failing.
 * No official values are imported.
 */
import { auditMdb, writeMdbOutputs } from "../../src/server/taksa/mdb-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildMdbPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditMdb();
  const outputs = writeMdbOutputs(result);
  console.log(`\nMDB files: ${result.totalFiles}`);
  for (const f of result.files) {
    console.log(`  ${f.relativePath}: ${f.format} (${f.status})`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildMdbPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
