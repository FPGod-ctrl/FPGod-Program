<#
.SYNOPSIS
  Register (or remove) the weekly Scheduled Task that commits and pushes the
  week's work to GitHub.

  Friday at 4:30pm by default. The OneDrive mirror runs hourly and covers client
  material; this covers code and documentation, so nothing has to be asked for at
  the end of the week.

  -StartWhenAvailable matters here: unlike an hourly job, a weekly one that fires
  while the machine is off or asleep is simply missed, and the week goes unsaved.
  With it set, the task runs at the next opportunity instead.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install-checkpoint-task.ps1
  powershell -ExecutionPolicy Bypass -File install-checkpoint-task.ps1 -At "17:00" -Day Thursday
  powershell -ExecutionPolicy Bypass -File install-checkpoint-task.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [string] $TaskName = "FPGod Weekly Checkpoint",
  [string] $At = "16:30",
  [ValidateSet('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')]
  [string] $Day = 'Friday',
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

$script = Join-Path $PSScriptRoot "weekly-checkpoint.ps1"
if (-not (Test-Path $script)) { throw "Cannot find weekly-checkpoint.ps1 next to this script." }

$argLine = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argLine -WorkingDirectory $PSScriptRoot

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Day -At $At

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

# Interactive, matching the other FPGod tasks. S4U needs administrator rights,
# and a push may need the cached Git credential that belongs to this session.
$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal `
  -Description "Commits and pushes the week's work to GitHub every $Day at $At." | Out-Null

Write-Host "Registered '$TaskName' - every $Day at $At."
Write-Host "Run it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove it with :  powershell -File install-checkpoint-task.ps1 -Uninstall"
