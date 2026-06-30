<#
.SYNOPSIS
  Run deep-db-audit.sql (READ-ONLY) against an isolated Taksa audit database and
  export the schema/metadata result sets to CSV files.

.DESCRIPTION
  Manual operator tooling — NOT run by CI or tests. Read-only: it extracts
  schema/metadata only (no data rows) and never touches production PostgreSQL.

.NOTES
  Run after restore-taksa-backups.ps1 has restored an isolated READ_ONLY
  database (KarmanAudit_Taksa_Data / KarmanAudit_Taksa_Str).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $SqlInstance,
  [Parameter(Mandatory = $true)] [string] $Database,
  [Parameter(Mandatory = $true)] [string] $OutputDir
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "deep-db-audit.sql"

if (-not (Test-Path $scriptPath)) { throw "Missing deep-db-audit.sql next to this script." }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

$outFile = Join-Path $OutputDir ("deep_db_audit_{0}.csv" -f $Database)

Write-Host "Exporting READ-ONLY schema/metadata for [$Database] from $SqlInstance ..."
# -s "," comma-separates columns; the SQL selects metadata only (no data rows).
sqlcmd -S $SqlInstance -d $Database -i $scriptPath -s "," -W -o $outFile

Write-Host "Wrote $outFile"
Write-Host "Reminder: this is schema/metadata only — no official values were exported."
