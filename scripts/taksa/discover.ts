/**
 * CLI: `npm run taksa:discover`
 *
 * Scans `${KARMAN_DATA_ROOT}/incoming/taksa`, prints counts by type, a safe
 * (relative-path) table, and the missing expected core files, then writes
 * `data/processed/taksa/audit/discovery.{json,csv}`. Exits cleanly with zero
 * files and prints production-path instructions.
 */
import { discoverTaksaSources } from "../../src/server/taksa/source-discovery";
import { getTaksaProcessedDir } from "../../src/server/taksa/data-root";
import { writeCsvFile, writeJsonFile } from "../../src/server/taksa/io";
import { printContext, printProductionInstructions } from "./_cli";

function main(): void {
  printContext();
  const discovery = discoverTaksaSources();

  const dir = getTaksaProcessedDir("audit");
  writeJsonFile(dir, "discovery.json", discovery);
  writeCsvFile(
    dir,
    "discovery.csv",
    [
      "relativePath",
      "fileName",
      "extension",
      "category",
      "sourceType",
      "sourceFamily",
      "sizeBytes",
      "checksum",
      "supportedForAnalysis",
      "supportedForIngestion",
    ],
    discovery.files,
  );

  console.log(`\nDiscovered ${discovery.totalFiles} file(s).`);
  if (discovery.totalFiles === 0) {
    printProductionInstructions();
    process.exitCode = 0;
    return;
  }

  console.log("\nCounts by detected type:");
  for (const [type, count] of Object.entries(discovery.countsByType).sort()) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nFiles (safe relative paths):");
  for (const f of discovery.files) {
    console.log(`  [${f.sourceType}] ${f.relativePath} (${f.sizeBytes} bytes)`);
  }

  if (discovery.missingCoreFiles.length > 0) {
    console.log("\nMissing expected core files:");
    for (const m of discovery.missingCoreFiles) {
      console.log(`  - ${m.category}/${m.fileName} — ${m.note}`);
    }
  } else {
    console.log("\nAll expected core files are present.");
  }

  console.log(`\nWrote discovery outputs to ${dir}.`);
}

main();
