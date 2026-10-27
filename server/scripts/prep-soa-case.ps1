<#
Stage 1-3 of the SOA pipeline: initial meeting notes, fact find and draft SOA Notes,
filed into a case folder laid out like the SharePoint client folder.

  powershell -File server/scripts/prep-soa-case.ps1 -Slug jane-citizen-sep03 `
      -Client "Citizen, Jane & John" -Short "Citizen J&J" -NotesName "Jane Citizen SEP03"

Reads from legacy/file-notes/:
  <Slug>-cds.json         Client Details Summary data (generate-client-details-summary.mjs)
  <Slug>-ff.json          fact find data (generate_fact_find.py)
  <Slug>-soa-notes.json   SOA Notes / paraplanner brief data (build_soa_notes.py)

Writes legacy/soa/<Client>/1. Advice/<Year> Advice & Service/... (gitignored).
Nothing is written to SharePoint: Tristan or the paraplanner moves the folder across.
#>
param(
  [Parameter(Mandatory)][string]$Slug,
  [Parameter(Mandatory)][string]$Client,      # "Surname, First" or "Surname, First & Second"
  [Parameter(Mandatory)][string]$Short,       # "Citizen J&J", as in the firm's file names
  [Parameter(Mandatory)][string]$NotesName,   # "Jane Citizen SEP03"
  [datetime]$Date = (Get-Date)
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$notes = Join-Path $root 'legacy\file-notes'
$env:PYTHONIOENCODING = 'utf-8'

$advice = Join-Path $root "legacy\soa\$Client\1. Advice\$($Date.Year) Advice & Service"
$research = Join-Path $advice '1. Research, Financials, Medicals, Schedules'
$compliance = Join-Path $advice '2. Compliance docs (SOA, ROA, EO & Fact Find)'
$signed = Join-Path $advice '3. Signed documents - Implemented Audit'
foreach ($d in $research, $compliance, $signed) { New-Item -ItemType Directory -Force $d | Out-Null }

$stamp = $Date.ToString('yyyy.MM.dd')
$cdsOut = Join-Path $compliance "$NotesName - Initial Meeting Notes.docx"
$ffOut = Join-Path $compliance "$stamp - $Short - Fact Find.docx"
$soaOut = Join-Path $compliance "$stamp - $Short - SOA Notes.docx"

Push-Location (Join-Path $root 'server')
try {
  node scripts/generate-client-details-summary.mjs (Join-Path $notes "$Slug-cds.json") $cdsOut
  if ($LASTEXITCODE) { throw 'Initial meeting notes failed' }
} finally { Pop-Location }
python (Join-Path $PSScriptRoot 'generate_fact_find.py') (Join-Path $notes "$Slug-ff.json") $ffOut
if ($LASTEXITCODE) { throw 'Fact find failed' }
python (Join-Path $PSScriptRoot 'build_soa_notes.py') (Join-Path $notes "$Slug-soa-notes.json") $soaOut
if ($LASTEXITCODE) { throw 'SOA Notes failed' }

# PDFs. Word's export engine sometimes hangs on this machine; the .docx files
# are the deliverable, so a failure here is reported, not fatal.
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $cdsOut, $ffOut, $soaOut) {
    try {
      $doc = $word.Documents.Open($f, $false, $true)
      $doc.ExportAsFixedFormat([IO.Path]::ChangeExtension($f, '.pdf'), 17)
      $doc.Close(0)
    } catch { Write-Warning "PDF export failed for $(Split-Path $f -Leaf): $_" }
  }
} finally { $word.Quit() }

Write-Output "Case folder: $advice"
Get-ChildItem $compliance | ForEach-Object { Write-Output "  $($_.Name)" }
