<#
.SYNOPSIS
  Read the locally signed-in Outlook desktop calendar (Microsoft 365) via COM and
  export appointments in a date window as JSON.

  Read-only against Outlook (never creates, moves or deletes appointments). No
  cloud/Azure setup — uses the mailbox already authenticated in Outlook desktop.
  Recurring appointments are expanded into their individual occurrences.

.EXAMPLE
  # Yesterday + next 30 days -> JSON on stdout
  powershell -File scan-calendar.ps1 -Back 1 -Ahead 30
#>
[CmdletBinding()]
param(
  [int]    $Back = 1,        # days to look back from today
  [int]    $Ahead = 30,      # days to look ahead from today
  [int]    $MaxItems = 500,  # safety cap
  [string] $Out = ""         # write JSON here instead of stdout
)

$ErrorActionPreference = "Stop"

$start = (Get-Date).Date.AddDays(-$Back)
$end   = (Get-Date).Date.AddDays($Ahead).AddDays(1).AddSeconds(-1)

# Outlook Restrict expects US-style date literals regardless of system locale —
# using "MM/dd/yyyy hh:mm tt" avoids the locale-sensitive short-date pitfall.
$fmt = "MM/dd/yyyy hh:mm tt"
$restrict = "[Start] >= '" + $start.ToString($fmt) + "' AND [Start] <= '" + $end.ToString($fmt) + "'"

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace("MAPI")
$cal = $ns.GetDefaultFolder(9)   # olFolderCalendar
$items = $cal.Items
# IncludeRecurrences MUST be paired with a Start sort + Restrict, otherwise the
# expanded series has no natural end and iteration can loop indefinitely.
$items.IncludeRecurrences = $true
$items.Sort("[Start]")
$filtered = $items.Restrict($restrict)

$results = New-Object System.Collections.ArrayList
$n = 0
foreach ($appt in $filtered) {
  if ($n -ge $MaxItems) { break }
  try { if ($appt.Start -gt $end) { break } } catch { continue }  # sorted asc -> past window

  $location = ""; try { $location = $appt.Location } catch {}
  $organizer = ""; try { $organizer = $appt.Organizer } catch {}
  $required = ""; try { $required = $appt.RequiredAttendees } catch {}

  $row = [ordered]@{
    start             = $appt.Start.ToString("yyyy-MM-ddTHH:mm:ss")
    end               = $appt.End.ToString("yyyy-MM-ddTHH:mm:ss")
    subject           = $appt.Subject
    location          = $location
    organizer         = $organizer
    requiredAttendees = $required
    allDay            = [bool]$appt.AllDayEvent
    recurring         = [bool]$appt.IsRecurring
    busyStatus        = [int]$appt.BusyStatus   # 0 Free 1 Tentative 2 Busy 3 OOF 4 WorkingElsewhere
    categories        = $appt.Categories
    entryId           = $appt.EntryID
  }
  [void]$results.Add($row)
  $n++
}

$json = $results | ConvertTo-Json -Depth 4
if ($Out) {
  $dir = Split-Path $Out -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $json | Out-File -FilePath $Out -Encoding utf8
  Write-Host ("Wrote {0} appointments -> {1}" -f $results.Count, $Out)
} else {
  $json
}
[Runtime.InteropServices.Marshal]::ReleaseComObject($ol) | Out-Null
