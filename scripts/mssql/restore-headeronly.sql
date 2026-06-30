-- restore-headeronly.sql
-- Inspect a Taksa backup HEADER only. Performs NO restore and changes nothing.
-- Usage: sqlcmd -S <instance> -i restore-headeronly.sql -v BackupPath="D:\taksa\Faragamara_Taksa.DB"
--
-- NOTE: If the backup is password-protected, HEADERONLY may report
-- Msg 3279 (a password is required). That is the known Phase 2 blocker.
RESTORE HEADERONLY
  FROM DISK = N'$(BackupPath)';
GO
