# Reference Master Data

This document describes the **reference master-data layer**: how Taksa-derived
data becomes usable, normalized reference/master data inside PostgreSQL.

It complements [`TAKSA_COMPATIBILITY.md`](./TAKSA_COMPATIBILITY.md) (which covers
both the raw preservation layer and this layer) and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) (which places the pipeline in the overall
system).

## Why this layer exists

Taksa sources are **first-class source/reference/master-data inputs**. Their
official data (فهرست‌بها prices, units, resources, شاخص indices, بخشنامه
circulars, ضرایب coefficients, کسورات deductions) must be importable and mapped
into the **PostgreSQL operational runtime database** so that calculations,
reports, validation, and golden tests can rely on real values.

- **PostgreSQL remains the operational runtime DB.** Taksa is never the live DB.
- **Raw preservation** (`src/server/taksa`) keeps Taksa rows byte-for-byte for
  round-trip safety — not usable business data.
- **Reference master data** (`src/server/reference`) is the usable normalized
  form. `ReferenceMapping` bridges raw rows → normalized entities.

## Pipeline

```text
Taksa sources → staging/extraction → raw preservation → reference mapping
   → normalized PostgreSQL Reference* tables → calc / reports / validation / golden tests
```

## Models

Provenance roots:

| Model | Purpose |
|-------|---------|
| `ReferenceSource` | A registered Taksa-derived source, typed by `ReferenceSourceType`; keeps `originalFileName` / `originalDbName` / `originalScriptName` and a `checksum`. |
| `ReferenceImportRun` | One import execution against a source; tracks `status`, timing, and row counts. |

Normalized reference entities (all carry provenance + `mappingStatus`):

| Model | Domain (FA) | Key numeric (Decimal 18,4) |
|-------|-------------|----------------------------|
| `ReferenceBook` / `ReferenceChapter` | کتاب/فصل فهرست‌بها | — |
| `ReferenceUnit` | واحد | — |
| `ReferenceItem` | ردیف فهرست‌بها | `unitPrice` |
| `ReferenceResource` | منبع | `unitPrice` (optional) |
| `ReferenceIndexPeriod` | شاخص | `indexValue` |
| `ReferenceCircular` | بخشنامه | — |
| `ReferenceCoefficientRule` | ضریب | `coefficientValue` |
| `ReferenceDeductionRule` | کسورات | `rate`, `fixedValue` |

Bridge:

| Model | Purpose |
|-------|---------|
| `ReferenceMapping` | Links a raw source row (`sourceType`, `rawTableName`, `rawRowId`/`rawRowOrder`/`rawCode`, `checksum`) to a normalized entity (`normalizedEntityType`, `normalizedEntityId`) with a `mappingStatus`. Indexed on `(normalizedEntityType, normalizedEntityId)` and `(rawTableName, rawCode)`. |

## Enums

- **`ReferenceSourceType`**: `TAKSA_DB`, `TAKSA_SQL_SCRIPT`, `SVZT`, `BRVT`,
  `PSNT`, `EXCEL`, `PDF_OFFICIAL_DOC`, `MANUAL_VERIFIED`.
- **`ReferenceBookType`**: `PRICE_LIST`, `INDEX`, `RESOURCE`, `CIRCULAR`,
  `COEFFICIENT`, `DEDUCTION`, `OTHER`.
- **`ReferenceMappingStatus`**: `RAW`, `MAPPED`, `VERIFIED`, `CONFLICT`,
  `DEPRECATED`.

## Provenance fields

Normalized entities and the mapping carry, where relevant:

- `sourceId` / `importRunId` — which source and import run produced the row.
- `rawTableName` — original Taksa table name (verbatim).
- `rawCode` / `rawRowOrder` — original code/key and ordering.
- `rawJson` — original raw row content (where retained on the entity).
- `checksum` — integrity hash of the raw source row.
- `mappingStatus` — current lifecycle state.

## Mapping-status lifecycle

```text
RAW ──▶ MAPPED ──▶ VERIFIED
  │        │           │
  ├────────┴───────────┴──▶ CONFLICT ──▶ (back to MAPPED) or DEPRECATED
  └───────────────────────▶ DEPRECATED (terminal)
```

- `RAW` — raw source row registered, not yet normalized.
- `MAPPED` — normalized into a reference entity.
- `VERIFIED` — confirmed by a human/golden check.
- `CONFLICT` — contradictory source data detected.
- `DEPRECATED` — superseded/retired (terminal).

Transitions are explicit (`REFERENCE_MAPPING_TRANSITIONS` /
`canTransitionMappingStatus`) so reference-data quality is always auditable.

## Service contracts (`src/server/reference`)

- Lifecycle: `createReferenceSource`, `startReferenceImportRun`,
  `completeReferenceImportRun`.
- Mapping: `mapReferenceUnit`, `mapReferenceItem`, `mapReferenceResource`,
  `mapReferenceIndexPeriod`, `mapReferenceCircular`,
  `mapReferenceCoefficientRule`, `mapReferenceDeductionRule`. Each carries source
  provenance, sets an explicit `mappingStatus`, and writes a `ReferenceMapping`.
- Lookups: `getReferenceItemByCode`, `getIndexPeriod`, `getReferenceMapping`.
- Decimal guard: `toReferenceDecimal` reuses `assertNotNumber` from
  `src/lib/money` so a JS `number` is rejected for any reference numeric.

## The rule: official values come from imports, never code

Official values (شاخص / فهرست‌بها / ردیف / واحد / منبع / ضریب / کسورات /
بخشنامه / تعدیل) **must** originate from imported/mapped reference data. Every
`map*` helper requires the caller to supply the value; none default or invent a
numeric reference value, and the codebase contains no seeded official numbers
(enforced by a guard test that scans the service for numeric literals).

All reference numerics are `Decimal @db.Decimal(18,4)` — never Float/Int/number
(enforced by `npm run check:decimal`).

## Intentionally NOT implemented yet

- Full Taksa DB restore / live connection.
- SVZT/BRVT/PSNT binary parsers.
- Official PDF value extraction.
- Export serialization back to Taksa formats.

Future importers will call these contracts to populate the reference tables
without schema rework.
