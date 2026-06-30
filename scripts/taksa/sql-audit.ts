/**
 * CLI: `npm run taksa:sql:audit`
 *
 * Statically parses Taksa SQL/SCP scripts (no execution), writes the six
 * static-SQL outputs, and best-effort persists detected tables.
 */
import { auditStaticSql, writeStaticSqlOutputs } from "../../src/server/taksa/sql-static-parser";
import { maybePersistAnalysisRun } from "../../src/server/taksa/analyze";
import { buildSqlPersist } from "../../src/server/taksa/persist-builders";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = auditStaticSql();
  const outputs = writeStaticSqlOutputs(result);
  console.log(`\nScripts parsed: ${result.totalFiles}`);
  for (const f of result.files) {
    const dangerous = Object.entries(f.dangerousHits).filter(([, c]) => c > 0).map(([k]) => k);
    console.log(`  ${f.relativePath} [${f.encoding}]: ${f.tables.length} table(s), ${f.procedures.length} proc(s)` +
      (dangerous.length ? `, dangerous: ${dangerous.join(",")}` : ""));
  }
  console.log(`\nWrote ${outputs.length} output file(s).`);
  const persistence = await maybePersistAnalysisRun(buildSqlPersist(result));
  console.log(`Persistence: ${persistence.message}`);
  if (result.totalFiles === 0) printProductionInstructions();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
