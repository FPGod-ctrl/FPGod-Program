<#
.SYNOPSIS
    Rebuilds the FPGod environment on a fresh Windows PC from a migration bundle.

.DESCRIPTION
    Restores the repo (from GitHub, or from the offline .bundle if there's no
    network), the PostgreSQL database, the upload folder and the .env secrets,
    then installs dependencies and builds the client.

    Safe to re-run: every step checks whether it has already been done and skips
    rather than clobbering. The one exception is -RestoreDb, which will refuse to
    overwrite a database that already has rows unless you pass -Force.

.EXAMPLE
    .\setup-new-pc.ps1 -BundlePath "G:\My Drive\FPGod-Migration-2026-08-12"

.EXAMPLE
    .\setup-new-pc.ps1 -BundlePath "D:\FPGod-Migration-2026-08-12" -RepoPath "C:\FPGod-Program" -Offline
#>
[CmdletBinding()]
param(
    # Folder holding FPGod-Program.bundle, fpgod-db.dump, uploads\ and secrets\
    [Parameter(Mandatory = $true)]
    [string]$BundlePath,

    # Where the working copy should end up
    [string]$RepoPath = "C:\FPGod-Program",

    # Restore from the .bundle instead of cloning from GitHub
    [switch]$Offline,

    # Overwrite a database that already contains data
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Branch  = 'claude/financial-planning-app-8GWYC'
$RepoUrl = 'https://github.com/FPGod-ctrl/FPGod-Program.git'

function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  [x]  $m" -ForegroundColor Red; exit 1 }

# Postgres ships its binaries outside PATH on Windows more often than not.
function Find-PgBin {
    $c = Get-Command pg_restore -ErrorAction SilentlyContinue
    if ($c) { return (Split-Path $c.Source) }
    $roots = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
             Sort-Object { [int]($_.Name -replace '\D', '') } -Descending
    foreach ($r in $roots) {
        if (Test-Path "$($r.FullName)\bin\pg_restore.exe") { return "$($r.FullName)\bin" }
    }
    return $null
}

Write-Host ""
Write-Host "FPGod - new PC setup" -ForegroundColor White
Write-Host "--------------------"

# ---------------------------------------------------------------- preflight --
Step "Checking prerequisites"

if (-not (Test-Path $BundlePath)) { Die "Bundle folder not found: $BundlePath" }
Ok "bundle folder: $BundlePath"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Die "Node.js not installed. Get the LTS from https://nodejs.org (v20 or newer)." }
$nodeMajor = [int](((node -v) -replace '^v', '') -split '\.')[0]
if ($nodeMajor -lt 20) { Die "Node $(node -v) is too old - the app needs v20 or newer." }
Ok "node $(node -v)"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Die "Git not installed. https://git-scm.com/download/win" }
Ok "git present"

$PgBin = Find-PgBin
if (-not $PgBin) {
    Die "PostgreSQL not found. Install v16 or newer from https://www.postgresql.org/download/windows/ then re-run."
}
Ok "postgres tools: $PgBin"

$psql      = Join-Path $PgBin 'psql.exe'
$pgRestore = Join-Path $PgBin 'pg_restore.exe'

# ------------------------------------------------------------------- repo ----
Step "Restoring the repository"

if (Test-Path (Join-Path $RepoPath '.git')) {
    Ok "repo already present at $RepoPath - leaving it alone"
}
else {
    $bundleFile = Join-Path $BundlePath 'FPGod-Program.bundle'
    $cloned = $false

    # No 2>&1 on native commands: PowerShell 5.1 wraps merged stderr in an
    # ErrorRecord, which trips ErrorActionPreference='Stop' even on success.
    # git clone reports progress on stderr, so judge it by exit code instead.
    # reference-plans/ holds filenames up to 144 characters. Windows caps a full
    # path at 260, so a deep destination silently fails to check those files out
    # ("Filename too long"). core.longpaths makes git use the extended-length API.
    $headroom = 260 - 144 - 1
    if ($RepoPath.Length -gt $headroom) {
        Warn "$RepoPath is deep - long filenames in reference-plans may not check out."
        Warn "somewhere short like C:\FPGod-Program is safer."
    }

    if (-not $Offline) {
        Say "trying GitHub..."
        git clone -c core.longpaths=true --branch $Branch $RepoUrl $RepoPath | Out-Null
        if ($LASTEXITCODE -eq 0) { $cloned = $true; Ok "cloned from GitHub" }
        else { Warn "GitHub unreachable (or access denied) - falling back to the offline bundle" }
    }

    if (-not $cloned) {
        if (-not (Test-Path $bundleFile)) { Die "No network and no bundle at $bundleFile" }
        git clone -c core.longpaths=true --branch $Branch $bundleFile $RepoPath | Out-Null
        if ($LASTEXITCODE -ne 0) { Die "Restoring from the bundle failed." }
        # A bundle-cloned repo points 'origin' at a file that won't exist forever.
        Push-Location $RepoPath
        git remote set-url origin $RepoUrl
        Pop-Location
        Ok "restored from offline bundle (origin re-pointed at GitHub)"
    }
}

Push-Location $RepoPath
$head = (git rev-parse --short HEAD)
$cur  = (git rev-parse --abbrev-ref HEAD)
Ok "on branch $cur at $head"
if ($cur -ne $Branch) {
    Warn "expected branch $Branch - 'main' is 31 commits behind and will not run correctly"
}

# A checkout that hit the path limit reports the missing files as deletions
# rather than failing the clone, so confirm the working tree is actually whole.
$missing = @(git status --porcelain | Where-Object { $_ -match '^\s*D\s' })
if ($missing.Count -gt 0) {
    Warn "$($missing.Count) tracked files did not check out (likely the 260-char path limit):"
    $missing | Select-Object -First 5 | ForEach-Object { Say "    $_" }
    Say "  retrying with long-path support..."
    git config core.longpaths true
    git checkout -- .
    $missing = @(git status --porcelain | Where-Object { $_ -match '^\s*D\s' })
    if ($missing.Count -gt 0) {
        Die "$($missing.Count) files still missing. Clone somewhere shorter, e.g. C:\FPGod-Program"
    }
    Ok "recovered - working tree complete"
}
else {
    Ok "working tree complete ($(@(git ls-files).Count) files)"
}

# ---------------------------------------------------------------- secrets ----
Step "Restoring configuration"

$serverEnv = Join-Path $RepoPath 'server\.env'
if (Test-Path $serverEnv) {
    Ok "server\.env already exists - leaving it alone"
}
else {
    $src = Join-Path $BundlePath 'secrets\server.env'
    if (-not (Test-Path $src)) { Die "Missing $src" }
    Copy-Item $src $serverEnv
    Ok "server\.env restored"
}

foreach ($pair in @(@('xplan.env', 'automation\xplan\.env'), @('xplan-api.env', 'automation\xplan-api\.env'))) {
    $from = Join-Path $BundlePath "secrets\$($pair[0])"
    $to   = Join-Path $RepoPath $pair[1]
    if ((Test-Path $from) -and (-not (Test-Path $to))) {
        New-Item -ItemType Directory -Force -Path (Split-Path $to) | Out-Null
        Copy-Item $from $to
        Ok "$($pair[1]) restored"
    }
}

# The old PC's postgres password almost certainly isn't this PC's.
Say ""
Say "This PC's PostgreSQL superuser password is needed to restore the database."
$sec = Read-Host "  postgres password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$PgPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
$env:PGPASSWORD = $PgPassword

& $psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT 1;" | Out-Null
if ($LASTEXITCODE -ne 0) { Die "Could not connect to PostgreSQL with that password." }
Ok "connected to PostgreSQL"

# Point the app at this machine's credentials.
$envText = Get-Content $serverEnv -Raw
$envText = $envText -replace '(?m)^DATABASE_URL=.*$', "DATABASE_URL=postgres://postgres:$PgPassword@localhost:5432/fpgod"
$envText = $envText -replace '(?m)^PGUSER=.*$',     'PGUSER=postgres'
$envText = $envText -replace '(?m)^PGPASSWORD=.*$', "PGPASSWORD=$PgPassword"
Set-Content -Path $serverEnv -Value $envText -Encoding utf8 -NoNewline
Ok "database credentials updated in server\.env"

# --------------------------------------------------------------- database ----
Step "Restoring the database"

$skipDb   = $false
$dbExisted = $false

$exists = & $psql -h localhost -p 5432 -U postgres -d postgres -A -t -c "SELECT 1 FROM pg_database WHERE datname='fpgod';"
if ($exists -match '1') {
    $dbExisted = $true
    $rows = & $psql -h localhost -p 5432 -U postgres -d fpgod -A -t -c "SELECT count(*) FROM clients;"
    if (($LASTEXITCODE -eq 0) -and ([int]$rows -gt 0) -and (-not $Force)) {
        Warn "database 'fpgod' already holds $rows clients - skipping restore. Pass -Force to overwrite."
        $skipDb = $true
    }
}
else {
    & $psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE fpgod;" | Out-Null
    if ($LASTEXITCODE -ne 0) { Die "Could not create the fpgod database." }
    Ok "created database 'fpgod'"
}

if (-not $skipDb) {
    $dump = Join-Path $BundlePath 'fpgod-db.dump'
    if (Test-Path $dump) {
        # --clean only when there's something to clean. On a fresh database it
        # emits a wall of "does not exist" warnings on stderr, and filtering
        # those would mean 2>&1 - which PowerShell 5.1 turns into a terminating
        # error on native commands. Avoiding the noise beats filtering it.
        if ($dbExisted) {
            & $pgRestore -h localhost -p 5432 -U postgres -d fpgod --clean --if-exists --no-owner --no-privileges $dump
        }
        else {
            & $pgRestore -h localhost -p 5432 -U postgres -d fpgod --no-owner --no-privileges $dump
        }
        if ($LASTEXITCODE -ne 0) { Die "pg_restore failed - the database was not restored." }
        Ok "database restored from dump"
    }
    else {
        Warn "no dump found - creating empty tables from schema instead"
        Push-Location (Join-Path $RepoPath 'server')
        npm run db:migrate
        Pop-Location
    }
}

# ---------------------------------------------------------------- uploads ----
Step "Restoring uploaded documents"

$uploadsSrc = Join-Path $BundlePath 'uploads'
$uploadsDst = Join-Path $RepoPath 'server\uploads'
if (Test-Path $uploadsSrc) {
    New-Item -ItemType Directory -Force -Path $uploadsDst | Out-Null
    Copy-Item "$uploadsSrc\*" $uploadsDst -Recurse -Force
    $n = (Get-ChildItem $uploadsDst -File -Recurse).Count
    Ok "$n files restored to server\uploads"
}
else {
    Warn "no uploads folder in the bundle - skipping"
}

# ----------------------------------------------------------- dependencies ----
Step "Installing dependencies (this takes a few minutes)"

Push-Location $RepoPath
npm run install:all
if ($LASTEXITCODE -ne 0) { Pop-Location; Die "npm install failed." }
Ok "dependencies installed"

Step "Building the client"
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; Die "client build failed." }
Ok "client built"
Pop-Location

# ------------------------------------------------------------ environment ---
$restoreEnv = Join-Path $RepoPath 'migration\restore-environment.ps1'
if (Test-Path $restoreEnv) {
    & $restoreEnv -BundlePath $BundlePath
}
else { Warn "restore-environment.ps1 not found - skipping VS Code and git identity" }

# ------------------------------------------------------------------ verify ---
Step "Verifying"

$counts = & $psql -h localhost -p 5432 -U postgres -d fpgod -A -F' ' -t -c @"
SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'cfs_accounts', count(*) FROM cfs_accounts
UNION ALL SELECT 'cfs_holdings', count(*) FROM cfs_holdings;
"@
foreach ($line in $counts) { if ($line.Trim()) { Ok $line.Trim() } }

$key = (Get-Content $serverEnv | Select-String '^ANTHROPIC_API_KEY=(.+)$')
if (-not $key) {
    Warn "ANTHROPIC_API_KEY is empty - AI features will run in stub mode until you add a key."
}

Pop-Location

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "  Start it with:   cd $RepoPath ; npm run dev"
Write-Host "  Then open:       http://localhost:5173"
Write-Host ""
Write-Host "  Before using AI features, put your own Anthropic API key in server\.env" -ForegroundColor Yellow
Write-Host "  The key carried over from the old machine is billed to the old firm." -ForegroundColor Yellow
Write-Host ""
