---
name: case-folder-intake
description: Copy a client's SharePoint case folder out (read only), read every document in it correctly, and produce an inventory, extracted text and a list of inconsistencies in a working folder outside SharePoint. Runs first, before build-soa, cvc-summary, application-details or build-pack, whenever there is no intake run yet or Howard has filed new documents. Use when Tristan says "read X's folder", "intake X", "what's in X's file", "copy X's folder out", "check X's file" or drops a client folder.
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
---

# Case folder intake

## Purpose

Get a client's case folder out of SharePoint safely and read all of it. Produce:

1. a byte-faithful copy outside SharePoint;
2. the text of every document;
3. an inventory of every file and how it was read;
4. a review list of inconsistencies for the adviser.

Later skills (`build-soa`, `cvc-summary`, `application-details`, `build-pack`) start from the latest intake run, not from SharePoint. If there is no intake run for the case, or Howard has filed new documents since the last one, run intake first (default, Q-IN-2).

This skill reads and reports. It does not write advice, fix documents or decide anything for the adviser.

## When to use

- Before any skill that needs the client's filed documents: `build-soa`, `cvc-summary`, `application-details`, `build-pack` (default, Q-IN-2).
- When the adviser asks what is in a client's file, or asks to read or copy it out.
- Again when Howard has filed new documents. Make a new dated run; never overwrite an earlier one.
- Only Tristan starts this skill. Howard files documents and reviews outputs (default, Q-SH-10).

Do not use it for a new prospect with no SharePoint folder. `meeting-notes` handles that.

## Inputs

| Input | Required | Where from |
|---|---|---|
| Client folder name (`Surname, First`) | Yes | The adviser. If several folders match, list them and ask. |
| Advice year | No | The newest `<YYYY> Advice & Service` folder, copied in full (default, Q-IN-3). |
| `LEGACY_LIBRARY_ROOT`, `WORK_ROOT` | Yes | Environment variables, else the fallbacks in `../_shared/firm-settings.md` §10 (default, Q-SH-4, Q-SH-8) |
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
   Check the path is not inside `LEGACY_LIBRARY_ROOT` before writing anything. Never put `text\` or `converted\` inside `source\`. Write any command or script for this run into `.build\`, using the methods in `references/extraction-methods.md` (default, Q-IN-6).

3. **Copy out.** Copy the newest advice year folder, in full, into `source\` (default, Q-IN-3). If a plain copy fails, use robocopy (see `references/extraction-methods.md` §1). Library path first. No `/MIR /PURGE /MOV /MOVE /M`. Log into the working folder.

4. **Check the copy.** Compare file count and total size with the source listing. List any file that failed to download (OneDrive placeholder) as `not copied`.

5. **List older years** by file name only. Do not copy them unless the adviser asks or a check needs a file from them (for example the last signed quote is in last year's folder). Then copy only that file into `source\<YYYY> Advice & Service\` and note it in the inventory (default, Q-IN-3).

6. **Read every file** in `source\` with the right method. See the decision rules below and `references/extraction-methods.md`. Write text to `text\`. Note the method and result for each file.

7. **Look at what text cannot show.** Render pages to PNG and read the images for Risk Researcher runs, Compare Ratings, One on One Comparison, scanned PDFs, and any page where provider names are logos.

8. **Build the inventory** from `references/inventory-template.md`. One row per file. Nothing skipped silently.

9. **Run the checks** in `references/inconsistency-checks.md`, with the thresholds there (default, Q-IN-7). Write each finding to `review-list.md` with the files and values on both sides (default, Q-IN-12).

10. **Report in chat** to whoever ran the skill: what was copied, what could not be read, any saved email files found (by name only), any tool that is missing and what it blocked, the key documents found (SOA Notes, Risk Checklist, latest Fact Find, latest quotes, CvC), missing key documents, and a summary of the review list. Do not make a `.docx` copy of the review list unless asked (default, Q-IN-12). End with the version line (firm-rules §10.2).

11. **Retention.** The working folder is kept until the pack is sent, then Tristan deletes it by hand. Never delete an earlier run yourself (default, Q-IN-13).

## Hard rules

- Obey every rule in `../_shared/firm-rules.md`. The ones this skill hits most:
- SharePoint is read only. Copy out first. Never write in. (rules §2)
- No output beside a source. Extraction folders go in the working folder, never in SharePoint and never inside `source\`. (rules §3)
- Do not open saved email files (`.msg`). List each by file name in the inventory and tell the adviser they exist (default, Q-IN-1).
- Never invent a value. A value you cannot read is `[ADVISER TO CONFIRM]` in the inventory, with the reason.
- Never copy client data into the skill pack, the repo outside gitignored folders, or chat beyond what the adviser needs.
- Do not install software. If a tool is missing, report which one and what it blocks, and ask before installing anything (default, Q-IN-11).
- Do not edit any document, including the copy. `source\` stays byte for byte as it was.

## Decision rules

| IF | THEN |
|---|---|
| `.pdf` with a text layer | `pdftotext -layout`. Check the output is not empty or scrambled. |
| `.pdf` with no text, or scrambled text | Read with pymupdf, then render pages to PNG and read the images. No OCR (default, Q-IN-5). |
| `.pdf` is an insurer application or form (fields, tick boxes; PPS paper applications always) | Also read AcroForm fields with pymupdf `widgets()`. Health, income history and travel answers live there, not in the text. |
| Risk Researcher, Compare Ratings or One on One Comparison PDF | Render every page to PNG and read the image. Provider names are logos and table layout scrambles in text. |
| `.docx` | mammoth for body text. Also scan headers, footers and text boxes from the XML. List images in `word/media/`. |
| `.doc` | Cannot be read as is. Convert the **copy** (never the original) to `.docx` in `converted\` with Word, read that, and note the conversion in the inventory. Never convert in SharePoint (default, Q-IN-4). |
| `.xlsx`, `.xlsm`, `.xls` | Read every sheet, including hidden ones. Keep sheet names exactly (the CvC sheet is `CvC ` with a trailing space). Read cached values, not formulas. |
| `.msg` | Do not open. List as `not read: saved email` and name it in the chat report (default, Q-IN-1). |
| Image file (`.jpg`, `.png`, `.heic`) | Read the image directly. |
| `.zip` or other archive | List it. Do not extract unless the adviser asks. |
| Any other type | List it as `not read: unsupported type`. |
| File will not download from OneDrive | List as `not copied`. Carry on. |
| Several files called "Final" for the same thing | Treat the newest by date stamp in the file name, then by modified time, as current. List the others in the review list (default, Q-IN-8). |
| The firm's own finished SOA is in the folder | List it in the inventory and mark it `firm SOA, set aside`. Do not extract its text; `build-soa` asks for it only for the after-the-fact comparison (default, Q-IN-9). |
| No SOA Notes in the folder | Flag it. Note where the reasoning may be instead (fact find "Your story", meeting notes). |
| A `Client Directed Amounts\` subfolder exists | Flag: client chose lower cover than first presented. |
| A document names a different client | Stop reading that file. Flag it as possibly misfiled. |
| A document names another adviser or another licensee | Flag it. (Insurer applications and quotes under Josh Davidson are expected.) |
| Subfolder names differ from firm-settings §8 | Match by leading number and keywords, accept any of the known variants, and record the actual names in the inventory (default, Q-IN-10). |

## Output

In `<WORK_ROOT>\<case name>\intake-<yyyy.MM.dd>\`:

| File | What |
|---|---|
| `source\` | Exact copy. Never edited. |
| `text\**.txt` | Extracted text, one per document, header line naming the source file and method. |
| `pages\**.png` | Page renders used. |
| `converted\` | `.docx` made from `.doc` copies. |
| `inventory.md` | Per `references/inventory-template.md`. |
| `review-list.md` | Inconsistencies and missing items, most serious first. Ends with the version line. Summarised in chat (default, Q-IN-12). |
| `copy-log.txt` | robocopy log, if used. |

All of it is client data. It stays in the gitignored working folder until the pack is sent, then Tristan deletes it by hand (default, Q-IN-13).

## Checks

Before reporting, confirm:

- [ ] Nothing was written under `LEGACY_LIBRARY_ROOT`. (List the client folder again: same files, same modified times.)
- [ ] Every file in `source\` has one inventory row with a status.
- [ ] File count in `source\` matches the SharePoint listing, less any `not copied`.
- [ ] Every Risk Researcher and ratings PDF was read from images.
- [ ] Every insurer application PDF had its form fields read.
- [ ] Every `.xlsx` sheet name is listed exactly.
- [ ] No `.msg` was opened; each is listed by name.
- [ ] Any firm SOA is listed as `firm SOA, set aside` and its text was not extracted.
- [ ] Every finding in the review list names both sources and both values.
- [ ] The review list ends with the version line.

## Decisions taken on defaults

Version 1.0.0 applies the default answer to every open question. Tristan's later answers become 1.1 updates. Search this skill for the tag to find each one.

- In this file: Q-IN-1, Q-IN-2, Q-IN-3, Q-IN-4, Q-IN-5, Q-IN-6, Q-IN-7, Q-IN-8, Q-IN-9, Q-IN-10, Q-IN-11, Q-IN-12, Q-IN-13; shared Q-SH-4, Q-SH-8, Q-SH-10.
- In `references/`: Q-IN-1, Q-IN-4, Q-IN-6, Q-IN-7, Q-IN-8, Q-IN-9, Q-IN-11.
- The questions and their defaults are in the repo at `skills-draft/_questions/case-folder-intake.md` and `skills-draft/_questions/shared.md`.
