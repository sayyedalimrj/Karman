# data/incoming/reference

Drop canonical reference-data files here to be validated and imported by the
reference importer (`npm run import:reference`). See
[`docs/REFERENCE_IMPORT_FORMAT.md`](../../../docs/REFERENCE_IMPORT_FORMAT.md)
for the accepted file names, formats (`.json` / `.csv`), and field contracts.

**Nothing real is committed here.** Only this README is tracked; all actual
incoming data files are git-ignored. Numeric reference values (unit prices,
index values, coefficients, rates) MUST be provided as decimal **strings** —
a JSON number is rejected by the importer.
