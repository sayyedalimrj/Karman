/**
 * CLI: `npm run taksa:register-sources`
 *
 * Runs discovery and persists discovered files as `TaksaDiscoveredFile` metadata
 * (idempotent by checksum + relative path), writing an AuditLog row per newly
 * registered source. Degrades gracefully when no DB / no admin actor / no files
 * are present. Admin-only server maintenance.
 */
import { registerDiscoveredSources } from "../../src/server/taksa/register-discovered-sources";
import { printContext, printProductionInstructions } from "./_cli";

async function main(): Promise<void> {
  printContext();
  const result = await registerDiscoveredSources();
  console.log(`\nDiscovered: ${result.totalDiscovered}`);
  console.log(`Persisted:  ${result.persisted}`);
  console.log(`Created:    ${result.created}`);
  console.log(`Existing:   ${result.existing}`);
  console.log(result.message);
  if (result.totalDiscovered === 0) {
    printProductionInstructions();
  }
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
