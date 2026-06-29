import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for Karman.
 *
 * - TypeScript + the `@/` path alias mirror the app/tsconfig setup so tests can
 *   import production modules exactly as the app does.
 * - Unit tests (`*.test.ts`) run without a database. Integration tests are kept
 *   separate under `*.int.test.ts` and are only included when RUN_DB_TESTS is
 *   set, so the default `vitest run` stays DB-free and fast.
 */
const runDbTests = process.env.RUN_DB_TESTS === "1";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.ts",
      "tests/**/*.test.ts",
      ...(runDbTests ? ["tests/**/*.int.test.ts", "src/**/*.int.test.ts"] : []),
    ],
    exclude: [
      "node_modules/**",
      ".next/**",
      ...(runDbTests ? [] : ["**/*.int.test.ts"]),
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
