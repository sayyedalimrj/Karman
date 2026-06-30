# Taksa Compatibility

Karman interoperates with legacy **Taksa** sources at two distinct layers:

1. **Raw preservation** — byte-stable round-trip safety (`src/server/taksa`).
2. **Reference master data** — usable, normalized business/calculation data
   mapped into PostgreSQL (`src/server/reference`; see
   [`REFERENCE_DATA.md`](./REFERENCE_DATA.md)).

> **Taksa sources are first-class source/reference/master-data inputs. They are
> not ignored. They are not the live runtime operational database, but their
> data must be imported/mapped into PostgreSQL and used by calculations,
> reports, validation, and golden tests.**

The operational runtime database is, and remains, **PostgreSQL** (via Prisma).
Taksa-derived data is imported/mapped *into* PostgreSQL.

## Sources in scope

Taksa DB, Taksa SQL scripts, SVZT/BRVT/PSNT files, Excel templates, official
PDF documents, and the extracted research package
(`docs/taksa-map/`).

## The pipeline

```text
Taksa sources
   → staging / extraction
   → RAW PRESERVATION layer        (src/server/taksa — TaksaArtifact/RawTable/RawRow)
   → REFERENCE MAPPING layer       (src/server/reference — map* contracts)
   → normalized PostgreSQL tables  (Reference* models)
   → calculations / reports / validation / golden tests
```

## Layer 1 — Raw preservation (round-trip safety)

Models: `TaksaArtifact`, `TaksaRawTable`, `TaksaRawRow`.

Preservation contract (Correctness Property CP7):

1. `TaksaRawTable.rawTableName` keeps the original Taksa table name verbatim
   (never normalized).
2. `TaksaRawTable.tableOrder` and `TaksaRawRow.rowOrder` preserve ordering;
   `@@unique` constraints enforce stability.
3. `TaksaRawRow.rawJson` stores the original row content unmodified; edits are
   recorded only in `patchJson` (non-destructive overlay), so the source stays
   reconstructable.
4. `checksum` fields (artifact/table/row) support integrity and round-trip
   equality verification.
5. `importStatus` / `exportStatus` track lifecycle without coupling to the
   operational workflow state.

Raw preservation is intentionally **not** usable business data — it exists so a
Taksa source can be reproduced faithfully.

## Layer 2 — Reference master data (usable, normalized)

The mapping layer turns preserved/extracted Taksa rows into normalized
PostgreSQL reference tables (فهرست‌بها items, units, resources, شاخص indices,
بخشنامه circulars, ضرایب coefficients, کسورات deductions). `ReferenceMapping` is
the bridge: it links a raw source row (source type, raw table name, raw
code/row order, checksum) to the normalized entity it produced.

Full model, enum, provenance, and lifecycle documentation lives in
[`REFERENCE_DATA.md`](./REFERENCE_DATA.md).

## Operational vs reference data

| Aspect | Operational runtime data | Reference / master data |
|--------|--------------------------|--------------------------|
| Examples | User, Project, Contract, WorkflowCase, AuditLog | فهرست‌بها items, units, resources, indices, circulars, coefficients, deductions |
| Source of truth | PostgreSQL (live) | Imported/mapped from Taksa/official sources into PostgreSQL |
| Mutability | Transactional, workflow-driven | Versioned by import run + mapping status |
| Origin | Created by users in-app | Mapped from Taksa sources with provenance |

## Hard rule — no hard-coded official values

Official values (شاخص / فهرست‌بها / ردیف / واحد / منبع / ضریب / کسورات /
بخشنامه / تعدیل) must come from imported/mapped reference data — **never** code
constants. Every `map*` contract requires the caller to supply the value
(sourced from a real import). No sample/fake official numbers are seeded.

## What is intentionally NOT implemented yet

- Full Taksa DB restore / live connection.
- SVZT/BRVT/PSNT binary parsing.
- Official PDF parsing/extraction of values.
- Export serialization back to Taksa formats.

These importers are future work; they will call the existing contracts in
`src/server/reference` and the preservation helpers in `src/server/taksa` so the
reference tables can be populated without schema rework. Export to Taksa is only
reachable through the workflow (`EXPORT_READY → EXPORTED_TO_TAKSA`) and is fully
audited.

## Repository hygiene

Raw Taksa material is never committed. See `.gitignore` (and Requirement 12):
`*.DB/*.MDB/*.mdb`, `*.svzt/*.brvt/*.psnt`, `*.bak/*.backup`, recovered text
dumps, binaries, archives (`*.zip/*.rar/*.7z`), and `private-assets/`.
