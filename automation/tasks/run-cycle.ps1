<#
.SYNOPSIS
  One pass of the live task list: scan the mailbox -> extract tasks -> update the sheet.

  This is what the scheduled task runs every 30 minutes. Each step is safe to
  repeat: the scan window overlaps deliberately, and extract-tasks.mjs only sends
  emails it has never seen before to Claude, so a re-run costs almost nothing and
  never duplicates a task.

  Mail is read through Microsoft Graph, signed in as you. Nothing has to be
  running locally — Outlook can be closed, or never installed on this machine.

.EXAMPLE
  powershell -File run-cycle.ps1
  powershell -File run-cycle.ps1 -Days 3 -ShowExcel
#>
[CmdletBinding()]
param(
  [int]    $Days = 2,          # look-back window; overlaps so nothing slips between runs
  [int]    $MaxItems = 300,
  [int]    $BodyChars = 2500,  # body text sent for task extraction
  [string] $Workbook = "",
  # Where mail comes from. Auto prefers Graph and falls back to the local Outlook
  # desktop when Graph has no sign-in — which is the case until the tenant admin
  # consents to Mail.Read.
  [ValidateSet('Auto','Graph','Drop','Outlook')]
  [string] $Source = 'Auto',
  # Overnight quiet hours: no mail worth scanning, so don't spend API calls on it.
  # The window is [QuietFrom, QuietUntil) in local time — 0 to 7 means midnight
  # until 7am. Set them equal to disable the quiet period entirely.
  [int]    $QuietFrom = 0,
  [int]    $QuietUntil = 7,
  [switch] $IgnoreQuietHours,   # run anyway (manual runs)
  [switch] $ShowExcel
)

$ErrorActionPreference = "Stop"
$here     = $PSScriptRoot
$stateDir = Join-Path $here "state"
$logDir   = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $stateDir, $logDir | Out-Null

$state = Join-Path $stateDir "tasks.json"
$scan  = Join-Path $stateDir "last-scan.json"
$log   = Join-Path $logDir "cycle.log"
if (-not $Workbook) { $Workbook = Join-Path ([Environment]::GetFolderPath("Desktop")) "Task List.xlsx" }

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $msg
  Add-Content -Path $log -Value $line
  Write-Host $line
}

# Resolve node explicitly. A scheduled task does not always inherit the PATH the
# interactive shell has.
function Resolve-Node {
  $n = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($n) { return $n }
  foreach ($c in @("$env:ProgramFiles\nodejs\node.exe", "$env:LOCALAPPDATA\Programs\nodejs\node.exe")) {
    if (Test-Path $c) { return $c }
  }
  throw "node.exe not found on PATH"
}

# Run a native command and hand back its output AND its real exit code.
#
# Necessary because of a PowerShell 5.1 trap: with $ErrorActionPreference = 'Stop',
# redirecting a native program's stderr with 2>&1 wraps each line in an
# ErrorRecord and throws immediately — before $LASTEXITCODE can be inspected.
# Every exit code this script branches on is reported alongside a stderr message,
# so without this the branches are unreachable and everything looks like a crash.
function Invoke-Native {
  param([string] $Exe, [string[]] $Arguments)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & $Exe @Arguments 2>&1 | ForEach-Object { "$_" }
    return [pscustomobject]@{ Output = @($output); Code = $LASTEXITCODE }
  } finally {
    $ErrorActionPreference = $prev
  }
}

# Outlook COM needs the desktop app actually running — checking the process first
# matters because New-Object -ComObject Outlook.Application LAUNCHES it otherwise.
function Test-OutlookRunning {
  return [bool](Get-Process -Name OUTLOOK -ErrorAction SilentlyContinue)
}

# Quiet hours. Exits 0 because this is the script working as intended, unlike the
# "no mail source" case which exits 4 — the two must stay distinguishable in Task
# Scheduler, or a genuine outage looks like a scheduled night off.
if (-not $IgnoreQuietHours -and $QuietFrom -ne $QuietUntil) {
  $hour = (Get-Date).Hour
  $quiet = if ($QuietFrom -lt $QuietUntil) {
    $hour -ge $QuietFrom -and $hour -lt $QuietUntil          # e.g. 00:00-07:00
  } else {
    $hour -ge $QuietFrom -or  $hour -lt $QuietUntil          # window crossing midnight
  }
  if ($quiet) {
    Write-Log ("Quiet hours ({0:00}:00-{1:00}:00) - skipping this cycle." -f $QuietFrom, $QuietUntil)
    exit 0
  }
}

try {
  $node = Resolve-Node
  $scanned = $false

  # 1. Scan the mailbox. In Auto the order is Graph (best, needs admin consent),
  #    then the Power Automate drop folder (no admin, works with new Outlook),
  #    then local Outlook COM (needs classic Outlook open). An explicit -Source
  #    tries only that one and fails loudly rather than quietly using another.
  $tried = @()

  if ($Source -eq 'Auto' -or $Source -eq 'Graph') {
    $r = Invoke-Native $node @((Join-Path $here "scan-graph.mjs"), '--days', $Days, '--max', $MaxItems,
                               '--body-chars', $BodyChars, '--out', $scan)
    if ($r.Code -eq 0) {
      foreach ($line in $r.Output) { Write-Log $line }
      $scanned = $true
    }
    elseif ($r.Code -eq 4) { $tried += "Graph (not authorised)" }
    else { throw "Graph scan failed: $($r.Output -join ' ')" }
  }

  if (-not $scanned -and ($Source -eq 'Auto' -or $Source -eq 'Drop')) {
    $r = Invoke-Native $node @((Join-Path $here "scan-drop.mjs"), '--days', $Days,
                               '--body-chars', $BodyChars, '--out', $scan)
    if ($r.Code -eq 0) {
      foreach ($line in $r.Output) { Write-Log $line }
      $scanned = $true
    }
    elseif ($r.Code -eq 4) { $tried += "drop folder (missing)" }
    else { throw "Drop-folder scan failed: $($r.Output -join ' ')" }
  }

  if (-not $scanned -and ($Source -eq 'Auto' -or $Source -eq 'Outlook')) {
    if (Test-OutlookRunning) {
      $comScript = Join-Path (Split-Path $here -Parent) "outlook\scan-outlook.ps1"
      $r = Invoke-Native "powershell.exe" @("-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
          "-File",$comScript,"-Days",$Days,"-MaxItems",$MaxItems,"-IncludeBody",
          "-BodyChars",$BodyChars,"-Out",$scan)
      if ($r.Code -ne 0) { throw "Outlook scan failed: $($r.Output -join ' ')" }
      foreach ($line in $r.Output) { Write-Log $line }
      $scanned = $true
    }
    else { $tried += "classic Outlook (not running)" }
  }

  if (-not $scanned) {
    # Never exit 0 here. Reporting success while reading nothing is exactly how
    # this ran for four days without anyone noticing.
    Write-Log "NO MAIL SOURCE - tried: $($tried -join '; '). Nothing was read."
    exit 4
  }

  # 1b. Sent mail, used to close out tasks he has already dealt with. Optional —
  #     absent until the Sent Items flow exists — and never fatal, because a
  #     missing sent feed should not stop new mail becoming tasks.
  $sentScan = Join-Path $stateDir "last-sent-scan.json"
  $sentArg = @()

  if ($Source -eq 'Auto' -or $Source -eq 'Drop') {
    $r = Invoke-Native $node @((Join-Path $here "scan-drop.mjs"), '--sent', '--days', $Days,
                               '--body-chars', $BodyChars, '--out', $sentScan)
    if ($r.Code -eq 0) {
      foreach ($line in $r.Output) { Write-Log "sent: $line" }
      $sentArg = @('--sent', $sentScan)
    }
  }
  elseif ($Source -eq 'Outlook' -and (Test-OutlookRunning)) {
    $comScript = Join-Path (Split-Path $here -Parent) "outlook\scan-outlook.ps1"
    $r = Invoke-Native "powershell.exe" @("-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
        "-File",$comScript,"-Days",$Days,"-MaxItems",$MaxItems,"-IncludeBody",
        "-BodyChars",$BodyChars,"-Folder","SentItems","-Out",$sentScan)
    if ($r.Code -eq 0) { $sentArg = @('--sent', $sentScan) }
  }

  # 2. Turn anything new into tasks, and close what the sent mail has answered.
  $extract = Join-Path $here "extract-tasks.mjs"
  $r = Invoke-Native $node (@($extract, '--scan', $scan, '--state', $state) + $sentArg)
  if ($r.Code -ne 0) { throw "Task extraction failed: $($r.Output -join ' ')" }
  foreach ($line in $r.Output) { Write-Log $line }

  # 3. Push to the spreadsheet (and pull your Status/Notes edits back in).
  $sheetScript = Join-Path $here "write-sheet.ps1"
  $sheetArgs = @("-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",$sheetScript,
                 "-TasksJson",$state,"-Workbook",$Workbook)
  if ($ShowExcel) { $sheetArgs += "-ShowExcel" }
  $r = Invoke-Native "powershell.exe" $sheetArgs
  if ($r.Code -ne 0) { throw "Sheet update failed: $($r.Output -join ' ')" }
  foreach ($line in $r.Output) { Write-Log $line }

  Write-Log "Cycle complete."
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
