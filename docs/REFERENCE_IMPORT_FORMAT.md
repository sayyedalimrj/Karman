# Canonical Reference Import Format

This document defines the canonical files the reference importer accepts. Drop
files into `data/incoming/reference/` and run the importer:

```bash
npm run import:reference                 # dry-run: validate only (no DB writes)
npm run import:reference -- --apply --source-id <id> --import-run-id <id>
```

## Rules (hard constraints)

- **No fabricated data.** Every value must come from a real Taksa/official
  source. The importer never seeds or invents values and never runs at app
  startup.
- **Numeric reference values are decimal STRINGS.** `unitPrice`, `indexValue`,
  `coefficientValue`, `rate`, and `fixedValue` MUST be strings (e.g.
  `"152340.7500"`). A JSON number is rejected by the schema (no float, no
  coercion).
- **Provenance required for a real run.** A non-dry-run requires an explicit
  `--source-id` (a registered `ReferenceSource`) and `--import-run-id` (an open
  `ReferenceImportRun`).
- **Formats:** each file is `<kind>.json` (an array of record objects) or
  `<kind>.csv` (header row + rows). In CSV, the integer fields `effectiveYear`,
  `order`, `year`, `quarter`, `month` are parsed as numbers; all other cells are
  strings (so codes such as `010101` keep their leading zeros).

## File kinds and fields

| File | Required fields | Optional fields |
|------|-----------------|-----------------|
| `reference-sources` | `sourceType`, `name` | `originalFileName`, `originalDbName`, `originalScriptName`, `checksum`, `notes` |
| `reference-books` | `bookType`, `code`, `title`, `effectiveYear` | `rawCode` |
| `reference-chapters` | `bookCode`, `code`, `title`, `order` | `rawCode` |
| `reference-units` | `code`, `name` | — |
| `reference-items` | `bookCode`, `itemCode`, `shortDescription`, `unitPrice` (string), `effectiveYear` | `chapterCode`, `fullDescription`, `unitCode` |
| `reference-resources` | `resourceCode`, `name`, `effectiveYear` | `unitCode`, `unitPrice` (string) |
| `reference-index-periods` | `indexValue` (string) | `category`, `bookCode`, `year`, `quarter`, `month`, `effectivePeriod` |
| `reference-circulars` | `circularNo`, `title` | `description` |
| `reference-coefficients` | `code`, `title`, `coefficientValue` (string) | `effectiveYear` |
| `reference-deductions` | `code`, `title`, at least one of `rate`/`fixedValue` (string) | `effectiveYear` |

### Enums

- `sourceType`: `TAKSA_DB`, `TAKSA_SQL_SCRIPT`, `SVZT`, `BRVT`, `PSNT`, `EXCEL`,
  `PDF_OFFICIAL_DOC`, `MANUAL_VERIFIED`.
- `bookType`: `PRICE_LIST`, `INDEX`, `RESOURCE`, `CIRCULAR`, `COEFFICIENT`,
  `DEDUCTION`, `OTHER`.

## Example — `reference-items.json`

```json
[
  {
    "bookCode": "ABNIE",
    "itemCode": "010101",
    "shortDescription": "<from source>",
    "unitCode": "M3",
    "unitPrice": "<decimal string from source>",
    "effectiveYear": 1403
  }
]
```

> The example uses placeholders for official values on purpose — no real
> فهرست‌بها/شاخص numbers are committed to the repository.

## What is implemented vs deferred

- **Implemented (this foundation):** typed schemas per file, file discovery,
  JSON/CSV parsing, strict validation, dry-run reporting, clear no-files
  failure, and JS-number rejection.
- **Deferred:** full row insertion is delegated to the `src/server/reference`
  mapping contracts (the future importer step), so partially-validated data is
  never written.
