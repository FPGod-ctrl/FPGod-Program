<#
.SYNOPSIS
  Morning Outlook sweep. Scans the last N days of the Inbox, saves document
  attachments, writes a dated JSON scan + appends a one-line summary to a log.
  Self-contained (no app server required) — run by the Windows Scheduled Task
  "FPGod Outlook Morning Scan". Review the results in the app and Ingest as needed.
#>
[CmdletBinding()]
param(
  [int] $Days = 1
)

$ErrorActionPreference = "Stop"
$here   = $PSScriptRoot
$outDir = Join-Path $here "morning"
$stamp  = Get-Date -Format "yyyy-MM-dd"
$attDir = Join-Path $outDir ("attachments\" + $stamp)
$scan   = Join-Path $outDir ("scan-$stamp.json")
$log    = Join-Path $outDir "morning-scan.log"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$scanScript = Join-Path $here "scan-outlook.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scanScript `
    -Days $Days -MaxItems 500 -SaveAttachments $attDir -Out $scan | Out-Null

$when = Get-Date -Format "yyyy-MM-dd HH:mm"
if (Test-Path $scan) {
  $data    = Get-Content $scan -Raw | ConvertFrom-Json
  $msgs    = @($data)
  $withAtt = @($msgs | Where-Object { $_.hasAttachments })
  $line = "[$when] last $Days day(s): $($msgs.Count) message(s), $($withAtt.Count) with attachments -> $scan"
} else {
  $line = "[$when] last $Days day(s): scan produced no output"
}
Add-Content -Path $log -Value $line
Write-Host $line
