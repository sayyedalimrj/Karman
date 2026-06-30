/**
 * CLI: `npm run taksa:excel:audit`
 *
 * Reads Excel template metadata (sheets/headers when detectable) and classifies
 * each template by purpose. No numeric values are imported. Writes the three
 * excel outputs and best-effort persists detected sheets.
 */
import { auditExcel, writeExcelOutputs } from "../../src/server/taksa/excel-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildExcelPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditExcel();
  const outputs = writeExcelOutputs(result);
  console.log(`\nExcel templates: ${result.totalFiles}`);
  for (const f of result.files) {
    console.log(`  ${f.relativePath}: ${f.format} [${f.templatePurpose}] sheets=${f.sheets.length} (${f.status})`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildExcelPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
