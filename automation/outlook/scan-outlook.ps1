<#
.SYNOPSIS
  Scan the locally signed-in Outlook desktop mailbox (Microsoft 365) via COM and
  export message metadata as JSON. Optionally save attachments to a target folder.

  Read-only against Outlook (never sends, deletes or moves mail). No cloud/Azure
  setup — uses the mailbox already authenticated in the Outlook desktop app.

.EXAMPLE
  # Last 7 days of the Inbox -> JSON on stdout
  powershell -File scan-outlook.ps1 -Days 7

.EXAMPLE
  # Last 30 days from a sender, save attachments into the app's intake area
  powershell -File scan-outlook.ps1 -Days 30 -From "aia.com" `
    -Out ..\..\intake\outlook\scan.json -SaveAttachments ..\..\intake\outlook\attachments
#>
[CmdletBinding()]
param(
  [int]    $Days = 7,               # look-back window in days
  [string] $Folder = "Inbox",       # Inbox | SentItems (default folder names)
  [string] $From = "",              # optional substring match on sender name/email
  [string] $Subject = "",           # optional substring match on subject
  [int]    $MaxItems = 200,         # safety cap
  [switch] $IncludeBody,            # include a short body preview (sensitive — off by default)
  [string] $SaveAttachments = "",   # dir to save attachments into (created if missing)
  [string] $Out = ""                # write JSON here instead of stdout
)

$ErrorActionPreference = "Stop"
$folderMap = @{ "Inbox" = 6; "SentItems" = 5; "Drafts" = 16 }
if (-not $folderMap.ContainsKey($Folder)) { throw "Unsupported -Folder '$Folder'. Use: $($folderMap.Keys -join ', ')" }

# Sort newest-first and walk until we pass the look-back window. Manual date
# compare avoids the locale-sensitive Restrict() date-format pitfall.
$cutoff = (Get-Date).AddDays(-$Days)

$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace("MAPI")
$src = $ns.GetDefaultFolder($folderMap[$Folder])
$items = $src.Items
$items.Sort("[ReceivedTime]", $true)

if ($SaveAttachments -and -not (Test-Path $SaveAttachments)) {
  New-Item -ItemType Directory -Path $SaveAttachments -Force | Out-Null
}

$results = New-Object System.Collections.ArrayList
$n = 0
foreach ($m in $items) {
  if ($n -ge $MaxItems) { break }
  if ($m.Class -ne 43) { continue }  # olMail only (skip meeting/report items)
  try { if ($m.ReceivedTime -lt $cutoff) { break } } catch { continue }  # sorted desc -> past window

  $sender = ""
  try { $sender = $m.SenderEmailAddress } catch {}
  $name = ""; try { $name = $m.SenderName } catch {}
  if ($From    -and (($name -notlike "*$From*") -and ($sender -notlike "*$From*"))) { continue }
  if ($Subject -and ($m.Subject -notlike "*$Subject*")) { continue }

  $attNames = @()
  $saved    = @()
  try {
    foreach ($a in $m.Attachments) {
      $attNames += $a.FileName
      # Save only real document types — skip signature images / inline blobs.
      if ($SaveAttachments -and $a.Type -eq 1 -and $a.FileName -match '\.(pdf|docx?|xlsx?|xlsm|csv|txt)$') {
        $safe = ($a.FileName -replace '[\\/:*?"<>|]', '_')
        $dest = Join-Path $SaveAttachments ("{0:yyyyMMdd_HHmmss}_{1}" -f $m.ReceivedTime, $safe)
        $a.SaveAsFile($dest)
        $saved += $dest
      }
    }
  } catch {}

  $row = [ordered]@{
    receivedTime    = $m.ReceivedTime.ToString("yyyy-MM-ddTHH:mm:ss")
    senderName      = $name
    senderEmail     = $sender
    subject         = $m.Subject
    hasAttachments  = [bool]($attNames.Count)
    attachmentNames = $attNames
    savedAttachments= $saved
    unread          = [bool]$m.UnRead
    entryId         = $m.EntryID
  }
  if ($IncludeBody) {
    $b = ""; try { $b = $m.Body } catch {}
    $row.bodyPreview = ($b -replace '\s+',' ').Trim()
    if ($row.bodyPreview.Length -gt 600) { $row.bodyPreview = $row.bodyPreview.Substring(0,600) }
  }
  [void]$results.Add($row)
  $n++
}

$json = $results | ConvertTo-Json -Depth 5
if ($Out) {
  $dir = Split-Path $Out -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $json | Out-File -FilePath $Out -Encoding utf8
  Write-Host ("Wrote {0} messages -> {1}" -f $results.Count, $Out)
} else {
  $json
}
[Runtime.InteropServices.Marshal]::ReleaseComObject($ol) | Out-Null
