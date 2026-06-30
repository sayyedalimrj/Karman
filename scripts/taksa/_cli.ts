/**
 * Shared helpers for the Taksa ingestion/analysis CLIs.
 *
 * These CLIs are ADMIN-ONLY server maintenance commands. They run against the
 * effective data root (`KARMAN_DATA_ROOT`, default `<repo>/data`) and must
 * behave safely on an empty local checkout: exit cleanly, create no fake data,
 * require no server files, and require no SQL Server restore.
 */
import {
  PRODUCTION_DATA_ROOT,
  REAL_SERVER_DATA_ROOT,
  getDataRoot,
  getTaksaIncomingRoot,
  toSafeRelativePath,
} from "../../src/server/taksa/data-root";

/** Prints the effective data root context (safe relative incoming path). */
export function printContext(): void {
  const root = getDataRoot();
  console.log(`Data root: ${root}`);
  console.log(`Effective Taksa source: ${toSafeRelativePath(getTaksaIncomingRoot())} (under data root)`);
}

/** Prints the production-path guidance shown when no local files are present. */
export function printProductionInstructions(): void {
  console.log("");
  console.log("No Taksa source files were found under the effective data root.");
  console.log("This is expected on a local checkout — raw Taksa files live on the server.");
  console.log("");
  console.log(`  Production app path:  ${PRODUCTION_DATA_ROOT}/incoming/taksa`);
  console.log(`  Real server path:     ${REAL_SERVER_DATA_ROOT}/incoming/taksa`);
  console.log(`  Symlink:              ${PRODUCTION_DATA_ROOT} -> ${REAL_SERVER_DATA_ROOT}`);
  console.log("");
  console.log("After deployment, run the analysis against the server data path, e.g.:");
  console.log(`  KARMAN_DATA_ROOT=${PRODUCTION_DATA_ROOT} npm run taksa:discover`);
  console.log(`  KARMAN_DATA_ROOT=${PRODUCTION_DATA_ROOT} npm run taksa:analyze`);
  console.log("");
  console.log("No SQL Server restore is required or performed. The website never reads");
  console.log("raw Taksa files — it reads PostgreSQL metadata produced by these commands.");
}
