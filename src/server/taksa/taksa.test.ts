/**
 * Unit + property tests for Taksa preservation logic (DB-free).
 *
 * Property CP7: Taksa raw rows preserve table name, row order, and raw JSON.
 * **Validates: Requirements 9.2, 9.3**
 *
 * The property asserts that after a simulated load→store (`preserveTable`) and
 * round-trip reconstruction (`reconstructTable`), the `rawTableName`,
 * `rowOrder`, and `rawJson` are byte-stable, and that edits are confined to
 * `patchJson` (never mutating `rawJson`).
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  applyPatch,
  canonicalJson,
  effectiveRow,
  preserveTable,
  reconstructTable,
  verifyRowChecksum,
  type Json,
  type RawTableInput,
} from "./index";

/** Arbitrary for a raw table with distinct, shuffled row orders. */
const rawTableArb: fc.Arbitrary<RawTableInput> = fc
  .record({
    rawTableName: fc.string({ minLength: 1, maxLength: 40 }),
    tableOrder: fc.integer({ min: 0, max: 1000 }),
    rows: fc.array(fc.jsonValue() as fc.Arbitrary<Json>, { maxLength: 30 }),
  })
  .chain((base) => {
    // Assign distinct rowOrder values, then shuffle to exercise sorting.
    const withOrder = base.rows.map((rawJson, i) => ({ rowOrder: i, rawJson }));
    return fc.shuffledSubarray(withOrder, { minLength: withOrder.length, maxLength: withOrder.length }).map(
      (rawRows) => ({
        rawTableName: base.rawTableName,
        tableOrder: base.tableOrder,
        rawRows,
      }),
    );
  });

describe("preserve → reconstruct (unit)", () => {
  it("preserves verbatim table name, order, and raw rows", () => {
    const input: RawTableInput = {
      rawTableName: "SVZT_Header",
      tableOrder: 3,
      rawRows: [
        { rowOrder: 1, rawJson: { a: 1, b: "x" } },
        { rowOrder: 0, rawJson: [1, 2, 3] },
      ],
    };
    const preserved = preserveTable(input);
    const round = reconstructTable(preserved);

    expect(round.rawTableName).toBe("SVZT_Header");
    expect(round.tableOrder).toBe(3);
    expect(round.rawRows.map((r) => r.rowOrder)).toEqual([0, 1]);
    expect(round.rawRows[0]?.rawJson).toEqual([1, 2, 3]);
    expect(round.rawRows[1]?.rawJson).toEqual({ a: 1, b: "x" });
  });

  it("starts every preserved row with a null patchJson", () => {
    const preserved = preserveTable({
      rawTableName: "T",
      tableOrder: 0,
      rawRows: [{ rowOrder: 0, rawJson: { v: 1 } }],
    });
    expect(preserved.rawRows[0]?.patchJson).toBeNull();
  });
});

describe("applyPatch / effectiveRow (unit)", () => {
  it("confines edits to patchJson and never mutates rawJson", () => {
    const preserved = preserveTable({
      rawTableName: "T",
      tableOrder: 0,
      rawRows: [{ rowOrder: 0, rawJson: { amount: 100, label: "orig" } }],
    });
    const row = preserved.rawRows[0];
    expect(row).toBeDefined();
    if (!row) return;
    const before = canonicalJson(row.rawJson);

    const edited = applyPatch(row, { label: "fixed", extra: true });

    expect(canonicalJson(edited.rawJson)).toBe(before); // raw untouched
    expect(edited.patchJson).toEqual({ label: "fixed", extra: true });
    expect(effectiveRow(edited)).toEqual({ amount: 100, label: "fixed", extra: true });
    // Original row object also unchanged (applyPatch returns a new object).
    expect(canonicalJson(row.rawJson)).toBe(before);
    expect(row.patchJson).toBeNull();
  });
});

describe("CP7 — raw rows preserve name, order, and raw JSON (property)", () => {
  it("round-trip reconstruction is byte-stable for raw fields", () => {
    fc.assert(
      fc.property(rawTableArb, (input) => {
        const preserved = preserveTable(input);
        const round = reconstructTable(preserved);

        // Table name + order preserved verbatim.
        expect(round.rawTableName).toBe(input.rawTableName);
        expect(round.tableOrder).toBe(input.tableOrder);

        // Source ordered by rowOrder for comparison.
        const sourceSorted = [...input.rawRows].sort((a, b) => a.rowOrder - b.rowOrder);
        expect(round.rawRows.map((r) => r.rowOrder)).toEqual(
          sourceSorted.map((r) => r.rowOrder),
        );
        // rawJson byte-stable (canonical form identical).
        for (let i = 0; i < sourceSorted.length; i++) {
          const got = round.rawRows[i];
          const exp = sourceSorted[i];
          expect(got).toBeDefined();
          expect(exp).toBeDefined();
          if (got && exp) {
            expect(canonicalJson(got.rawJson)).toBe(canonicalJson(exp.rawJson));
          }
        }
      }),
    );
  });

  it("checksums verify against preserved rawJson", () => {
    fc.assert(
      fc.property(rawTableArb, (input) => {
        const preserved = preserveTable(input);
        for (const row of preserved.rawRows) {
          expect(verifyRowChecksum(row)).toBe(true);
        }
      }),
    );
  });

  it("patching never changes the preserved rawJson or its checksum", () => {
    fc.assert(
      fc.property(rawTableArb, fc.jsonValue() as fc.Arbitrary<Json>, (input, patch) => {
        const preserved = preserveTable(input);
        for (const row of preserved.rawRows) {
          const rawBefore = canonicalJson(row.rawJson);
          const edited = applyPatch(row, patch);
          expect(canonicalJson(edited.rawJson)).toBe(rawBefore);
          expect(edited.checksum).toBe(row.checksum);
          expect(verifyRowChecksum(edited)).toBe(true);
        }
      }),
    );
  });
});
