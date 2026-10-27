---
name: case-folder-intake
description: Copy a client's SharePoint case folder out (read only), read every document in it correctly, and produce an inventory, extracted text and a list of inconsistencies in a working folder outside SharePoint. Use before build-soa, cvc-summary, application-details or build-pack, or when the adviser says "read X's folder", "intake X", "what's in X's file", "copy X's folder out" or drops a client folder.
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# Case folder intake

## Purpose

Get a client's case folder out of SharePoint safely and read all of it. Produce:

1. a byte-faithful copy outside SharePoint;
2. the text of every document;
3. an inventory of every file and how it was read;
4. a review list of inconsistencies for the adviser.

Later skills (`build-soa`, `cvc-summary`, `application-details`, `build-pack`) work from this output, not from SharePoint.

This skill reads and reports. It does not write advice, fix documents or decide anything for the adviser.

## When to use

- Before any skill that needs the client's filed documents.
- When the adviser asks what is in a client's file, or asks to read or copy it out.
- Again when Howard has filed new documents. Make a new dated run; never overwrite an earlier one.

Do not use it for a new prospect with no SharePoint folder. `meeting-notes` handles that.

## Inputs

| Input | Required | Where from |
|---|---|---|
| Client folder name (`Surname, First`) | Yes | The adviser. If several folders match, list them and ask. |
| Advice year | No | Default: the newest `<YYYY> Advice & Service` folder. [Q-IN-3] |
| `LEGACY_LIBRARY_ROOT`, `WORK_ROOT` | Yes | `../_shared/firm-settings.md` §10 |
| Known facts to check against (amounts the adviser named in chat) | No | The adviser |

Read first: `../_shared/firm-rules.md` and `../_shared/firm-settings.md`.

## Steps

1. **Find the folder.** List `<LEGACY_LIBRARY_ROOT>\Clients\` and match the name. Read only. Confirm the match with the adviser if it is not exact.

2. **Make the working folder** outside SharePoint:
   ```
   <WORK_ROOT>\<case name>\intake-<yyyy.MM.dd>\
     source\      exact copy of the SharePoint folder
     text\        one .txt per document, same relative path
     pages\       PNG page renders (tables, logos, scans)
     converted\   .docx made from .doc copies
     .build\      any script written for this run
   ```
   Check the path is not inside `LEGACY_LIBRARY_ROOT` before writing anything. Never put `text\` or `converted\` inside `source\`.

3. **Copy out.** Copy the advice year folder into `source\`. If a plain copy fails, use robocopy (see `references/extraction-methods.md` §1). Library path first. No `/MIR /PURGE /MOV /MOVE /M`. Log into the working folder.

4. **Check the copy.** Compare file count and total size with the source listing. List any file that failed to download (OneDrive placeholder) as `not copied`.

5. **List older years** by file name only. Do not copy them unless the adviser asks or a check needs them (for example the last signed quote is in last year's folder). [Q-IN-3]

6. **Read every file** in `source\` with the right method. See the decision rules below and `references/extraction-methods.md`. Write text to `text\`. Note the method and result for each file.

7. **Look at what text cannot show.** Render pages to PNG and read the images for Risk Researcher runs, Compare Ratings, One on One Comparison, scanned PDFs, and any page where provider names are logos.

8. **Build the inventory** from `references/inventory-template.md`. One row per file. Nothing skipped silently.

9. **Run the checks** in `references/inconsistency-checks.md`. Write each finding to the review list with the files and values on both sides.

10. **Report in chat:** what was copied, what could not be read, the key documents found (SOA Notes, Risk Checklist, latest Fact Find, latest quotes, CvC), missing key documents, and the review list. End with the version line (firm-rules §10.2).

## Hard rules

- Obey every rule in `../_shared/firm-rules.md`. The ones this skill hits most:
- SharePoint is read only. Copy out first. Never write in. (rules §2)
- No output beside a source. Extraction folders go in the working folder, never in SharePoint and never inside `source\`. (rules §3)
- Do not open saved email files (`.msg`) until [Q-IN-1] is answered. List them by name.
- Never invent a value. A value you cannot read is `[ADVISER TO CONFIRM]` in the inventory, with the reason.
- Never copy client data into the skill pack, the repo outside gitignored folders, or chat beyond what the adviser needs.
- Do not install software without asking. If a tool is missing, say which and what it blocks. [Q-IN-11]
- Do not edit any document, including the copy. `source\` stays byte for byte as it was.

## Decision rules

| IF | THEN |
|---|---|
| `.pdf` with a text layer | `pdftotext -layout`. Check the output is not empty or scrambled. |
| `.pdf` with no text, or scrambled text | Read with pymupdf, then render pages to PNG and read the images. [Q-IN-5] |
| `.pdf` is an insurer application or form (fields, tick boxes; PPS paper applications always) | Also read AcroForm fields with pymupdf `widgets()`. Health, income history and travel answers live there, not in the text. |
| Risk Researcher, Compare Ratings or One on One Comparison PDF | Render every page to PNG and read the image. Provider names are logos and table layout scrambles in text. |
| `.docx` | mammoth for body text. Also scan headers, footers and text boxes from the XML. List images in `word/media/`. |
| `.doc` | Cannot be read as is. Convert the **copy** to `.docx` in `converted\`, then read that. Never convert in SharePoint. [Q-IN-4] |
| `.xlsx`, `.xlsm`, `.xls` | Read every sheet, including hidden ones. Keep sheet names exactly (the CvC sheet is `CvC ` with a trailing space). Read cached values, not formulas. |
| `.msg` | Do not open. List as `not read: saved email [Q-IN-1]`. |
| Image file (`.jpg`, `.png`, `.heic`) | Read the image directly. |
| `.zip` or other archive | List it. Do not extract unless the adviser asks. |
| Any other type | List it as `not read: unsupported type`. |
| File will not download from OneDrive | List as `not copied`. Carry on. |
| Several files called "Final" for the same thing | Treat the newest by date stamp in the name, then by modified time, as current. Flag the others. [Q-IN-8] |
| The firm's own finished SOA is in the folder | Inventory and read it, but mark it `firm SOA` so `build-soa` can set it aside. [Q-IN-9] |
| No SOA Notes in the folder | Flag it. Note where the reasoning may be instead (fact find "Your story", meeting notes). |
| A `Client Directed Amounts\` subfolder exists | Flag: client chose lower cover than first presented. |
| A document names a different client | Stop reading that file. Flag it as possibly misfiled. |
| A document names another adviser or another licensee | Flag it. (Insurer applications and quotes under Josh Davidson are expected.) |
| Subfolder names differ from firm-settings §8 | Match by leading number and keywords. Note the actual names. [Q-IN-10] |

## Output

In `<WORK_ROOT>\<case name>\intake-<yyyy.MM.dd>\`:

| File | What |
|---|---|
| `source\` | Exact copy. Never edited. |
| `text\**.txt` | Extracted text, one per document, header line naming the source file and method. |
| `pages\**.png` | Page renders used. |
| `converted\` | `.docx` made from `.doc` copies. |
| `inventory.md` | Per `references/inventory-template.md`. |
| `review-list.md` | Inconsistencies and missing items, most serious first. Ends with the version line. |
| `copy-log.txt` | robocopy log, if used. |

All of it is client data. It stays in the gitignored working folder.

## Checks

Before reporting, confirm:

- [ ] Nothing was written under `LEGACY_LIBRARY_ROOT`. (List the client folder again: same files, same modified times.)
- [ ] Every file in `source\` has one inventory row with a status.
- [ ] File count in `source\` matches the SharePoint listing, less any `not copied`.
- [ ] Every Risk Researcher and ratings PDF was read from images.
- [ ] Every insurer application PDF had its form fields read.
- [ ] Every `.xlsx` sheet name is listed exactly.
- [ ] No `.msg` was opened.
- [ ] Every finding in the review list names both sources and both values.
- [ ] The review list ends with the version line.

## Open questions

See `../_questions/case-folder-intake.md` (Q-IN-1 to Q-IN-13) and `../_questions/shared.md`.
