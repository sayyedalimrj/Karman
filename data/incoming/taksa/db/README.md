# data/incoming/taksa/db

SQL Server backups (`Faragamara_Taksa.DB`, `Faragamara_Taksa_Str.DB`).

Analyzed by `taksa:db:inspect` (header/metadata only) and
`taksa:backup-strings:audit` (safe candidate strings). **No restore** is
performed — full restore is blocked by SQL Server Msg 3279 (backup password).
Raw files are ingestion/analyze inputs only; they are git-ignored and never read
by the website (the UI reads PostgreSQL metadata). See `../README.md`.
