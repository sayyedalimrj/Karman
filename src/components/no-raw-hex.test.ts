/**
 * Guard test: components must not hard-code raw hex color literals. All color
 * must flow through the design tokens / CSS custom properties (Requirement
 * 10.1, 10.2). This scans every component source file under `src/components`
 * and fails on any `#rgb`/`#rrggbb`/`#rrggbbaa` literal.
 *
 * The single source of truth for hex values is `src/design/tokens.ts` (and the
 * `:root` block in globals.css), which are intentionally outside this scan.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_DIR = join(process.cwd(), "src/components");
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collect(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("no raw hex in components", () => {
  it("contains no raw hex color literals under src/components", () => {
    const offenders: string[] = [];
    for (const file of collect(COMPONENTS_DIR)) {
      const src = readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        if (HEX.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
