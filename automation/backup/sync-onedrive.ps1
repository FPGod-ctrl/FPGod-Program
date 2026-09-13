<#
.SYNOPSIS
  Mirror the project into OneDrive, so the material that cannot go to GitHub
  still exists somewhere other than this machine's disk.

  Code is already backed up by git. This exists for everything that is
  deliberately git-ignored and therefore has no off-machine copy at all:

    legacy/file-notes, follow-ups, fact-finds, soa, client-profiles
        - produced client documents
    legacy/drop/**
        - the firm's blank templates and the gold-standard examples the
          document generators are written against
    automation/tasks/state/
        - the live task list, the seen-email map, and archive.jsonl, which is
          the only record of completed work

  node_modules and .git are excluded: the first is reinstallable, the second is
  on GitHub, and both are tens of thousands of small files that OneDrive syncs
  badly.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File sync-onedrive.ps1
  powershell -ExecutionPolicy Bypass -File sync-onedrive.ps1 -WhatIf
#>
[CmdletBinding()]
param(
  [string] $Source = "",
  [string] $Destination = "",
  [switch] $WhatIf          # list what would change without copying anything
)

$ErrorActionPreference = "Stop"
$here   = $PSScriptRoot
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "backup.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $msg
  Add-Content -Path $log -Value $line
  Write-Host $line
}

if (-not $Source) { $Source = Split-Path (Split-Path $here -Parent) -Parent }

# Resolve the business OneDrive without hard-coding the firm name - the folder is
# "OneDrive - <Tenant Display Name>" and changes if the firm is ever renamed.
if (-not $Destination) {
  $business = Get-ChildItem $env:USERPROFILE -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'OneDrive - *' } |
    Sort-Object Name | Select-Object -First 1
  if (-not $business) { throw "No business OneDrive folder found under $env:USERPROFILE" }
  $Destination = Join-Path $business.FullName "FPGod-Backup"
}

if (-not (Test-Path $Source)) { throw "Source not found: $Source" }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

# /MIR mirrors, so a file deleted locally is removed from the backup too.
# OneDrive keeps deleted files for 30 days and holds version history, which is
# the safety net that makes a true mirror acceptable rather than reckless.
$exclDirs = @('node_modules', '.git', 'dist', 'build', '.vite', '.next', 'coverage', 'uploads-test')
$exclFiles = @('*.tmp', '*.log.lock', 'Thumbs.db', '.DS_Store')

$args = @(
  $Source, $Destination,
  '/MIR',
  '/XD') + $exclDirs + @(
  '/XF') + $exclFiles + @(
  '/R:1', '/W:1',          # a locked file should not stall the whole run
  '/NFL', '/NDL', '/NP',   # quiet: no per-file or per-directory listing
  '/NJH', '/NJS'
)
if ($WhatIf) { $args += '/L' }

Write-Log "Mirroring $Source -> $Destination$(if ($WhatIf) { ' (dry run)' })"
$output = & robocopy.exe @args 2>&1
$code = $LASTEXITCODE

# Robocopy exit codes are a bit flag, not a status: 0-7 are success (1 = files
# copied, 2 = extras removed, 4 = mismatches). Only 8 and above are failures, so
# a plain non-zero check would report every successful copy as an error.
if ($code -ge 8) {
  Write-Log "ERROR: robocopy exit $code"
  foreach ($line in @($output)) { if ($line) { Write-Log "  $line" } }
  exit 1
}

$summary = switch ($true) {
  { $code -eq 0 } { 'nothing changed'; break }
  { $code -band 1 } { 'files copied'; break }
  default { "exit $code" }
}
Write-Log "Backup complete - $summary."
