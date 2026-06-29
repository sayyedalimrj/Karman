/**
 * Taksa RAW PRESERVATION service.
 *
 * Karman ingests legacy "Taksa" sources (the Taksa DB, SQL scripts,
 * SVZT/BRVT/PSNT files, Excel templates, official PDFs) for round-trip
 * interoperability. This module ships the *shape* of that interoperability and
 * its preservation guarantees — NOT the full SVZT/BRVT/PSNT parsing or export
 * logic (intentionally out of scope for the foundation).
 *
 * Preservation contract (Correctness Property CP7): for every raw row, after a
 * load→store cycle the original `rawTableName`, `tableOrder`, `rowOrder`, and
 * `rawJson` are byte-identical to the source. All application edits live in a
 * non-destructive `patchJson` overlay; the raw source is never mutated, so it
 * always remains reconstructable.
 *
 * ── Raw preservation vs Reference master data ──────────────────────────────
 * This module is the RAW PRESERVATION layer: its job is round-trip safety, so
 * Taksa rows are kept verbatim and are intentionally NOT usable business data.
 * The usable, normalized business/calculation form (فهرست‌بها items, units,
 * resources, indices, circulars, coefficients, deductions) lives in the
 * REFERENCE MASTER DATA layer (`src/server/reference`). `ReferenceMapping` is
 * the bridge that links a raw preserved row here to the normalized reference
 * entity it produced there.
 *
 * IMPORTANT: Taksa sources are first-class reference/master-data inputs, but
 * they are NEVER the runtime operational database — the operational store is
 * PostgreSQL via Prisma. Taksa-derived data is imported/mapped INTO PostgreSQL.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4 (and Correctness Property CP7)
 */
import { createHash } from "node:crypto";
import {
  Prisma,
  type TaksaExportStatus,
  type TaksaImportStatus,
} from "@prisma/client";
import type { AuditTx } from "@/server/audit";

/** JSON value type aligned with Prisma's Json columns. */
export type Json = Prisma.JsonValue;

/** A raw Taksa row as received from a source, before persistence. */
export interface RawRowInput {
  /** Original 0/1-based ordering within the table — PRESERVED verbatim. */
  rowOrder: number;
  /** Original row content — PRESERVED verbatim (never normalised). */
  rawJson: Json;
}

/** A raw Taksa table as received from a source, before persistence. */
export interface RawTableInput {
  /** Original Taksa table name — PRESERVED verbatim (never normalised). */
  rawTableName: string;
  /** Original table ordering — PRESERVED verbatim. */
  tableOrder: number;
  rawRows: RawRowInput[];
}

/** A preserved row: immutable raw fields plus a per-row checksum + overlay. */
export interface PreservedRow {
  rowOrder: number;
  rawJson: Json;
  /** Non-destructive overlay for edits; `null` until an edit is applied. */
  patchJson: Json | null;
  /** Per-row integrity hash over the canonical form of `rawJson`. */
  checksum: string;
}

/** A preserved table: immutable raw fields plus checksum and preserved rows. */
export interface PreservedTable {
  rawTableName: string;
  tableOrder: number;
  checksum: string;
  rawRows: PreservedRow[];
}

// ---------------------------------------------------------------------------
// Canonicalisation + checksums (pure)
// ---------------------------------------------------------------------------

/**
 * Produces a deterministic JSON string with object keys sorted recursively, so
 * checksums are stable regardless of key insertion order. Arrays preserve their
 * order (order is semantically meaningful and must be preserved).
 */
export function canonicalJson(value: Json): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item as Json));
  }
  if (value !== null && typeof value === "object") {
    const obj = value as { [k: string]: Json };
    const out: { [k: string]: Json } = {};
    for (const key of Object.keys(obj).sort()) {
      const child = obj[key];
      if (child !== undefined) out[key] = sortKeys(child);
    }
    return out;
  }
  return value;
}

/** SHA-256 hex checksum over the canonical JSON form of a value. */
export function checksumOf(value: Json): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

// ---------------------------------------------------------------------------
// Preservation logic (pure) — the heart of CP7
// ---------------------------------------------------------------------------

/**
 * Preserves a raw table for storage WITHOUT modifying any raw field. The
 * `rawTableName`, `tableOrder`, `rowOrder`, and `rawJson` values are carried
 * through unchanged; a per-row and per-table checksum is computed for integrity
 * verification. `patchJson` starts as `null` (no edits yet).
 *
 * This pure function models the "load→store" step the property test exercises.
 */
export function preserveTable(input: RawTableInput): PreservedTable {
  const rawRows: PreservedRow[] = input.rawRows.map((row) => ({
    rowOrder: row.rowOrder,
    rawJson: row.rawJson,
    patchJson: null,
    checksum: checksumOf(row.rawJson),
  }));

  return {
    rawTableName: input.rawTableName,
    tableOrder: input.tableOrder,
    checksum: checksumOf(
      rawRows.map((r) => ({ rowOrder: r.rowOrder, checksum: r.checksum })) as unknown as Json,
    ),
    rawRows,
  };
}

/**
 * Reconstructs the original raw table from preserved rows, returning `rawJson`
 * untouched and rows ordered by `rowOrder`. This is the round-trip
 * reconstruction helper: the output raw content equals the source byte-for-byte
 * (edits in `patchJson` are deliberately ignored here).
 */
export function reconstructTable(table: PreservedTable): RawTableInput {
  const rawRows = [...table.rawRows]
    .sort((a, b) => a.rowOrder - b.rowOrder)
    .map((row) => ({ rowOrder: row.rowOrder, rawJson: row.rawJson }));

  return {
    rawTableName: table.rawTableName,
    tableOrder: table.tableOrder,
    rawRows,
  };
}

/**
 * Applies a non-destructive edit to a preserved row. The raw fields (`rowOrder`,
 * `rawJson`, `checksum`) are returned UNCHANGED; the edit is recorded only in
 * `patchJson`. Returns a new object (no in-place mutation).
 */
export function applyPatch(row: PreservedRow, patch: Json): PreservedRow {
  return {
    rowOrder: row.rowOrder,
    rawJson: row.rawJson,
    checksum: row.checksum,
    patchJson: patch,
  };
}

/**
 * Computes the effective (edited) view of a row by overlaying `patchJson` on top
 * of `rawJson`, WITHOUT mutating either. When both are JSON objects the patch
 * keys win; otherwise the patch (if present) replaces the raw value. The stored
 * `rawJson` is never altered by this operation.
 */
export function effectiveRow(row: PreservedRow): Json {
  if (row.patchJson == null) return row.rawJson;
  const raw = row.rawJson;
  const patch = row.patchJson;
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    patch !== null &&
    typeof patch === "object" &&
    !Array.isArray(patch)
  ) {
    return { ...(raw as object), ...(patch as object) } as Json;
  }
  return patch;
}

/**
 * Verifies a preserved row's stored checksum still matches its `rawJson` —
 * useful for round-trip integrity checks.
 */
export function verifyRowChecksum(row: PreservedRow): boolean {
  return row.checksum === checksumOf(row.rawJson);
}

// ---------------------------------------------------------------------------
// Import / export status helpers (placeholder lifecycle, no parsing/export)
// ---------------------------------------------------------------------------

/** True once an artifact has been fully imported. */
export function isImported(status: TaksaImportStatus): boolean {
  return status === ("IMPORTED" as TaksaImportStatus);
}

/** True once an artifact has been fully exported. */
export function isExported(status: TaksaExportStatus): boolean {
  return status === ("EXPORTED" as TaksaExportStatus);
}

// ---------------------------------------------------------------------------
// Persistence contracts (placeholders) — operate on the real Prisma models
// ---------------------------------------------------------------------------

/**
 * Persists a preserved table and its rows under an existing artifact, inside
 * the caller's transaction, WITHOUT altering any raw field. This is a
 * placeholder contract: it stores the preserved raw content + checksums but
 * performs NO SVZT/BRVT/PSNT parsing. The operational system never runs against
 * Taksa; this only stages reference/import data.
 */
export async function persistPreservedTable(
  artifactId: string,
  table: PreservedTable,
  tx: AuditTx,
): Promise<string> {
  const created = await tx.taksaRawTable.create({
    data: {
      artifactId,
      rawTableName: table.rawTableName,
      tableOrder: table.tableOrder,
      checksum: table.checksum,
      rawRows: {
        create: table.rawRows.map((row) => ({
          rowOrder: row.rowOrder,
          rawJson: row.rawJson as Prisma.InputJsonValue,
          patchJson:
            row.patchJson == null
              ? Prisma.JsonNull
              : (row.patchJson as Prisma.InputJsonValue),
          checksum: row.checksum,
        })),
      },
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Records a non-destructive edit to a stored raw row by writing ONLY its
 * `patchJson`. The immutable `rawJson` (and `rowOrder`, `rawTableName`) are
 * never touched, upholding the preservation contract.
 */
export async function persistRowPatch(
  rawRowId: string,
  patch: Json,
  tx: AuditTx,
): Promise<void> {
  await tx.taksaRawRow.update({
    where: { id: rawRowId },
    data: { patchJson: patch as Prisma.InputJsonValue },
  });
}
