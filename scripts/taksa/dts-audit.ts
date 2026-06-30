/**
 * CLI: `npm run taksa:dts:audit`
 *
 * Registers DTS files and extracts safe readable names (no execution / no
 * import). Writes the dts outputs and best-effort persists detected packages.
 */
import { auditDts, writeDtsOutputs } from "../../src/server/taksa/dts-rpt-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildDtsPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditDts();
  const outputs = writeDtsOutputs(result);
  console.log(`\nDTS files: ${result.totalFiles}`);
  for (const f of result.files) {
    console.log(`  ${f.relativePath}: ${f.readableNames.length} readable name(s)`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildDtsPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
