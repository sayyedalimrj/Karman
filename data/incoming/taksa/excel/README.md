# data/incoming/taksa/excel

Excel **templates** (`Fosool.xls`, `Mali.xls`, `Rizmertreh.xls`,
`kholaseh_metreh.xls`, `rzmt_act.xls`, `resource_price.xlsx`). Analyzed by
`taksa:excel:audit` for sheet/header metadata + template classification.
**Excel = templates, not master data: no numeric values are imported.** Raw
files are ingestion/analyze inputs only; they are git-ignored and never read by
the website (the UI reads PostgreSQL metadata). See `../README.md`.
