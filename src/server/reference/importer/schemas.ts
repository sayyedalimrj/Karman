/**
 * Canonical reference-import file schemas (typed contracts).
 *
 * Each accepted file kind maps to a zod schema describing one normalized
 * reference entity. The schemas enforce the HARD numeric rule: every numeric
 * reference value (unitPrice, indexValue, coefficientValue, rate, fixedValue)
 * MUST be a decimal STRING — a raw JS/JSON number is rejected outright (no
 * silent coercion, no float). String decimals are validated with
 * `toReferenceDecimal` (which reuses the money guard `assertNotNumber`).
 *
 * No official values are encoded here — only the SHAPE that imported data must
 * satisfy. See docs/REFERENCE_IMPORT_FORMAT.md.
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6, 8.2
 */
import { z } from "zod";
import { toReferenceDecimal } from "../index";

/**
 * A decimal value that must arrive as a STRING. If a JS number is supplied, the
 * `invalid_type_error` fires (reject JS number). The refinement then ensures
 * the string parses as a finite decimal via the shared reference guard.
 */
export function decimalString(field: string) {
  return z
    .string({
      required_error: `${field} is required`,
      invalid_type_error: `${field} must be a decimal string, not a JS number`,
    })
    .refine(
      (s) => {
        try {
          toReferenceDecimal(s, field);
          return true;
        } catch {
          return false;
        }
      },
      { message: `${field} must be a valid finite decimal string` },
    );
}

const optionalString = z.string().trim().min(1).optional();

const SOURCE_TYPES = [
  "TAKSA_DB",
  "TAKSA_SQL_SCRIPT",
  "SVZT",
  "BRVT",
  "PSNT",
  "EXCEL",
  "PDF_OFFICIAL_DOC",
  "MANUAL_VERIFIED",
] as const;

const BOOK_TYPES = [
  "PRICE_LIST",
  "INDEX",
  "RESOURCE",
  "CIRCULAR",
  "COEFFICIENT",
  "DEDUCTION",
  "OTHER",
] as const;


export const referenceSourceFileSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  name: z.string().trim().min(1),
  originalFileName: optionalString,
  originalDbName: optionalString,
  originalScriptName: optionalString,
  checksum: optionalString,
  notes: optionalString,
});

export const referenceBookFileSchema = z.object({
  bookType: z.enum(BOOK_TYPES),
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  effectiveYear: z.number().int(),
  rawCode: optionalString,
});

export const referenceChapterFileSchema = z.object({
  bookCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  order: z.number().int(),
  rawCode: optionalString,
});

export const referenceUnitFileSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const referenceItemFileSchema = z.object({
  bookCode: z.string().trim().min(1),
  chapterCode: optionalString,
  itemCode: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  fullDescription: optionalString,
  unitCode: optionalString,
  unitPrice: decimalString("unitPrice"),
  effectiveYear: z.number().int(),
});

export const referenceResourceFileSchema = z.object({
  resourceCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  unitCode: optionalString,
  unitPrice: decimalString("unitPrice").optional(),
  effectiveYear: z.number().int(),
});

export const referenceIndexPeriodFileSchema = z.object({
  category: optionalString,
  bookCode: optionalString,
  year: z.number().int().optional(),
  quarter: z.number().int().optional(),
  month: z.number().int().optional(),
  effectivePeriod: optionalString,
  indexValue: decimalString("indexValue"),
});

export const referenceCircularFileSchema = z.object({
  circularNo: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: optionalString,
});

export const referenceCoefficientFileSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  coefficientValue: decimalString("coefficientValue"),
  effectiveYear: z.number().int().optional(),
});

export const referenceDeductionFileSchema = z
  .object({
    code: z.string().trim().min(1),
    title: z.string().trim().min(1),
    rate: decimalString("rate").optional(),
    fixedValue: decimalString("fixedValue").optional(),
    effectiveYear: z.number().int().optional(),
  })
  .refine((d) => d.rate !== undefined || d.fixedValue !== undefined, {
    message: "deduction requires at least one of `rate` or `fixedValue`",
  });


import type { ZodTypeAny } from "zod";

/** The canonical reference file kinds (also the accepted base file names). */
export const REFERENCE_FILE_KINDS = [
  "reference-sources",
  "reference-books",
  "reference-chapters",
  "reference-units",
  "reference-items",
  "reference-resources",
  "reference-index-periods",
  "reference-circulars",
  "reference-coefficients",
  "reference-deductions",
] as const;

export type ReferenceFileKind = (typeof REFERENCE_FILE_KINDS)[number];

/** Registry mapping each canonical file kind to its row schema. */
export const REFERENCE_FILE_SCHEMAS: Record<ReferenceFileKind, ZodTypeAny> = {
  "reference-sources": referenceSourceFileSchema,
  "reference-books": referenceBookFileSchema,
  "reference-chapters": referenceChapterFileSchema,
  "reference-units": referenceUnitFileSchema,
  "reference-items": referenceItemFileSchema,
  "reference-resources": referenceResourceFileSchema,
  "reference-index-periods": referenceIndexPeriodFileSchema,
  "reference-circulars": referenceCircularFileSchema,
  "reference-coefficients": referenceCoefficientFileSchema,
  "reference-deductions": referenceDeductionFileSchema,
};
