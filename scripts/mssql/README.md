# MSSQL manual restore & deep-audit tooling

These scripts are **manual, operator-run** tooling for an **isolated** SQL
Server machine. They are documentation/maintenance aids — **they are NOT run by
CI or by the test suite**, and they never touch the production PostgreSQL
database.

> Status: the Taksa SQL Server full restore is currently **blocked by a backup
> password failure (SQL Server Msg 3279)**. Phase 2 proceeds WITHOUT a restore,
> using the cross-platform analyzers (`npm run taksa:*`). These scripts exist so
> that, once a valid backup password is available, an operator can restore the
> backups into isolated **READ_ONLY** audit databases and extract schema/metadata.

## Files

| File | Purpose |
|------|---------|
| `restore-headeronly.sql` | `RESTORE HEADERONLY` — inspect backup header (no restore). |
| `restore-filelistonly.sql` | `RESTORE FILELISTONLY` — list logical files (no restore). |
| `restore-taksa-backups.ps1` | Plan/perform restore into isolated READ_ONLY DBs. |
| `deep-db-audit.sql` | Extract SCHEMA/metadata only (no data rows by default). |
| `export-deep-db-audit.ps1` | Run `deep-db-audit.sql` and export results to CSV. |

## Safety rules (enforced by the scripts)

- **Plan-only by default.** `restore-taksa-backups.ps1` prints the plan and does
  nothing unless `-ConfirmRestore` is passed.
- **Password is never echoed, logged, or written to disk.** `-BackupPassword` is
  a `SecureString`; it is passed to `RESTORE ... WITH PASSWORD` only.
- **Never overwrites an existing database** unless `-Force` is given.
- **Restores into isolated READ_ONLY databases** `KarmanAudit_Taksa_Data` and
  `KarmanAudit_Taksa_Str` — never into a production database.
- **Never connects to production PostgreSQL** and **never executes Taksa SQL
  scripts as mutations** — `deep-db-audit.sql` is read-only metadata extraction.
- **No data rows by default** — `deep-db-audit.sql` extracts table/column/key/
  index/module metadata and (optional) row COUNTS only.

## Example (isolated machine only)

```powershell
# 1) Inspect header / file list (no restore)
sqlcmd -S .\SQLEXPRESS -i restore-headeronly.sql -v BackupPath="D:\taksa\Faragamara_Taksa.DB"

# 2) Plan the restore (no changes made)
./restore-taksa-backups.ps1 -BackupDir "D:\taksa" -SqlInstance ".\SQLEXPRESS" `
  -DataDir "D:\KarmanAudit\data" -LogDir "D:\KarmanAudit\log" -OutputDir "D:\KarmanAudit\out"

# 3) Perform the restore into isolated READ_ONLY DBs (requires confirmation)
$pw = Read-Host -AsSecureString "Backup password"
./restore-taksa-backups.ps1 -BackupDir "D:\taksa" -SqlInstance ".\SQLEXPRESS" `
  -DataDir "D:\KarmanAudit\data" -LogDir "D:\KarmanAudit\log" -OutputDir "D:\KarmanAudit\out" `
  -BackupPassword $pw -ConfirmRestore

# 4) Extract schema/metadata (read-only) to CSV
./export-deep-db-audit.ps1 -SqlInstance ".\SQLEXPRESS" -Database "KarmanAudit_Taksa_Data" `
  -OutputDir "D:\KarmanAudit\out"
```
