/**
 * Build-time extraction: brand archive -> public/brand/
 *
 * Produces the canonical brand asset filenames the application references
 * (logo, app icon, favicon, Open Graph image) from the committed brand archive.
 * Run via: `npm run extract:brand`.
 *
 * Note: the brand archive ships PNG sources only; a vector `logo.svg` is not
 * present and is therefore not produced here.
 *
 * Requirements: 14.2
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARCHIVE = join(ROOT, "public/brand/karman_brand_assets.zip");
const DEST = join(ROOT, "public/brand");
const PREFIX = "karman_brand_assets/";

// Map archive source files -> canonical output names used by the app.
const MAPPING: ReadonlyArray<{ source: string; output: string }> = [
  { source: "karman-logo-transparent.png", output: "logo.png" },
  { source: "karman-icon-512.png", output: "icon-512.png" },
  { source: "karman-icon-64.png", output: "favicon.png" },
  { source: "karman-og-image-1200.png", output: "og-image.png" },
];

function main(): void {
  if (!existsSync(ARCHIVE)) {
    console.error(`[extract:brand] archive not found: ${ARCHIVE}`);
    process.exit(1);
  }

  const tmp = join(ROOT, ".tmp-brand-extract");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const sources = MAPPING.map((m) => PREFIX + m.source);
  execFileSync("unzip", ["-o", "-q", ARCHIVE, ...sources, "-d", tmp], {
    stdio: "inherit",
  });

  mkdirSync(DEST, { recursive: true });
  const produced: string[] = [];
  for (const { source, output } of MAPPING) {
    const from = join(tmp, PREFIX, source);
    if (!existsSync(from)) {
      console.warn(`[extract:brand] source missing, skipped: ${source}`);
      continue;
    }
    cpSync(from, join(DEST, output));
    produced.push(output);
  }

  rmSync(tmp, { recursive: true, force: true });
  console.log(`[extract:brand] produced: ${produced.join(", ")}`);
}

main();
