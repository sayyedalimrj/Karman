/**
 * Integration tests for the Reference Master Data layer (DB-backed).
 *
 * Gated by RUN_DB_TESTS=1 (see vitest.config.ts). These verify the
 * Taksa-source → normalized-PostgreSQL mapping behaviour end-to-end:
 *   - Source provenance (sourceType / rawTableName / rawCode / checksum) is
 *     preserved onto the normalized entity AND the ReferenceMapping row.
 *   - Every map* helper writes a ReferenceMapping linking the raw source info
 *     to the normalized entity (correct normalizedEntityType / normalizedEntityId).
 *   - Reference numerics persist as Decimal (exact), never float.
 *   - Mapping status is explicit on the persisted rows.
 *
 * **Validates: Requirements 9.2, 9.3, 9.4, 8.2**
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { prisma } from "@/server/db";
import { Decimal } from "@/lib/money";
import {
  createReferenceSource,
  startReferenceImportRun,
  completeReferenceImportRun,
  mapReferenceUnit,
  mapReferenceItem,
  mapReferenceResource,
  mapReferenceIndexPeriod,
  mapReferenceCircular,
  mapReferenceCoefficientRule,
  mapReferenceDeductionRule,
  getReferenceItemByCode,
  getIndexPeriod,
  getReferenceMapping,
  type SourceProvenance,
} from "./index";

async function cleanup(): Promise<void> {
  await prisma.referenceMapping.deleteMany({});
  await prisma.referenceItem.deleteMany({});
  await prisma.referenceChapter.deleteMany({});
  await prisma.referenceResource.deleteMany({});
  await prisma.referenceIndexPeriod.deleteMany({});
  await prisma.referenceCircular.deleteMany({});
  await prisma.referenceCoefficientRule.deleteMany({});
  await prisma.referenceDeductionRule.deleteMany({});
  await prisma.referenceUnit.deleteMany({});
  await prisma.referenceBook.deleteMany({});
  await prisma.referenceImportRun.deleteMany({});
  await prisma.referenceSource.deleteMany({});
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("reference mapping preserves provenance and links raw→normalized", () => {
  it("maps a فهرست‌بها item with full provenance and a mapping row", async () => {
    const result = await prisma.$transaction(async (tx) => {
      const sourceId = await createReferenceSource(
        {
          sourceType: "TAKSA_DB",
          name: "Taksa Master DB 1403",
          originalDbName: "taksa_master.DB",
          checksum: "src-checksum-abc",
        },
        tx,
      );
      const importRunId = await startReferenceImportRun(sourceId, tx, "initial item import");

      const book = await tx.referenceBook.create({
        data: {
          bookType: "PRICE_LIST",
          code: "ABNIE",
          title: "فهرست‌بهای ابنیه",
          effectiveYear: 1403,
          sourceId,
          importRunId,
          mappingStatus: "MAPPED",
        },
        select: { id: true },
      });

      const provenance: SourceProvenance = {
        sourceType: "TAKSA_DB",
        sourceId,
        importRunId,
        rawTableName: "tblFehrestItems",
        rawRowOrder: 42,
        rawCode: "010101",
        checksum: "row-checksum-xyz",
      };

      const { entityId: unitId } = await mapReferenceUnit(
        { code: "M3", name: "مترمکعب" },
        { ...provenance, rawTableName: "tblUnits", rawCode: "M3" },
        tx,
      );

      const { entityId: itemId, mappingId } = await mapReferenceItem(
        {
          bookId: book.id,
          itemCode: "010101",
          shortDescription: "خاکبرداری",
          unitId,
          // Official value is CALLER-SUPPLIED (would come from the real import),
          // never a constant baked into the service.
          unitPrice: "152340.7500",
          effectiveYear: 1403,
          rawJson: { code: "010101", price: "152340.75" },
        },
        provenance,
        tx,
      );

      await completeReferenceImportRun(importRunId, { rowsRead: 1, rowsMapped: 1 }, tx);

      return { itemId, mappingId, unitId };
    });

    // Provenance preserved on the normalized entity.
    const item = await prisma.referenceItem.findUniqueOrThrow({ where: { id: result.itemId } });
    expect(item.rawTableName).toBe("tblFehrestItems");
    expect(item.rawCode).toBe("010101");
    expect(item.rawRowOrder).toBe(42);
    expect(item.checksum).toBe("row-checksum-xyz");
    expect(item.mappingStatus).toBe("MAPPED");
    // Decimal-exact value (never a float).
    expect(new Decimal(item.unitPrice.toString()).equals(new Decimal("152340.75"))).toBe(true);

    // ReferenceMapping links raw source info → normalized entity.
    const mapping = await prisma.referenceMapping.findUniqueOrThrow({
      where: { id: result.mappingId },
    });
    expect(mapping.sourceType).toBe("TAKSA_DB");
    expect(mapping.rawTableName).toBe("tblFehrestItems");
    expect(mapping.rawCode).toBe("010101");
    expect(mapping.normalizedEntityType).toBe("ReferenceItem");
    expect(mapping.normalizedEntityId).toBe(result.itemId);
    expect(mapping.checksum).toBe("row-checksum-xyz");
  });

  it("maps resources, indices, circulars, coefficients and deductions with mappings", async () => {
    const ids = await prisma.$transaction(async (tx) => {
      const sourceId = await createReferenceSource(
        { sourceType: "EXCEL", name: "Resources template" },
        tx,
      );
      const importRunId = await startReferenceImportRun(sourceId, tx);
      const base: SourceProvenance = {
        sourceType: "EXCEL",
        sourceId,
        importRunId,
        rawTableName: "Sheet1",
        rawCode: "R-1",
      };

      const res = await mapReferenceResource(
        { resourceCode: "CEM-1", name: "سیمان", unitPrice: "8500.0000", effectiveYear: 1403 },
        base,
        tx,
      );
      const idx = await mapReferenceIndexPeriod(
        { category: "ابنیه", year: 1403, quarter: 1, indexValue: "1.2345" },
        { ...base, rawCode: "IDX-1" },
        tx,
      );
      const circ = await mapReferenceCircular(
        { circularNo: "96/1234", title: "بخشنامه تعدیل" },
        { ...base, rawTableName: "tblCirculars", rawCode: "96/1234" },
        tx,
      );
      const coef = await mapReferenceCoefficientRule(
        { code: "BALASARI", title: "ضریب بالاسری", coefficientValue: "1.3000", effectiveYear: 1403 },
        { ...base, rawCode: "COEF-1" },
        tx,
      );
      const ded = await mapReferenceDeductionRule(
        { code: "BIME", title: "کسر بیمه", rate: "0.0500", effectiveYear: 1403 },
        { ...base, rawCode: "DED-1" },
        tx,
      );
      return { res, idx, circ, coef, ded };
    });

    // Each map* produced a ReferenceMapping with the right normalized type.
    for (const [type, r] of [
      ["ReferenceResource", ids.res],
      ["ReferenceIndexPeriod", ids.idx],
      ["ReferenceCircular", ids.circ],
      ["ReferenceCoefficientRule", ids.coef],
      ["ReferenceDeductionRule", ids.ded],
    ] as const) {
      const mapping = await prisma.referenceMapping.findUniqueOrThrow({ where: { id: r.mappingId } });
      expect(mapping.normalizedEntityType).toBe(type);
      expect(mapping.normalizedEntityId).toBe(r.entityId);
      expect(mapping.sourceType).toBe("EXCEL");
    }

    // Decimal-exact reference numerics.
    const ded = await prisma.referenceDeductionRule.findUniqueOrThrow({ where: { id: ids.ded.entityId } });
    expect(new Decimal(ded.rate!.toString()).equals(new Decimal("0.05"))).toBe(true);
    const idx = await prisma.referenceIndexPeriod.findUniqueOrThrow({ where: { id: ids.idx.entityId } });
    expect(new Decimal(idx.indexValue.toString()).equals(new Decimal("1.2345"))).toBe(true);
  });

  it("looks up items, indices and mappings via the read contracts", async () => {
    const { bookId } = await prisma.$transaction(async (tx) => {
      const sourceId = await createReferenceSource(
        { sourceType: "TAKSA_SQL_SCRIPT", name: "lookup script" },
        tx,
      );
      const importRunId = await startReferenceImportRun(sourceId, tx);
      const book = await tx.referenceBook.create({
        data: { bookType: "PRICE_LIST", code: "MECH", title: "مکانیک", effectiveYear: 1402 },
        select: { id: true },
      });
      await mapReferenceItem(
        {
          bookId: book.id,
          itemCode: "200101",
          shortDescription: "لوله",
          unitPrice: "99999.9999",
          effectiveYear: 1402,
        },
        { sourceType: "TAKSA_SQL_SCRIPT", sourceId, importRunId, rawTableName: "tblItems", rawCode: "200101" },
        tx,
      );
      await mapReferenceIndexPeriod(
        { bookId: book.id, year: 1402, indexValue: "2.5000" },
        { sourceType: "TAKSA_SQL_SCRIPT", sourceId, importRunId, rawTableName: "tblIndex", rawCode: "I2" },
        tx,
      );
      return { bookId: book.id };
    });

    const found = await getReferenceItemByCode(bookId, "200101", 1402, prisma);
    expect(found).not.toBeNull();
    expect(found!.shortDescription).toBe("لوله");

    const idx = await getIndexPeriod({ bookId, year: 1402 }, prisma);
    expect(idx).not.toBeNull();

    const mapping = await getReferenceMapping("ReferenceItem", found!.id, prisma);
    expect(mapping).not.toBeNull();
    expect(mapping!.rawTableName).toBe("tblItems");
  });

  it("rejects a deduction rule with neither rate nor fixedValue", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const sourceId = await createReferenceSource(
          { sourceType: "MANUAL_VERIFIED", name: "bad deduction" },
          tx,
        );
        await mapReferenceDeductionRule(
          { code: "EMPTY", title: "no values" },
          { sourceType: "MANUAL_VERIFIED", sourceId, rawTableName: "manual" },
          tx,
        );
      }),
    ).rejects.toThrow(/at least one of/);
  });
});
