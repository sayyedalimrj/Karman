/**
 * Guard test: NORMAL USER UI must never expose server filesystem paths, shell
 * commands, the data-root env var, or SQL Server restore error codes.
 *
 * This scans every user-facing page/component under `src/app/(app)` (and the
 * Persian string catalog keys they render) EXCEPT the SYSTEM_ADMIN-only
 * `/admin/data-diagnostics` page, which is intentionally allowed to surface
 * technical detail. It fails on any forbidden token.
 *
 * Forbidden in normal UI: `/opt/` paths, `npm run`, `KARMAN_DATA_ROOT`,
 * `Msg 3279`, «داده موجود نیست», «هنوز پیاده‌سازی نشده» / «پیاده‌سازی نشده».
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = join(process.cwd(), "src/app/(app)");
const DIAGNOSTICS_DIR = join(APP_DIR, "admin", "data-diagnostics");

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: "/opt/ server path", re: /\/opt\// },
  { label: "npm run command", re: /npm run/ },
  { label: "KARMAN_DATA_ROOT env var", re: /KARMAN_DATA_ROOT/ },
  { label: "SQL Server Msg 3279", re: /Msg 3279/ },
  { label: "data-missing wording", re: /موجود نیست/ },
  { label: "not-implemented wording", re: /پیاده‌سازی نشده/ },
];

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (full.startsWith(DIAGNOSTICS_DIR)) continue; // admin diagnostics is exempt
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

describe("no forbidden technical strings in user-facing app pages", () => {
  it("contains no server paths, commands, env vars, restore errors, or dev wording", () => {
    const offenders: string[] = [];
    for (const file of collect(APP_DIR)) {
      const src = readFileSync(file, "utf8");
      for (const { label, re } of FORBIDDEN) {
        if (re.test(src)) offenders.push(`${file}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
