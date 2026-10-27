# Inventory template

Version 0.1.0-draft. Part of `case-folder-intake`. Copy this shape into `inventory.md`. All values below are placeholders.

```markdown
# Intake inventory: <case name>

- Source: <LEGACY_LIBRARY_ROOT>\Clients\<Surname, First>\1. Advice\<YYYY> Advice & Service\
- Copied to: <WORK_ROOT>\<case name>\intake-<yyyy.MM.dd>\source\
- Copied on: <d MMMM yyyy>, method <Copy-Item | robocopy>
- Files at source: <n>. Copied: <n>. Not copied: <n>.
- Older advice years listed, not copied: <YYYY>, <YYYY>

## Key documents

| Role | File | Date | Note |
|---|---|---|---|
| SOA Notes | <path or MISSING> | | |
| Risk Checklist | | | |
| Latest Fact Find | | | |
| Final quote(s) | | | one row per policy |
| Insurance Cover Summary / CvC | | | sheets: "Option 1", "CvC " |
| Risk Researcher / comparisons | | | |
| Existing schedules | | | |
| Applications | | | |
| Firm SOA (set aside) | | | |

## All files

| # | Path (relative to source\) | Type | Size | Modified | Category | Method | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2. Compliance docs\<file>.docx | docx | 84 KB | 2026.10.20 | soa-notes | mammoth + parts | read | |
| 2 | 1. Research...\<file>.pdf | pdf | 1.2 MB | 2026.10.18 | research | pages as images | read | 6 pages rendered |
| 3 | 1. Research...\<file>.pdf | pdf | 310 KB | 2026.10.18 | application | pdftotext + form fields | read | 142 fields |
| 4 | 2. Compliance docs\<file>.doc | doc | 40 KB | 2025.03.02 | other | converted copy + mammoth | read | |
| 5 | 2. Compliance docs\<file>.msg | msg | 55 KB | 2026.10.10 | correspondence | — | not read [Q-IN-1] | saved email |
| 6 | 1. Research...\<file>.pdf | pdf | — | — | — | — | not copied | OneDrive download failed |

Status values: `read`, `partial` (say what is missing), `not read` (say why), `not copied`.

Category values (first match wins, from the library indexer): soa-notes, risk-checklist, cover-summary, fact-find, meeting-notes, product (PDS/FSG), soa, schedule, research, application, certificate, authority, premium-summary, correspondence, other.

## Tools

<tool and version used for each method; anything missing and what it blocked>

Produced with case-folder-intake 0.1.0-draft, firm-rules 0.1.0-draft, firm-settings 0.1.0-draft, on <d MMMM yyyy>.
```
