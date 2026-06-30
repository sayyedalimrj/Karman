# Taksa Ingestion & Analysis (Phase 2)

Phase 2 adds **server-aware** ingestion and **safe analysis** of Taksa sources.
It builds the CLI, services, staging schema, and UI so that — **after
deployment** — an operator runs the commands against the real server data path.
Nothing assumes real Taksa files exist locally, and no official values are
imported.

## Pipeline

```text
raw Taksa files (server)
  → admin CLI / server action: discover + register  (TaksaDiscoveredFile)
  → admin CLI: analyze (safe analyzers)              (TaksaAnalysisRun + children)
  → PostgreSQL staging metadata                      (safe metadata only)
  → UI / API (reads PostgreSQL metadata only)
```

The website **never reads raw Taksa files at runtime** — it renders PostgreSQL
metadata produced by the analyzers. Raw files are inputs to the admin CLI /
server actions only.

## Data root

`KARMAN_DATA_ROOT` selects the root; the effective source directory is
`${KARMAN_DATA_ROOT}/incoming/taksa`.

- Local default: `<repo>/data`
- Production: `KARMAN_DATA_ROOT=/opt/civilic/data`
- Real server path: `/opt/karman-data/app-data`
- Symlink: `/opt/civilic/data` → `/opt/karman-data/app-data`

A shared resolver (`src/server/taksa/data-root.ts`) is the single place that
computes paths and converts absolute paths into **safe relative paths** — no
absolute path ever reaches the database or the UI.

## Server-side commands

```sh
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:discover
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:register-sources
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:analyze
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:db:inspect
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:scriptxml:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:sql:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:backup-strings:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:mdb:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:excel:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:docs:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run taksa:pdf:audit
KARMAN_DATA_ROOT=/opt/civilic/data npm run import:reference -- --dry-run
```

`npm run import:reference -- --apply` is **BLOCKED until Phase 3 mapping is
reviewed/approved.**

## Source-of-truth decision

| Role | Sources |
|------|---------|
| **Primary data** | `Faragamara_Taksa.DB` + `Faragamara_Taksa_Str.DB` |
| **Critical mapping** | `ScriptXML.sql` (OPENXML → target tables) |
| **Schema / static** | `myscr.sql`, `ScriptConst.sql`, `prj*.scp` |
| **Project/template candidates** | `SVZT/BRVT/PSNT.MDB`, `MSPSchema.mdb` |
| **UI / behavior** | `gws.ini`, `TAKSA.xml`, `tx_tips*.txt`, `read_msp.txt` |
| **Templates only** | Excel (`*.xls/*.xlsx`) — NOT master data |
| **Provenance** | PDFs — NOT auto-numeric import |
| **Report parity** | RPT (Crystal) — templates, not data |

Notes:

- **Excel = templates, not master data.** No numeric values are imported.
- **PDF = provenance, not numeric import.** No OCR, no value extraction.
- **RPT = templates, not data.** Crystal is never executed.
- A **full DB restore is desired later** but is currently **blocked by a backup
  password failure (SQL Server Msg 3279)**. Phase 2 proceeds without it, using
  SQL/SCP, ScriptXML, MDB, Excel templates, docs, and safe backup-string
  extraction. Manual restore tooling lives in `scripts/mssql/` (operator-run,
  isolated machine, not run by CI/tests).

## Staging models (PostgreSQL)

`TaksaDiscoveredFile`, `TaksaAnalysisRun`, `TaksaDetectedEntity`,
`TaksaScriptXmlMapping`, `TaksaUiLabel`, `TaksaBehaviorHint`. These store **only
safe metadata** and are separate from the raw-preservation models
(`TaksaArtifact/RawTable/RawRow`) and the normalized `Reference*` models.

## Permissions

All Taksa analysis UI pages require authentication. Platform-wide
analysis/register/import server actions require **SYSTEM_ADMIN**
(PROJECT_ADMIN and VIEWER are not allowed in Phase 2). The CLIs are documented
as admin-only server maintenance.
