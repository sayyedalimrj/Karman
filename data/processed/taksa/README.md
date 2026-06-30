# data/processed/taksa

Analyzer **outputs** (JSON / CSV / Markdown) written by the Taksa analysis CLIs.
These are derived artifacts — they contain only safe metadata (relative paths,
checksums, detected structure, counts), never raw file content, official
values, or secrets.

| Folder | Producer |
|--------|----------|
| `audit/` | `taksa:discover` (discovery inventory) |
| `db-audit/` | `taksa:db:inspect` |
| `scriptxml/` | `taksa:scriptxml:audit` |
| `sql-static/` | `taksa:sql:audit` |
| `backup-strings/` | `taksa:backup-strings:audit` |
| `mdb/` | `taksa:mdb:audit` |
| `excel/` | `taksa:excel:audit` |
| `docs/` | `taksa:docs:audit` |
| `pdf/` | `taksa:pdf:audit` |
| `dts/` | `taksa:dts:audit` |
| `rpt/` | `taksa:rpt:audit` |

The website does **not** read these files at runtime; analyzers persist a
summary to PostgreSQL and the UI reads that. Only `README.md` is tracked; all
generated outputs are git-ignored.
