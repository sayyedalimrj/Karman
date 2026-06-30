/**
 * CLI: `npm run taksa:analyze`
 *
 * Runs ALL safe analyzers, writes JSON/CSV/MD outputs under
 * `data/processed/taksa/`, and best-effort persists a unified `TaksaAnalysisRun`
 * (+ detected entities / ScriptXML mappings / UI labels / behavior hints) when a
 * DB and SYSTEM_ADMIN actor are available. Imports no official data, requires no
 * SQL Server restore, and degrades gracefully.
 */
import { analyzeTaksa } from "../../src/server/taksa/analyze";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const { result, persistence } = await analyzeTaksa();
  const s = result.summary;

  console.log("\nAnalyzer summary:");
  console.log(`  discovery:      ${s.discovery.totalFiles} file(s), ${s.discovery.missingCoreFiles} missing core`);
  console.log(`  db backup:      ${s.dbBackup.totalFiles} file(s), restore=${s.dbBackup.restoreStatus}`);
  console.log(`  scriptxml:      found=${s.scriptXml.found}, OPENXML=${s.scriptXml.openXmlCount}, targets=${s.scriptXml.insertTargets}`);
  console.log(`  sql static:     ${s.sqlStatic.files} file(s), ${s.sqlStatic.tables} table(s)`);
  console.log(`  backup strings: ${s.backupStrings.files} file(s), ${s.backupStrings.candidates} candidate(s)`);
  console.log(`  mdb:            ${s.mdb.files} file(s)`);
  console.log(`  excel:          ${s.excel.files} file(s), ${s.excel.sheets} sheet(s)`);
  console.log(`  docs:           ${s.docs.labels} label(s), ${s.docs.hints} hint(s)`);
  console.log(`  pdf:            ${s.pdf.files} file(s)`);
  console.log(`  dts:            ${s.dts.files} file(s)`);
  console.log(`  rpt:            ${s.rpt.files} file(s)`);
  console.log(`\nWrote ${result.outputs.length} output file(s) under ${s.outputDirRelative}.`);
  console.log(`Persistence: ${persistence.message}`);

  if (s.discovery.totalFiles === 0) {
    printProductionInstructions();
  }
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
