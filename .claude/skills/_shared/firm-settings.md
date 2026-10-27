---
name: firm-settings
description: The facts every Legacy Risk Advice skill uses. Firm, licensee, advisers, team, insurers, referral partners, FSG versions, folder layout, file naming and placeholder spelling.
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
  updated: 27 Oct 2026
---

# Firm settings

Every skill reads this file. Do not copy these values into a skill. Point to this file instead, so one edit here changes every skill.

How to read each value:

- **Source** says where the value came from. `env.js` = `server/src/config/env.js` defaults. `practice.json` = `server/src/data/legacy-practice.json`. `spec` = `FPGOD-SYSTEM-SPEC.md` (27 Oct 2026). `memory` = Tristan's Claude memory notes, with the date he confirmed it.
- **Status** is `confirmed` (Tristan said so), `configured` (in code, not re-confirmed) or `default` (the question's default answer is in use until Tristan answers; see the `(default, Q-SH-n)` tag).
- **LOCAL** marks a value each team member sets on their own machine. See section 10.

Never use the previous practice's name, licensee, AFSL, AR numbers, letterhead or branding. See `firm-rules.md` rule 6.

---

## 1. The firm

| Item | Value | Source | Status |
|---|---|---|---|
| Trading name | Legacy Risk Advice | env.js `FIRM_NAME` | configured |
| Legal name | Legacy Risk Advice Pty Ltd | env.js `FIRM_LEGAL_NAME` | default (Q-SH-9) |
| Corporate AR number | 1296611 | env.js `FIRM_AR`; memory 23 Oct 2026 | default (Q-SH-9) |
| ABN | 22 655 978 046 | env.js `FIRM_ABN` | default (Q-SH-9) |
| Address | Level 3, 489-505 Toorak Road, Toorak VIC 3142 | env.js `FIRM_ADDRESS` | default (Q-SH-9) |
| Office phone | 1300 240 481 (the later save; not the 03 9100 3225 variant) | memory 23 Oct 2026 (FSG Part Two) | default (Q-SH-1) |
| Advice type | Risk insurance only: life, TPD, trauma, income protection | memory; spec Part 3 | confirmed |
| Record system | XPLAN (Iress). XPLAN stays the client record. | memory | confirmed |

Legacy Risk Advice is a **corporate Authorised Representative**. It has no AFSL of its own. Every document names the licensee's AFSL, never "Legacy's AFSL".

## 2. The licensee

| Item | Value | Source | Status |
|---|---|---|---|
| Licensee | Synchron Advice Pty Ltd | env.js `LICENSEE_NAME`; memory | configured |
| AFSL | 243313 | env.js `LICENSEE_AFSL`; memory | configured |
| Licensee ABN | 33 007 207 650 | env.js `LICENSEE_ABN` | default (Q-SH-9) |

## 3. Advisers

**Tristan Biro is the adviser on every SOA from 23 Oct 2026.** Other advisers are reference only. Do not use their details on any document. Insurer applications and quotes stay under Josh Davidson (default, Q-SH-2).

| Adviser | Role in the skills | AR number | Contact on SOAs | Source | Status |
|---|---|---|---|---|---|
| Tristan Biro | Adviser on every SOA, fact find, FSG and adviser profile | Sub-AR 1313019 (AR of Legacy Risk Advice) | P 0406 824 597, E Tristan@legacyriskadvice.com.au, office 1300 240 481 | AR: Tristan, 27 Oct 2026. Contacts: memory 26 Oct 2026 | AR **confirmed** (Q-SH-1 answered, 27 Oct 2026); contacts default (Q-SH-1) |
| Josh Davidson | Managing Director, adviser. Reference only. Insurer applications and quotes still carry his name. | not recorded here | not recorded here | practice.json; memory 26 Oct 2026 | default (Q-SH-2) |
| Luke Fisher | Adviser. Reference only (his SOAs are wording examples). | not recorded | not recorded | memory; spec Part 3 | default (Q-SH-2) |
| Gary Douglas | Adviser. Reference only. | not recorded | not recorded | practice.json | default (Q-SH-2) |

Rules for adviser details:

- Do **not** use the mobile number or personal email printed in Tristan's FSG Part Two v8.0. They are out of date. Use the contacts in the table above. FSG Part Two v8.0 is still the one used until Synchron issues a corrected profile (default, Q-SH-1).
- `env.js` has no adviser AR, email or phone set. It renders the AR as a placeholder. Treat this file as the source until `env.js` is updated.
- A firm XPLAN merge that names another adviser must be re-badged to Tristan on the SOA. Insurer applications and quotes are not re-badged.
- If Tristan asks for another adviser on a document, stop and ask for that adviser's AR number, contacts and FSG. They are not recorded here (default, Q-SH-2).

## 4. Team

| Name | Role | Source |
|---|---|---|
| Josh Davidson (JD) | Managing Director, Adviser | practice.json |
| Gary Douglas | Adviser | practice.json |
| Tristan Biro | Adviser | practice.json |
| Howard Cortes | VA / paraplanner. Drafts SOAs, gathers quotes, research and notes into the SharePoint client folder. SOA Notes are addressed to him ("Hey Howard, ..."). | practice.json; memory |
| Rubi Carao | Reporting Administrator | practice.json |
| Josh Arellano (JA) | Renewals Administrator | practice.json |
| Enis Vural | Head of Operations | practice.json |
| Grant Conda | Paraplanner named on some finished firm SOAs. Reference only. | spec Part 3 §5.13 |

Howard files documents in SharePoint and reviews outputs. Only Tristan starts skills (default, Q-SH-10).

## 5. Insurers the firm places with

Acenda, AIA, Asteron, BT, ClearView, Encompass, Futura, MetLife, NEOS, OnePath, PPS, Resolution Life, TAL, Zurich.

- Source: practice.json, taken from SharePoint `Documents & Templates\Insurer Forms`. Status: default (Q-SH-12). An insurer not on this list is flagged in the review notes.
- Insurer and super fund logos for SOA tables: `legacy/drop/soa-build/templates/insurer-logos/` (`xplan/` = the 60×34 set house SOAs embed; `hires/` = larger copies). Missing as at 27 Oct 2026: Brighter Super, CFS, ART, MLC.
- PDS files are not kept in the repo. Take the current PDS from a recent client folder or the insurer's website. The SharePoint templates folder can hold superseded PDSs. Check the PDS date every time.

## 6. Referral partners and fees

Only these three have approved SOA disclosure wording. The SOA must name the dollar amount.

| Partner | Legal name | Fee | Source | Status |
|---|---|---|---|---|
| PPA (Performance Property) | Performance Property Pty Ltd | 25% of the initial and ongoing remuneration, including GST | practice.json (from the Referral Partner Disclosure document) | default (Q-SH-5) |
| The HOPE Fund | The Hepatobiliary Oesophagogastric Pancreatic Fund Ltd | 10% of the initial and ongoing remuneration, excluding GST (the Fund cannot accept GST) | practice.json | default (Q-SH-5) |
| Tony Chen | — | 10% of the initial remuneration as a one-off fee, including GST | practice.json | default (Q-SH-5) |

Other referral sources (no approved disclosure wording): Allfin, existing client, accountant, website enquiry, conference. If a client came through one of these and a fee is paid, write `[ADVISER TO CONFIRM]` for the disclosure and add it to the review list (default, Q-SH-5).

Remuneration convention used so far (memory, not yet confirmed for every insurer): initial 66% and ongoing 22% of the **total** annual premium, including plan fee and stamp duty, as on the Risk Checklist. Disclosed per policy. This belongs to the `build-soa` skill's questions.

## 7. FSG and adviser documents

The FSG used in every pack is the combined 2026 PDF (FSG Part 1 v9.1 with Tristan's Part Two v8.0 dated 1 Oct 2026), taken from `legacy/advisers/tristan-biro/` (default, Q-SH-7).

| Document | Version | Where | Source | Status |
|---|---|---|---|---|
| FSG Part 1 (Synchron Advice) | v9.1 | `legacy/advisers/tristan-biro/` (LOCAL, gitignored) | memory 23 Oct 2026 | default (Q-SH-7) |
| Tristan's FSG Part Two (Adviser Profile) | v8.0, dated 1 Oct 2026 | same | memory 23 Oct 2026 | default (Q-SH-1, Q-SH-7) |
| FSG Combined 2026 (Part 1 v9.1 + Part Two v8.0), 9 pages | 2026 | same | memory 23 Oct 2026 | default (Q-SH-7): **this is the master copy** |
| Josh Davidson's FSG set | — | `legacy/advisers/josh-davidson/` (LOCAL). Reference only. | memory | — |
| FSG versions held by the firm | various | SharePoint `Compliance\` | memory | read only, not the master |

Take adviser details and the FSG from the adviser folder. Never from another client's SOA or pack.

## 8. SharePoint client folder layout

Library root: LOCAL setting `LEGACY_LIBRARY_ROOT` (section 10). Client folders sit under `Clients\`, one per client, named `Surname, First`. About 1,278 folders (memory, Sep 2026).

Inside a client folder, the house standard names (default, Q-SH-11):

```
Clients\<Surname, First>\
  1. Advice\
    <YYYY> Advice & Service\
      1. Research, Financials, Medicals, Schedules\
      2. Compliance docs (SOA, ROA, EO & Fact Find)\
      3. Signed documents - Implemented Audit\
```

- Folder names as in `server/src/services/workbench/paths.js`. Generated folders always use these names (default, Q-SH-11).
- Variants seen in real folders (memory), accepted when reading but never used when writing: `2. Compliance docs` without the bracket, `4. Pages to sign`, `6. Schedules`, a month subfolder such as `Oct 2026\` inside `1. Research...`, and a `Client Directed Amounts\` subfolder (the client chose lower cover than first presented).
- Other library folders: `Compliance\` (FSG versions, policies), `Documents & Templates\` (blank forms, the CvC spreadsheet template, `Insurer Forms\<n>. <Insurer>\`, `Processes\`, `Threads broken down.xlsx`, `Change of Servicing Rights.docx`), and the Processes and Procedures Manual.
- There is no blank SOA master in SharePoint. Files called "SoA Template" there are other clients' completed SOAs.

The repo mirrors this layout for generated documents: `legacy/soa/<case name>/1. Advice/<YYYY> Advice & Service/<1./2./3. subfolders>`. Tristan or Howard moves them into SharePoint by hand.

## 9. Naming conventions

Placeholders below: `First`, `Last`, `F` = first initial. Examples use invented names only.

| Name | Single | Couple, same surname | Couple, different surnames | Source |
|---|---|---|---|---|
| Case name (folders) | `Last, First` → `Citizen, Jane` | `Last, First & First` → `Citizen, Jane & John` | `Last1, First1 & Last2, First2` → `Citizen, Jane & Doe, John` | paths.js `caseNameOf` |
| Short name (file names) | `Last F` → `Citizen J` | `Last F&F` → `Citizen J&J` | `Last1 F1 & Last2 F2` → `Citizen J & Doe J` | paths.js `shortNameOf` |
| Pack name | `Last, F` → `Citizen, J` | `Last, F & F` → `Citizen, J & J` | same as short name | paths.js `packNameOf` |
| Notes name | `First Last MONDD` → `Jane Citizen OCT27` (first-named client only) | same | same | paths.js `notesNameOf` |

Date stamps:

| Use | Format | Example |
|---|---|---|
| File name prefix | `yyyy.MM.dd` | `2026.10.27` |
| Notes name suffix | `MONDD`, month in capitals | `OCT27` |
| Dates in documents | `d MMMM yyyy` (en-AU) | `27 October 2026` |
| Dates on letters | `dd/mm/yyyy` | `27/10/2026` |

File names:

| Document | Pattern | Source |
|---|---|---|
| Initial Meeting Notes | `<First Last> <MONDD> - Initial Meeting Notes.docx`, no leading date (default, Q-SH-11) | spec Part 3 §2 |
| Fact Find | `<yyyy.MM.dd> - <Short> - Fact Find.docx` | spec Part 3 §2 |
| SOA Notes | `<yyyy.MM.dd> - <Short> - SOA Notes.docx` | spec Part 3 §2 |
| Draft SOA | `<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` | spec Part 3 §2 |
| SOA pack folder | `<Pack name> - SOA Pack\` in Downloads (default, Q-SH-11) | spec Part 4 §6 |
| Pack items | `NN - <name>` (two digits), `0 - READ ME` first | spec Part 4 §6 |
| FINAL Insurance Summary (CvC) | `FINAL Insurance Summary - <First Last>.pdf`, one per life insured | memory 22 Oct 2026 |
| Application details sheet | `<Surnames> - Application Details.docx` in Downloads | memory 22 Oct 2026 |
| Case-folder intake working folder | `<WORK_ROOT>\<case name>\` | case-folder-intake skill |

Strip `< > : " / \ | ? *` and trailing dots or spaces from every name (paths.js `safeName`).

## 10. Local settings (each team member sets these)

These paths differ per machine and per person. Never hard-code one person's path into a skill. Each is read from the environment variable of the same name if it is set, otherwise from the fallback shown (default, Q-SH-4).

| Setting | What it is | Fallback | Notes |
|---|---|---|---|
| `LEGACY_LIBRARY_ROOT` | The SharePoint library as synced by OneDrive. **Read only.** | `%USERPROFILE%\Legacy Risk Advice\Legacy - Documents` | Use the full library sync, not the partial `OneDrive - Legacy Risk Advice\Legacy - Documents` shortcut, which is missing `Documents & Templates` and the manual. Same variable name as env.js. |
| `LEGACY_LIBRARY_CLIENTS_DIR` | Client folders subfolder | `Clients` | env.js |
| `LEGACY_REPO_ROOT` | The repo's `legacy/` working folder | `<repo>\legacy` | env.js |
| `WORK_ROOT` | Where case folders are copied out to and read | `<repo>\legacy\drop\soa-build\cases` (gitignored) | Kept inside the repo's gitignored folder (default, Q-SH-8). |
| `DOWNLOADS` | Where finished packs, CvCs, application sheets and meeting notes copies go | `%USERPROFILE%\Downloads` | paths.js `WORKBENCH_DOWNLOADS` |
| `ADVISER_DOCS` | Adviser FSG and AR documents | `<repo>\legacy\advisers\<adviser>\` (gitignored, local only) | Each machine needs its own copy. |
| `SCRATCH` | Claude's scratchpad for the session | set by Claude Code | Temporary only. |
| DocuSign config | DocuSign credentials for draft envelopes | `%USERPROFILE%\.docusign\` | Never read or print it. |

## 11. Placeholder spelling

One spelling for anything not known: **`[ADVISER TO CONFIRM]`**, including table cells (default, Q-SH-3).

- Never `[ADVISOR TO CONFIRM]`, and never "Not provided / To be confirmed".
- House-practice exception: the Initial Meeting Notes and the Fact Find keep `TBC` (highlighted yellow) for a missing **client fact**, because that is their documented house practice and their builders highlight it. Every other document, and every adviser decision in any document, uses `[ADVISER TO CONFIRM]` (house practice, Q-SH-3).
- List every placeholder left in an output in its review notes or handover.
- Australian spelling: "adviser", not "advisor".

## 12. Where the skills live and how they change

- The released skills live in this git repo at `.claude/skills/<name>/`, with these shared files at `.claude/skills/_shared/`. That folder is the single source; there is no separate copy. The open questions stay in `skills-draft/`. Tristan approves every change (default, Q-SH-13).
- Every team member runs the same released version. Nothing is published to SharePoint (default, Q-SH-13).
