<#
.SYNOPSIS
  Register (or remove) the Windows Scheduled Task that runs the cycle every 30 min.

  The task deliberately runs ONLY while you are logged on, in your own desktop
  session. Driving Excel needs an interactive session — a task configured to "run
  whether user is logged on or not" executes in session 0, where there is no
  Excel to write the workbook with.

  Mail itself comes from Microsoft Graph, so Outlook does not need to be open.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install-task.ps1
  powershell -ExecutionPolicy Bypass -File install-task.ps1 -Minutes 15
  powershell -ExecutionPolicy Bypass -File install-task.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [int]    $Minutes = 30,
  [string] $TaskName = "FPGod Live Task List",
  [string] $Workbook = "",
  # Mail source passed through to run-cycle.ps1. Pin to Outlook while Graph is
  # waiting on tenant admin consent; switch to Auto once that lands and it will
  # prefer Graph on its own.
  [ValidateSet('Auto','Graph','Drop','Outlook')]
  [string] $Source = 'Auto',
  # Working-day window. Default 07:00 for 17 hours, i.e. 7am until midnight —
  # there is no mail worth scanning overnight and no reason to spend API calls on it.
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

$runCycle = Join-Path $PSScriptRoot "run-cycle.ps1"
if (-not (Test-Path $runCycle)) { throw "Cannot find run-cycle.ps1 next to this script." }

$argLine = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $runCycle
if ($Workbook)          { $argLine += ' -Workbook "{0}"' -f $Workbook }
if ($Source -ne 'Auto') { $argLine += ' -Source {0}' -f $Source }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argLine -WorkingDirectory $PSScriptRoot

# A daily trigger with a bounded repetition window beats repeating around the
# clock and skipping overnight inside the script: the machine is not woken at
# all between midnight and 7am.
#
# New-ScheduledTaskTrigger cannot set -RepetitionInterval on a -Daily trigger,
# so the Repetition block is lifted off a throwaway -Once trigger.
$repeat = New-TimeSpan -Minutes $Minutes
$daily  = New-ScheduledTaskTrigger -Daily -At $StartTime
$daily.Repetition = (New-ScheduledTaskTrigger -Once -At $StartTime `
    -RepetitionInterval $repeat `
    -RepetitionDuration (New-TimeSpan -Hours $ActiveHours)).Repetition

# Also fire at logon so the list is current when he sits down. run-cycle.ps1
# applies its own quiet-hours guard, so a 3am logon still does not scan.
$triggers = @(
  $daily
  New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

# Interactive logon type: the task runs inside the desktop session, which is what
# gives it a live Outlook to read and an Excel it can update on screen.
$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers `
  -Settings $settings -Principal $principal `
  -Description "Scans Outlook every $Minutes minutes and rebuilds the live task list spreadsheet." | Out-Null

$endHour = ([datetime]$StartTime).AddHours($ActiveHours).ToString('HH:mm')
Write-Host "Registered '$TaskName' - every $Minutes minutes, $StartTime to $endHour, while you are logged on."
Write-Host "Run it now with:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove it with :  powershell -File install-task.ps1 -Uninstall"
