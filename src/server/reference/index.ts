/**
 * Reference Master Data service — Taksa-derived reference/master data contracts.
 *
 * ============================================================================
 * WHAT THIS LAYER IS
 * ----------------------------------------------------------------------------
 * Karman treats Taksa sources (the Taksa database, SQL scripts, SVZT/BRVT/PSNT
 * files, Excel templates, official PDFs, and the extracted research package) as
 * FIRST-CLASS source / reference / master-data inputs. They are not ignored.
 *
 * The data pipeline is:
 *
 *   Taksa sources
 *     → staging / extraction
 *     → RAW PRESERVATION layer        (src/server/taksa — byte-stable round-trip)
 *     → REFERENCE MAPPING layer       (THIS module — src/server/reference)
 *     → normalized PostgreSQL tables  (Reference* models)
 *     → calculations / reports / validation / golden tests
 *
 * The operational runtime database is, and remains, PostgreSQL (via Prisma).
 * Taksa is NEVER the live runtime DB; its data is imported/mapped INTO
 * PostgreSQL as reference/master data that calculations, reports, validation,
 * and golden tests can rely on.
 *
 * RAW PRESERVATION (src/server/taksa) vs REFERENCE MASTER DATA (this module):
 *   - Raw preservation exists for round-trip safety: every original Taksa row
 *     is stored verbatim (rawTableName / rowOrder / rawJson) so the source can
 *     be reconstructed byte-for-byte. It is intentionally NOT usable business
 *     data.
 *   - Reference master data is the usable, normalized business/calculation form
 *     (فهرست‌بها items, units, resources, indices, circulars, coefficients,
 *     deductions). `ReferenceMapping` is the bridge that links a raw preserved
 *     row to the normalized entity it produced.
 *
 * ============================================================================
 * HARD RULE — NO HARD-CODED OFFICIAL VALUES
 * ----------------------------------------------------------------------------
 * Official values (شاخص / فهرست‌بها / ردیف / واحد / منبع / ضریب / کسورات /
 * بخشنامه / تعدیل) MUST come from imported/mapped reference data — NEVER from
 * code constants. Every `map*` helper therefore REQUIRES the caller to supply
 * the value (sourced from a real import); none of them invent or default a
 * numeric reference value. There are deliberately no seeded/sample official
 * numbers in this module.
 *
 * All numeric reference values (unitPrice, indexValue, coefficientValue, rate,
 * fixedValue, ...) are Decimal — never JS `number`/Float. JS numbers are
 * rejected at the boundary via `assertNotNumber` (re-used from src/lib/money).
 *
 * ============================================================================
 * SCOPE
 * ----------------------------------------------------------------------------
 * This module ships typed CONTRACTS + foundation persistence helpers. It does
 * NOT perform a full Taksa DB restore, nor SVZT/BRVT/PSNT parsing, nor PDF
 * parsing, nor any data invention. Those importers are future work that will
 * call these contracts.
 *
 * Requirements: 9.1, 9.2, 9.4 (Taksa compatibility) + Reference Master Data note.
 */
import {
  Prisma,
  type ReferenceMappingStatus,
  type ReferenceSourceType,
} from "@prisma/client";
import { assertNotNumber, Decimal, MONEY_ROUNDING, MONEY_SCALE } from "@/lib/money";
import type { AuditTx } from "@/server/audit";

/** JSON value type aligned with Prisma's Json columns. */
export type Json = Prisma.JsonValue;

/** Decimal-safe input accepted for reference numeric values. Never `number`. */
export type DecimalInput = Decimal | string | bigint;

/**
 * Constructs a reference Decimal at the central scale (18,4). Reuses the money
 * guard so a JS `number` is rejected immediately rather than silently coerced —
 * official/reference numerics must never originate from floating-point.
 */
export function toReferenceDecimal(
  value: DecimalInput,
  context = "reference numeric value",
): Decimal {
  assertNotNumber(value, context);
  const d =
    value instanceof Decimal
      ? value
      : new Decimal(typeof value === "bigint" ? value.toString() : value);
  if (!d.isFinite()) {
    throw new RangeError(`Reference numeric value (${context}) must be finite.`);
  }
  return d.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

// ---------------------------------------------------------------------------
// Provenance — every mapped entity carries where it came from.
// ---------------------------------------------------------------------------

/**
 * Source provenance that travels with every mapping. This is how a normalized
 * reference entity stays traceable back to the exact raw Taksa source row.
 */
export interface SourceProvenance {
  sourceType: ReferenceSourceType;
  /** Originating ReferenceSource id (if a source row was registered). */
  sourceId?: string | null;
  /** Originating ReferenceImportRun id. */
  importRunId?: string | null;
  /** Original Taksa table name — PRESERVED verbatim. */
  rawTableName: string;
  /** Original raw row id (if the raw row was persisted in the preservation layer). */
  rawRowId?: string | null;
  /** Original row ordering — PRESERVED verbatim. */
  rawRowOrder?: number | null;
  /** Original raw code/key from the source. */
  rawCode?: string | null;
  /** Integrity checksum of the raw source row. */
  checksum?: string | null;
}

// ---------------------------------------------------------------------------
// Source + import-run lifecycle
// ---------------------------------------------------------------------------

export interface CreateReferenceSourceInput {
  sourceType: ReferenceSourceType;
  name: string;
  originalFileName?: string | null;
  originalDbName?: string | null;
  originalScriptName?: string | null;
  checksum?: string | null;
  notes?: string | null;
}

/** Registers a Taksa-derived source (DB, script, SVZT/BRVT/PSNT, Excel, PDF). */
export async function createReferenceSource(
  input: CreateReferenceSourceInput,
  tx: AuditTx,
): Promise<string> {
  const created = await tx.referenceSource.create({
    data: {
      sourceType: input.sourceType,
      name: input.name,
      originalFileName: input.originalFileName ?? null,
      originalDbName: input.originalDbName ?? null,
      originalScriptName: input.originalScriptName ?? null,
      checksum: input.checksum ?? null,
      notes: input.notes ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

/** Opens an import run for a registered source; returns the run id. */
export async function startReferenceImportRun(
  sourceId: string,
  tx: AuditTx,
  notes?: string | null,
): Promise<string> {
  const run = await tx.referenceImportRun.create({
    data: { sourceId, status: "STARTED", notes: notes ?? null },
    select: { id: true },
  });
  return run.id;
}

export interface CompleteImportRunInput {
  status?: "COMPLETED" | "FAILED";
  rowsRead?: number | null;
  rowsMapped?: number | null;
  notes?: string | null;
}

/** Closes an import run, recording completion time and counts. */
export async function completeReferenceImportRun(
  importRunId: string,
  input: CompleteImportRunInput,
  tx: AuditTx,
): Promise<void> {
  await tx.referenceImportRun.update({
    where: { id: importRunId },
    data: {
      status: input.status ?? "COMPLETED",
      completedAt: new Date(),
      rowsRead: input.rowsRead ?? null,
      rowsMapped: input.rowsMapped ?? null,
      notes: input.notes ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// ReferenceMapping — the raw → normalized bridge.
// ---------------------------------------------------------------------------

/**
 * Records the link from a raw Taksa source row to a normalized reference entity.
 * Every `map*` helper writes one of these so the normalized data is always
 * traceable to its source with an explicit mapping status.
 */
export async function getReferenceMapping(
  normalizedEntityType: string,
  normalizedEntityId: string,
  tx: AuditTx,
) {
  return tx.referenceMapping.findFirst({
    where: { normalizedEntityType, normalizedEntityId },
  });
}

async function writeMapping(
  provenance: SourceProvenance,
  normalizedEntityType: string,
  normalizedEntityId: string,
  mappingStatus: ReferenceMappingStatus,
  tx: AuditTx,
): Promise<string> {
  const created = await tx.referenceMapping.create({
    data: {
      sourceType: provenance.sourceType,
      rawTableName: provenance.rawTableName,
      rawRowId: provenance.rawRowId ?? null,
      rawRowOrder: provenance.rawRowOrder ?? null,
      rawCode: provenance.rawCode ?? null,
      normalizedEntityType,
      normalizedEntityId,
      mappingStatus,
      checksum: provenance.checksum ?? null,
      importRunId: provenance.importRunId ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

// ---------------------------------------------------------------------------
// Mapping helpers — each REQUIRES caller-supplied official values + provenance.
// ---------------------------------------------------------------------------

/** Result of a mapping operation: the normalized entity id + its mapping row id. */
export interface MapResult {
  entityId: string;
  mappingId: string;
}

export interface MapReferenceUnitInput {
  code: string;
  name: string;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized unit (واحد). */
export async function mapReferenceUnit(
  input: MapReferenceUnitInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const unit = await tx.referenceUnit.create({
    data: {
      code: input.code,
      name: input.name,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceUnit", unit.id, status, tx);
  return { entityId: unit.id, mappingId };
}

export interface MapReferenceItemInput {
  bookId: string;
  chapterId?: string | null;
  itemCode: string;
  shortDescription: string;
  fullDescription?: string | null;
  unitId?: string | null;
  /** Official فهرست‌بها unit price — REQUIRED, Decimal-only, caller-supplied. */
  unitPrice: DecimalInput;
  effectiveYear: number;
  rawJson?: Json;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized فهرست‌بها item with an official price. */
export async function mapReferenceItem(
  input: MapReferenceItemInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const unitPrice = toReferenceDecimal(input.unitPrice, "ReferenceItem.unitPrice");
  const item = await tx.referenceItem.create({
    data: {
      bookId: input.bookId,
      chapterId: input.chapterId ?? null,
      itemCode: input.itemCode,
      shortDescription: input.shortDescription,
      fullDescription: input.fullDescription ?? null,
      unitId: input.unitId ?? null,
      unitPrice: new Prisma.Decimal(unitPrice.toFixed(MONEY_SCALE)),
      effectiveYear: input.effectiveYear,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      rawRowOrder: provenance.rawRowOrder ?? null,
      rawJson: input.rawJson == null ? Prisma.JsonNull : (input.rawJson as Prisma.InputJsonValue),
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceItem", item.id, status, tx);
  return { entityId: item.id, mappingId };
}

export interface MapReferenceResourceInput {
  resourceCode: string;
  name: string;
  unitId?: string | null;
  /** Official منبع price — optional, Decimal-only when present, caller-supplied. */
  unitPrice?: DecimalInput | null;
  effectiveYear: number;
  rawJson?: Json;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized resource (منبع). */
export async function mapReferenceResource(
  input: MapReferenceResourceInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const unitPrice =
    input.unitPrice == null
      ? null
      : new Prisma.Decimal(
          toReferenceDecimal(input.unitPrice, "ReferenceResource.unitPrice").toFixed(MONEY_SCALE),
        );
  const resource = await tx.referenceResource.create({
    data: {
      resourceCode: input.resourceCode,
      name: input.name,
      unitId: input.unitId ?? null,
      unitPrice,
      effectiveYear: input.effectiveYear,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      rawRowOrder: provenance.rawRowOrder ?? null,
      rawJson: input.rawJson == null ? Prisma.JsonNull : (input.rawJson as Prisma.InputJsonValue),
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceResource", resource.id, status, tx);
  return { entityId: resource.id, mappingId };
}

export interface MapReferenceIndexPeriodInput {
  bookId?: string | null;
  chapterId?: string | null;
  itemId?: string | null;
  category?: string | null;
  year?: number | null;
  quarter?: number | null;
  month?: number | null;
  effectivePeriod?: string | null;
  /** Official شاخص value — REQUIRED, Decimal-only, caller-supplied. */
  indexValue: DecimalInput;
  rawJson?: Json;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized price index period (شاخص). */
export async function mapReferenceIndexPeriod(
  input: MapReferenceIndexPeriodInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const indexValue = toReferenceDecimal(input.indexValue, "ReferenceIndexPeriod.indexValue");
  const period = await tx.referenceIndexPeriod.create({
    data: {
      bookId: input.bookId ?? null,
      chapterId: input.chapterId ?? null,
      itemId: input.itemId ?? null,
      category: input.category ?? null,
      year: input.year ?? null,
      quarter: input.quarter ?? null,
      month: input.month ?? null,
      effectivePeriod: input.effectivePeriod ?? null,
      indexValue: new Prisma.Decimal(indexValue.toFixed(MONEY_SCALE)),
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      rawRowOrder: provenance.rawRowOrder ?? null,
      rawJson: input.rawJson == null ? Prisma.JsonNull : (input.rawJson as Prisma.InputJsonValue),
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceIndexPeriod", period.id, status, tx);
  return { entityId: period.id, mappingId };
}

export interface MapReferenceCircularInput {
  circularNo: string;
  title: string;
  issuedAt?: Date | null;
  effectiveDate?: Date | null;
  description?: string | null;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized circular (بخشنامه). */
export async function mapReferenceCircular(
  input: MapReferenceCircularInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const circular = await tx.referenceCircular.create({
    data: {
      circularNo: input.circularNo,
      title: input.title,
      issuedAt: input.issuedAt ?? null,
      effectiveDate: input.effectiveDate ?? null,
      description: input.description ?? null,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceCircular", circular.id, status, tx);
  return { entityId: circular.id, mappingId };
}

export interface MapReferenceCoefficientRuleInput {
  code: string;
  title: string;
  /** Official ضریب value — REQUIRED, Decimal-only, caller-supplied. */
  coefficientValue: DecimalInput;
  applicability?: Json;
  effectiveYear?: number | null;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized coefficient rule (ضرایب). */
export async function mapReferenceCoefficientRule(
  input: MapReferenceCoefficientRuleInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  const coefficientValue = toReferenceDecimal(
    input.coefficientValue,
    "ReferenceCoefficientRule.coefficientValue",
  );
  const rule = await tx.referenceCoefficientRule.create({
    data: {
      code: input.code,
      title: input.title,
      coefficientValue: new Prisma.Decimal(coefficientValue.toFixed(MONEY_SCALE)),
      applicability:
        input.applicability == null
          ? Prisma.JsonNull
          : (input.applicability as Prisma.InputJsonValue),
      effectiveYear: input.effectiveYear ?? null,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceCoefficientRule", rule.id, status, tx);
  return { entityId: rule.id, mappingId };
}

export interface MapReferenceDeductionRuleInput {
  code: string;
  title: string;
  /** Official کسورات rate (fraction) — Decimal-only when present, caller-supplied. */
  rate?: DecimalInput | null;
  /** Official کسورات fixed amount — Decimal-only when present, caller-supplied. */
  fixedValue?: DecimalInput | null;
  applicability?: Json;
  effectiveYear?: number | null;
  mappingStatus?: ReferenceMappingStatus;
}

/** Maps a raw source row to a normalized deduction rule (کسورات). */
export async function mapReferenceDeductionRule(
  input: MapReferenceDeductionRuleInput,
  provenance: SourceProvenance,
  tx: AuditTx,
): Promise<MapResult> {
  const status = input.mappingStatus ?? "MAPPED";
  if (input.rate == null && input.fixedValue == null) {
    throw new RangeError(
      "ReferenceDeductionRule requires at least one of `rate` or `fixedValue` (caller-supplied, never defaulted).",
    );
  }
  const rate =
    input.rate == null
      ? null
      : new Prisma.Decimal(
          toReferenceDecimal(input.rate, "ReferenceDeductionRule.rate").toFixed(MONEY_SCALE),
        );
  const fixedValue =
    input.fixedValue == null
      ? null
      : new Prisma.Decimal(
          toReferenceDecimal(input.fixedValue, "ReferenceDeductionRule.fixedValue").toFixed(
            MONEY_SCALE,
          ),
        );
  const rule = await tx.referenceDeductionRule.create({
    data: {
      code: input.code,
      title: input.title,
      rate,
      fixedValue,
      applicability:
        input.applicability == null
          ? Prisma.JsonNull
          : (input.applicability as Prisma.InputJsonValue),
      effectiveYear: input.effectiveYear ?? null,
      sourceId: provenance.sourceId ?? null,
      importRunId: provenance.importRunId ?? null,
      rawTableName: provenance.rawTableName,
      rawCode: provenance.rawCode ?? null,
      checksum: provenance.checksum ?? null,
      mappingStatus: status,
    },
    select: { id: true },
  });
  const mappingId = await writeMapping(provenance, "ReferenceDeductionRule", rule.id, status, tx);
  return { entityId: rule.id, mappingId };
}

// ---------------------------------------------------------------------------
// Lookups used by calculations / reports / validation / golden tests.
// ---------------------------------------------------------------------------

/** Looks up a فهرست‌بها item by its book/code/year natural key. */
export async function getReferenceItemByCode(
  bookId: string,
  itemCode: string,
  effectiveYear: number,
  tx: AuditTx,
) {
  return tx.referenceItem.findUnique({
    where: { bookId_itemCode_effectiveYear: { bookId, itemCode, effectiveYear } },
  });
}

/**
 * Looks up an index period (شاخص). Callers pass whatever period descriptors they
 * have; the most recent matching row is returned.
 */
export async function getIndexPeriod(
  where: { bookId?: string; itemId?: string; category?: string; year?: number; effectivePeriod?: string },
  tx: AuditTx,
) {
  return tx.referenceIndexPeriod.findFirst({
    where: {
      bookId: where.bookId,
      itemId: where.itemId,
      category: where.category,
      year: where.year,
      effectivePeriod: where.effectivePeriod,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Mapping-status lifecycle (explicit transitions).
// ---------------------------------------------------------------------------

/**
 * Allowed mapping-status transitions. A raw row enters as RAW, is normalized to
 * MAPPED, then human/golden-verified to VERIFIED. CONFLICT marks contradictory
 * source data; DEPRECATED retires superseded reference data. Transitions are
 * explicit so reference data provenance/quality is always auditable.
 */
export const REFERENCE_MAPPING_TRANSITIONS: Readonly<
  Record<ReferenceMappingStatus, readonly ReferenceMappingStatus[]>
> = {
  RAW: ["MAPPED", "CONFLICT", "DEPRECATED"],
  MAPPED: ["VERIFIED", "CONFLICT", "DEPRECATED"],
  VERIFIED: ["CONFLICT", "DEPRECATED"],
  CONFLICT: ["MAPPED", "DEPRECATED"],
  DEPRECATED: [],
} as const;

/** True iff `to` is a permitted next mapping status from `from`. */
export function canTransitionMappingStatus(
  from: ReferenceMappingStatus,
  to: ReferenceMappingStatus,
): boolean {
  return REFERENCE_MAPPING_TRANSITIONS[from].includes(to);
}
