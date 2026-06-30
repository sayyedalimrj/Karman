/**
 * Unit + property tests for the Reference Master Data layer (DB-free).
 *
 * These cover the pure/contract guarantees that do not require PostgreSQL:
 *   - Reference numerics are Decimal-only; a JS `number` is rejected.
 *   - Mapping-status lifecycle transitions are explicit and reachable.
 *   - No fake official reference values are hard-coded in the service code.
 *
 * DB-backed provenance/mapping behaviour is verified in `reference.int.test.ts`
 * (gated by RUN_DB_TESTS=1).
 *
 * **Validates: Requirements 8.2 (Decimal-only), 9.4 (reference master data)**
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Decimal } from "@/lib/money";
import {
  REFERENCE_MAPPING_TRANSITIONS,
  canTransitionMappingStatus,
  toReferenceDecimal,
} from "./index";

describe("toReferenceDecimal — Decimal-only reference numerics", () => {
  it("accepts Decimal/string/bigint and normalizes to scale 4", () => {
    expect(toReferenceDecimal("123.5").toFixed(4)).toBe("123.5000");
    expect(toReferenceDecimal(new Decimal("0.12345")).toFixed(4)).toBe("0.1235"); // ROUND_HALF_UP
    expect(toReferenceDecimal(10n).toFixed(4)).toBe("10.0000");
  });

  it("rejects a JS number outright (no silent coercion)", () => {
    // @ts-expect-error — passing a number must be a type error AND a runtime throw.
    expect(() => toReferenceDecimal(123.45)).toThrow(TypeError);
  });

  it("rejects non-finite values", () => {
    expect(() => toReferenceDecimal("not-a-number")).toThrow();
    expect(() => toReferenceDecimal(new Decimal(Infinity))).toThrow(RangeError);
  });

  it("property: any decimal string round-trips at scale 4 without float drift", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000_000, max: 10_000_000 }),
        fc.integer({ min: 0, max: 9999 }),
        (whole, frac) => {
          const str = `${whole}.${frac.toString().padStart(4, "0")}`;
          const d = toReferenceDecimal(str);
          // Equality is decimal-exact; never compared against a JS number.
          expect(d.equals(new Decimal(str))).toBe(true);
        },
      ),
    );
  });
});

describe("mapping-status lifecycle (explicit transitions)", () => {
  it("RAW progresses to MAPPED then VERIFIED", () => {
    expect(canTransitionMappingStatus("RAW", "MAPPED")).toBe(true);
    expect(canTransitionMappingStatus("MAPPED", "VERIFIED")).toBe(true);
  });

  it("CONFLICT and DEPRECATED are reachable", () => {
    expect(canTransitionMappingStatus("RAW", "CONFLICT")).toBe(true);
    expect(canTransitionMappingStatus("MAPPED", "DEPRECATED")).toBe(true);
    expect(canTransitionMappingStatus("VERIFIED", "CONFLICT")).toBe(true);
    expect(canTransitionMappingStatus("CONFLICT", "MAPPED")).toBe(true);
  });

  it("forbids skipping RAW→VERIFIED and any exit from DEPRECATED", () => {
    expect(canTransitionMappingStatus("RAW", "VERIFIED")).toBe(false);
    expect(canTransitionMappingStatus("DEPRECATED", "MAPPED")).toBe(false);
    expect(REFERENCE_MAPPING_TRANSITIONS.DEPRECATED).toHaveLength(0);
  });

  it("never lists a status as a transition to itself", () => {
    for (const [from, tos] of Object.entries(REFERENCE_MAPPING_TRANSITIONS)) {
      expect(tos).not.toContain(from);
    }
  });
});

describe("no hard-coded official reference values in service code", () => {
  it("contains no numeric literals in executable code (values must be imported/mapped)", () => {
    const src = readFileSync(join(process.cwd(), "src/server/reference/index.ts"), "utf8");

    // Strip block comments, line comments, and string literals so we only
    // inspect executable code. Official values (شاخص/فهرست‌بها/ضرایب/...) must
    // never appear as constants here — they arrive via caller-supplied imports.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
      .replace(/\/\/[^\n]*/g, "") // line comments
      .replace(/"(?:[^"\\]|\\.)*"/g, '""') // double-quoted strings
      .replace(/'(?:[^'\\]|\\.)*'/g, "''") // single-quoted strings
      .replace(/`(?:[^`\\]|\\.)*`/g, "``"); // template strings

    // No decimal literals at all (e.g. 1234.56, 0.05).
    const decimalLiterals = code.match(/\b\d+\.\d+\b/g) ?? [];
    expect(decimalLiterals).toEqual([]);

    // No multi-digit integer literals (a hard-coded price/index/year/coefficient).
    const bigIntegers = code.match(/\b\d{2,}\b/g) ?? [];
    expect(bigIntegers).toEqual([]);
  });
});
