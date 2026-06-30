/**
 * CLI: `npm run taksa:docs:audit`
 *
 * Parses gws.ini labels + DataPropertyName-like keys, TAKSA.xml structure, and
 * tx_tips/read_msp behavior hints. Writes the docs outputs and best-effort
 * persists UI labels + behavior hints. Tips are hints, not official rules.
 */
import { auditDocs, writeDocsOutputs } from "../../src/server/taksa/docs-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildDocsPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditDocs();
  const outputs = writeDocsOutputs(result);
  console.log(`\nDocs files: ${result.totalFiles}`);
  console.log(`  gws labels: ${result.gwsLabels.length}`);
  console.log(`  DataPropertyName-like: ${result.dataPropertyNames.length}`);
  console.log(`  behavior hints: ${result.behaviorHints.length}`);
  console.log(`  TAKSA.xml: ${result.taksaXml ? "parsed" : "not found"}`);
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildDocsPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
