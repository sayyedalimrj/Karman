/**
 * Unit tests for the canonical reference importer foundation (DB-free).
 *
 * Cover the contract guarantees that need no database:
 *   - numeric reference values must be decimal STRINGS; a JS number is rejected,
 *   - string decimals are accepted and validated,
 *   - discovery finds canonical files, validation reports per-row errors,
 *   - a missing/empty incoming dir fails CLEARLY (NoReferenceFilesError),
 *   - deductions require at least one of rate/fixedValue.
 *
 * **Validates: Requirements 15.2, 15.3, 15.5, 15.6, 8.2**
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  referenceItemFileSchema,
  referenceDeductionFileSchema,
} from "./schemas";
import {
  validateIncoming,
  NoReferenceFilesError,
  importReferenceData,
} from "./index";
import { discoverReferenceFiles } from "./discovery";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "karman-ref-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("numeric reference values are decimal strings (reject JS number)", () => {
  it("accepts a decimal STRING unitPrice", () => {
    const r = referenceItemFileSchema.safeParse({
      bookCode: "ABNIE",
      itemCode: "010101",
      shortDescription: "x",
      unitPrice: "152340.7500",
      effectiveYear: 1403,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a JS number unitPrice outright", () => {
    const r = referenceItemFileSchema.safeParse({
      bookCode: "ABNIE",
      itemCode: "010101",
      shortDescription: "x",
      unitPrice: 152340.75,
      effectiveYear: 1403,
    });
    expect(r.success).toBe(false);
  });

  it("rejects a non-decimal string unitPrice", () => {
    const r = referenceItemFileSchema.safeParse({
      bookCode: "ABNIE",
      itemCode: "010101",
      shortDescription: "x",
      unitPrice: "not-a-number",
      effectiveYear: 1403,
    });
    expect(r.success).toBe(false);
  });
});

describe("deduction rule requires a rate or fixed value", () => {
  it("rejects when neither is present", () => {
    expect(referenceDeductionFileSchema.safeParse({ code: "X", title: "t" }).success).toBe(false);
  });
  it("accepts a string rate", () => {
    expect(
      referenceDeductionFileSchema.safeParse({ code: "X", title: "t", rate: "0.0500" }).success,
    ).toBe(true);
  });
});


describe("discovery + validation report", () => {
  it("throws a clear error when no files exist", () => {
    expect(() => validateIncoming(dir)).toThrow(NoReferenceFilesError);
  });

  it("discovers and validates JSON files, reporting per-row errors", () => {
    writeFileSync(
      join(dir, "reference-units.json"),
      JSON.stringify([
        { code: "M3", name: "مترمکعب" },
        { code: "", name: "bad" }, // invalid: empty code
      ]),
      "utf8",
    );
    writeFileSync(
      join(dir, "reference-coefficients.json"),
      JSON.stringify([{ code: "BALASARI", title: "ضریب بالاسری", coefficientValue: "1.3000" }]),
      "utf8",
    );

    const found = discoverReferenceFiles(dir);
    expect(found.map((f) => f.kind).sort()).toEqual([
      "reference-coefficients",
      "reference-units",
    ]);

    const report = validateIncoming(dir);
    const units = report.files.find((f) => f.kind === "reference-units")!;
    expect(units.total).toBe(2);
    expect(units.valid).toBe(1);
    expect(units.errors).toHaveLength(1);
    expect(report.ok).toBe(false);
  });

  it("a real (non-dry-run) import requires sourceId and importRunId", () => {
    expect(() => importReferenceData({ dir, dryRun: false })).toThrow(/sourceId/);
  });

  it("parses CSV with integer-field coercion and string codes preserved", () => {
    const csvDir = mkdtempSync(join(tmpdir(), "karman-ref-csv-"));
    writeFileSync(
      join(csvDir, "reference-items.csv"),
      "bookCode,itemCode,shortDescription,unitPrice,effectiveYear\nABNIE,010101,خاکبرداری,152340.7500,1403\n",
      "utf8",
    );
    const report = validateIncoming(csvDir);
    const items = report.files.find((f) => f.kind === "reference-items")!;
    expect(items.valid).toBe(1);
    expect(items.errors).toHaveLength(0);
    rmSync(csvDir, { recursive: true, force: true });
  });
});
