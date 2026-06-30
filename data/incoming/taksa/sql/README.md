# data/incoming/taksa/sql

Taksa SQL / SCP scripts (`ScriptXML.sql`, `myscr.sql`, `ScriptConst.sql`,
`prj*.scp`). Analyzed statically by `taksa:scriptxml:audit` and `taksa:sql:audit`
— **parsed as text, never executed**. Raw files are ingestion/analyze inputs
only; they are git-ignored and never read by the website (the UI reads
PostgreSQL metadata). See `../README.md`.
