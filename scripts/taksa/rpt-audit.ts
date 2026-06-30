/**
 * CLI: `npm run taksa:rpt:audit`
 *
 * Lists Crystal Reports templates and classifies them by prefix/folder (Crystal
 * is never executed; no report is generated). Writes the rpt outputs and
 * best-effort persists detected templates.
 */
import { auditRpt, writeRptOutputs } from "../../src/server/taksa/dts-rpt-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildRptPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditRpt();
  const outputs = writeRptOutputs(result);
  console.log(`\nRPT templates: ${result.totalFiles}`);
  for (const f of result.files) {
    console.log(`  ${f.relativePath}: ${f.classification}`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildRptPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
