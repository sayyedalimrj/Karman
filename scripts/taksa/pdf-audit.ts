/**
 * CLI: `npm run taksa:pdf:audit`
 *
 * Lists PDFs with size/checksum/page-count/title metadata and filename
 * classification. NO OCR, NO numeric extraction, NO official import. Writes the
 * pdf outputs and best-effort persists detected documents.
 */
import { auditPdf, writePdfOutputs } from "../../src/server/taksa/pdf-audit";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildPdfPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditPdf();
  const outputs = writePdfOutputs(result);
  console.log(`\nPDF files: ${result.totalFiles}`);
  for (const f of result.files) {
    console.log(`  ${f.relativePath}: pages=${f.pageCount ?? "?"} class=[${f.classifications.join(",")}]`);
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildPdfPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
