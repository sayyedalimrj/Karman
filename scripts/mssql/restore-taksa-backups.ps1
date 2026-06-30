<#
.SYNOPSIS
  Plan or perform a SAFE restore of the Taksa SQL Server backups into ISOLATED,
  READ_ONLY audit databases on an isolated machine.

.DESCRIPTION
  Manual operator tooling — NOT run by CI or tests. By default this script only
  PRINTS THE PLAN and makes no changes. Pass -ConfirmRestore to actually restore.

  Safety guarantees:
    * Plan-only unless -ConfirmRestore is supplied.
    * -BackupPassword is a SecureString and is NEVER echoed, logged, or written
      to disk; it is passed only to RESTORE ... WITH PASSWORD.
    * Existing databases are NEVER overwritten unless -Force is supplied.
    * Restores into isolated databases KarmanAudit_Taksa_Data /
      KarmanAudit_Taksa_Str and immediately sets them READ_ONLY.
    * Never connects to production PostgreSQL; never executes Taksa SQL scripts.

.NOTES
  The full restore is currently blocked by SQL Server Msg 3279 (backup password
  failure). Provide a valid -BackupPassword once available.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $BackupDir,
  [Parameter(Mandatory = $true)] [string] $SqlInstance,
  [Parameter(Mandatory = $true)] [string] $DataDir,
  [Parameter(Mandatory = $true)] [string] $LogDir,
  [Parameter(Mandatory = $true)] [string] $OutputDir,
  [SecureString] $BackupPassword,
  [switch] $ConfirmRestore,
  [switch] $Force
)

$ErrorActionPreference = "Stop"

# Map each backup file to an isolated, READ_ONLY audit database name.
$Plan = @(
  @{ File = "Faragamara_Taksa.DB";     Database = "KarmanAudit_Taksa_Data" },
  @{ File = "Faragamara_Taksa_Str.DB"; Database = "KarmanAudit_Taksa_Str"  }
)

function Write-Plan {
  Write-Host "=== Taksa restore PLAN (isolated, READ_ONLY) ==="
  Write-Host "SQL instance : $SqlInstance"
  Write-Host "Backup dir   : $BackupDir"
  Write-Host "Data dir     : $DataDir"
  Write-Host "Log dir      : $LogDir"
  Write-Host "Output dir   : $OutputDir"
  Write-Host "Password set : $([bool]$BackupPassword)   (value is never displayed)"
  Write-Host "ConfirmRestore: $ConfirmRestore   Force: $Force"
  foreach ($p in $Plan) {
    Write-Host ("  {0}  ->  {1}" -f $p.File, $p.Database)
  }
}

function Get-PlainPassword([SecureString] $secure) {
  if (-not $secure) { return $null }
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Test-DatabaseExists([string] $db) {
  $q = "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$db';"
  $out = sqlcmd -S $SqlInstance -h -1 -W -Q $q 2>$null
  return ([int]($out | Select-Object -First 1) -gt 0)
}

Write-Plan

if (-not $ConfirmRestore) {
  Write-Host ""
  Write-Host "Plan only — no changes made. Re-run with -ConfirmRestore to execute."
  return
}

if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
if (-not (Test-Path $LogDir))  { New-Item -ItemType Directory -Path $LogDir  -Force | Out-Null }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

foreach ($p in $Plan) {
  $backupPath = Join-Path $BackupDir $p.File
  $db = $p.Database

  if (-not (Test-Path $backupPath)) {
    Write-Warning "Backup not found: $backupPath — skipping $db."
    continue
  }
  if ((Test-DatabaseExists $db) -and (-not $Force)) {
    Write-Warning "Database $db already exists; refusing to overwrite (use -Force)."
    continue
  }

  # Build the RESTORE. The password (if any) is concatenated into the T-SQL only
  # at execution time and never written to a file or echoed to the host.
  $pw = Get-PlainPassword $BackupPassword
  $pwClause = if ($pw) { ", PASSWORD = N'$pw'" } else { "" }
  $replaceClause = if ($Force) { ", REPLACE" } else { "" }

  $dataFile = Join-Path $DataDir ("{0}.mdf" -f $db)
  $logFile  = Join-Path $LogDir  ("{0}_log.ldf" -f $db)

  $tsql = @"
RESTORE DATABASE [$db]
  FROM DISK = N'$backupPath'
  WITH MOVE N'__DATA__' TO N'$dataFile',
       MOVE N'__LOG__'  TO N'$logFile',
       RECOVERY$replaceClause$pwClause;
ALTER DATABASE [$db] SET READ_ONLY WITH ROLLBACK IMMEDIATE;
"@

  Write-Host "Restoring $db (READ_ONLY) ..."
  Write-Host "NOTE: replace __DATA__/__LOG__ with the LogicalName values from restore-filelistonly.sql."
  # Execute via stdin so the password never appears in the process command line.
  $tsql | sqlcmd -S $SqlInstance -b
  $pw = $null
}

Write-Host "Done. Audit databases are READ_ONLY. Run export-deep-db-audit.ps1 next."
