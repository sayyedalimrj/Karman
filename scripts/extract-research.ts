/**
 * Build-time extraction: research archive -> docs/taksa-map/
 *
 * Extracts ONLY safe documentation files (Markdown / CSV / JSON) from the
 * committed research archive, deliberately excluding any sensitive or raw
 * material (raw DB dumps, recovered credential/string dumps, raw sql_objects,
 * binaries). Run via: `npm run extract:research`.
 *
 * Requirements: 14.1, 13.2
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";

const ROOT = process.cwd();
const ARCHIVE = join(ROOT, "docs/_incoming/taksa_web_research_all_docs_roadmap.zip");
const DEST = join(ROOT, "docs/taksa-map");
const STRIP_PREFIX = "taksa_web_research_package/";

// Only these extensions are considered safe documentation.
const SAFE_EXTENSIONS = new Set([".md", ".csv", ".json"]);

// Entries matching any of these (case-insensitive) are always excluded, even
// if they have a "safe" extension, per repository hygiene rules.
const SENSITIVE_PATTERNS = [
  /readable_strings/i,
  /passwords?_found/i,
  /(^|\/)sql_objects\.txt$/i,
  /\.(db|mdb|svzt|brvt|psnt|bak|backup|exe|dll|ocx|sys)$/i,
];

function isSafeEntry(entry: string): boolean {
  if (entry.endsWith("/")) return false;
  if (SENSITIVE_PATTERNS.some((re) => re.test(entry))) return false;
  return SAFE_EXTENSIONS.has(extname(entry).toLowerCase());
}

function listEntries(archive: string): string[] {
  const out = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" });
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

function main(): void {
  if (!existsSync(ARCHIVE)) {
    console.error(`[extract:research] archive not found: ${ARCHIVE}`);
    process.exit(1);
  }

  const entries = listEntries(ARCHIVE);
  const safe = entries.filter(isSafeEntry);
  const skipped = entries.filter((e) => !e.endsWith("/") && !isSafeEntry(e));

  if (safe.length === 0) {
    console.error("[extract:research] no safe documentation files found.");
    process.exit(1);
  }

  const tmp = join(ROOT, ".tmp-research-extract");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  // Extract only the safe entries into a temp directory.
  execFileSync("unzip", ["-o", "-q", ARCHIVE, ...safe, "-d", tmp], {
    stdio: "inherit",
  });

  // Copy into docs/taksa-map, stripping the archive's top-level package folder.
  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });
  for (const entry of safe) {
    const rel = entry.startsWith(STRIP_PREFIX) ? entry.slice(STRIP_PREFIX.length) : entry;
    const from = join(tmp, entry);
    const to = join(DEST, rel);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }

  rmSync(tmp, { recursive: true, force: true });

  const count = (dir: string): number =>
    readdirSync(dir).reduce((n, name) => {
      const p = join(dir, name);
      return n + (statSync(p).isDirectory() ? count(p) : 1);
    }, 0);

  console.log(
    `[extract:research] extracted ${count(DEST)} safe files into docs/taksa-map (skipped ${skipped.length} non-safe entries).`,
  );
  if (skipped.length) {
    console.log(
      `[extract:research] skipped examples: ${skipped
        .slice(0, 5)
        .map((e) => basename(e))
        .join(", ")} ...`,
    );
  }
}

main();
