<#
.SYNOPSIS
    Snapshots everything needed to rebuild FPGod elsewhere into one folder.

.DESCRIPTION
    Produces a self-contained migration bundle:

        FPGod-Program.bundle   full git history, every branch (offline clone source)
        fpgod-db.dump          pg_dump of the fpgod database
        fpgod-schema.sql       schema only, for reference
        uploads\               server\uploads (gitignored, so not in the repo)
        secrets\               .env files (gitignored, so not in the repo)
        setup-new-pc.ps1       the restore script
        MIGRATION.md           the runbook
        MANIFEST.txt           what was captured, and when

    Run this again on your last day - the database and follow-ups will have moved
    on since the first snapshot, and only the git history is also on GitHub.

.EXAMPLE
    .\make-bundle.ps1
    .\make-bundle.ps1 -OutRoot "G:\My Drive"
#>
[CmdletBinding()]
param(
    [string]$RepoPath = "C:\FPGod-Program",
    [string]$OutRoot  = "$env:USERPROFILE\Downloads"
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  [x]  $m" -ForegroundColor Red; exit 1 }

function Find-PgBin {
    $c = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($c) { return (Split-Path $c.Source) }
    $roots = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
             Sort-Object { [int]($_.Name -replace '\D', '') } -Descending
    foreach ($r in $roots) {
        if (Test-Path "$($r.FullName)\bin\pg_dump.exe") { return "$($r.FullName)\bin" }
    }
    return $null
}

if (-not (Test-Path (Join-Path $RepoPath '.git'))) { Die "No git repo at $RepoPath" }

$stamp = Get-Date -Format 'yyyy-MM-dd'
$out   = Join-Path $OutRoot "FPGod-Migration-$stamp"
New-Item -ItemType Directory -Force -Path $out           | Out-Null
New-Item -ItemType Directory -Force -Path "$out\secrets" | Out-Null

Write-Host ""
Write-Host "FPGod - building migration bundle" -ForegroundColor White
Write-Host "---------------------------------"
Say "into: $out"

# ------------------------------------------------------------------- git -----
Step "Capturing git history"
Push-Location $RepoPath

$dirty = git status --porcelain
if ($dirty) {
    Warn "uncommitted changes present - these will NOT be in the bundle:"
    $dirty -split "`n" | Select-Object -First 10 | ForEach-Object { Say "    $_" }
    Warn "commit them first if you want them to travel."
}

git bundle create "$out\FPGod-Program.bundle" --all 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Pop-Location; Die "git bundle failed" }
git bundle verify "$out\FPGod-Program.bundle" 2>&1 | Select-String 'complete history' | ForEach-Object { Ok $_.ToString().Trim() }

$head   = git rev-parse HEAD
$branch = git rev-parse --abbrev-ref HEAD
Ok "branch $branch at $($head.Substring(0,7))"
Pop-Location

# -------------------------------------------------------------- database -----
Step "Dumping the database"

$pgBin = Find-PgBin
if (-not $pgBin) { Die "pg_dump not found - is PostgreSQL installed?" }

$envFile = Join-Path $RepoPath 'server\.env'
if (-not (Test-Path $envFile)) { Die "No server\.env - cannot work out the database credentials." }
$url = ((Get-Content $envFile | Select-String '^DATABASE_URL=') -replace '^DATABASE_URL=', '').Trim()
if ($url -notmatch '://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)$') { Die "Could not parse DATABASE_URL." }
$dbUser = $matches[1]; $env:PGPASSWORD = $matches[2]
$dbHost = $matches[3]; $dbPort = $matches[4]; $dbName = $matches[5]

& "$pgBin\pg_dump.exe" -h $dbHost -p $dbPort -U $dbUser -d $dbName -Fc -f "$out\fpgod-db.dump"
if ($LASTEXITCODE -ne 0) { Die "pg_dump failed" }
& "$pgBin\pg_dump.exe" -h $dbHost -p $dbPort -U $dbUser -d $dbName --schema-only -f "$out\fpgod-schema.sql" | Out-Null
Ok "database dumped"

$counts = & "$pgBin\psql.exe" -h $dbHost -p $dbPort -U $dbUser -d $dbName -A -F' ' -t -c @"
SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'cfs_accounts', count(*) FROM cfs_accounts
UNION ALL SELECT 'cfs_holdings', count(*) FROM cfs_holdings;
"@

# ------------------------------------------------- gitignored runtime bits ---
Step "Capturing files git doesn't track"

$uploads = Join-Path $RepoPath 'server\uploads'
$nUploads = 0
if (Test-Path $uploads) {
    if (Test-Path "$out\uploads") { Remove-Item "$out\uploads" -Recurse -Force }
    Copy-Item $uploads "$out\uploads" -Recurse -Force
    $nUploads = (Get-ChildItem "$out\uploads" -File -Recurse).Count
    Ok "$nUploads uploaded documents"
}

Copy-Item $envFile "$out\secrets\server.env" -Force
Ok "server\.env"
foreach ($p in @(@('automation\xplan\.env', 'xplan.env'), @('automation\xplan-api\.env', 'xplan-api.env'))) {
    $src = Join-Path $RepoPath $p[0]
    if (Test-Path $src) { Copy-Item $src "$out\secrets\$($p[1])" -Force; Ok $p[0] }
}

# ------------------------------------------------------------------ docs -----
Step "Adding the runbook"
foreach ($f in @('migration\setup-new-pc.ps1', 'MIGRATION.md')) {
    $src = Join-Path $RepoPath $f
    if (Test-Path $src) { Copy-Item $src "$out\$(Split-Path $f -Leaf)" -Force; Ok (Split-Path $f -Leaf) }
}

$sizeMb = [math]::Round((Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)

@"
FPGod migration bundle
======================
Created      : $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Source PC    : $env:COMPUTERNAME
Repo         : $RepoPath
Branch       : $branch
Commit       : $head
Bundle size  : $sizeMb MB

Database rows captured
----------------------
$($counts -join "`n")

Uploaded documents: $nUploads

Contents
--------
FPGod-Program.bundle  full git history, all branches - clone from this offline
fpgod-db.dump         pg_dump custom format - restore with pg_restore
fpgod-schema.sql      schema only, reference
uploads\              server\uploads (not in git)
secrets\              .env files (not in git)
setup-new-pc.ps1      restore script - run this on the new machine
MIGRATION.md          the full runbook

To rebuild on a new PC
----------------------
    .\setup-new-pc.ps1 -BundlePath "<this folder>"

CONTAINS CLIENT PERSONAL INFORMATION
------------------------------------
Client statements, statements of advice, call transcripts and a database of
client financial records. Handle per your licensee's data policy. Do not place
in a public repository or a shared drive folder.
"@ | Set-Content "$out\MANIFEST.txt" -Encoding utf8

Write-Host ""
Write-Host "Done - $sizeMb MB at:" -ForegroundColor Green
Write-Host "  $out"
Write-Host ""
