<#
.SYNOPSIS
  Register (or remove) the Windows Scheduled Task that mirrors the project into
  OneDrive.

  Runs hourly across the working day, on the same window as the task scanner, so
  the task archive and any client documents written during the day reach OneDrive
  within the hour rather than sitting only on this disk.

  Runs while you are logged on, like the task scanner. Registering a task that
  runs when logged off needs administrator rights, and the machine has to be
  awake for OneDrive to sync in any case.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install-backup-task.ps1
  powershell -ExecutionPolicy Bypass -File install-backup-task.ps1 -Minutes 240
  powershell -ExecutionPolicy Bypass -File install-backup-task.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [int]    $Minutes = 60,
  [string] $TaskName = "FPGod OneDrive Backup",
  [string] $StartTime = '07:00',
  [int]    $ActiveHours = 17,
  [switch] $Uninstall
)

$ErrorActionPreference = "Stop"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task '$TaskName'."
  } else {
    Write-Host "No scheduled task named '$TaskName'."
  }
  return
}

$script = Join-Path $PSScriptRoot "sync-onedrive.ps1"
if (-not (Test-Path $script)) { throw "Cannot find sync-onedrive.ps1 next to this script." }

$argLine = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argLine -WorkingDirectory $PSScriptRoot

# New-ScheduledTaskTrigger cannot set -RepetitionInterval on a -Daily trigger,
# so the Repetition block is lifted off a throwaway -Once trigger.
$repeat = New-TimeSpan -Minutes $Minutes
$daily  = New-ScheduledTaskTrigger -Daily -At $StartTime
$daily.Repetition = (New-ScheduledTaskTrigger -Once -At $StartTime `
    -RepetitionInterval $repeat `
    -RepetitionDuration (New-TimeSpan -Hours $ActiveHours)).Repetition

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# Interactive, matching the task scanner. S4U ("run whether logged on or not")
# needs administrator rights to register and is refused with Access Denied under
# a standard account - and the machine has to be awake for OneDrive to sync anyway.
$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $daily `
  -Settings $settings -Principal $principal `
  -Description "Mirrors C:\FPGod-Program into OneDrive every $Minutes minutes, excluding node_modules and .git." | Out-Null

$endHour = ([datetime]$StartTime).AddHours($ActiveHours).ToString('HH:mm')
Write-Host "Registered '$TaskName' - every $Minutes minutes, $StartTime to $endHour."
Write-Host "Run it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove it with :  powershell -File install-backup-task.ps1 -Uninstall"
