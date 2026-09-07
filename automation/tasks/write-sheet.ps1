<#
.SYNOPSIS
  Render the task state file into an Excel workbook, live.

  Two-way by design. The spreadsheet owns Status and Notes — whatever you typed
  there is read back into tasks.json BEFORE the sheet is rewritten, so ticking
  something "Done" sticks. Everything else (task text, who, priority, due, source)
  is regenerated from the state file each cycle.

  Attaches to a running Excel instance when there is one, so if the workbook is
  already open on screen the rows update in place while you watch.

.EXAMPLE
  powershell -File write-sheet.ps1 -TasksJson state\tasks.json -Workbook "$env:USERPROFILE\Desktop\Task List.xlsx"
#>
[CmdletBinding()]
param(
  [string] $TasksJson = "",
  [string] $Workbook  = "",
  [switch] $ShowExcel     # bring Excel to the front after writing (manual runs)
)

$ErrorActionPreference = "Stop"
if (-not $TasksJson) { $TasksJson = Join-Path $PSScriptRoot "state\tasks.json" }
if (-not $Workbook)  { $Workbook  = Join-Path ([Environment]::GetFolderPath("Desktop")) "Task List.xlsx" }

if (-not (Test-Path $TasksJson)) { throw "No task state at $TasksJson — run a scan first." }
$state = Get-Content $TasksJson -Raw | ConvertFrom-Json
$tasks = @($state.tasks)

$HEADERS = @("ID","Status","Priority","Due","Type","Who","Task","Notes","From","Received","Email Subject")

# Every value on this sheet came out of an email, i.e. from outside. A cell whose
# text starts with = + - @ (or a leading tab/CR) is evaluated by Excel as a
# formula, so a crafted subject line could execute on open. Prefixing an
# apostrophe forces literal text; Excel does not display it.
function ConvertTo-SafeCell($v) {
  if ($null -eq $v) { return "" }
  $s = [string]$v
  if ($s -match '^[=+\-@\t\r]') { return "'" + $s }
  return $s
}
$STATUSES = "In Progress,Open,Waiting,Done,Cancelled"
$FIRST_DATA_ROW = 3

# --- connect to Excel -------------------------------------------------------
# Prefer an already-running instance so an open workbook updates in place.
$excel = $null
$weStartedExcel = $false
try { $excel = [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application") } catch { }
if (-not $excel) {
  $excel = New-Object -ComObject Excel.Application
  $weStartedExcel = $true
}
$excel.DisplayAlerts = $false

# Reuse the workbook if this Excel already has it open, otherwise open/create it.
$wb = $null
foreach ($open in $excel.Workbooks) {
  try { if ($open.FullName -eq $Workbook) { $wb = $open; break } } catch { }
}
$createdWorkbook = $false
if (-not $wb) {
  if (Test-Path $Workbook) {
    $wb = $excel.Workbooks.Open($Workbook)
  } else {
    $dir = Split-Path $Workbook -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $wb = $excel.Workbooks.Add()
    $createdWorkbook = $true
  }
}

$ws = $null
foreach ($sheet in $wb.Worksheets) { if ($sheet.Name -eq "Tasks") { $ws = $sheet; break } }
if (-not $ws) {
  $ws = $wb.Worksheets.Add()
  $ws.Name = "Tasks"
}

# --- read the human's edits back out before we overwrite anything -----------
$edits = @{}
$lastRow = 0
try { $lastRow = $ws.Cells($ws.Rows.Count, 1).End(-4162).Row } catch { $lastRow = 0 }  # xlUp
if ($lastRow -ge $FIRST_DATA_ROW) {
  # One bulk read beats a COM round-trip per cell. Value2 comes back as a
  # 1-based array indexed relative to the range, not by worksheet row number.
  $existing = $ws.Range($ws.Cells($FIRST_DATA_ROW,1), $ws.Cells($lastRow,8)).Value2
  $rowCount = $lastRow - $FIRST_DATA_ROW + 1
  for ($r = 1; $r -le $rowCount; $r++) {
    $id = $existing.GetValue($r, 1)
    if (-not $id) { continue }
    $edits["$id"] = @{
      status = [string]$existing.GetValue($r, 2)
      notes  = [string]$existing.GetValue($r, 8)
    }
  }
}

# Apply only what a HUMAN changed in the sheet.
#
# Comparing the cell against the task's current status is wrong: the scanner may
# have just closed a task, and the sheet still shows the value from the previous
# cycle, so a plain comparison reverts every machine change — auto-close could
# never stick. Each task therefore remembers the value last WRITTEN to the sheet
# ('sheetStatus'). A cell that still matches that is untouched; a cell that
# differs is a real edit and wins.
$changed = $false
foreach ($t in $tasks) {
  if (-not $edits.ContainsKey($t.id)) { continue }
  $e = $edits[$t.id]
  $lastStatus = if ($t.PSObject.Properties['sheetStatus']) { [string]$t.sheetStatus } else { $null }
  $lastNotes  = if ($t.PSObject.Properties['sheetNotes'])  { [string]$t.sheetNotes  } else { $null }

  if ($e.status -and $null -ne $lastStatus -and $e.status -ne $lastStatus -and $e.status -ne $t.status) {
    $t.status = $e.status; $changed = $true
  }
  if ($null -ne $e.notes -and $null -ne $lastNotes -and $e.notes -ne $lastNotes -and $e.notes -ne $t.notes) {
    $t.notes = $e.notes; $changed = $true
  }
}
if ($changed) {
  $state.tasks = $tasks
  # WriteAllText with a BOM-less encoding: Out-File -Encoding utf8 prepends a
  # UTF-8 BOM, and every JSON.parse downstream (the API, extract-tasks) then
  # rejects the whole file.
  [IO.File]::WriteAllText($TasksJson, ($state | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
}

# --- order: what needs doing, soonest and most urgent, at the top -----------
$statusRank = @{ "In Progress" = 0; "Open" = 1; "Waiting" = 2; "Done" = 3; "Cancelled" = 4 }
$prioRank   = @{ "High" = 0; "Medium" = 1; "Low" = 2 }
# @() forces an array: with a single task Sort-Object returns a scalar, whose
# .Count is null, so the row-writing block below was skipped entirely and the
# sheet came out with headers and no data.
$sorted = @($tasks | Sort-Object `
  @{ Expression = { if ($statusRank.ContainsKey($_.status)) { $statusRank[$_.status] } else { 1 } } }, `
  @{ Expression = { if ($prioRank.ContainsKey($_.priority)) { $prioRank[$_.priority] } else { 1 } } }, `
  @{ Expression = { if ($_.due) { $_.due } else { "9999-12-31" } } }, `
  @{ Expression = { $_.source.received }; Descending = $true })

# --- write ------------------------------------------------------------------
$ws.Cells.UnMerge() | Out-Null
$ws.Cells.Clear() | Out-Null

$ws.Cells(1,1).Value2 = "Live Task List  —  updated $(Get-Date -Format 'ddd d MMM, h:mm tt')"
$titleRange = $ws.Range($ws.Cells(1,1), $ws.Cells(1,$HEADERS.Count))
$titleRange.Merge() | Out-Null
$titleRange.Font.Size = 14
$titleRange.Font.Bold = $true
$ws.Rows(1).RowHeight = 26

for ($c = 0; $c -lt $HEADERS.Count; $c++) { $ws.Cells(2, $c + 1).Value2 = $HEADERS[$c] }
$headerRange = $ws.Range($ws.Cells(2,1), $ws.Cells(2,$HEADERS.Count))
$headerRange.Font.Bold = $true
$headerRange.Interior.Color = 15921906    # light grey fill
$headerRange.Borders.Item(9).LineStyle = 1  # xlEdgeBottom

if ($sorted.Count -gt 0) {
  # Build the whole block in memory, then hand Excel one array — writing cell by
  # cell over COM takes seconds per hundred rows.
  $grid = New-Object 'object[,]' $sorted.Count, $HEADERS.Count
  for ($i = 0; $i -lt $sorted.Count; $i++) {
    $t = $sorted[$i]
    $grid[$i,0]  = ConvertTo-SafeCell $t.id
    $grid[$i,1]  = ConvertTo-SafeCell $(if ($t.status) { $t.status } else { "Open" })
    $grid[$i,2]  = ConvertTo-SafeCell $t.priority
    $grid[$i,3]  = ConvertTo-SafeCell $t.due
    $grid[$i,4]  = ConvertTo-SafeCell $t.type
    $grid[$i,5]  = ConvertTo-SafeCell $t.who
    $grid[$i,6]  = ConvertTo-SafeCell $t.task
    $grid[$i,7]  = ConvertTo-SafeCell $t.notes
    $grid[$i,8]  = ConvertTo-SafeCell $t.source.from
    $grid[$i,9]  = if ($t.source.received) { ([datetime]$t.source.received).ToString("yyyy-MM-dd HH:mm") } else { "" }
    $grid[$i,10] = ConvertTo-SafeCell $t.source.subject
  }
  # Remember what each row was written with, so the next run can distinguish a
  # human edit from a cell that simply has not been touched.
  foreach ($t in $tasks) {
    $st = if ($t.status) { $t.status } else { "Open" }
    if ($t.PSObject.Properties['sheetStatus']) { $t.sheetStatus = $st }
    else { $t | Add-Member -NotePropertyName sheetStatus -NotePropertyValue $st }
    if ($t.PSObject.Properties['sheetNotes']) { $t.sheetNotes = [string]$t.notes }
    else { $t | Add-Member -NotePropertyName sheetNotes -NotePropertyValue ([string]$t.notes) }
  }
  $state.tasks = $tasks
  [IO.File]::WriteAllText($TasksJson, ($state | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))

  $lastDataRow = $FIRST_DATA_ROW + $sorted.Count - 1
  $target = $ws.Range($ws.Cells($FIRST_DATA_ROW,1), $ws.Cells($lastDataRow,$HEADERS.Count))
  # Excel ranges sometimes arrive as a raw System.__ComObject with no IDispatch
  # adapter, and Value2 then binds to its scalar String overload and rejects the
  # array. Formula takes the same 2-D block and is unaffected.
  try { $target.Value2 = $grid } catch { $target.Formula = $grid }
  $target.VerticalAlignment = -4160   # xlTop

  # Status dropdown, so the column stays a clean set of values to filter on.
  $statusCol = $ws.Range($ws.Cells($FIRST_DATA_ROW,2), $ws.Cells($lastDataRow,2))
  $statusCol.Validation.Delete() | Out-Null
  $statusCol.Validation.Add(3, 1, 1, $STATUSES) | Out-Null   # xlValidateList, xlValidAlertStop
  $statusCol.HorizontalAlignment = -4108  # xlCenter

  # Colour the two things worth seeing at a glance: urgency and what is finished.
  $rows = $ws.Range($ws.Cells($FIRST_DATA_ROW,1), $ws.Cells($lastDataRow,$HEADERS.Count))
  $rows.FormatConditions.Delete() | Out-Null
  $hi = $rows.FormatConditions.Add(2, 0, "=`$C$FIRST_DATA_ROW=""High""")
  $hi.Interior.Color = 13551615   # soft red
  $done = $rows.FormatConditions.Add(2, 0, "=OR(`$B$FIRST_DATA_ROW=""Done"",`$B$FIRST_DATA_ROW=""Cancelled"")")
  $done.Font.Strikethrough = $true
  $done.Font.Color = 10921638
  $overdue = $rows.FormatConditions.Add(2, 0, "=AND(`$D$FIRST_DATA_ROW<>"""",`$D$FIRST_DATA_ROW<TODAY(),`$B$FIRST_DATA_ROW<>""Done"")")
  $overdue.Font.Bold = $true
  $overdue.Font.Color = 255       # red text

  $ws.Range("A2").AutoFilter() | Out-Null
}

# Widths tuned so Task and Notes get the room; the rest stay scannable.
$widths = @(8, 12, 9, 11, 9, 22, 62, 40, 22, 16, 40)
for ($c = 0; $c -lt $widths.Count; $c++) { $ws.Columns.Item($c + 1).ColumnWidth = $widths[$c] }
$ws.Columns.Item(7).WrapText = $true
$ws.Columns.Item(8).WrapText = $true

# Freeze the title + header so the list scrolls under them. Only possible when
# Excel has a real window — a headless background write has none, and that is
# cosmetic, so never let it fail the run.
try {
  $ws.Activate() | Out-Null
  $excel.ActiveWindow.FreezePanes = $false
  $ws.Cells($FIRST_DATA_ROW,1).Select() | Out-Null
  $excel.ActiveWindow.FreezePanes = $true
} catch { }

# --- save -------------------------------------------------------------------
if ($createdWorkbook) {
  $wb.SaveAs($Workbook, 51)   # xlOpenXMLWorkbook
} else {
  $wb.Save()
}

$open = @($tasks | Where-Object { $_.status -ne "Done" -and $_.status -ne "Cancelled" }).Count
Write-Host "Wrote $($sorted.Count) row(s) ($open open) -> $Workbook"

if ($ShowExcel) { $excel.Visible = $true }
elseif ($weStartedExcel) {
  # We opened Excel purely to write; leave the machine as we found it.
  $wb.Close($true)
  $excel.Quit()
}
$excel.DisplayAlerts = $true
[Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
