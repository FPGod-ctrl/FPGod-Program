# `0 - READ ME` template

Version 1.0.0. Written as Markdown (`0 - READ ME.md`), then always converted with
`python legacy/packs/readme_to_docx.py` so the pack also holds the `.pdf`. (default, Q-PK-15) `readme_to_docx.py`
handles `#`/`##` headings, pipe tables, `- ` bullets, `1. ` lists and `**bold**`. It narrows the
columns of a 3-column table whose first header starts with `#`, so keep the contents table to
exactly 3 columns with `#` first.

Placeholders only. Replace with the case's facts.

```markdown
# <Surname(s)> - SOA Pack

Built <dd/mm/yyyy hh:mm> for Legacy Risk Advice. Adviser: Tristan Biro.

## Contents

| # | File | In DocuSign envelope |
|---|---|---|
| 01 | Statement of Advice - <pack name>.pdf | Yes |
| 02 | FSG.pdf | Yes |
| 03 | Fact Find - <pack name>.pdf | Yes |
| 04 | [INSURER_A] Application Summary - Pre-Fill - [CLIENT_1 FULL NAME].pdf | Yes |
| 05 | [INSURER_B] Cancellation Letter - [CLIENT_1 FULL NAME].pdf | Yes |
| 06 | <PDS file name>.pdf | Yes |
| 07 | FINAL Insurance Summary - [CLIENT_1 FIRST LAST].pdf | **No** - send to client directly |
| 08 | Risk Checklist - <pack name>.pdf | **No** |

PDFs marked "(PDF of the Word copy, exported read-only)" were exported from the copied .docx.

## DocuSign signing routing

- **Order 1, in parallel:** [CLIENT_1 FULL NAME], [CLIENT_2 FULL NAME].
- **Order 2:** [ADVISER TO CONFIRM] countersigns. (open, Q-PK-1)

| Person | Signs |
|---|---|
| [CLIENT_1] | SOA Authority to Proceed; application 04; cancellation letter 05 |
| [CLIENT_2] | SOA Authority to Proceed; application <n> |
| [ADVISER TO CONFIRM] (open, Q-PK-1) | SOA (countersign) |

Envelope: every numbered document up to and including the PDS, PDF only where a .docx twin exists.
FSG, Fact Find and PDS carry no fields. Leave out the FINAL Insurance Summaries and the Risk
Checklist. (default, Q-PK-3; default, Q-PK-8)

## Firm documents: plain copies, SHA-256 matched to source

| File | SHA-256 | Source |
|---|---|---|
| 01 - Statement of Advice ... | <full hash> | <source path in the working copy> |
| 02 - FSG.pdf | <full hash> | legacy/advisers/tristan-biro/<FSG Combined 2026 file> |

Always the full 64-character SHA-256. (default, Q-PK-18)

## Edited items (not byte-for-byte)

| File | Change | Original hash | Pack copy hash |
|---|---|---|---|
| 05 - ... Cancellation Letter ... | Dated <dd/mm/yyyy>; "amend your records" line replaced with "please cancel" | <hash> | <hash> |

## Generated items

- <file>: filled from <house template>, dated <dd/mm/yyyy>.

## Review list

- <one line per item for Tristan to check>

Produced with build-pack 1.0.0, firm-rules <version>, firm-settings <version>, on <d MMMM yyyy>.
```

## Standard review lines (use when they apply)

- `<name> is older than its .docx in the client folder; it was copied as is. Check it matches.`
- `No Statement of Advice in the pack.`
- `No FSG in the pack (2026 FSG is the Combined file, Part 1 v9.1 + Part Two v8.0).`
- `FSG Part Two v8.0 shows out-of-date contact details; corrected profile pending from Synchron.` (always, while that is true) (default, Q-PK-2)
- `DocuSign countersigner not confirmed. [ADVISER TO CONFIRM]` (open, Q-PK-1)
- `No Fact Find in the pack.`
- `No insurer application summaries in the pack.`
- `No FINAL Insurance Summary yet for <name>. Run cvc-summary if wanted.`
- `FINAL Insurance Summaries and the Risk Checklist stay OUT of the DocuSign envelope; send the summaries to the clients directly.`
- `PDF export failed for <file>; the .docx is in the pack (DocuSign accepts .docx).` (default, Q-PK-16)
- `Two "Final" versions of <document> found; used <file> per Tristan.` or `...; identical hashes, used <file>.` (default, Q-PK-14)
- `PDS <file> dated <date>; checked against the insurer's site on <dd/mm/yyyy>.` (every PDS) (default, Q-PK-11)
- `Built into <new folder> because <old folder> was locked / already existed.` (default, Q-PK-13)
