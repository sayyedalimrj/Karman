/**
 * Guard test: NO FAKE/DEMO DATA and NO HARD-CODED OFFICIAL VALUES.
 *
 * Phase 1 is a Taksa-first operational product, not a demo. This scan asserts
 * that production source files (everything under src/ except tests) contain:
 *   1. no forbidden demo/marketing tokens (lorem ipsum, dummy/fake/sample data),
 *   2. no hard-coded official reference VALUES — i.e. no line pairs an official
 *      term (فهرست‌بها / شاخص / ضریب / بخشنامه / تعدیل / کسورات) with a decimal
 *      number, which would indicate a fabricated price/index/coefficient.
 *
 * Official values must always come from imported/mapped reference data, never
 * from code constants. (UI labels mention these terms but never with numbers.)
 *
 * Requirements: 15.5 (no hard-coded official values), product no-fake-data rule.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.|\.int\.test\./.test(entry)) out.push(full);
  }
  return out;
}

const DEMO_TOKENS = [
  "lorem",
  "ipsum",
  "dummydata",
  "fakedata",
  "mockproject",
  "sampleproject",
  "fakeproject",
  "داده ساختگی",
  "نمونه ساختگی",
];

const OFFICIAL_TERMS = ["فهرست‌بها", "شاخص", "ضریب", "بخشنامه", "تعدیل", "کسورات"];
const DECIMAL = /\d+\.\d+/;

const files = collect(SRC).filter((f) => !f.endsWith("no-fake-data.test.ts"));


describe("no forbidden demo/marketing tokens in production code", () => {
  it("contains none of the demo tokens", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lower = readFileSync(file, "utf8").toLowerCase();
      for (const token of DEMO_TOKENS) {
        if (lower.includes(token)) offenders.push(`${file}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("no hard-coded official reference values in production code", () => {
  it("never pairs an official term with a decimal number on the same line", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (DECIMAL.test(line) && OFFICIAL_TERMS.some((term) => line.includes(term))) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
