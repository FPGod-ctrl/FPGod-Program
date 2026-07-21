<#
.SYNOPSIS
  Save the file attachments of a single Outlook message (by EntryID) to a folder
  and print JSON metadata. Used by the app to ingest email attachments into the
  document pipeline. Read-only against Outlook (only saves copies out).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string] $EntryId,
  [Parameter(Mandatory)][string] $OutDir
)

$ErrorActionPreference = "Stop"
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace("MAPI")
$m  = $ns.GetItemFromID($EntryId)

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$atts = New-Object System.Collections.ArrayList
$i = 0
foreach ($a in $m.Attachments) {
  if ($a.Type -ne 1) { continue }  # olByValue only — skip inline/signature images
  $i++
  $safe = ($a.FileName -replace '[\\/:*?"<>|]', '_')
  $dest = Join-Path $OutDir ("{0:D2}_{1}" -f $i, $safe)
  $a.SaveAsFile($dest)
  [void]$atts.Add([ordered]@{ name = $a.FileName; path = $dest; sizeBytes = (Get-Item $dest).Length })
}

$sender = ""; try { $sender = $m.SenderEmailAddress } catch {}
$out = [ordered]@{
  subject      = $m.Subject
  senderName   = $m.SenderName
  senderEmail  = $sender
  receivedTime = $m.ReceivedTime.ToString("yyyy-MM-ddTHH:mm:ss")
  attachments  = $atts
}
$out | ConvertTo-Json -Depth 5
[Runtime.InteropServices.Marshal]::ReleaseComObject($ol) | Out-Null
