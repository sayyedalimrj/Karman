/**
 * CLI: `npm run taksa:scriptxml:audit`
 *
 * Statically parses `incoming/taksa/sql/ScriptXML.sql` (no execution), writes
 * the four scriptxml outputs, and best-effort persists ScriptXML mappings.
 */
import { auditScriptXml, writeScriptXmlOutputs } from "../../src/server/taksa/scriptxml-parser";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildScriptXmlPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditScriptXml();
  const outputs = writeScriptXmlOutputs(result);
  if (!result.found) {
    console.log("\nScriptXML.sql not found under incoming/taksa/sql.");
    console.log(`Wrote ${outputs.length} (empty) output file(s).`);
    printProductionInstructions();
    process.exitCode = 0;
    return;
  }
  const s = result.summary!;
  console.log(`\nProcedures: ${s.procedureNames.length}`);
  console.log(`OPENXML occurrences: ${s.openXmlCount}`);
  console.log(`INSERT targets: ${s.insertTargets.join(", ") || "(none)"}`);
  console.log(`Known /NewDataSet paths found: ${s.knownPathsFound.join(", ") || "(none)"}`);
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildScriptXmlPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
