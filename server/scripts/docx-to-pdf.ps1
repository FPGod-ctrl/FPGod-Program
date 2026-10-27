<#
Export Word documents to PDF next to themselves, opening each read-only so the
.docx is never modified. Used by the workbench after it builds a document and by
the SOA pack builder for firm documents that only exist in Word.

  powershell -NoProfile -ExecutionPolicy Bypass -File server/scripts/docx-to-pdf.ps1 a.docx b.docx

Prints one line per file: "OK <pdf>" or "FAIL <docx>: <reason>". Exit code 0 even
when a single export fails; the caller treats a missing PDF as a warning.
#>
param([Parameter(ValueFromRemainingArguments)][string[]]$Paths)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $Paths) {
    try {
      $pdf = [IO.Path]::ChangeExtension($f, '.pdf')
      $doc = $word.Documents.Open($f, $false, $true)
      $doc.ExportAsFixedFormat($pdf, 17)
      $doc.Close(0)
      Write-Output "OK $pdf"
    } catch { Write-Output "FAIL ${f}: $($_.Exception.Message)" }
  }
} finally { $word.Quit() }
