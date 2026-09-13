<#
.SYNOPSIS
  End-of-week save: stage everything, commit, and push to GitHub.

  The OneDrive mirror already runs hourly and covers the client material that
  cannot go to git. This covers the other half - code and documentation - so the
  week's work reaches GitHub without anyone having to ask for it.

  Before committing it checks what is actually staged and REFUSES to commit if
  client material has crept in. That guard is not theoretical: legacy/follow-ups
  was added without an ignore rule and a client follow-up email containing an
  insurer, cover types and health details was staged for GitHub before it was
  caught by hand. An unattended commit is precisely where that slips through.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File weekly-checkpoint.ps1
  powershell -ExecutionPolicy Bypass -File weekly-checkpoint.ps1 -WhatIf
#>
[CmdletBinding()]
param(
  [string] $RepoRoot = "",
  [switch] $WhatIf        # stage and run the safety check, but do not commit or push
)

$ErrorActionPreference = "Stop"
$here   = $PSScriptRoot
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "checkpoint.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $msg
  Add-Content -Path $log -Value $line
  Write-Host $line
}

# git writes ordinary progress to stderr. With ErrorActionPreference Stop that
# would throw on a perfectly successful command, so every call goes through here
# and is judged on its exit code instead.
function Invoke-Git {
  param([string[]] $Arguments)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = & git @Arguments 2>&1 | ForEach-Object { "$_" }
    return [pscustomobject]@{ Output = @($out); Code = $LASTEXITCODE }
  } finally { $ErrorActionPreference = $prev }
}

if (-not $RepoRoot) { $RepoRoot = Split-Path (Split-Path $here -Parent) -Parent }
if (-not (Test-Path (Join-Path $RepoRoot '.git'))) { throw "Not a git repository: $RepoRoot" }
Set-Location $RepoRoot

<#
  Paths that must never reach GitHub. Matched against staged paths, which git
  reports with forward slashes.

  legacy/ holds produced client work - file notes, fact finds, SOAs, follow-ups.
  Only the READMEs and .gitkeep placeholders belong in the repository. Everything
  under it is allowed through ONLY if it is one of those.
#>
function Test-ClientMaterial {
  param([string] $Path)
  $p = $Path -replace '\\', '/'
  $leaf = Split-Path $p -Leaf

  if ($p -like 'legacy/*') {
    if ($leaf -eq 'README.md' -or $leaf -eq '.gitkeep') { return $false }
    return $true
  }
  if ($p -like 'automation/tasks/state/*') { return $true }
  if ($p -like '*/logs/*' -or $p -like 'logs/*') { return $true }
  if ($leaf -eq '.env' -or $leaf -like '.env.*' -and $leaf -ne '.env.example') { return $true }
  if ($p -like 'intake/*') { return $true }
  return $false
}

try {
  $branch = (Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')).Output[0]
  Write-Log "Checkpoint on branch '$branch'."

  $dirty = (Invoke-Git @('status', '--porcelain')).Output | Where-Object { $_ }
  if (-not $dirty) {
    # Still push: there may be local commits from during the week.
    $ahead = (Invoke-Git @('rev-list', '--count', "origin/$branch..HEAD")).Output[0]
    if ($ahead -and [int]$ahead -gt 0) {
      Write-Log "Nothing to commit, but $ahead local commit(s) to push."
    } else {
      Write-Log "Nothing to commit and nothing to push."
      exit 0
    }
  } else {
    $add = Invoke-Git @('add', '-A')
    if ($add.Code -ne 0) { throw "git add failed: $($add.Output -join ' ')" }

    $staged = (Invoke-Git @('diff', '--cached', '--name-only')).Output | Where-Object { $_ }
    $suspect = @($staged | Where-Object { Test-ClientMaterial $_ })

    if ($suspect.Count) {
      # Leave the working tree exactly as found, and say plainly what stopped it.
      Invoke-Git @('reset') | Out-Null
      Write-Log "ABORTED - client material was staged. Nothing committed, nothing pushed."
      foreach ($f in $suspect) { Write-Log "    $f" }
      Write-Log "Add an ignore rule for these, then re-run. See .gitignore for the existing legacy/ rules."
      exit 2
    }

    Write-Log "Staged $($staged.Count) file(s), none flagged as client material."
    if ($WhatIf) {
      Invoke-Git @('reset') | Out-Null
      Write-Log "Dry run - staged set released, nothing committed."
      exit 0
    }

    $stamp = Get-Date -Format 'dddd d MMMM yyyy'
    $body = "Weekly checkpoint - $stamp`n`nAutomatic end-of-week save. $($staged.Count) file(s) changed:`n" +
            (($staged | Select-Object -First 40 | ForEach-Object { "  $_" }) -join "`n")
    if ($staged.Count -gt 40) { $body += "`n  ... and $($staged.Count - 40) more" }

    $msgFile = Join-Path $env:TEMP "fpgod-checkpoint-msg.txt"
    [IO.File]::WriteAllText($msgFile, $body, (New-Object Text.UTF8Encoding($false)))
    $commit = Invoke-Git @('commit', '-F', $msgFile)
    Remove-Item $msgFile -Force -ErrorAction SilentlyContinue
    if ($commit.Code -ne 0) { throw "git commit failed: $($commit.Output -join ' ')" }
    Write-Log "Committed $($staged.Count) file(s)."
  }

  if ($WhatIf) { Write-Log "Dry run - not pushing."; exit 0 }

  $push = Invoke-Git @('push', 'origin', $branch)
  if ($push.Code -ne 0) {
    # Credentials are cached by Git Credential Manager after a successful
    # interactive sign-in. If that cache is gone the push cannot prompt from a
    # scheduled task, so it fails here rather than hanging on an invisible dialog.
    Write-Log "PUSH FAILED - the commit is safe locally. Re-run by hand to sign in if needed."
    foreach ($line in $push.Output) { if ($line) { Write-Log "    $line" } }
    exit 3
  }
  Write-Log "Pushed to origin/$branch. Week saved."
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
