-- restore-filelistonly.sql
-- List the logical files contained in a Taksa backup. Performs NO restore.
-- Usage: sqlcmd -S <instance> -i restore-filelistonly.sql -v BackupPath="D:\taksa\Faragamara_Taksa.DB"
--
-- Use the LogicalName values reported here for the MOVE clauses in
-- restore-taksa-backups.ps1. If the backup is password-protected this may
-- report Msg 3279 (password required) — the known Phase 2 blocker.
RESTORE FILELISTONLY
  FROM DISK = N'$(BackupPath)';
GO
