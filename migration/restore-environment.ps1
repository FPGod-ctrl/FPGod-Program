<#
.SYNOPSIS
    Puts the VS Code setup and git identity back on the new PC.

.DESCRIPTION
    Called by setup-new-pc.ps1, but runs standalone too. Reinstalls VS Code
    extensions, restores user settings, and sets a global git identity so
    commits aren't attributed to the old firm's domain.

    Does NOT install programs - run environment\reinstall-programs.ps1 for that,
    in an elevated shell, before this.

.EXAMPLE
    .\restore-environment.ps1 -BundlePath "G:\My Drive\FPGod-Migration-2026-08-12"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BundlePath,

    # Overwrite VS Code settings that already exist on this machine
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
function Say  ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }

$envDir = Join-Path $BundlePath 'environment'
if (-not (Test-Path $envDir)) {
    Warn "no environment\ folder in the bundle - nothing to restore"
    return
}

# ------------------------------------------------------------------ vscode ---
Step "VS Code"

$code = Get-Command code -ErrorAction SilentlyContinue
if (-not $code) {
    Warn "VS Code's 'code' command isn't on PATH."
    Say  "Install VS Code first (environment\reinstall-programs.ps1), then re-run this."
    Say  "If it is installed, open it and run: Ctrl+Shift+P > 'Shell Command: Install code command in PATH'"
}
else {
    $extFile = Join-Path $envDir 'vscode-extensions.txt'
    if (Test-Path $extFile) {
        $installed = @(code --list-extensions)
        $wanted = Get-Content $extFile | Where-Object { $_.Trim() }
        foreach ($line in $wanted) {
            # stored as publisher.name@version - install without the version so
            # the new machine gets a build matching its own architecture
            $id = ($line -split '@')[0]
            if ($installed -contains $id) { Ok "$id already installed" ; continue }
            Say "installing $id ..."
            code --install-extension $id --force | Out-Null
            if ($LASTEXITCODE -eq 0) { Ok "$id" } else { Warn "$id failed - install it from the Marketplace by hand" }
        }
    }
    else { Warn "no vscode-extensions.txt in the bundle" }

    $codeUser = "$env:APPDATA\Code\User"
    New-Item -ItemType Directory -Force -Path $codeUser | Out-Null
    foreach ($f in @('settings.json', 'keybindings.json')) {
        $src = Join-Path $envDir "vscode\$f"
        $dst = Join-Path $codeUser $f
        if (-not (Test-Path $src)) { continue }
        if ((Test-Path $dst) -and (-not $Force)) {
            Warn "$f already exists here - keeping it (pass -Force to overwrite)"
            continue
        }
        if (Test-Path $dst) { Copy-Item $dst "$dst.before-migration" -Force }
        Copy-Item $src $dst -Force
        Ok "$f restored"
    }
    foreach ($d in @('snippets', 'profiles')) {
        $src = Join-Path $envDir "vscode\$d"
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $codeUser $d) -Recurse -Force
            Ok "$d restored"
        }
    }
}

# --------------------------------------------------------------- git identity -
Step "Git identity"

# On the old PC HOMEDRIVE was H:, so git never found a global config and derived
# the author from the domain account - which is how the old firm's address ended
# up on every commit. Set it explicitly here.
$name  = git config --global user.name
$email = git config --global user.email

if ($name -and $email) {
    Ok "already set: $name <$email>"
}
else {
    Say "No global git identity is set, so commits would be auto-derived from"
    Say "this machine's account - likely the new firm's domain."
    Say ""
    $inName  = Read-Host "  git user.name  (blank to skip)"
    if ($inName) {
        $inEmail = Read-Host "  git user.email"
        git config --global user.name  $inName
        git config --global user.email $inEmail
        Ok "identity set: $inName <$inEmail>"
    }
    else { Warn "skipped - set it later with: git config --global user.name/user.email" }
}

# Long filenames in reference-plans/ exceed the Windows 260-char path limit.
git config --global core.longpaths true
Ok "core.longpaths enabled globally"

Step "Left for you"
Say "- Sign in to Claude Code in VS Code (credentials aren't copied)"
Say "- Put your own Anthropic API key in server\.env"
Say "- Check environment\environment-report.md for the rest"
Write-Host ""
