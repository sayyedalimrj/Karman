# data/incoming/taksa

Raw **Taksa** source files are placed here on the server to be **discovered and
analyzed** by the Phase 2 ingestion/analysis tooling. They are ingestion/analyze
**inputs only** — never committed to git, and never read by the website at
runtime.

> **The web application NEVER reads raw Taksa files as a data source.** The UI
> reads **PostgreSQL metadata** produced by the analyzers. Raw files are read
> only by the admin CLI / server actions during discovery & analysis.

## Where this lives in production

- **Application data path:** `/opt/civilic/data/incoming/taksa`
- **Real server path:** `/opt/karman-data/app-data/incoming/taksa`
- **Symlink:** `/opt/civilic/data` → `/opt/karman-data/app-data`

The effective source directory is `${KARMAN_DATA_ROOT}/incoming/taksa`. Set
`KARMAN_DATA_ROOT` to point the CLI at the right root:

- Locally it defaults to `<repo>/data`.
- In production set `KARMAN_DATA_ROOT=/opt/civilic/data`.

## Folder layout

| Folder | Contents |
|--------|----------|
| `db/` | SQL Server backups (`Faragamara_Taksa.DB`, `…_Str.DB`) |
| `sql/` | SQL / SCP scripts (`ScriptXML.sql`, `myscr.sql`, `ScriptConst.sql`, `prj*.scp`) |
| `svzt/` `brvt/` `psnt/` | Round-trip estimate/BOQ/proposal files |
| `mdb/` | Access databases (`SVZT.MDB`, `BRVT.MDB`, `PSNT.MDB`, `MSPSchema.mdb`) |
| `dts/` | Legacy DTS import packages |
| `excel/` | Excel **templates** (`Fosool.xls`, `Mali.xls`, `resource_price.xlsx`, …) |
| `docs/` | UI/behavior config (`gws.ini`, `TAKSA.xml`, `tx_tips*.txt`, `read_msp.txt`) |
| `pdf/` | Official **provenance** PDFs |
| `rpt/` | Crystal Reports templates |
| `unknown/` | Anything not yet classified |

## Server-side commands (run after deployment, against the server data path)

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

`npm run import:reference -- --apply` remains **BLOCKED** until the Phase 3
mapping is reviewed and approved. No official numbers are imported from Excel or
PDF in Phase 2; the SQL Server full restore is currently blocked by a backup
password failure (SQL Server Msg 3279) and Phase 2 proceeds without it.

## Hygiene

Only `README.md` files are tracked here. All raw data files (`*.DB`, `*.bak`,
`*.mdb`, `*.svzt`, `*.brvt`, `*.psnt`, `*.dts`, `*.xls`, `*.xlsx`, `*.pdf`,
`*.rpt`, `*.scp`, `*.sql`, …) are git-ignored and must never be committed.
