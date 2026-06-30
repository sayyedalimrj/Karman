# data/incoming/taksa/mdb

Access databases (`SVZT.MDB`, `BRVT.MDB`, `PSNT.MDB`, `MSPSchema.mdb`). Analyzed
by `taksa:mdb:audit` (signature + best-effort metadata; records
`MDB_METADATA_EXTRACTION_UNAVAILABLE` when no extractor is present). **No
official values are imported.** Raw files are ingestion/analyze inputs only;
they are git-ignored and never read by the website (the UI reads PostgreSQL
metadata). See `../README.md`.
