# FPGod System Specification

A description of the whole FPGod / Legacy Risk Advice adviser system as it stood on 27 October 2026: every Claude Code skill, every job Claude does from memory, and every screen and script in the app. It is written so the system can be rebuilt as a shared, versioned Claude skill for the team. It describes; it does not review or recommend.

## How this file was made

- Read only. No file in the repo was changed while surveying. No server, script, API, XPLAN or DocuSign call was run, and the database was not queried.
- **Client data rule.** No file holding a real client's details was opened. Where code or instruction files name clients, the details are replaced with placeholders such as `[CLIENT_1]`, `[AMOUNT]` and `[POLICY_NO]`. File names that contain client names are also replaced. Each part lists the folders it skipped and why.
- **Email rule.** Outlook and email are permanently off limits (a standing rule, enforced by a hook). Archived email code exists at `archive/outlook-and-email/`. It was not opened and is only mentioned generically.
- Where something could not be found, the text says `NOT FOUND` and where it looked.
- Every part follows the same 15 sections: 1 Inventory, 2 Entry point and trigger, 3 Inputs, 4 Pipeline, 5 Prompts verbatim, 6 Output structure, 7 Fixed wording, 8 Decision logic, 9 Figures, 10 Where facts come from, 11 Template and rendering, 12 Versioning, 13 Known problems, 14 Dependencies, 15 Questions for Tristan. Part 3 (SOA) also has a section 0 listing what was skipped, and it uses the SOA-specific headings it was first written with.

## Changes made after this survey (27 Oct 2026, Lakeside removal)

The parts below describe the repo as it was read. Afterwards, at Tristan's request ("we only want Legacy"):

- 15 Lakeside-era scripts were moved from `server/scripts/` to `archive/lakeside/scripts/`: the per-client SOA and export builders, `build-combined-guide.mjs`, `emit-guide-html.mjs`, `export-docx.mjs`, `export-guide-docx.mjs`, `export-super-guide-docx.mjs`, `md-to-docx.mjs` and `import-reference-material.mjs`. Paths to them in the parts below are their old locations.
- Demo seed data (`server/src/db/seed-demo-client.js`) now says "Legacy Risk Advice" in its fact find and plan sign-offs.
- `automation/xplan/README.md` and `automation/xplan-api/README.md` now name Synchron Advice Pty Ltd (AFSL 243313) as licensee instead of Pareto Group.
- `README.md` and `archive/lakeside/README.md` were updated to match.

## Changes made after this survey (27 Oct 2026, skills and fixes)

Status at the end of 27 Oct 2026, commit `ce13f9f` on `claude/financial-planning-app-8GWYC`, pushed to GitHub. Where a part below says something is broken or missing and it is listed here, this list wins.

**Skills.** The three project skills described in Parts 1–4 (`meeting-notes`, `build-soa`, `build-pack`) were replaced by the 1.0.0 skill pack in `.claude/skills/`:

| Skill | Covers | Part |
|---|---|---|
| `case-folder-intake` | Copy a SharePoint client folder out read-only, read every document, list inconsistencies | 5 |
| `meeting-notes` | Initial Meeting Notes; then runs `fact-find` and `soa-notes` | 1 |
| `fact-find` | The 2026 Fact Find | 2 |
| `soa-notes` | SOA Notes, the brief for Howard | 3 |
| `build-soa` | The Statement of Advice, only on Tristan's command | 3 |
| `application-details` | Application details sheet and check-before-lodging list | 4 |
| `cvc-summary` | CvC / FINAL Insurance Summary | 4 |
| `build-pack` | The DocuSign SOA pack, only on Tristan's command | 4 |

Shared facts and rules live in `.claude/skills/_shared/firm-settings.md` and `firm-rules.md`. Every open point runs on its default answer, tagged `(default, Q-xx-n)`. The 155 questions are in `skills-draft/QUESTIONS.md`. Answered so far: Q-SH-1, AR 1313019 (also set as `ADVISER_AR` in `server/.env`). No default, so the skill stops and asks: Q-PK-1 (DocuSign countersigner) and Q-CVC-2 (Yearly Saving across billing frequencies).

**Fixes to findings in the parts below:**

| Part | Finding | Now |
|---|---|---|
| 2 | Totals dropped when a row held text; monthly and annual added together; cents lost | Amounts parsed robustly; income and expenses annualised and marked "(annualised)"; unknown rows left out with "(excl. TBC items)"; cents kept |
| 2 | Adviser signatory and cover "Adviser Name" still Joshua Davidson | Written from the data, default Tristan Biro |
| 2 | Fixed "Review of your personal risk insurance needs:" scope bullet always added | Still the default; `scope_fixed_bullet: false` drops it |
| 2 | In-app prompt lacked the 26 Oct no-recommendation rules | Added |
| 3 | Two title blocks; US date in the Word header | One title; en-AU date throughout |
| 3 | Replacement warnings sent for new cover with "do not omit" | Only where cover is replaced, cancelled or reduced; clawback lead-in moved to Fees, Alternatives lead-in to Alternatives |
| 3 | Guardrail forbade "declined" INA wording | Branches on the adviser notes: not done → client-directed wording + Incomplete INA warning; done → reasons in prose; silent → `[ADVISER TO CONFIRM]`. SOA Notes now record the INA status |
| 3 | A failed section showed as stub text with `ai: true` | `failedSections` returned and shown as a warning |
| 3, 8 | Four placeholder spellings | `[ADVISER TO CONFIRM]` across the app; `TBC` kept for missing client facts in meeting notes and fact finds |
| 4 | Rebuild deleted the whole pack folder | Only files the builder wrote are replaced; hand-added or edited files are kept and listed |
| 4 | Same-surname couple's application named after the first person | Matched on first names; unclear cases keep their name and are flagged |
| 4 | FSG picked from SharePoint, could be another adviser's | From `legacy/advisers/<adviser>/` (Combined FSG first); SharePoint only as a flagged fallback; another adviser's FSG refused |
| 4 | .docx/.pdf numbering depended on sort order | Twins share a number |
| 5 | "$1.2m" saved as 1.2 | k/m/bn scaled, in both the CFS import and the client scan review |
| 5 | CFS adviser fee % for the report period treated as yearly | Annualised from the statement period; unknown period → % left blank with a note |
| 5 | Two-digit birth years became 20yy; units × price holdings got 0% | Year pivot; holdings valued before allocation |
| 6 | `chat_messages` rejected `'library'`, so every ask failed after the AI call | Constraint widened |
| 6 | History loaded the oldest turns | Latest turns, in order (also in the plan chat) |
| 6 | A one-name match attached another person's record | Needs first name and surname |
| 7 | Weekly GitHub checkpoint aborting since 23 Oct | Logo harvest folder ignored; firm tooling and logos under `legacy/` allowed; all work committed and pushed |

**Still open, not changed:**
- `automation/xplan-api/IRESS-API-REQUEST-email.md` still names Pareto Group, AFSL 418700 and AR 001313019, and two demo follow-up emails in `seed-demo-client.js` still sign off as Lakeside. Editing them would be drafting email, which the standing rule forbids. Tristan to change by hand.
- Lakeside reference rows in `training_data` (`source: 'lakeside'`): not checked or deleted; needs Tristan's say-so.
- AI-read CFS statements can't be annualised (the prompt does not ask for the report period).
- Cancellation letter date and "please cancel" fix is done by the `build-pack` skill, not yet by the app's pack screen.
- The Stage 1 prompt still uses two real clients' meeting notes as its few-shot examples (Q-MN on the questions list).
- Client Library page (`Library.jsx`) not built.

## Skills and jobs covered

| Skill, job or screen | How it is started | Part |
|---|---|---|
| `/meeting-notes` skill (Stages 1 to 3: Initial Meeting Notes, Fact Find, SOA Notes) | Paste a transcript in Claude Code | 1, 2, 3 |
| `/build-soa` skill (Stage 4: Statement of Advice) | "build the SOA for X" in Claude Code | 3 |
| `/build-pack` skill (Stage 5: DocuSign SOA pack) | "build the pack for X" in Claude Code | 4 |
| Initial Client Notes table (memory job) | "do me initial file notes" | 1 |
| CvC / FINAL Insurance Summary (memory job) | "CvC" | 4 |
| Application details sheet (memory job) | "prepare X for an application" | 4 |
| Cancellation and alteration letters, Change of Servicing Rights | Part of the pack | 4 |
| DocuSign draft envelopes | `legacy/docusign/docusign.mjs`, by hand | 4 |
| Workbench app: client list, 5-step case pipeline | Browser | 1, 2, 3, 4, 7 |
| Document upload, scan and extraction; CFS statements; reference import | Browser and scripts | 5 |
| Client Library (ask a question) and plan chat | Browser (page half built) | 6 |
| CRM, Task Tracker, XPLAN live browsing, scheduled backups | Browser, Claude Code, Windows scheduler | 7 |
| Client profile, insurance report, general plan generator, guides, config, AI wrapper, tests | Scripts and archived screens | 8 |

## Parts

1. Initial Meeting Notes
2. Fact Find
3. Statement of Advice (SOA), including SOA Notes
4. SOA Pack, Letters, CvC and DocuSign
5. Document Scanning and Extraction
6. Client Library and Chat
7. CRM, Task Tracker, XPLAN and Automation
8. Other Generators and Shared Plumbing

---

## Part 1. Initial Meeting Notes

Scope: the Initial Meeting Notes document (the firm calls it the "Client Details Summary", code calls it `cds`), produced from a meeting transcript. Also the older "Initial Client Notes" table document. Described as found on 27 October 2026. Read only.

There are two routes, as in the SOA spec:
- **Route A (Workbench app).** Browser page, Express route, one Anthropic API call, then the generator script.
- **Route B (Claude Code skill `meeting-notes`).** Claude in the VS Code chat writes the JSON itself, then runs `prep-soa-case.ps1`, which calls the same generator script.

Placeholders: `[CLIENT_A]`, `[CLIENT_B]` … stand for real clients. Each mapping is given where used. I replaced every client name, employer, school, insurer-in-context and file slug that names a client.

---

### 1. Inventory

#### Code

| Path | What it is | Read / written by |
|---|---|---|
| `server/scripts/generate-client-details-summary.mjs` | The generator. Opens the Word template with JSZip and inserts paragraphs after each label. Highlights `TBC` yellow. Tracked in git. | Called by `run.js` `buildMeetingNotes()` (Route A) and `prep-soa-case.ps1` (Route B). Reads the template and a JSON file. Writes the .docx. |
| `server/src/services/workbench/writers.js` | `writeMeetingNotes()` (lines 73-100): builds the Stage 1 prompt and calls the API. Also holds `GENERAL`, `extras()`, `who()`, the label lists. Untracked. | `routes/workbench.js`. Reads the README and one example JSON at run time. |
| `server/src/routes/workbench.js` | `POST /api/workbench/cases/:id/generate/cds` (line 394), `POST /cases/:id/data/cds` (hand-edited JSON rebuild), `buildDoc()` (line 343), `knownFacts()` (line 378). Untracked. | Client `DocStep.jsx`. Writes `workbench_cases.transcript`, `meeting_date`, `cds_json`, `stage`. |
| `server/src/services/workbench/run.js` | `writeDataFile()` writes `legacy/file-notes/<slug>-cds.json`. `buildMeetingNotes()` runs the generator as a child process. `exportPdfs()` runs `docx-to-pdf.ps1`. Untracked. | `routes/workbench.js`. |
| `server/src/services/workbench/paths.js` | Names and folders: `notesNameOf()` (`<First Last> <MONDD>`), `slugOf()`, `longDate()`, `caseDirs()`, `assertWritable()`. Untracked. | `routes/workbench.js`, `writers.js`, `run.js`. |
| `server/src/services/workbench/lookup.js` | `lookupClient()` (name match against `clients` rows and SharePoint folder names) and `clientStatusLine()` (the NEW / POSSIBLY EXISTING / EXISTING line put into the prompt). Untracked. | `routes/workbench.js`. |
| `server/src/services/workbench/sources.js` | `sharepointText()`: reads text of up to N SharePoint files for "known facts". Untracked. | `knownFacts()` in the route, only when `WORKBENCH_READ_SHAREPOINT=true`. |
| `server/src/services/ai.js` | `complete()`: the Anthropic call wrapper. Tracked. | `writers.js`. |
| `server/src/config/env.js` | Model name, firm name, adviser name, library roots. Tracked. | Everything above. |
| `server/scripts/docx-to-pdf.ps1` | Word COM export of .docx to PDF, read-only open. Untracked. | `run.js` `exportPdfs()`. |
| `server/scripts/prep-soa-case.ps1` | Route B runner. Builds the Initial Meeting Notes, Fact Find and SOA Notes .docx from three JSON files, then exports PDFs with Word COM. Untracked. | `meeting-notes` skill. |
| `server/src/services/library/indexer.js` | `categoryOf()` line 153 tags files named "meeting notes / file note / client details summary / initial client notes" as category `meeting-notes`. Tracked. | `sources.js` (known-facts read; the CDS route asks for that category). |
| `client/src/pages/wb/CaseView.jsx` | Case page. Tab "Initial Meeting Notes" (key `notes`, default tab): meeting date, transcript box, generate button, client check. Untracked. | Browser. |
| `client/src/pages/wb/DocStep.jsx` | Shared step panel: generate, re-generate confirm, preview, JSON edit + rebuild, output file list, copy-to-Downloads. Untracked. | `CaseView.jsx`. |
| `client/src/pages/wb/parts.jsx` | `DataPreview` (cds: label/value list), `Flagged` (highlights TBC in preview), `useRun` (NDJSON stream reader). Untracked. | `DocStep.jsx`. |
| `client/src/pages/wb/ClientCheck.jsx` | Shows existing/new client result and a note when SharePoint reading is off. Untracked. | `CaseView.jsx`. |
| `client/src/pages/wb/NewClientModal.jsx` | New client form; transcript and meeting date optional at creation. Untracked. | `Workbench.jsx` → `POST /cases`. |
| `server/src/db/schema.sql` (lines 730-751) | `workbench_cases` table: `transcript`, `meeting_date`, `adviser_notes`, `cds_json`, `stage`. Modified, uncommitted. | Route A. |
| `server/src/routes/transcripts.js`, `meeting_transcripts` table (schema.sql 219), `client/src/pages/Meetings.jsx` | Older plain CRUD for transcripts with a hand-typed optional `summary`. Not used by either CDS route. | Older Meetings page. |
| `server/scripts/generate-client-profile.mjs` | Different document (Client Profile). Named in the generator header as the model the CDS generator copied. Not part of this pipeline. | — |

#### Prompts and instructions

| Path | What it is | Used by |
|---|---|---|
| `writers.js` lines 61-100 | Stage 1 system and user prompt text. | Route A, API call. |
| `lookup.js` lines 123-131 | Client status line inserted into the user prompt. | Route A. |
| `legacy/drop/initial-meeting-build/README.md` | House rules. Inserted whole into the Route A system prompt. Route B skill tells Claude to follow it. Tracked; one uncommitted line change. | Both routes. |
| `.claude/skills/meeting-notes/SKILL.md` | Route B skill: stages 1-3. Untracked. | Claude Code. |
| Memory `initial-meeting-notes-means-cds-generator.md` | "Initial meeting notes" from a transcript = this generator, not the table. Export PDF and copy to Downloads. | Claude Code sessions. |
| Memory `legacy-soa-from-case-folder.md`, sections "Fourth job type, 2026-10-07: Initial Client Notes" and "'Initial meeting notes' is a different document" | Describes the Initial Client Notes table job and a Python-built variant of the meeting notes. | Claude Code sessions. |
| Memory `soa-pipeline-built.md` | Pipeline order; run meeting-notes skill end to end on a pasted transcript. | Claude Code sessions. |
| Memory `legacy-va-workflow-direction.md` | Background: VAs, XPLAN is the record. | Claude Code sessions. |
| `legacy/va-workflow-build-brief.md`, section "1. Initial meeting — ACTIVE" | Older build notes for the generator. Tracked. | Claude Code sessions (reference). |
| `legacy/drop/README.md` line 15 | One-line index entry for `initial-meeting-build/`. | Reference. |

#### Templates

| Path | What it is | Read by |
|---|---|---|
| `legacy/drop/initial-meeting-build/client-details-summary/templates/Initial meeting notes.docx` | The Word template the generator clones (1 file in the folder). Gitignored (`.gitignore:44` `legacy/drop/**/*.docx`). **Skipped** (folder in the skip list). I could not check its labels. | Generator line 25-28. |

#### Reference material (few-shot)

| Path | What it is | Read by |
|---|---|---|
| `legacy/file-notes/[CLIENT_A]-sep14-cds.json` | Couple example. Inserted whole into the Route A system prompt. **Skipped**, client data. | `writers.js:17`. |
| `legacy/file-notes/[CLIENT_I]-oct09-cds.json` | Single-client example. Same use. **Skipped**, client data. | `writers.js:18`. |
| `legacy/drop/initial-meeting-build/client-details-summary/examples/` (3 files) | Drafts edited by Tristan, with annotated diffs. Source of the README rules. **Skipped**. | Not read by code. |

#### Configuration

| Item | Where | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | `server/.env` | Required. Missing → error "ANTHROPIC_API_KEY is not set, so the writers cannot run." Value not printed. |
| `ANTHROPIC_MODEL` | `server/.env` = `claude-opus-5`; default the same (`env.js:68`) | Model. |
| `FIRM_NAME`, `ADVISER_NAME` | `server/.env` / `env.js:43,60` (defaults `Legacy Risk Advice`, `Tristan Biro`) | Put into the prompt. |
| `WORKBENCH_READ_SHAREPOINT` | env, default off (`workbench.js:26`) | Whether SharePoint text is put into the prompt. Off since 26 Oct 2026. |
| `WORKBENCH_DOWNLOADS` | env, default `~/Downloads` (`paths.js:23`) | Where the copy goes. |
| `LEGACY_REPO_ROOT`, `LEGACY_LIBRARY_ROOT`, `LEGACY_LIBRARY_CLIENTS_DIR`, `LIBRARY_MAX_FILE_MB` | `env.js:86-95` | Output root, SharePoint read root, file size cap. |
| `.claude/settings.json` line 6 | A permission allowing a `cp` of the template to `tmpl.zip`. | Claude Code permission only. |

#### Skipped under the client data rule

| Path | Reason |
|---|---|
| `legacy/drop/initial-meeting-build/client-details-summary/examples/`, `.../templates/`, `fact-find/*`, `source-transcripts/` (empty) | Listed in the skip rule; edited client documents and a template that may carry client data. |
| `legacy/file-notes/` | Generated and example JSON for real clients, incl. the two few-shot files. |
| `legacy/soa/` | Output case folders. |
| `legacy/drop/soa-build/cases/*/.build/` | Per-client build scripts. Memory says the Initial Client Notes table builder and a Python meeting-notes builder live here. Not opened. |
| `archive/lakeside/db-snapshot/meeting_transcripts.json` | Transcript DB snapshot. Client data. |
| SharePoint library, Downloads | Client records and outputs. |
| `workbench_cases` rows | Database not queried. |
| Archived email code exists at `archive/outlook-and-email/` | Off limits. |

---

### 2. Entry point and trigger

#### Route A (browser app)

1. Start the app (Express server + React client). How it is started: see Part SOA.
2. Browser, home (Workbench client list). Click to add a client. `NewClientModal.jsx`: first name, surname, optional partner names, initial meeting date (defaults today), optional SharePoint folder, optional transcript. Submit → `POST /api/workbench/cases`.
3. Open the client. Case page `/case/:id` opens on the **Initial Meeting Notes** tab (default `tab=notes`, `CaseView.jsx:129`).
4. The "Client check" box shows whether a same-name client exists in the program or SharePoint. He can link the SharePoint folder from there.
5. Set **Meeting date**. Paste the transcript into **Meeting transcript**. Both save on blur (PATCH).
6. Optional: **Details** tab → **Adviser notes** ("Given to Claude with every document. They take precedence over the transcript.").
7. Click **✨ Generate Initial Meeting Notes** (disabled while the transcript box is empty, `CaseView.jsx:234`). On a re-run a confirm dialog warns it replaces the current version (`DocStep.jsx:24`).
8. A progress log streams. When done, a toast says built and copied to Downloads. The .docx and .pdf appear under **Documents**.
9. Optional: **✎ Edit** the JSON in the preview card, then **Save & rebuild** → `POST /cases/:id/data/cds` (no AI call).
10. Open the Word file and hand-edit it. He moves the file to SharePoint himself (UI text: "Move to SharePoint yourself when it is right.").

#### Route B (Claude Code chat in VS Code)

1. Tristan pastes a transcript in chat and asks for "initial meeting notes", "do the fact find" or "prep the SOA" (skill description). Memory adds: "fo up initial meeting notes" wording seen once; "initial client notes" / "file notes" means the table document instead.
2. Claude follows `SKILL.md`: reads known facts from SharePoint (copying out), writes `<slug>-cds.json` (and ff, soa-notes JSON) to `legacy/file-notes/`, runs `prep-soa-case.ps1` with `-Slug -Client -Short -NotesName`.
3. Claude reports the folder path and outstanding list.
4. Memory `initial-meeting-notes-means-cds-generator.md` says to export a PDF too and copy both to Downloads. `SKILL.md` and `prep-soa-case.ps1` do not copy to Downloads. That step is done by Claude by hand.

#### Initial Client Notes table (older document)

Trigger per memory: "do me initial file notes" / "initial client notes" / "file notes". Claude clones a recent firm Initial Client Notes .docx from a SharePoint client folder, or reuses a prior client's build script in `cases/<client>/.build/`. No skill, no route, no tracked code. NOT FOUND in tracked code; looked in `server/`, `client/`, `.claude/skills/`, grep for "Initial Client Notes".

---

### 3. Inputs

#### Route A

| Input | Format | From | Required | Use |
|---|---|---|---|---|
| Transcript | Plain text, pasted | Browser textarea → `workbench_cases.transcript` | Required (`workbench.js:407` "Paste the meeting transcript first"). Cut to 400,000 chars (`text(…, 400000)`). | Whole text in the user prompt after `TRANSCRIPT:`. |
| Meeting date | `YYYY-MM-DD` | Date field | Optional | `longDate()` in prompt; `MONDD` in file name and slug; advice year folder. Missing → today's date (`paths.js:73`). |
| Client names | first/last, partner first/last | `clients` row | First and last required at creation | `who()` line; couple vs single (`isCouple`) chooses label list and example; `notesName`. |
| Adviser notes | Free text, up to 20,000 chars | Details tab | Optional | User prompt block "ADVISER NOTES (take precedence over the transcript)". |
| SharePoint folder link | Folder name | Details tab / Client check | Optional | Status line ("EXISTING CLIENT…"). Known-facts read only if `WORKBENCH_READ_SHAREPOINT=true`. |
| Lookup result | Name match | `lookupClient()` | Automatic | Status line. |
| Known facts | Extracted text, max 5 files, 60,000 chars, categories fact-find, schedule, cover-summary, meeting-notes | SharePoint client folder | Off by default | User prompt block "KNOWN FACTS FROM THE CLIENT'S SHAREPOINT FOLDER…". |
| House rules | Markdown | `legacy/drop/initial-meeting-build/README.md` | Read at each call; empty string if missing (`readOr`) | System prompt. |
| Example | JSON | one of two `legacy/file-notes/*-cds.json` | Read at each call; empty if missing | System prompt. |
| Template | .docx | `.../templates/Initial meeting notes.docx` | Required; generator throws if missing | Generator. |

Not used by the CDS route: client email, phone, referral source (they are in `CASE_SQL` but not passed into `writeMeetingNotes`). The `Mobile` and `Referred from` fields are filled only from the transcript or adviser notes.

#### Route B

Transcript pasted in chat; optional SharePoint folder contents (fact find, insurer schedules, renewal letters) copied out by Claude; README rules. Claude chooses the slug, client folder name, short name and notes name. `-Date` defaults to today (`prep-soa-case.ps1:21`), not the meeting date.

---

### 4. Pipeline step by step

#### Route A

1. `POST /api/workbench/cases/:id/generate/cds` with `{transcript, meeting_date}` (`workbench.js:394`).
2. If body has transcript or date: `UPDATE … COALESCE` saves them (line 400-405). Reload case.
3. No transcript → error.
4. `lookupClient()` → `clientStatusLine()` → `wb.statusLine` (lines 409-411).
5. `knownFacts()` (line 378): no folder → `''`. Folder but reading off → progress line "Existing SharePoint file noted; not reading it (switched off for now)", returns `''`. Else reads text.
6. **AI call (the only one)**: `writeMeetingNotes()` (`writers.js:73`).
   - Model: `env.anthropic.model` = `claude-opus-5`.
   - `max_tokens: 24000`; streamed (because > 16000, `ai.js:98`).
   - `thinking: {type: 'adaptive'}`; `output_config.effort: 'medium'`.
   - No temperature/top_p/top_k sent.
   - System prompt cached (`cache: true` → `cache_control: ephemeral`).
   - `json: true` → `coerceJson()` strips a fence or slices first `{` to last `}`. No schema check.
   - System prompt text: `writers.js:66-70` + `81-89`, with the README and example file inserted. User prompt: `writers.js:90-91`.
7. `parse()` → error "Claude's meeting notes was not valid JSON. Try again." on failure. `data.clientName` forced to `notesName`. Error if `sections` is not an array (lines 96-98). Labels and order are **not** checked.
8. `cds_json` saved to DB (line 428).
9. `buildDoc('cds')`: `ensureCaseDirs()` makes `legacy/soa/<case_name>/1. Advice/<Year> Advice & Service/` and its 3 subfolders. `writeDataFile()` writes `legacy/file-notes/<slug>-cds.json`.
10. Child process `node generate-client-details-summary.mjs <json> <compliance>/<First Last MONDD> - Initial Meeting Notes.docx` (timeout 180 s).
11. Generator: load template → walk paragraphs in order → for the head of the label queue, compare normalised text → insert content paragraphs after it → splice from the end → write .docx.
12. `docx-to-pdf.ps1` via PowerShell (timeout 240 s). Failure → warning, not error. Non-Windows → no PDF.
13. Copy .docx and .pdf to Downloads (overwrites same name).
14. Stage advanced to `fact_find` if it was earlier (`advance()`, never backwards).
15. Stream `done` with data, file list, warnings.

AI calls per generate: 1. Re-generate: 1 more. Edit + rebuild: 0.

Manual steps: Tristan reviews and edits the Word file; moves it to SharePoint. README says stray empty labels are left for him to delete (see §13).

#### Route B

1. Claude (the Claude Code session model; settings not in repo — NOT FOUND, looked in `.claude/skills/meeting-notes/SKILL.md`, `.claude/settings*.json`) reads known facts and writes the JSON by hand following README rules. 0 API calls from code.
2. `prep-soa-case.ps1`: makes the folders; runs the generator (`node`, from `server/`); then `generate_fact_find.py`; then `build_soa_notes.py`; throws on the first failure; then Word COM PDF export of all three (warnings on failure); prints the folder.
3. Claude checks the fact find PDF and reports.

Route B has no label list given to Claude. Claude must use labels that match the template in order (generator comment, lines 11-14).

---

### 5. Prompts and instructions verbatim

`${…}` marks a substitution. `⟦…⟧` is my note, not prompt text.

#### 5.1 Shared text, `writers.js:54-70`

```js
function who(client) {
  const names = fullNamesOf(client);
  return isCouple(client)
    ? `a couple: ${names[0]} (client 1) and ${names[1]} (client 2)`
    : `a single client: ${names[0]}`;
}

const extras = (wb, known) =>
  (wb.statusLine ? `\n\n${wb.statusLine}` : '')
  + (wb.adviser_notes ? `\n\nADVISER NOTES (take precedence over the transcript):\n${wb.adviser_notes}` : '')
  + (known ? `\n\nKNOWN FACTS FROM THE CLIENT'S SHAREPOINT FOLDER (older documents; use to fill DOBs, addresses and existing cover, but the meeting wins where they differ):\n${known}` : '');

const GENERAL =
  `You work for ${env.firm.name}, an Australian risk insurance advice practice (life, TPD, trauma, income protection). `
  + `The adviser is ${env.adviser.name}. Australian spelling and AUD throughout. `
  + 'Never invent a fact: anything that should be known but was not said is TBC. '
  + 'Reply with the JSON document only: no prose, no code fence.';
```

#### 5.2 Status line, `lookup.js:123-131`

```js
  if (wb.sharepoint_folder) {
    return `EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.`;
  }
  if (look?.inSharePoint || look?.inProgram) {
    return `POSSIBLY AN EXISTING CLIENT: a record with the same name exists${look.inSharePoint ? ' in SharePoint' : ''}${look.inProgram ? ' in the program' : ''}, not yet confirmed. Do not assume it; go by the transcript.`;
  }
  return `NEW CLIENT: no existing client file was found for them at ${env.firm.name}.`;
```

#### 5.3 Stage 1 prompt, `writers.js:14-25, 73-95`

Client names in the example file paths and comment replaced: `[CLIENT_A]` = the SEP14 couple, `[CLIENT_I]` = the OCT09 single client.

```js
const README = path.join(REPO_LEGACY, 'drop', 'initial-meeting-build', 'README.md');
// House-style exemplars: [CLIENT_A] (SEP14, couple) is the current standard;
// [CLIENT_I] (OCT09) is the single-client shape.
const EXAMPLE_COUPLE = path.join(FILE_NOTES, '[CLIENT_A]-sep14-cds.json');
const EXAMPLE_SINGLE = path.join(FILE_NOTES, '[CLIENT_I]-oct09-cds.json');

const LABELS_SINGLE = ['Name', 'Mobile', 'Sex', 'Referred from', 'About the client', 'What is important to you',
  'Reasons for seeking advice', 'Current Insurance', 'Financial circumstances', 'Family', 'Super',
  'Estate Planning', 'Health', 'Height', 'Hobbies', 'UNDERWRITING', 'Insurance needs', 'Goals',
  'About the client', 'Reasons for seeking advice', 'Existing cover', 'Estate Planning', 'Super',
  'Outcome of meeting'];
const LABELS_COUPLE = ['Name', 'Mobile', 'Sex', 'Spouse Details', 'Name', 'Mobile', 'Sex', ...LABELS_SINGLE.slice(3)];

export async function writeMeetingNotes({ wb, client, notesName, known }) {
  requireAi();
  const couple = isCouple(client);
  const [rules, example] = await Promise.all([
    readOr(README),
    readOr(couple ? EXAMPLE_COUPLE : EXAMPLE_SINGLE),
  ]);
  const labels = couple ? LABELS_COUPLE : LABELS_SINGLE;
  const system = `${GENERAL}\n\nYou write the firm's Initial Meeting Notes (the Client Details Summary) from an initial meeting transcript. `
    + 'Follow every house rule below exactly; where rules disagree, the SEP14 rules win. '
    + 'Circumstances only: no strategy, sums insured or pricing.\n\n'
    + `===== HOUSE RULES =====\n${rules}\n\n`                       ⟦rules = README.md in full, §5.4⟧
    + 'OUTPUT SHAPE: {"clientName": string, "sections": [{"label": string, "value": string}, ...]}. '
    + 'The labels fill a Word template in document order, so use exactly these labels, in this order, each once '
    + `(a repeated label is the template's second occurrence):\n${JSON.stringify(labels)}\n`
    + 'Values: "\\n" splits paragraphs. A field with nothing known is "TBC". '
    + `Example of a finished file in the current house style (a different client; copy its form, never its facts):\n${example}`;
                                                                     ⟦example = a real client's full cds.json. Not read.⟧
  const user = `Client: ${who(client)}. clientName must be "${notesName}". Meeting date: ${longDate(wb.meeting_date)}.`
    + `${extras(wb, known)}\n\nTRANSCRIPT:\n${wb.transcript}`;
  const text = await complete({
    messages: [{ role: 'system', content: system, cache: true }, { role: 'user', content: user }],
    json: true, maxTokens: 24000, effort: 'medium',
  });
```

Substitutions: `env.firm.name`, `env.adviser.name`, `rules`, `labels`, `example`, `who(client)`, `notesName` (`<First Last> <MONDD>`), `longDate(meeting_date)` (e.g. "22 October 2026"), `statusLine`, `adviser_notes`, `known`, `transcript`.

#### 5.4 `legacy/drop/initial-meeting-build/README.md` (whole file; inserted into the Stage 1 system prompt; Route B rules)

Replacements: `[CLIENT_A]` = SEP14 couple; `[CLIENT_B]` = SEP10 couple; `[CLIENT_C]` = SEP02 single client; `[CLIENT_D]` = the AUG03 review client; `[CLIENT_E]` = the client whose fact find the master was made from; `[CLIENT_F]` = the 2023 fact find client. The follow-up email generator's file path is replaced with `[archived follow-up email generator]` (hook rule). Nothing else changed.

````markdown
# Task: initial meeting — transcript into the two house documents

One transcript in, **two documents** out:

1. **Client Details Summary** — "initial meeting notes". The record of the
   meeting itself.
2. **Fact find** — the client's full circumstances, captured on the house form.

Both are written from the same initial meeting, so they are built as one task.

## House style — derived from Tristan's edits of generated drafts

Three examples, each a generated draft **after he edited it**. The diff between draft and
issued document is the real specification.

| Example | Shape | Status |
|---|---|---|
| `client-details-summary/examples/[CLIENT_A]-SEP14-EDITED-BY-TRISTAN.md` | Couple; first-contact referral call, no cover details known | **Current — follow this** (2026-09-14) |
| `client-details-summary/examples/[CLIENT_B]-SEP10-EDITED-BY-TRISTAN.md` | Couple; adviser already held the client's details | Superseded where it disagrees with SEP14 |
| `client-details-summary/examples/[CLIENT_C]-SEP02-EDITED-BY-TRISTAN.md` | Single client, first-contact enquiry, most basics unknown | Superseded where the others disagree |

The SEP10 and SEP14 files each carry a full annotated diff. Rules below are the SEP10 set;
**read the SEP14 rules further down first — they take precedence where they overlap.**

1. **Never write about the transcript.** Cut "came through unclearly", "figure unclear on
   the call", "[CONFIRM spelling]" scattered through prose. Either state the fact, or mark
   the field `TBC`. This also killed in-prose flags like "stated as X and recorded as Y",
   "spelled verbally and is to be confirmed", "fund not known; to be confirmed" and
   "NOT CAPTURED" appended to a sentence. A `NOT KNOWN` **inside a structured cover
   listing survives** — that is data about a policy, not a note to self.

2. **Do not editorialise on significance.** State the fact and stop — he draws the
   conclusion himself.

3. **Outstanding items are `TBC`, highlighted, in the field they belong to.** Not a
   sentence, not a closing list. Fill everything that is known first — he fills DOB,
   mobile, email, postcode, smoker status and the spouse's details from the client file —
   then highlight the residue. Fall back to a closing `OUTSTANDING - TO BE OBTAINED` list
   only when the gaps are too many or too large to sit in a field, as on a first-contact
   enquiry where nothing is yet known (the SEP02 example). **On a normal meeting there is
   no closing list.**

4. **Header field formats:**

   | Field | Format |
   |---|---|
   | `DOB` | `dd/mm/yyyy` |
   | `Address` | street, then **suburb uppercase**, state, postcode — no commas |
   | `Smoker` | `N` or `Y` |
   | `Speciality` | industry, en dash, job title — `IT – Solutions Analyst` (illustrative) |
   | `Employer/self` | employment basis **and income** — `PAYG $000,000 + Super` |

5. **For a couple, add a `Spouse Details` header block** immediately under the client's,
   identically formatted, carrying the same nine fields. It is not in the blank template.
   When present, **delete the `Family / partner/ dependants:` heading** — the partner is
   header data, and the children survive as one or two italicised lines under `Income` in
   the financial section, with no heading of their own.

6. **Resolve a range to one figure where the client effectively gave one.** Ranges survive
   only where genuinely uncertain.

7. **`What is important to you` records what the money must DO, not what the client
   asked.** Education delivered in the meeting — trauma versus TPD, stepped versus level,
   how a rollover premium is paid — is not file-note content and gets deleted wholesale.
   Write purpose-per-cover instead, short and declarative: "Wants to clear total debt in a
   claimable Life event." / "TPD to clear home debt and provide excess monies post tax to
   fund house modifications or medical expenses." **This is the section that justifies the
   sums insured.**

8. **Strategy, structure and pricing come OUT.** The Client Details Summary records the
   client's **circumstances**. Indicative sums insured, premium figures, the funding split
   between super and cash flow, stepped-versus-level, the 15% rollover rebate, the
   deductibility argument, the 70%-of-income basis — all belong in the Statement of Advice
   and were deleted in full. Anything reading like an argument for a course of action is
   cut. Same for the intestacy explanation under Estate Planning, which reduces to one
   line, and the "outside the practice's authorisation" disclaimer.

9. **`Insurance needs` is repurposed as `UNDERWRITING`.** What survives is only what an
   underwriter needs: condition, medication and dose, when diagnosed, whether controlled,
   and the occupation rating still to be established. Nothing about sums insured.

10. **The document ends at `Goals`.** Delete the repeated second block outright — including
    the second `About the client.` and `Reasons for seeking advice`, not merely the
    repeated Existing cover / Estate Planning / Super.

11. **`Outcome of meeting` is dropped whenever no advice was given** — even where the
    meeting agreed concrete next steps. Adviser/client action lists and the
    service-and-remuneration explanation are not file-note content. Keep the section only
    for a meeting that decided something advice-bearing (see the [CLIENT_D] AUG03 review, where
    it was the point of the document).

12. **Compression device:** `Same as <spouse>.` appended where the spouse's position mirrors
    the client's, instead of repeating the detail.

13. **Small wording tell:** "life plus TPD and income protection" became "life plus TPD and
    income protection **as a minimum**". He leaves the door open on scope.

Net effect: **the draft is too wordy, too self-referential, and strays into advice.** Aim
shorter and more declarative, keep the reasoning out, and stop at the client's circumstances.

### SEP14 edit — these override the above where they overlap

From `client-details-summary/examples/[CLIENT_A]-SEP14-EDITED-BY-TRISTAN.md`
(2026-09-14). The draft was close — his words were "not many changes" — so these are the
residue, and they are the sharpest signal available.

14. **Never assert a negative as fact; record it as not disclosed.** "No investment
    properties, shares, managed funds, cash or savings **are held**" became "**have been
    disclosed**", and the same in the assets list. The client saying he holds nothing is
    not evidence that he holds nothing. Every absence in the document is an absence *of
    disclosure*.

15. **Qualify the standing cover clause when no cover is confirmed.** "EXISTING COVER
    REMAINS IN FORCE" becomes "**EXISTING COVER (IF ANY) REMAINS IN FORCE**" where nothing
    has yet been confirmed to exist.

16. **Financial circumstances does not repeat the header or About the client.** The whole
    `Income` block and the dependants line were deleted — both incomes already sit on the
    `Employer/self` header lines and the children are already in *About the client*. This
    **replaces SEP10 rules 4 and 8**, which moved the children into this section. It now
    reduces to: ASSETS, total, LIABILITIES, total, `Estimated net position approx. $X.`,
    then any `NOT CAPTURED` line and the one-line driver sentence.

17. **Delete any section with nothing real in it — `Goals` and `UNDERWRITING` included.**
    SEP14 **ends at `Height / weight`**: `Hobbies / pets`, `UNDERWRITING`, `Insurance
    needs`, `Goals` and the trailing repeated block all went. This **replaces SEP10 rule
    10** ("the document ends at Goals") — SEP10 ended at Goals because that meeting had
    goals. The test is **would this section exist if the draft could only use facts?** A
    heading is not a reason to synthesise content, and a first-contact call usually has
    nothing to underwrite and no goals yet explored.

18. **A `TBC` field can carry a qualifying line** where something partial is known —
    "Both to be explored further however, client has disclosed [a healthy] BMI for each."

19. **A long `Employer/self` value moves to its own line**, leaving `Sex` and `Speciality`
    on the row above. Short values keep all three on one line.

20. **Name the school type where fees are in play** — "one child still at school" became
    "one child still at **private** school".

21. **"No binding death benefit nominations discussed." stays out of `Super`.** He cut the
    same line from SEP10 and it came back in the SEP14 draft. It is a note about what the
    meeting did not cover, which rule 1 already forbids — the recurrence is the point.

22. **Stray empty labels are tolerated; invented content is not.** He left the empty
    `Family / partner/ dependants:` heading standing and spent his edits on deleting
    inferred prose instead. Do not pad a section to justify its heading.

### Generator gaps against this spec

`server/scripts/generate-client-details-summary.mjs` cannot yet produce three things the
SEP10 document needs, so they are hand-finished:

- **Yellow highlighting** for `TBC` — `contentParas()` emits plain runs with no `rPr`.
- **The `Spouse Details` header block** — it has no insertion point in the template.
- **Deleting unfilled labels** — it only inserts after a label, so every dropped section
  (`Family / partner/ dependants`, the repeated second block, `Outcome of meeting`) leaves
  a stray heading behind for him to delete by hand.

## Where things go

| Folder | What goes in it | Status |
|--------|-----------------|--------|
| `client-details-summary/templates/` | The **blank** Client Details Summary template. | Waiting |
| `client-details-summary/examples/` | **Completed** Client Details Summaries from real meetings. | **Two, both edited by Tristan — SEP10 is current** |
| `fact-find/templates/` | `Fact Find - master.docx`: a blanked [CLIENT_E] 2026.09.30 fact find (the firm's "Fact Find Template.docx" is a 2023 [CLIENT_F] one on the older, shorter form). Filled by `server/scripts/generate_fact_find.py`; the whole pipeline is the `/meeting-notes` skill. | **In use (2026-10-22)** |
| `fact-find/examples/` | **Completed** fact finds for real clients. | Coming later |
| `source-transcripts/` | The meeting transcripts / raw notes both documents were written **from**. | **None matching — do not chase** |

### No matched transcripts — work from live ones instead

Tristan has no *pre-existing* transcript that matches an existing Client Details
Summary or fact find (confirmed 2026-09-01). **Do not chase them.** The build
works from the completed documents for structure and house wording, and the
transformation gets tuned against real transcripts as meetings come through.

**Matched pairs now exist, produced by this process rather than found** — SEP02
and SEP10. For each, the generated draft is in `legacy/file-notes/<slug>-cds.json`
and the issued version is the `EDITED-BY-TRISTAN.md` example. That draft/issued
pair is the calibration signal; the transcript itself only needs saving into
`source-transcripts/` if a run is to be reproduced end to end.

Practically this means the first few runs are calibration: generate from a live
transcript, compare against how he would have written it, and adjust. Expect
the "what gets added that was never said out loud" part — the judgement a real
adviser applies — to need his correction rather than being inferable up front.

Examples covering **different client shapes** (single vs couple, employee vs
self-employed, existing cover vs none) are worth more than volume.

## The fact find template is being supplied — use it directly

Tristan is providing the **blank** fact find form (2026-09-01). Use it as the
clone-and-fill master. This supersedes the fallback below and is the better
option: a supplied blank carries no client data, so there is nothing to strip
and no risk of a stray value propagating into future fact finds.

His examples are all on the current Legacy form, so there is no
previous-licensee branding in play — unlike the archived Lakeside material,
which must never appear on a Legacy document (see commit `c879ef4`).

<details>
<summary>Fallback if the blank is ever unavailable</summary>

A form's blank is recoverable from completed copies: every copy shares identical
labels, section order and fixed wording, and only the client data varies. Take
one completed `.docx` and clear the client-specific cells — clone-and-fill
already operates on the document XML, so blanking a filled form is the same
operation in reverse.

**Required safeguard for that route.** Every client value must be stripped *and
verified stripped* — one value left in a cell propagates silently into every
future client's fact find. Blank programmatically, then scan for residual names,
dates, dollar figures and policy numbers. Do not rely on visual inspection.
</details>

## Decisions (2026-09-01, confirmed by Tristan)

- **Output is a Word document** — a `.docx` into the client file, like the
  client profile and insurance report generators produce.
- **One format each**, with sections included only when relevant.
- **Initial and review meetings use the same document** (confirmed 2026-09-01). In
  a risk-only practice they are usually one and the same — a review captures the
  same circumstances an initial meeting does. Do **not** build a review variant,
  add a meeting-type field, or branch the generator. Fields that read as
  initial-only ("Referred from", "About the client") simply carry review-context
  content. Verified against the [CLIENT_D] AUG03 transcript, which is a review meeting
  and fills the template unmodified.
- **Tristan writes these today; a VA takes them over once built.** That makes
  them the **first VA-assigned task type**, and so the first real case for the
  assignment/tracking model in
  [`../../va-workflow-build-brief.md`](../../va-workflow-build-brief.md).

## The fact find is not only a document

A Client Details Summary is prose — it is read by people. A fact find is
**structured data**: income, expenses, assets, liabilities, family, existing
cover. The app already has a table for every one of those, and
`gatherClientContext()` already reads them back out.

So generating a fact find from a transcript should do two things:

1. Produce the `.docx` on the house form, and
2. **Write the extracted detail into the client file** — `family_members`,
   `income_sources`, `expenses`, `assets`, `liabilities`,
   `insurance_policies`.

That second half is what makes the rest of the workflow pay off: the SOA brief
pack is assembled from exactly those tables, so a fact find done at the initial
meeting populates the pack automatically instead of being re-keyed later. It
also means the fact find that `soa-build/fact-finds/` currently expects as a
manual input becomes something this app produces.

Confirm the mapping against a real completed fact find before relying on it —
field names and how the form asks a question are read out of the template.

## Which .docx path each uses depends on its template

The repo has both, and the choice is made by looking at the template:

| Template shape | Path | Why |
|---|---|---|
| A **form** — labelled table rows and cells | **Clone-and-fill** (`JSZip`, as in `server/scripts/generate-client-profile.mjs`) | Opens the real `.docx` and rewrites cell text in place, so letterhead, fonts and brand colours survive byte-for-byte. `setCellText()` already splits on newlines, so a large free-text cell works fine. |
| **Prose under headings**, variable length | Build from `html-to-docx` / `docx` | Free-flowing content has no fixed cell to land in. |

A fact find is almost certainly a form, so clone-and-fill should suit it — the
client profile generator is the closest working model and its ledger/label
matching logic is directly reusable. The Client Details Summary may go either
way.

## Not the same thing as the follow-up email

The repo already generates a client-facing follow-up email from a transcript
(`[archived follow-up email generator]`). These are different documents:
third-person and factual for the file, versus warm and second person to the
client. Same input, separate generators — do not merge them.

## Formats

`.docx`, `.pdf`, `.md` and `.txt` extract cleanly. `.doc` does **not** — open it
in Word and re-save as `.docx` first. See [`../README.md`](../README.md).

## Client data

Real client material. It stays on this machine, is read only to derive structure
and house wording, and is never used as content in another client's documents.
Everything in this folder except the READMEs is gitignored.
````

#### 5.5 `.claude/skills/meeting-notes/SKILL.md` (Route B, whole file)

Replacements: `[client-e]-oct22` = a client slug; `[CLIENT_E1] and [CLIENT_E2]` = that couple's first names; `[CLIENT_E]` as in §5.4; `[CLIENT_G]/[CLIENT_H]` = the two clients whose SOA Notes are the shape reference.

````markdown
---
name: meeting-notes
description: Stages 1-3 of the Legacy SOA pipeline. From an initial meeting transcript, produce the Initial Meeting Notes, the filled 2026 Fact Find and the draft SOA Notes (paraplanner brief), filed in a case folder under legacy/soa/. Use when Tristan pastes a meeting transcript or asks for "initial meeting notes", "do the fact find" or "prep the SOA".
---

# Initial meeting → notes, fact find, SOA prep

One transcript in, one case folder out:

```
legacy/soa/<Surname, First [& Second]>/1. Advice/<Year> Advice & Service/
  1. Research, Financials, Medicals, Schedules/      (empty: for the paraplanner)
  2. Compliance docs (SOA, ROA, EO & Fact Find)/
     <First Last> <MON><DD> - Initial Meeting Notes.docx + .pdf
     <yyyy.MM.dd> - <Short> - Fact Find.docx + .pdf
     <yyyy.MM.dd> - <Short> - SOA Notes.docx + .pdf
  3. Signed documents - Implemented Audit/           (empty)
```

**Never write to SharePoint** (`C:\Users\TristanBiro\Legacy Risk Advice\...`). It is read-only.
Tristan or the paraplanner moves the folder across. Nothing goes into the app database.

## Steps

1. **Pull known facts first.** If the client already has a SharePoint folder, read it (copy
   files out to the scratchpad if you need to extract them): the latest fact find, insurer
   schedules and renewal letters fill DOBs, addresses and existing cover. Check DOBs against
   an insurer certificate where there is one.

2. **Write three JSON files** in `legacy/file-notes/` (gitignored), all with the same slug,
   e.g. `[client-e]-oct22`:
   - `<slug>-cds.json`: Initial Meeting Notes. Follow every house rule in
     `legacy/drop/initial-meeting-build/README.md`; the SEP14 rules win. Circumstances only:
     no strategy, sums insured or pricing.
   - `<slug>-ff.json`: Fact Find. The schema is in the docstring of
     `server/scripts/generate_fact_find.py`. Rules, from the firm's Fact Find Process:
     - "Why are you seeking advice", "Your story", goals and scope are written in the
       **second person** ("[CLIENT_E1] and [CLIENT_E2], you wish to review...").
     - Health status defaults to `Good` unless a condition was disclosed.
     - A fact that should be known but wasn't said is `TBC` (it gets highlighted). A whole
       section the meeting never touched gets `not_disclosed`, or `Not disclosed` in cells.
     - Dates of birth are written `5 June 1982 (44)`. Addresses are `STREET` on one line,
       then `SUBURB STATE POSTCODE`, uppercase.
     - Money is `$270,000`. Income, expense, asset and liability totals are added for you.
     - For a single client give one name in `clients`; the partner column is dropped.
   - `<slug>-soa-notes.json`: Draft SOA Notes. The schema is in
     `server/scripts/build_soa_notes.py`. The shape is the firm's own ([CLIENT_G]/[CLIENT_H] SOA Notes):
     - `brief`: "Hey Howard," then what to quote (each cover, sum insured options, waiting and
       benefit periods, inside/outside super), as the adviser discussed in the meeting.
     - `to_obtain`: existing policy schedules, super statements, quotes, Risk Researcher run,
       pre-assessments for any disclosed condition.
     - `outstanding`: every TBC in the fact find, in plain words.
     - `circumstances`: short shorthand list (incomes, property and debt, savings, super, estate).
     - `sections`: Goals; Reasons for Seeking Advice; Insurance Review and Cover Discussion;
       Cover Funding; Health Disclosure; Advice and Recommendations. Write what the meeting
       actually established. Anything not yet decided is `[ADVISER TO CONFIRM]`.

3. **Run it:**
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File server/scripts/prep-soa-case.ps1 `
     -Slug <slug> -Client "<Surname, First & Second>" -Short "<Surname F&S>" -NotesName "<First Last MONDD>"
   ```
   It builds all three .docx files, exports PDFs (a PDF failure is a warning; the .docx is the
   deliverable) and prints the folder.

4. **Check** the fact find PDF pages render cleanly, then report to Tristan: the folder path and
   the outstanding list. Mention anything in the transcript that contradicts the file.

## Masters

- Fact find master: `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx`,
  a blanked [CLIENT_E] 2026.09.30 fact find (verified clean with `server/scripts/leakscan_docx.py`).
  If it is ever rebuilt from another client's fact find, leak-scan it for that client's names,
  address, phone, email, insurer and figures before use.
- Meeting notes template: `legacy/drop/initial-meeting-build/client-details-summary/templates/`.
````

#### 5.6 Memory `initial-meeting-notes-means-cds-generator.md` (whole file)

Replacements: `[CLIENT_I]` = the 12 Oct single client; `[CLIENT_J]` = the client whose notes were the table.

```markdown
---
name: initial-meeting-notes-means-cds-generator
description: "Initial meeting notes" from a transcript = the program's Client Details Summary generator, not the house Initial Client Notes table.
metadata:
  type: feedback
---

When Tristan pastes a call transcript and asks for "initial meeting notes", he means the program's
**Client Details Summary**: write `legacy/file-notes/<slug>-cds.json`, run
`server/scripts/generate-client-details-summary.mjs`, and output `<Name> <MON><DD> - Initial Meeting Notes.docx`.
Follow the house rules in `legacy/drop/initial-meeting-build/README.md` (SEP14 rules take precedence).
On 2026-10-12 he rejected the Initial Client Notes table (Word table with Client 1 and Client 2 columns)
for [CLIENT_I]: "initial meeting notes not client notes... the program ones".

**Why:** the two documents are different. The table is only used when he asks for "initial client notes" or "file notes" ([CLIENT_J]).
**How to apply:** default to the CDS generator for transcripts. Export a PDF too, and copy both to Downloads; he wants them there.
See [[legacy-soa-from-case-folder]].
```

#### 5.7 Memory `legacy-soa-from-case-folder.md`, the two relevant sections (verbatim)

Replacements: `[CLIENT_J]` = 7 Oct table client; `[CLIENT_M]` = the couple used as clean base; `[INSURER_A]` = the insurer whose renewal letters were used; `[CLIENT_I]` = the 9 Oct single prospect; `[CLIENT_K]` = the 14 Oct client; `[CLIENT_L]` = the client whose own notes were the base. Folder and script paths that contain client names are replaced the same way.

```markdown
## Fourth job type, 2026-10-07: Initial Client Notes from a call transcript ([CLIENT_J])

"Do me initial file notes" = the house **Initial Client Notes** Word table (label | Client 1 | Client 2;
Mobile, DOB, Income, Liabilities, Insurance, Height/Weight, medical rows…) plus free-text notes below.
Clone a recent one from `Clients\<name>\1. Advice\2026 Advice & Service\1. Research...\` ([CLIENT_M] 2026.09.18
is a clean couple base: no images or headers). Fill from the pasted transcript, and use the latest fact find,
[INSURER_A] renewal letters and `6. Schedules` to fill anything he says is unchanged. Output `legacy/soa/`.
Check DOBs against the insurer's certificate. The fact find can be wrong (it was here).
Second one 2026-10-09: [CLIENT_I] (new prospect, single, "fo up initial meeting notes"). Cloned the [CLIENT_J]
output itself via `cases/[CLIENT_I]/.build/build_initial_notes.py` (python-docx; table dict + notes list) —
reuse that script for the next one. Word COM PDF export worked.

**"Initial meeting notes" is a different document** (corrected 2026-10-14, [CLIENT_K]): he wants the firm's
prose Word doc — CLIENT DETAILS SUMMARY header lines (Name/DOB/Address, Mobile/Email/Smoker, Sex/Speciality/
Employer), then bold headings: Spouse Details, Referred from, About the client, What is important to you,
Reasons for seeking advice, Current Insurance, Financial circumstances (ASSETS/LIABILITIES/net), Family, Super,
Estate Planning, Health, Height/weight, Hobbies, Insurance needs, UNDERWRITING, next steps. Base: his own
"[CLIENT_L] OCT09 - Initial Meeting Notes.docx" in `Clients\[CLIENT_L]\...\1. Research...`; builder
`cases/[CLIENT_K]/.build/build_initial_meeting_notes.py`. Name: `<date> <First Last> <MON><DD> - Initial Meeting
Notes.docx`. Word only, and drop a copy in Downloads.
```

#### 5.8 Memory `soa-pipeline-built.md` (whole body, frontmatter metadata omitted)

```markdown
Tristan's process (2026-10-22): after an initial meeting, Claude produces the meeting notes,
fills the fact find, and prepares the SOA documents. The paraplanner (Howard) then gathers the
rest into the SharePoint client folder, and Claude generates the SOA and later the pack **only
on his command**.

Built as project skills in `.claude/skills/`: `meeting-notes` (stages 1-3, runs
`server/scripts/prep-soa-case.ps1`), `build-soa`, `build-pack`. Stage-3 output is a case folder
under `legacy/soa/<Surname, First>/1. Advice/<Year> Advice & Service/` in the SharePoint layout.
He said "drop the pack in SOA folder". The paraplanner brief and the draft SOA Notes are one
document, as in the firm's own SOA Notes ("Hey Howard, ...").

**Why:** he chose these constraints himself: no app database writes and no SharePoint writes "for
the time being". SharePoint is only ever read, by copying out.
**How to apply:** when he pastes a transcript, run the meeting-notes skill end to end. Never
start the SOA without his say-so. Untested on a live transcript as of 2026-10-22, so the first
real run is calibration: expect fact-find wording corrections and record them.
See [[soa-pack-copy-firm-docs-unchanged]], [[initial-meeting-notes-means-cds-generator]],
[[legacy-soa-from-case-folder]].
```

`legacy-va-workflow-direction.md` has no instruction about this document beyond background (VAs, XPLAN as record). Not repeated.

#### 5.9 `legacy/va-workflow-build-brief.md`, section "1. Initial meeting — ACTIVE" (lines 93-120, verbatim)

Replacements: `[CLIENT_D]` = AUG03 review client; `[EMPLOYER_A]`, `[SCHOOL_A]`, `[INSURER_B]` = names from that transcript; `[GARBLED_…]` = the transcript's mis-hearings of them.

```markdown
### 1. Initial meeting — ACTIVE

One transcript in, **two documents** out: the **Client Details Summary** (what
the firm calls initial meeting notes) and the **fact find**. His words, so use
them — an earlier guess called this "file notes" and that folder was renamed.

Output is a **Word document** each; **one format** each; he writes them today
and a **VA takes over**, making these the first VA-assigned task type.

Intake folder and the full brief:
[`drop/initial-meeting-build/`](drop/initial-meeting-build/).

**The Client Details Summary generator is working and signed off by Tristan**
(2026-09-01) — `server/scripts/generate-client-details-summary.mjs`, first run
against the archived [CLIENT_D] AUG03 transcript. Do not redesign it. What made it
land, and what to preserve in any future document generator:

- **Clone-and-fill his real template**, never rebuild the document.
- **De-garble the transcript the way he does** — the raw text renders [EMPLOYER_A] as
  "[GARBLED_EMPLOYER]", [SCHOOL_A] as "[GARBLED_SCHOOL]", [INSURER_B] as "[GARBLED_INSURER]".
  Fix the obvious mangling; cross-check names against any follow-up email in
  `archive/lakeside/follow-ups/`.
- **Flag, never invent.** Anything the transcript does not cover is marked
  `[CONFIRM]` and collected into an outstanding list. On these documents the
  gaps are the value — they are the chase list.
- **Reconcile the numbers as a self-check.** The premium components summed to
  the totals Tristan quoted in the meeting, which is what confirmed the
  individual figures had been heard correctly.
```

Lines 122-143 of the same file (verifying a .docx by opening it in Word; do not use `html-to-docx`) also apply to this document. See Part SOA if repeated there.

---

### 6. Output structure

#### Files

| Route | File | Location |
|---|---|---|
| A | `<First Last> <MONDD> - Initial Meeting Notes.docx` + `.pdf` | `legacy/soa/<case_name>/1. Advice/<Year> Advice & Service/2. Compliance docs (SOA, ROA, EO & Fact Find)/`; also copied to Downloads |
| A, B | `<slug>-cds.json` (`<first-last>-<monDD>` lower-case) | `legacy/file-notes/` |
| B | Same .docx/.pdf name, `-NotesName` chosen by Claude | Same folder layout; no Downloads copy in the script |
| CLI default (no out path) | `<clientName> - Client Details Summary.docx` | `legacy/file-notes/` (generator line 109-111) |

#### JSON shape

`{"clientName": string, "sections": [{"label": string, "value": string}, …]}`. `\n` in a value splits paragraphs.

#### Sections (Route A label order, `writers.js:20-25`)

Single: Name, Mobile, Sex, Referred from, About the client, What is important to you, Reasons for seeking advice, Current Insurance, Financial circumstances, Family, Super, Estate Planning, Health, Height, Hobbies, UNDERWRITING, Insurance needs, Goals, About the client (2nd), Reasons for seeking advice (2nd), Existing cover, Estate Planning (2nd), Super (2nd), Outcome of meeting.

Couple: Name, Mobile, Sex, Spouse Details, Name, Mobile, Sex, then the single list from Referred from.

- **Always vs conditional in code:** every label is asked for; the prompt says "each once". The generator inserts only what is in the JSON, in order. It never removes a template label.
- **Conditional by README rule (model judgement):** Spouse Details block (couple only), Family heading deleted for couple, sections with nothing real deleted (rule 17), second block deleted (rules 10/17), Outcome of meeting only when advice was given (rule 11), OUTSTANDING list only on near-empty first contact (rule 3). These conflict with "each once" (see §8 gaps).
- **Header fields** (DOB, Address, Email, Smoker, Speciality, Employer/self): no label of their own in the list. Where they go: NOT FOUND in code; the template was skipped. The memory (§5.7) says header lines are "Name/DOB/Address, Mobile/Email/Smoker, Sex/Speciality/Employer", so presumably the Name/Mobile/Sex labels are the start of each header line. Not verified.

#### Initial Client Notes table

Per memory: a Word table, label | Client 1 | Client 2, rows Mobile, DOB, Income, Liabilities, Insurance, Height/Weight, medical rows, then free-text notes. Built by a per-client Python script (skipped). No other source.

---

### 7. Fixed wording the system inserts

#### By code

| Text | Trigger | Location |
|---|---|---|
| Yellow highlight on `TBC` | Any whole word `TBC` in a value | `generate-client-details-summary.mjs:38, 48` |
| ` - Initial Meeting Notes.docx` | File name | `workbench.js:351`, `prep-soa-case.ps1:35` |
| ` - Client Details Summary.docx` | CLI with no output path | generator line 111 |
| `clientName` overwritten with `<First Last> <MONDD>` | Always (Route A) | `writers.js:97` |
| No other text is added to the document by code. Template label text is whatever the template holds (not read). | | |

#### By the model, as instructed

| Text | Trigger | Source |
|---|---|---|
| `TBC` | Field should be known but was not said / nothing known | `writers.js:69, 88`; README rule 3 |
| `OUTSTANDING - TO BE OBTAINED` (closing list) | Gaps too many, first-contact enquiry | README rule 3 |
| `NOT KNOWN` | Inside a structured cover listing | README rule 1 |
| `PAYG $000,000 + Super` format | Employer/self | README rule 4 |
| `Same as <spouse>.` | Spouse mirrors client | README rule 12 |
| "… as a minimum" | Scope of cover | README rule 13 |
| "… have been disclosed" (not "are held") | Any absence | README rule 14 |
| `EXISTING COVER (IF ANY) REMAINS IN FORCE` | No cover confirmed | README rule 15 |
| `Estimated net position approx. $X.` | Financial circumstances | README rule 16 |
| `NOT CAPTURED` line | Financial circumstances | README rule 16 (rule 1 forbids it appended to a sentence) |
| "private" school | Fees in play | README rule 20 |

---

### 8. Decision logic

| # | Condition as tested | Effect | File:line | Code / model |
|---|---|---|---|---|
| 1 | `kind !== 'soa-notes' && !wb.transcript` | Error "Paste the meeting transcript first" | `workbench.js:407` | Code |
| 2 | `!transcript.trim()` in UI | Generate button disabled | `CaseView.jsx:234` | Code |
| 3 | `data` exists | Confirm dialog before re-generate | `DocStep.jsx:24` | Code |
| 4 | `!aiEnabled()` | Error, no call | `writers.js:50-52` | Code |
| 5 | `wb.sharepoint_folder` set | Status line EXISTING CLIENT | `lookup.js:124-126` | Code |
| 6 | `look.inSharePoint \|\| look.inProgram` | Status line POSSIBLY EXISTING | `lookup.js:127-129` | Code |
| 7 | else | Status line NEW CLIENT | `lookup.js:130` | Code |
| 8 | `!wb.sharepoint_folder` | No known facts | `workbench.js:379` | Code |
| 9 | `!READ_SHAREPOINT` | No known facts; progress note | `workbench.js:380-383` | Code |
| 10 | `wb.adviser_notes` | Adviser notes block added; "take precedence over the transcript" | `writers.js:63` | Code adds; model applies |
| 11 | `isCouple(client)` (partner first or last name present) | Couple labels + couple example; `who()` couple line | `writers.js:56, 75-80`; `paths.js:39-44,71` | Code |
| 12 | Partner has no surname | Partner takes client's surname | `paths.js:43` | Code |
| 13 | `meeting_date` null | Today's date used in prompt, file name, slug, year folder | `paths.js:73` | Code |
| 14 | Model output not JSON | Error | `writers.js:42-48` | Code |
| 15 | `sections` not array | Error | `writers.js:98` | Code |
| 16 | Paragraph text empty | Skipped, not a label | generator `:78` | Code |
| 17 | Normalised paragraph text starts with normalised next label, label length > 2 | Insert value after it; next label | generator `:82-88` | Code |
| 18 | Queue empty | Stop scanning | generator `:75` | Code |
| 19 | Labels left in queue at end | `missed` list; CLI prints warning; exit 0 | generator `:93, 116` | Code |
| 20 | Run text equals `TBC` | Yellow highlight | generator `:38` | Code |
| 21 | Template missing | Throw | generator `:53-55` | Code |
| 22 | PDF export fails / not Windows | Warning only / no PDF | `run.js:64, 77-79`; `docx-to-pdf.ps1:24` | Code |
| 23 | `kind === 'cds'` | Copy .docx + .pdf to Downloads | `workbench.js:364-366` | Code |
| 24 | Stage index lower than `fact_find` | Stage set to `fact_find` | `workbench.js:90-94, 429` | Code |
| 25 | Names edited and no cds/ff/soa-notes JSON yet | Case name and short name follow the new names; otherwise kept | `workbench.js:239-242` | Code |
| 26 | Rules disagree | SEP14 rules win | `writers.js:82`; README 101-103 | Model |
| 27 | Couple | Spouse Details block; delete Family heading | README rule 5 | Model |
| 28 | Range given but effectively one figure | One figure | README rule 6 | Model |
| 29 | No advice given | Drop Outcome of meeting | README rule 11 | Model |
| 30 | Section has nothing real | Delete it | README rule 17 | Model |
| 31 | No cover confirmed | "(IF ANY)" wording | README rule 15 | Model |
| 32 | Spouse mirrors client | "Same as <spouse>." | README rule 12 | Model |
| 33 | Employer/self value long | Own line | README rule 19 | Model |
| 34 | Gaps too many (first contact) | Closing OUTSTANDING list | README rule 3 | Model |
| 35 | Existing client per status line | Reasons for advice written as a review "where the transcript supports it" | `lookup.js:125` | Model |
| 36 | Known facts differ from meeting | Meeting wins | `writers.js:64` | Model |

#### Decisions with no written rule (gaps)

1. "Each once" for all 24/27 labels (`writers.js:86`) vs README rules 10, 11, 17 that delete sections. No rule says what value to send for a deleted section (empty string, "TBC", or omit). Omitting a label shifts nothing in the generator (sequential match continues) but violates the prompt.
2. Where DOB, Address, Email, Smoker, Speciality and Employer/self go: no label for them; README rule 4 gives formats only.
3. README rule 5 says the Spouse Details block "is not in the blank template". The generator comment (`:67-68`) says "the spouse header rows are byte-identical clones of the client's", which implies the current template has them. Which is true: not verifiable (template skipped).
4. Route B: no label list is given to Claude in the skill. How Claude knows the exact template labels: NOT FOUND.
5. When `TBC` versus "Not disclosed" versus "have been disclosed": rule 14 vs rule 3 overlap; no tie-break.
6. What counts as "advice given" for rule 11: only the example reference to [CLIENT_D] AUG03.
7. The va brief says gaps are `[CONFIRM]` and an outstanding list; README rule 1 and 3 say `TBC` in the field and no list. No note says the brief is superseded.
8. Which document "initial meeting notes" means: memory of 12 Oct says the generator; the 14 Oct section says a Python clone of his own prose doc with a date-prefixed name. No rule picks between them.
9. Downloads copy in Route B: required by memory, absent from the skill.
10. Adviser notes vs transcript vs known facts: adviser notes beat transcript, meeting beats known facts; adviser notes vs known facts not stated.

---

### 9. Figures and calculations

- No arithmetic in code for this document. The generator copies text.
- Asset total, liability total and "Estimated net position approx. $X." are written by the model (README rule 16). Not checked by code.
- Ranges resolved to one figure by the model (rule 6).
- Income in `Employer/self` header from transcript, by the model.
- Dates: `longDate()` uses `toLocaleDateString('en-AU')` (`paths.js:88`). `monDay()` uses local month/day (`paths.js:76-79`). A `DATE` column is returned by pg as a JS Date at local midnight; `ymd()` formats it with local getters (`workbench.js:72-74`), so no off-by-one found in that path.
- Flag: `meeting_date` null → today (`paths.js:73`). The prompt then states today as the meeting date and the file name uses today's MONDD.
- Flag: Route B `-Date` defaults to `Get-Date` (`prep-soa-case.ps1:21`), so the year folder is the run date, not the meeting date. Route A uses the meeting year (`paths.js:95`).
- The README rule 8 mentions "15% rollover rebate" and "70%-of-income basis" only as things to delete.

---

### 10. Where facts come from

| Fact | Source |
|---|---|
| Names | `clients` row (typed by Tristan); `clientName` forced by code |
| Meeting date | Date field |
| Everything in section values | Model, from the transcript; adviser notes; known facts (off by default); status line |
| Existing-client framing | Status line from name matching only (`lookup.js`); "POSSIBLY" lines are told not to be assumed |
| Style and form | README + one real client's example JSON |

Where unsupported statements could appear:
- Facts copied from the few-shot example (a different real client's JSON sits in every prompt; only an instruction "copy its form, never its facts" guards it). No check in code.
- De-garbled names: the model corrects mis-heard names (va brief asks for it); a wrong correction reads as fact.
- Totals and net position (model arithmetic).
- "What is important to you" written as purpose-per-cover (rule 7) is a model reframing, and the README says it "justifies the sums insured".
- Header fields README says Tristan fills from the client file (DOB, mobile, email, postcode, smoker, spouse details) when known facts are off: the model must mark them TBC; nothing in code checks.
- Existing client status line could push "review" wording on a name collision only when the folder is linked.
- No step compares the output to the transcript.

---

### 11. Template and rendering

- Method: clone-and-fill. JSZip opens the template, reads `word/document.xml`, inserts new `<w:p>` after each matched label paragraph, writes the zip with DEFLATE (generator `:56-98`).
- Template: `legacy/drop/initial-meeting-build/client-details-summary/templates/Initial meeting notes.docx`. Not tracked in git. Not read by me.
- Placeholders: none. The template is labelled paragraphs. Content goes beneath labels.
- Matching: paragraph text joined from `<w:t>` runs, lower-cased, non-alphanumerics removed; must start with the normalised label. Match is strictly sequential: the head of the queue must be found before the next is tried.
- Content paragraphs reuse the label's `<w:pPr>` (paragraph properties) but not run properties, so not bold (`:43-45`). Each `\n` line becomes a paragraph. Empty line → empty run.
- Unfilled labels: left in the document as headings with nothing under them. Unmatched JSON labels: dropped; listed in `missed`.
- Known rendering problems:
  - A label not found in the template stops all later labels from filling (sequential queue). In Route A the child process exit code is 0 and `run.js:40` ignores stdout, so the `NOT MATCHED` warning is never shown in the app.
  - Label prefix match: a short label such as `Name` or `Sex` matches any later paragraph whose text starts with those letters (e.g. a paragraph starting "Names…" would match `Name`). Whether this occurs depends on the template (not read).
  - Header lines: a value for `Name` is inserted as a new paragraph after the whole Name/DOB/Address line, not beside it. Whether that is the intended look: NOT FOUND.
  - No italics: README rule 5 asks for italic child lines; the generator emits no italic runs.
  - No label deletion (README "Generator gaps").
  - `xmlEscape` does not escape quotes; text nodes do not need it.
  - PDF via Word COM; memory and comments say the export engine sometimes hangs on this machine; treated as warning.
- Fix history (git): 14 Sep 2026 changed `doc.replace(p, …)` to positional splicing because repeated and identical spouse header rows got all insertions on the first copy, interleaved and reversed (`:63-70`). 28 Sep 2026 added the TBC highlight.

---

### 12. Versioning and history

| File | Git |
|---|---|
| `server/scripts/generate-client-details-summary.mjs` | Tracked. Commits `0e5971e` (2026-09-07, first), `5f29059` (2026-09-14, splice fix), `f9e6f41` (2026-09-28, TBC highlight). Clean now. |
| `legacy/drop/initial-meeting-build/README.md` | Tracked. Last commit `5b07300` (2026-09-21). One uncommitted change (fact-find templates row). |
| `legacy/va-workflow-build-brief.md` | Tracked. Last `0e5971e`. |
| `server/src/services/ai.js`, `env.js`, `indexer.js` | Tracked. |
| `writers.js`, `routes/workbench.js`, `run.js`, `paths.js`, `lookup.js`, `sources.js`, `DocStep.jsx`, `CaseView.jsx`, `parts.jsx`, `prep-soa-case.ps1`, `docx-to-pdf.ps1`, `.claude/skills/meeting-notes/SKILL.md` | **Untracked.** No history. |
| `schema.sql` | Modified, uncommitted (`workbench_cases`). |
| Template, examples, few-shot JSON, outputs | Gitignored (`.gitignore:44, 52, 64, 68`). No history. |
| Memory files | Outside the repo. Not in git. |

Commits are local weekly checkpoints on `claude/financial-planning-app-8GWYC`.

Can you tell which prompt version produced an output: **No.** The JSON and .docx carry no prompt version, model id, date of generation or README hash. `cds_json` in the DB holds only the model output. The README and the example JSON are read live at each call, so a changed README or example changes later outputs with no record. The model name comes from `.env`.

---

### 13. Known problems and workarounds

1. README "Generator gaps": the TBC highlight item is out of date (fixed 28 Sep, `f9e6f41`). The other two (Spouse Details insertion point, deleting unfilled labels) are still open per README. Stray headings are deleted by Tristan by hand (README lines 149-158; rule 22 says he tolerates some).
2. Prompt demands every label once; README demands deleting empty sections. Output therefore tends to carry TBC-filled or empty sections he then deletes. (Inferred from code and README; not observed, outputs skipped.)
3. Unmatched labels are silent in the app (§11).
4. Word PDF export sometimes hangs (`run.js:57-59`, `prep-soa-case.ps1:49-50`, memory). Workaround: ship the .docx.
5. SharePoint known-facts read switched off by Tristan on 26 Oct 2026 (`workbench.js:23-26`). UI says notes are from the transcript only (`ClientCheck.jsx:60-63`). He fills DOB, mobile, etc. himself (README rule 3).
6. Two real clients' JSON are sent to the API as examples on every call.
7. Memory `soa-pipeline-built.md`: untested on a live transcript as of 22 Oct; first run is calibration.
8. Memory notes two competing builders for "initial meeting notes": this generator (12 Oct memory) and a per-client Python clone with date-prefixed naming (14 Oct section). The 14 Oct one is in a skipped client folder.
9. Memory: python-docx was missing on this machine at times (relevant to the Initial Client Notes table builder).
10. Route B does not copy to Downloads; Claude does it by hand per memory.
11. `meeting_date` missing → today used silently.
12. The old `meeting_transcripts` table and Meetings page are not connected to the workbench; transcripts pasted there are not used.
13. README says matched source transcripts are not kept (`source-transcripts/` empty), so no run can be reproduced end to end.

---

### 14. Dependencies

| Kind | Item |
|---|---|
| Languages / runtimes | Node.js >= 20 (`server/package.json` engines); PowerShell 5.1 (Windows); Python (fact find / SOA Notes in the same Route B script, not this document) |
| npm | `jszip` 3.10.1 — **not declared** in `server/package.json`; present only as a dependency of `docx`, `html-to-docx` and `mammoth` (`server/package-lock.json:2113, 3074, 3509`). `@anthropic-ai/sdk` ^0.69.0. `express`, React client (see Part SOA). |
| API | Anthropic Messages API, model `claude-opus-5` (from `ANTHROPIC_MODEL`). |
| Keys | `ANTHROPIC_API_KEY` in `server/.env`. Not printed. |
| Database | PostgreSQL `fpgod`, table `workbench_cases` (Route A only). |
| Local tools | Microsoft Word (COM) for PDF; Windows Explorer for reveal; OneDrive-synced SharePoint library (read only, only if known-facts on). |
| Claude Code | `meeting-notes` skill; memory files. |

---

### 15. Questions for Tristan

1. The prompt makes the model output all 24 (single) or 27 (couple) labels, but the README says delete empty sections, the second block and Outcome of meeting. Which should win, and should the generator delete unused labels from the template?
2. Does the current `Initial meeting notes.docx` template contain a Spouse Details block? The README says no; the generator comment says the spouse header rows are clones of the client's.
3. Where should DOB, Address, Email, Smoker, Speciality and Employer/self values go? They have no label in the list.
4. For "initial meeting notes", is the program generator the only route now, or does the 14 Oct Python clone of your own prose doc (date-prefixed file name) still apply?
5. Is the Initial Client Notes table still in use? If yes, should it become part of the shared skill, and what is its template?
6. Should two real clients' meeting notes keep being sent as few-shot examples, or should they be replaced with an anonymised example?
7. Should the shared skill keep the SharePoint known-facts read off (as set on 26 Oct)?
8. Should Route B also copy the .docx and PDF to Downloads, as memory says you want?
9. Gaps: `TBC` in the field (README) or `[CONFIRM]` plus a list (va brief)? Is the va brief wording superseded?
10. When the meeting date is blank, should generation stop instead of using today's date?
11. Who checks the asset/liability totals and net position the model writes?
12. Should each output record the README version, model and date it was made with?
13. Which VA(s) will run this, and in which route (app or Claude Code)?
14. Should the source transcript be saved with each case so runs can be reproduced?

---

## Part 2. Fact Find

Scope: turning an initial (or review) meeting transcript into the firm's filled 2026 Fact Find `.docx` (+ PDF). Two routes exist, as in the SOA spec: **Route A** = the in-app Workbench (Express + React, Anthropic API from code); **Route B** = the `/meeting-notes` Claude Code skill (Claude in chat writes the JSON, a PowerShell script builds). Both use the same builder, `server/scripts/generate_fact_find.py`.

Client-data placeholders used below: `[CLIENT_1_FIRST]`, `[CLIENT_2_FIRST]`, `[CLIENT_1_FULL]`, `[CLIENT_2_FULL]`, `[SURNAME]` replace real client names that appear in code comments, docstrings and prompt text. `[MASTER_CLIENT]` = the client whose fact find the master was blanked from. `[OLD_TEMPLATE_CLIENT]` = the client on the firm's 2023 template. `[REVIEW_CLIENT]` = the client in the recreated fact find case. All line numbers are for the working tree on 2026-10-27.

### 1. Inventory

**Code**

| Path | What | Read / written by |
|---|---|---|
| `server/scripts/generate_fact_find.py` (381 lines) | python-docx builder. Opens the master, finds tables by the Heading 1/Heading 2 above them, rebuilds every client table from JSON, adds totals, highlights `TBC`, ticks checkboxes, fills cover table and signatories, drops the partner column for a single client. Its docstring is also the JSON schema sent to the model. | Run by `run.js buildFactFind()` (Route A) and `prep-soa-case.ps1` (Route B). Docstring read by `writers.js docstringOf()`. |
| `server/scripts/leakscan_docx.py` (32 lines) | Scans every `.xml`/`.rels` part of a .docx for given words (case-insensitive). Exit 1 on any hit. | Run by hand only. Used once to prove the master is clean (per skill). Not called by any pipeline code. |
| `server/src/services/workbench/writers.js` | `GENERAL` (66-70), `extras()` (61-64), `who()` (54-59), `docstringOf()` (36-40), `FACT_FIND_RULES` (102-109), `writeFactFind()` (112-126). Also passes `ff_json` to the SOA Notes writer (143) and to `soaInstructions()` (157). | Called by `routes/workbench.js`. |
| `server/src/services/ai.js` | `complete()`: Anthropic Messages call, adaptive thinking, effort, streaming above 16,000 max tokens, JSON coercion (strips code fence / takes outermost `{…}`). | `writers.js`. |
| `server/src/services/workbench/run.js` | `writeDataFile()` (31-36) writes `legacy/file-notes/<slug>-ff.json`; `buildFactFind()` (44-48) runs `python generate_fact_find.py <json> <out>`; `exportPdfs()` (62-80) runs `docx-to-pdf.ps1`. | `routes/workbench.js buildDoc()`. |
| `server/src/services/workbench/paths.js` | Names (`fullNamesOf`, `firstNamesOf`, `isCouple`, `stampOf`, `longDate`, `slugOf`), case folders, `assertWritable()` (208-216). | `writers.js`, `routes/workbench.js`, `run.js`. |
| `server/src/services/workbench/lookup.js` | `clientStatusLine()` (123-131): NEW / POSSIBLY EXISTING / EXISTING CLIENT line added to the prompt. | `routes/workbench.js` generate route. |
| `server/src/services/workbench/sources.js` | `sharepointText()`: reads SharePoint client files for "known facts". Only used for the fact find when `WORKBENCH_READ_SHAREPOINT=true` (off by default). | `routes/workbench.js knownFacts()`. |
| `server/src/routes/workbench.js` | `POST /api/workbench/cases/:id/generate/ff` (394-431) and `POST /api/workbench/cases/:id/data/ff` (435-446); `buildDoc()` (343-368); `knownFacts()` (378-391); `READ_SHAREPOINT` flag (26). | Client `DocStep.jsx`. |
| `server/scripts/docx-to-pdf.ps1` | Word COM, opens read-only, exports PDF next to the docx. Prints `OK`/`FAIL` lines. | `run.js exportPdfs()`. |
| `server/scripts/prep-soa-case.ps1` | Route B builder: runs the meeting notes builder, `generate_fact_find.py`, `build_soa_notes.py`, then Word PDF export, into `legacy/soa/<Client>/...`. | Run by Claude in the `/meeting-notes` skill. |
| `client/src/pages/wb/DocStep.jsx` | Generate / Re-generate button (confirm before replace), NDJSON run log, warnings, file list with "Copy to Downloads", Preview, ✎ Edit JSON → "Save & rebuild". | `CaseView.jsx` tab `ff` (242-252). |
| `client/src/pages/wb/CaseView.jsx` | Step tab `{ key: 'ff', label: 'Fact Find', num: 2 }` (19); Fact Find DocStep with blurb (242-252); "No transcript yet" note (157-161). | Browser. |
| `client/src/pages/wb/parts.jsx` | `DataPreview` (97-127): generic key/value/table preview for `ff`; `Flagged` (77-80) highlights `TBC` and `[ADVISER TO CONFIRM]`. | `DocStep.jsx`. |
| `server/src/db/schema.sql` (730-752) | `workbench_cases.ff_json JSONB` holds the fact find data. | `routes/workbench.js`. |
| `server/src/services/workbench/pack.js` | Pack slot `fact_find` (29, 50, 76, 133, 189, 263): the fact find is a firm doc, plain-copied into the pack. Out of scope here (see Part SOA §4 Stage 5). | — |

**Prompts / instructions**

| Path | What | Used by |
|---|---|---|
| `writers.js` `GENERAL`, `FACT_FIND_RULES`, `writeFactFind()` system and user text | Route A prompt. | Anthropic API. |
| `generate_fact_find.py` docstring (lines 1-32) | JSON schema; inserted whole into the Route A system prompt. Route B skill also points Claude at it. | Anthropic API; Claude in chat. |
| `lookup.js clientStatusLine()` | Client-status line in the user prompt. | Anthropic API. |
| `.claude/skills/meeting-notes/SKILL.md` | Route B instructions (stages 1-3). Fact find rules at lines 35-45; masters at 69-75. | Claude Code. |
| `legacy/drop/initial-meeting-build/README.md` | Task README. Fact find parts: rows at 166-167, "template is being supplied" 191-215, Decisions 217-232 (initial and review use the same document), "not only a document" 234-255, clone-and-fill table 257-269. Note: the README is inserted whole into the **meeting notes** prompt, not the fact find prompt. | Meeting notes writer; humans. |
| Memory `fact-find-mirrors-soa-wording.md` | Review fact find boxes reuse SOA wording word for word; never put the recommendation in the fact find. | Claude in chat only. Not in any Route A prompt. |
| Memory `soa-exec-summary-goals-not-recommendation.md` | "Same rule for Scope of advice … and the Fact Find Agreed scope of advice": list advice areas, not outcomes. | Claude in chat only. |
| Memory `legacy-soa-from-case-folder.md` (182-196) | Seventh case: recreated review fact find cloned from the client's previous signed fact find by a per-case build script. Adviser split: fact find carries Tristan Biro. | Claude in chat only. |
| Memory `soa-pipeline-built.md` | Route B pipeline; "no app database writes"; first real run is calibration, expect fact-find wording corrections. | Claude in chat only. |
| Memory `workbench-is-the-new-program.md` (21) | `WORKBENCH_READ_SHAREPOINT` defaults off; fact find does not read client files. "Ask before changing." | Claude in chat only. |
| `.claude/skills/build-soa/SKILL.md` (22) | SOA build uses "the latest Fact Find in the folder, not the stage-1 draft, because the paraplanner may have corrected it." | Claude Code. |
| `legacy/va-workflow-build-brief.md` (150-155) | Plan: fact find should write structured data back to `family_members`, `income_sources`, `expenses`, `assets`, `liabilities`, `insurance_policies`. Not built. | Humans. |

**Templates**

| Path | What |
|---|---|
| `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx` | The only master. Exists on disk (checked by file test only, not opened). Gitignored by `.gitignore:44` (`legacy/drop/**/*.docx`). Per the skill and README it is "a blanked [MASTER_CLIENT] 2026.09.30 fact find" (an XPLAN/Opex merge of a real couple fact find), "verified clean with leakscan_docx.py". README: the firm's own "Fact Find Template.docx" is a 2023 [OLD_TEMPLATE_CLIENT] one on the older, shorter form, so it is not used. |

**Reference**

| Path | What |
|---|---|
| `server/scripts/markdown-to-docx.mjs` (header 1-21) | Older approach: comment says the fact find was to be **built** from Markdown with the `docx` library because the only copy was a completed real one. Superseded by the clone-and-fill master. No code calls it for fact finds now (NOT FOUND: any caller passing fact find Markdown; searched server/ and .claude/). |
| `legacy/drop/soa-build/README.md` (15), `legacy/README.md` (19) | `fact-finds/` folders for completed fact finds ("Waiting"). |
| `server/src/data/legacy-house-wording.json` (20, 78, 336) | SOA sentences that mention the Fact Find. Not used by the fact find builder. |
| `automation/xplan/src/mcp.mjs` (38) | XPLAN browse tool; example path `/factfind/list`. No fact find code uses it. |

**Config**

| Item | Where |
|---|---|
| `WORKBENCH_READ_SHAREPOINT` (default off) | `routes/workbench.js:26` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5`) | `server/src/config/env.js:66-70` |
| `FIRM_NAME` (default "Legacy Risk Advice"), `ADVISER_NAME` (default "Tristan Biro") | `env.js:42-63` (go into `GENERAL`) |
| `LEGACY_REPO_ROOT`, `LEGACY_LIBRARY_ROOT`, `WORKBENCH_DOWNLOADS` | `env.js:74-96`, `paths.js:107-111` |

**Older fact find generators**

- `markdown-to-docx.mjs` (see Reference): the earlier "build, don't clone" route. Not wired to the fact find now.
- Per-case `build_<surname>_ff.py` scripts under `legacy/drop/soa-build/cases/<client>/.build/` (named in memory). Skipped under the client data rule. These are how recreated review fact finds were made.
- NOT FOUND: any other fact find generator in `server/src/`, `server/scripts/` (excluding skipped per-client build/export scripts), `client/src/`, `.claude/`, `automation/`.

**DB writes of fact find data**

- Route A writes the whole JSON to `workbench_cases.ff_json` (`routes/workbench.js:427` and `:443`). It also creates/updates `clients` rows on case create/edit (not from the fact find).
- NOT FOUND: any code that writes fact find data into `family_members`, `income_sources`, `expenses`, `assets`, `liabilities` or `insurance_policies`. The only `INSERT INTO` those tables in code is `server/src/db/seed-demo-client.js` (demo seed) plus generic CRUD routes (`routes/family.js`, `routes/financials.js` via `crudFactory.js`) used by the old UI. The README (241-252) and VA brief (150-155) describe this write-back as planned. The Route B skill says "Nothing goes into the app database."

**Skipped (client data rule)**

| Path | Reason |
|---|---|
| `legacy/drop/initial-meeting-build/fact-find/templates/` (the master) | Blanked real client document. Described only from code and READMEs. |
| `legacy/drop/initial-meeting-build/*/examples/`, `*/templates/`, `source-transcripts/` | Real client documents. |
| `legacy/file-notes/` | Generated JSON per client (incl. the CDS exemplars `writers.js` reads for meeting notes). |
| `legacy/soa/`, `legacy/fact-finds/` | Generated / completed client documents. |
| `legacy/drop/soa-build/cases/**/.build/build_*_ff.py` | Per-client recreated fact find builders. |
| SharePoint library, Downloads | Live client files. |

### 2. Entry point and trigger

**Route A (Workbench, browser)**

1. Workbench home → open the client's case (or "New client" with names, meeting date, transcript, adviser notes).
2. Step tab "Initial Meeting Notes": paste the transcript there (the Fact Find tab shows "No transcript yet. Paste it on the Initial Meeting Notes step." when none is saved, `CaseView.jsx:157-161`).
3. Step tab "2 Fact Find" → click **"✨ Generate Fact Find"**. If a fact find exists the button reads "↻ Re-generate" and a confirm asks "Re-generate the Fact Find? This replaces the current version (the Word file is rebuilt)." (`DocStep.jsx:24`).
4. The run log streams steps: "Checking whether this is an existing client", optionally "Existing SharePoint file noted; not reading it (switched off for now)", "Claude is filling the Fact Find", "Building the Word document", "Exporting the PDF with Word".
5. Optional: **✎ Edit** the JSON in the Preview card → **Save & rebuild** (`POST …/data/ff`). No AI call.
6. Optional: "⬇" per file copies it to Downloads.
7. He moves the file to SharePoint himself (UI text: "In the case folder (legacy\soa). Move to SharePoint yourself when it is right.").

**Route B (Claude Code chat)**

- He pastes a transcript or says "initial meeting notes", "do the fact find" or "prep the SOA" (skill description). Claude writes `legacy/file-notes/<slug>-ff.json` by hand, then runs `prep-soa-case.ps1 -Slug … -Client "…" -Short "…" -NotesName "…"`. This builds all three documents together; there is no fact-find-only command.
- Recreated / review fact finds: no command or skill. Done ad hoc in chat by cloning the client's previous signed fact find with a per-case script (memory, seventh case).

### 3. Inputs

| Input | Format | Source | Required | Fields used |
|---|---|---|---|---|
| Transcript | Text ≤400,000 chars | `workbench_cases.transcript` (pasted) | Required (`workbench.js:407` "Paste the meeting transcript first") | Whole text in user prompt. |
| Meeting date | `YYYY-MM-DD` | `workbench_cases.meeting_date` | Optional; falls back to today (`paths.js:160`) | `date_completed` (long date), file stamp `yyyy.MM.dd`, advice year folder. |
| Client names | DB `clients.first_name`, `last_name`, `partner_first_name`, `partner_last_name` | New client form / Details tab | First and last name required | `who()`, `clients` (first names), `full_names`. Partner present → couple. Partner surname defaults to client 1's. |
| Initial Meeting Notes JSON | JSON | `workbench_cases.cds_json` | Optional (used if Stage 1 ran) | Whole JSON in user prompt. |
| Adviser notes | Text ≤20,000 | `workbench_cases.adviser_notes` | Optional | In prompt, "take precedence over the transcript". |
| Client status line | Text | `lookupClient()` + `sharepoint_folder` | Always added | NEW / POSSIBLY EXISTING / EXISTING CLIENT. |
| Known facts | Text ≤60,000 chars, ≤5 files, categories `fact-find`, `schedule`, `cover-summary`, `meeting-notes` | SharePoint client folder | Only if `sharepoint_folder` set **and** `WORKBENCH_READ_SHAREPOINT=true`; default off | Whole text in prompt. |
| Hand-edited JSON | JSON object | Edit box | Optional (data route) | Replaces `ff_json`; no schema check beyond "must be a JSON object". |
| Route B extra | Known facts from SharePoint copied out | Skill step 1 ("If the client already has a SharePoint folder, read it…") | Expected by the skill | DOBs, addresses, existing cover; "Check DOBs against an insurer certificate". |

### 4. Pipeline step by step

**Route A, `POST /api/workbench/cases/:id/generate/ff`** (`routes/workbench.js:394-431`)

1. Load the case. If the body has `transcript` or `meeting_date`, save them first (398-404).
2. Fail if no transcript (407).
3. Load the `clients` row. Run `lookupClient()` (errors swallowed) and build `wb.statusLine` (409-411).
4. `knownFacts()` (378-391): empty if no `sharepoint_folder`; if the flag is off, logs a step and returns empty; else reads up to 5 SharePoint files.
5. **AI call (the only one): `writeFactFind()`** (`writers.js:112-126`).
   - `requireAi()`: throws "ANTHROPIC_API_KEY is not set, so the writers cannot run." if no key.
   - Model: `env.anthropic.model` (`ANTHROPIC_MODEL`, default `claude-opus-5`).
   - `max_tokens` 32000 → streamed (`ai.js:97-100`).
   - `thinking: { type: 'adaptive' }`, `output_config: { effort: 'medium' }`.
   - No temperature (`ai.js` never forwards sampling params).
   - System prompt cached (`cache: true` → `cache_control: ephemeral`).
   - System prompt location: `writers.js:115-116` + `GENERAL` (66-70) + docstring of `generate_fact_find.py` (1-32) + `FACT_FIND_RULES` (102-109).
   - User prompt: `writers.js:117-120`.
   - `json: true`: response trimmed of a code fence or cut to the outermost `{…}` (`ai.js coerceJson`).
   - `JSON.parse`; on failure throws "Claude's fact find was not valid JSON. Try again." No retry. No shape validation.
6. Save JSON to `workbench_cases.ff_json` (427).
7. `buildDoc('ff', …)` (343-368): make case dirs; write `legacy/file-notes/<slug>-ff.json` (slug = `<first-last>-<mon><dd>` lower-case); output `legacy/soa/<case_name>/1. Advice/<Year> Advice & Service/2. Compliance docs (SOA, ROA, EO & Fact Find)/<yyyy.MM.dd> - <short_name> - Fact Find.docx`; run `python generate_fact_find.py <json> <out>` (timeout 180 s); then PDF via Word (timeout 240 s; failure = warning).
8. Advance stage to `soa_notes` if behind (429).
9. Stream `done` with data, file list, warnings. Not copied to Downloads (only meeting notes are).

**Route A, `POST /cases/:id/data/ff`** (435-446): save posted JSON to `ff_json`, run steps 7 only. No AI call, no stage change.

**Route B**: Claude (the chat model, settings outside this repo) writes `<slug>-ff.json`; `prep-soa-case.ps1` runs the builder (line 44) and Word PDF export (51-62). Skill step 4: "Check the fact find PDF pages render cleanly, then report to Tristan: the folder path and the outstanding list."

**Count of AI calls for the fact find:** Route A = 1 per generate, 0 per hand-edit rebuild. Route B = 0 API calls from code.

**Manual steps:** paste transcript; optional JSON edit; review the Word/PDF; move to SharePoint by hand; the paraplanner may correct the fact find in SharePoint (build-soa skill says to use that corrected copy). Recreated review fact finds are fully manual in chat.

### 5. Prompts and instructions verbatim

In use order for Route A. Substitutions shown as `${…}` as in source. Real client names replaced as noted at the top.

**5.1 `GENERAL`** (`writers.js:66-70`, joined string)

```
You work for ${env.firm.name}, an Australian risk insurance advice practice (life, TPD, trauma, income protection). The adviser is ${env.adviser.name}. Australian spelling and AUD throughout. Never invent a fact: anything that should be known but was not said is TBC. Reply with the JSON document only: no prose, no code fence.
```

**5.2 System prompt** (`writers.js:115-116`)

```
${GENERAL}

You fill the firm's 2026 Fact Find from an initial meeting. The document builder reads this JSON:
${schema}

${FACT_FIND_RULES}
```

`${schema}` = the `generate_fact_find.py` docstring between the triple quotes, trimmed (`writers.js:36-40`). Verbatim, names replaced:

```
Fill the Legacy 2026 fact find (XPLAN/Opex form) from a JSON file.

    python server/scripts/generate_fact_find.py <data.json> <out.docx> [--master <path>]

The master is a blanked copy of a real 2026 couple fact find, kept in
legacy/drop/initial-meeting-build/fact-find/templates/ (gitignored). Tables are
found by the Heading 1 / Heading 2 they sit under, not by index, and every
client table is rebuilt from the data: XPLAN prints only the rows that hold
something, so a row not in the data is not in the document.

JSON shape (every key optional; omitted text boxes are left empty):
  clients         ["[CLIENT_1_FIRST]", "[CLIENT_2_FIRST]"]           column headers (preferred names)
  full_names      ["[CLIENT_1_FULL]", "[CLIENT_2_FULL]"]
  date_completed  "22 October 2026"
  why, story, planning_preferences, future_changes          text
  goals           [[for, description, timeframe, amount, priority], ...]
  personal, contact, employment, health, other_cashflow, estate
                  [[label, client1, client2], ...]
  dependants      [[name, relationship, age, living at home, dependent], ...]
  income, expenses, assets, liabilities   [[description, owner, amount], ...]
                  a Total row is added from the amounts unless one is given
  super           [[plan, policy #, owner, balance, life, tpd, ip, beneficiaries], ...]
  insurance       [[description, owner, life insured, type, cover, premium], ...]
  scope           text for "Scope of advice" (defaults to `why`)
  scope_items     ["Life.", "TPD.", ...] for "Agreed scope of advice"
  incomplete_info "None"   expertise "Yes"
  not_applicable / not_disclosed   ["dependants", "super", ...] ticks the box
  changes / additional   {"dependants": "text", ...} the "Any changes" and
                  "Additional information" boxes, keyed like the tables

Text: "\n" splits paragraphs; a line starting "- " becomes a bullet.
```

Note: the real source docstring holds a real couple's first names and full names as the example; those go to the model on every call.

`${FACT_FIND_RULES}` (`writers.js:102-109`):

```
Rules, from the firm's Fact Find Process:
- "why", "story", goals and scope are written in the SECOND PERSON ("[CLIENT_1_FIRST] and [CLIENT_2_FIRST], you wish to review...").
- Health status defaults to "Good" unless a condition was disclosed.
- A fact that should be known but wasn't said is "TBC" (it gets highlighted). A whole section the meeting never touched goes in not_disclosed, or "Not disclosed" in cells.
- Dates of birth are written "5 June 1982 (44)". Addresses are STREET on one line, then SUBURB STATE POSTCODE, uppercase.
- Money is "$270,000". Income, expense, asset and liability totals are added for you; do not add Total rows.
- For a single client give one name in "clients"; the partner column is dropped.
- Per-client tables are [label, client1, client2] for a couple and [label, client1] for a single client.
```

**5.3 User prompt** (`writers.js:117-120`)

```
Client: ${who(client)}. Preferred names for the column headers: ${JSON.stringify(firstNamesOf(client))}. full_names: ${JSON.stringify(fullNamesOf(client))}. date_completed: "${longDate(wb.meeting_date)}".
```
then, only if `cds_json` exists:
```


INITIAL MEETING NOTES ALREADY WRITTEN:
${JSON.stringify(wb.cds_json)}
```
then `${extras(wb, known)}`, then:
```


TRANSCRIPT:
${wb.transcript}
```

`who(client)` (`writers.js:54-59`): `a couple: ${names[0]} (client 1) and ${names[1]} (client 2)` or `a single client: ${names[0]}`.

`extras(wb, known)` (`writers.js:61-64`), each part only if present:
```


${wb.statusLine}
```
```


ADVISER NOTES (take precedence over the transcript):
${wb.adviser_notes}
```
```


KNOWN FACTS FROM THE CLIENT'S SHAREPOINT FOLDER (older documents; use to fill DOBs, addresses and existing cover, but the meeting wins where they differ):
${known}
```

`statusLine` (`lookup.js:123-131`), one of:
```
EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.
```
```
POSSIBLY AN EXISTING CLIENT: a record with the same name exists${look.inSharePoint ? ' in SharePoint' : ''}${look.inProgram ? ' in the program' : ''}, not yet confirmed. Do not assume it; go by the transcript.
```
```
NEW CLIENT: no existing client file was found for them at ${env.firm.name}.
```

**5.4 Route B: `.claude/skills/meeting-notes/SKILL.md`** — fact find parts verbatim (lines 25-45, 66-75), names replaced. Full file is in Part SOA §5.11.

```
1. **Pull known facts first.** If the client already has a SharePoint folder, read it (copy
   files out to the scratchpad if you need to extract them): the latest fact find, insurer
   schedules and renewal letters fill DOBs, addresses and existing cover. Check DOBs against
   an insurer certificate where there is one.

2. **Write three JSON files** in `legacy/file-notes/` (gitignored), all with the same slug,
   e.g. `[client-slug]-oct22`:
   ...
   - `<slug>-ff.json`: Fact Find. The schema is in the docstring of
     `server/scripts/generate_fact_find.py`. Rules, from the firm's Fact Find Process:
     - "Why are you seeking advice", "Your story", goals and scope are written in the
       **second person** ("[CLIENT_1_FIRST] and [CLIENT_2_FIRST], you wish to review...").
     - Health status defaults to `Good` unless a condition was disclosed.
     - A fact that should be known but wasn't said is `TBC` (it gets highlighted). A whole
       section the meeting never touched gets `not_disclosed`, or `Not disclosed` in cells.
     - Dates of birth are written `5 June 1982 (44)`. Addresses are `STREET` on one line,
       then `SUBURB STATE POSTCODE`, uppercase.
     - Money is `$270,000`. Income, expense, asset and liability totals are added for you.
     - For a single client give one name in `clients`; the partner column is dropped.
...
4. **Check** the fact find PDF pages render cleanly, then report to Tristan: the folder path and
   the outstanding list. Mention anything in the transcript that contradicts the file.

## Masters

- Fact find master: `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx`,
  a blanked [MASTER_CLIENT] 2026.09.30 fact find (verified clean with `server/scripts/leakscan_docx.py`).
  If it is ever rebuilt from another client's fact find, leak-scan it for that client's names,
  address, phone, email, insurer and figures before use.
```

Route B lacks the last Route A rule ("Per-client tables are [label, client1, client2]…") and the "do not add Total rows" clause. Route A lacks Route B's step 1 (read SharePoint) and step 4 (check PDF, report outstanding list, contradictions).

**5.5 Memory rules that apply to the fact find (Claude in chat only, not in Route A prompts)**

`fact-find-mirrors-soa-wording.md` body, verbatim, names and figures replaced:

```
When the SOA and fact find are produced together, the fact find's "about the advice" boxes **reuse the SOA's wording**. Tristan's [REVIEW_CLIENT] edit, 26 Oct 2026:

- **"Why are you seeking advice"** (top box): the client's motivation only, e.g. "He would like to explore alternative options given the costs associated with the [INSURER] Income Protection policy." No product, no "top up", no "cancel".
- **"Your financial goals" table:** one broad goal per client, e.g. "Review Income protection coverage and implement a cost effective strategy moving forward in line with 70% of your income." | Short Term | [AMOUNT] per month | High. No insurer names, and no exclusion acknowledgements in the goals.
- **About our advice → Scope of advice (summary box)** = the SOA Executive summary "Why you are seeking advice" paragraphs, **word for word**: review request plus no-change confirmation, background (why [INSURER] was kept, the [INSURER_2] exclusion), and the client's motivation plus exclusion acknowledgement.
- **Agreed scope of advice** = the SOA "Scope of our advice → Included" bullets, word for word ("Review of your income protection insurance." / "Implement a new cost-effective income protection strategy.").
- Facts the client confirms in the fact find (e.g. Will in place = Yes) must also flow into the SOA personal details table.

**Why:** the fact find is the client's record of what they asked for. The SOA's advice has to answer it, so the two documents must say the same thing and the fact find must not pre-empt the recommendation.

**How to apply:** write the SOA's exec summary and scope first, then copy them into the fact find boxes. Related: [[soa-exec-summary-goals-not-recommendation]], [[soa-ask-ina-every-time]].
```

`soa-exec-summary-goals-not-recommendation.md`, the fact find sentence verbatim (insurer and product names replaced):

```
**Same rule for "Scope of advice"** (SOA Included box and the Fact Find "Agreed scope of advice", Tristan 26 Oct 2026): list the advice areas, not the outcome. Right: "Review of your income protection insurance." + "Implement a new cost-effective income protection strategy." Wrong: "Implementation of new [INSURER_2] [PRODUCT] cover of [AMOUNT] per month" / "Cancellation of your [INSURER] policy".
```

Full text of that memory is in Part SOA §5.13.

`legacy-soa-from-case-folder.md` (seventh case), fact find content only, paraphrased short: the recreated review fact find "was cloned from the signed May one (same details, new goals and story, 'Any changes' = no change)"; builder was a per-case `build_<surname>_ff.py`; "the SOA, fact find, FSG and adviser profile carry Tristan Biro".

### 6. Output structure

From code only (the master was not opened). Sections are matched by exact Heading 1 / Heading 2 text (`generate_fact_find.py:48-71`). Block kinds are decided by the first cell of each table (`_kind`, 147-154): contains `✍` → text box; contains "Not applicable" → checkbox row; else data table.

| Part of the document | Data key | Fill rule | Always / conditional |
|---|---|---|---|
| Cover table (`doc.tables[1]`): "Client Name(s)" | `full_names` (falls back to `clients`) joined " & " | 279-283 | Always written (empty if no names). |
| Cover table: "Date Completed" | `date_completed` | 284-285 | Always written (empty if missing). |
| H1 "Why are you seeking advice" text box | `why` | 310 | Always written; empty if missing. |
| H1 "Your financial goals" table | `goals` rows `[for, description, timeframe, amount, priority]` | 314 | Rebuilt; one blank row if empty. |
| H1 "Your planning preferences" | `planning_preferences` | 310 | As text box (if master has one). |
| H1 "Future changes" | `future_changes` | 310 | As text box. |
| H1 "Your story" | `story` | 310 | As text box. |
| H1 "Your personal information" | `personal` `[label, c1, c2]` | 312-314 | Per-client; header cols renamed to `clients` (default "Client", "Partner"). |
| H1 "Your contact details" | `contact` | same | Per-client. |
| H1 "Your dependants" | `dependants` `[name, relationship, age, living at home, dependent]` | 314 | Rebuilt. |
| H1 "Your employment" | `employment` | 312-314 | Per-client. |
| H1 "Your health" | `health` | 312-314 | Per-client. |
| H1 "Your cashflow" / H2 "Your income" | `income` `[description, owner, amount]` + Total | 314 | Total added if all amounts parse. |
| H1 "Your cashflow" / H2 "Your expenses" | `expenses` + Total | 314 | Same. |
| H1 "Your cashflow" / H2 "Other cashflow details" | `other_cashflow` | 312-314 | Per-client. |
| H1 "Your cashflow" with no/other H2 | key `cashflow` (no such data key in schema) | 289, 314 | Any table here is rebuilt to one blank row; text box left empty. |
| H1 "Your assets" | `assets` + Total | 314 | Same as income. |
| H1 "Your liabilities" | `liabilities` + Total | 314 | Same. |
| H1 "Your retirement products" | `super` `[plan, policy #, owner, balance, life, tpd, ip, beneficiaries]` | 314 | No total. |
| H1 "Your personal insurance" | `insurance` `[description, owner, life insured, type, cover, premium]` | 314 | No total. |
| H1 "Your estate planning" | `estate` | 312-314 | Per-client. |
| Any section: checkbox row "Not applicable / Not disclosed" | `not_applicable`, `not_disclosed` lists of section keys | 302-303, 208-213 | Always reset: ☑ if key listed, else ☐. |
| Any section: H2 "Any changes" text box | `changes[key]` | 305-306 | Empty if not given. |
| Any section: H2 "Additional information" text box | `additional[key]` | 307-308 | Empty if not given. |
| H1 "About our advice" / H2 "Scope of advice" | `scope`, else `why` | 293 | Always. |
| "About our advice" / "Agreed scope of advice" | `scope_items` → fixed lead-in + bullets | 294, 329-334 | Empty if no items. |
| "About our advice" / "Incomplete or inaccurate information" | `incomplete_info` default "None" | 295 | Always. |
| "About our advice" / "Adviser expertise" | `expertise` default "Yes" | 296 | Always. |
| "About our advice" / "Advice limitations" | — | 73, 291 | Left as master wording (`KEEP_TEXT`). |
| "About our advice" / any other text box | — | 297 | Blanked to "". |
| Signatory tables (first cell "Signatory", ≥3 rows) | `full_names` into unique cells 1 and 4 of row 3 | 336-350 | Skipped if row 3 cell 1 contains "Joshua Davidson" (the adviser table). |
| Single client (`len(clients) == 1`) | — | 318-325 | Drops last column of every per-client table; drops 3 columns of a 6-column signatory table. |
| Opex debug block | — | 352-356 | Any text node containing "Sample client:" is cut to "Sample client:". |
| Headings, other text, sections not in `SECTIONS` | — | — | Left as in master. |

Where decided: section-to-key mapping is code. Which rows exist and all wording is the model (Route A) or Claude in chat (Route B). There is no code that removes whole sections; sections are always present, with empty tables and unticked boxes when unused.

### 7. Fixed wording inserted

| Text | Trigger | Location |
|---|---|---|
| `As a result of the agreed subject matter of advice, we have identified the scope of advice to be:` then bullet `Review of your personal risk insurance needs: ` then one bullet per `scope_items` entry | `scope_items` non-empty | `generate_fact_find.py:329-334` → "Agreed scope of advice" box |
| `None` | `incomplete_info` missing | 295 → "Incomplete or inaccurate information" |
| `Yes` | `expertise` missing | 296 → "Adviser expertise" |
| `Total` + `$N` (sum) | income/expenses/assets/liabilities, no Total row given, all amounts parse | 232-235 |
| `Total` (blank amount) | table empty and master's last row is Total | 231 |
| `Client`, `Partner` | per-client table header when `clients` empty | 257 |
| `☑` / `☐` | checkbox rows | 210 |
| `Sample client:` | Opex debug text | 356 |
| Master's "Advice limitations" wording | always kept | 73 (wording itself NOT FOUND; it is in the master, not opened) |
| Yellow highlight on every whole-word `TBC` | any cell text | 186-199 |

### 8. Decision logic table

| Condition as tested | Effect | File:line | Code / model |
|---|---|---|---|
| `!wb.transcript` | Error "Paste the meeting transcript first" | `workbench.js:407` | Code |
| `!aiEnabled()` | Error, no build | `writers.js:50-52` | Code |
| `wb.sharepoint_folder` set | statusLine = EXISTING CLIENT | `lookup.js:124-126` | Code |
| lookup finds same name in SharePoint or program | statusLine = POSSIBLY EXISTING | `lookup.js:127-129` | Code |
| `wb.sharepoint_folder && READ_SHAREPOINT` | Known facts read and added to prompt | `workbench.js:378-391` | Code |
| `wb.cds_json` present | Meeting notes JSON added to prompt | `writers.js:118` | Code |
| `partner_first_name` or `partner_last_name` non-empty | Couple | `paths.js:126-131` | Code |
| Statement is "known but not said" | `TBC` | Prompt rule | Model |
| Section never touched | `not_disclosed` or "Not disclosed" | Prompt rule | Model |
| Health not disclosed | "Good" | Prompt rule | Model |
| Existing client and transcript supports it | Reasons written as a review | statusLine text | Model |
| First cell has `✍` / "Not applicable" | text box / checkbox | `generate_fact_find.py:147-154` | Code |
| `h2 in SUBSECTIONS` else `h1 in SECTIONS` | data key | 289 | Code |
| `h1 == 'About our advice'` and text box not "Advice limitations" | Fill from scope / defaults; others blank | 290-299 | Code |
| `key in PER_CLIENT` | rename header columns | 312-313 | Code |
| `key in LIST_WITH_TOTAL` and no row[0]=="Total" and every `money(r[-1])` parses | add Total row | 232-235 | Code |
| Any amount fails to parse | no Total row, silently | 234 | Code |
| rows empty | one blank row (+ blank Total row) | 228-231 | Code |
| table has only a header row | nothing written | 219-220 | Code |
| `len(clients) == 1` | drop partner column; drop 3 signatory cols if 6 wide | 318-325 | Code |
| signatory row 3 cell 1 contains "Joshua Davidson" | adviser signatory left untouched | 340-341 | Code |
| line starts "- " | bullet (format from "Advice limitations" box) | 174-185 | Code |
| prototype paragraph was a bullet, line is not | use plain format | 180-181 | Code |
| `--master` passed | use that master | 368-372 | Code |
| `data` exists and Generate clicked | confirm, then replace | `DocStep.jsx:24` | Code |
| Stage behind `soa_notes` | advance to `soa_notes` | `workbench.js:429`, `86-90` | Code |

**Gaps with no written rule**

- Whether a meeting is initial or review: README says one document for both; no code branch; statusLine nudges "review of an existing client". No rule for what "Any changes" boxes say on a review (memory: "no change" was used in one recreated case).
- When to use `not_applicable` vs `not_disclosed`: no rule beyond "a whole section the meeting never touched goes in not_disclosed".
- Age in DOB "(44)": age as at which date is not stated (meeting date? build date?).
- Goal `timeframe` values, `priority` values, `amount` format (per month / per annum): no rule in Route A. Memory example shows "Short Term" / "High" / "per month".
- Income/expense frequency: no rule (annual vs monthly) and totals sum whatever is given.
- What goes in `planning_preferences`, `future_changes`, `employment`, `health`, `estate`, `personal`, `contact` label rows: no list of labels. The model picks labels.
- Super / insurance columns when unknown (policy #, beneficiaries): only the general TBC rule.
- Route A has no rule that goals and scope must not name the recommended product (memory rule exists for chat only).
- Route A has no rule that Scope / Agreed scope must match the SOA word for word (the SOA does not exist yet at Stage 2).
- Recreated / review fact find from a prior signed fact find: no written procedure outside one memory entry.
- Adviser on the fact find: no code sets the adviser name or signatory (see §13).

### 9. Figures and calculations

| Item | How | Where | Issue |
|---|---|---|---|
| Totals (income, expenses, assets, liabilities) | Sum of last column parsed by `money()` | `generate_fact_find.py:81-83, 232-235` | `money()` only accepts digits, commas, optional `$` and decimals. Any "p.a.", "/m", "per month", "TBC", "Not disclosed", negative or `-` makes the whole Total silently disappear. |
| Total format | `f'${x:,.0f}'` | 86-87 | Rounds to whole dollars; cents lost. |
| Frequency mixing | none | 233-235 | Annual and monthly amounts in one table are added together. No check. |
| Owner split | none | — | Single Total for all owners; no per-client subtotal. |
| Liabilities sign | none | — | Totalled as positive. |
| Model-supplied Total row | kept as is if row[0] == "Total" | 232 | Not checked against the rows. Route B skill does not say "do not add Total rows". |
| Ages | Written by the model inside DOB strings | Prompt rule | No code computes or checks ages. |
| `date_completed` | `toLocaleDateString('en-AU', {day:'numeric', month:'long', year:'numeric'})` of meeting date, else today | `paths.js:175` | Today is used silently if no meeting date. |
| File stamp | `yyyy.MM.dd` of meeting date (Route A, `paths.js:169-172`); of `$Date` default today (Route B, `prep-soa-case.ps1:21, 34`) | — | Routes differ: meeting date vs run date. |
| Advice year folder | Meeting date year (Route A, `paths.js:182`); `$Date.Year` (Route B, `prep-soa-case.ps1:28`) | — | Same difference. |
| Money in cells | Model writes "$270,000" | Prompt rule | Not checked by code. |
| Goal amounts | Model | — | No total, no check. |

### 10. Where facts come from

- **Transcript**: main source for every field.
- **Initial Meeting Notes JSON** (`cds_json`): included when Stage 1 ran. No rule on which wins if they differ.
- **Adviser notes**: "take precedence over the transcript".
- **SharePoint known facts**: off by default in Route A; Route B skill tells Claude to read them. When on, "the meeting wins where they differ".
- **DB `clients` row**: names only (column headers, full names, cover table, signatories).
- **Meeting date**: date completed.
- **Code**: totals, ticks, fixed scope lead-in, defaults "None" / "Yes", master's standard wording.
- **Model defaults with no source**: Health "Good" when nothing was disclosed; "None" for incomplete info and "Yes" for expertise are code defaults applied without any input.
- **Unsupported statements possible**: "Good" health is asserted without disclosure. "Yes" adviser expertise and "None" incomplete information are always asserted unless the model sets them. The fixed bullet "Review of your personal risk insurance needs" is always added before scope items, whatever was agreed. The model can write any label/value; there is no check against the transcript. No provenance (source per field) is stored.

### 11. Template and rendering

- **Master**: `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx` (default, `generate_fact_find.py:45, 372`). One master for couple and single; single loses the partner column at build time. `--master <path>` overrides (Route A never passes it).
- **Origin**: a real 2026 couple fact find (XPLAN/Opex merge) blanked by hand/script, leak-scanned with `leakscan_docx.py` (skill). The blanking script is NOT FOUND in the repo (searched `server/scripts/`, `.claude/`). The master is gitignored and so not versioned.
- **Finding tables**: walks body children in order, tracks the last Heading 1 and Heading 2 paragraph text, tags each top-level table (`_index`, 130-145). Only top-level tables are indexed; nested tables are not. The cover table is found by index `doc.tables[1]` (279), not by heading.
- **Rebuilding rows**: keeps row 0 as header; uses first body row as the formatting prototype and the last row as the Total prototype if its first cell is "Total"; deletes all body rows; deep-copies a prototype per data row; writes cells (215-253). Merged cells are de-duplicated by `_tc` identity.
- **Cell writing**: removes all paragraphs; adds one paragraph per `\n` line; reuses the first paragraph's pPr and first run's rPr (163-203). Bullet pPr is taken from the first numbered paragraph in the "Advice limitations" box; plain pPr from its first non-numbered paragraph (268-276).
- **Placeholders**: none. The master has no `{{…}}` tokens; filling is structural.
- **Unfilled behaviour**: text boxes become empty; tables keep one blank row (and a blank Total row); checkboxes reset to ☐; header columns default to "Client"/"Partner"; cover cells empty.
- **Column drop** (`drop_last_cols`, 90-119): removes grid columns and cells, gives freed width to the previous column (grid and `tcW` of the last remaining cell if `dxa`).
- **PDF**: Word COM, read-only open, `ExportAsFixedFormat(…, 17)`. Failure is a warning only.
- **Rendering problems known or visible in code**:
  - If the master's "Advice limitations" box has no numbered paragraph, `- ` lines lose the dash and render as plain paragraphs, no warning.
  - `set_cell` uses only the first run's format; mixed formatting in a master cell is lost.
  - Text boxes always write the **last** cell of row 0 (`set_text_box`, 205-206).
  - Highlight insertion respects rPr schema order (`RPR_AFTER_HIGHLIGHT`, 76-77), a fix for an earlier ordering issue (no history found).
  - Opex scrub only fixes a text node containing "Sample client:"; a name in a separate run would remain.
  - Skill step 4 asks Claude to check the PDF pages "render cleanly" (Route B). Route A does no render check.

### 12. Versioning and history

- `server/scripts/generate_fact_find.py`, `leakscan_docx.py`, `prep-soa-case.ps1`, `server/src/services/workbench/`, `server/src/routes/workbench.js`, `client/src/pages/wb/`, `.claude/skills/` are all **untracked** (`??` in `git status`). No commits exist for any of them.
- `legacy/drop/initial-meeting-build/README.md` is tracked and modified: the uncommitted diff changes the `fact-find/templates/` row from "The **blank** fact find form. | **Incoming — use this**" to the current "blanked [MASTER_CLIENT] 2026.09.30 fact find … **In use (2026-10-22)**".
- `server/src/db/schema.sql` modified (uncommitted), adds `workbench_cases` incl. `ff_json`.
- The master `.docx` and all generated outputs (`legacy/file-notes/*`, `legacy/soa/*`, `legacy/fact-finds/*`) are gitignored (`.gitignore:44, 64-68`).
- Last commit on the branch: `f9e6f41 Weekly checkpoint - Monday 28 September 2026`. Weekly checkpoint and OneDrive mirror scripts exist under `automation/backup/` (they mention fact finds; not read in detail).
- No version number on the prompt, schema, rules or master. No record of which master/prompt built a given fact find.

### 13. Known problems and workarounds

1. **Adviser on the fact find.** Code skips the signatory table whose row 3 names "Joshua Davidson" (340-341), which implies the master's adviser signatory names Joshua Davidson. Memory (26 Oct) says the fact find carries Tristan Biro. No code changes the adviser signatory. NOT FOUND: any code replacing the adviser name in the fact find. In the recreated review case this was done in the per-case script.
2. **SharePoint read is off in Route A but on in Route B.** `WORKBENCH_READ_SHAREPOINT` defaults off (Tristan, 26 Oct). The CaseView blurb still says "Known facts are pulled from the SharePoint folder when one is linked." The skill still says "Pull known facts first."
3. **Agreed scope fixed bullet** "Review of your personal risk insurance needs: " (trailing colon and space) is always prefixed. This conflicts with the memory rule that Agreed scope = SOA Included bullets word for word.
4. **Route A prompt does not carry the 26 Oct memory rules** (no product in goals/why/scope; mirror SOA wording). Only Claude in chat sees them.
5. **Totals silently dropped** when any amount has text; frequencies are mixed; cents lost (§9).
6. **Route A and Route B dates differ** (meeting date vs run date) for the file stamp and year folder.
7. **No JSON validation.** A wrong shape (e.g. per-client table with 2 columns for a couple, a string instead of a list) is written as-is or fails in Python with a 6-line stderr tail shown to the user.
8. **Real client names in the docstring and rules** are sent to the model on every call (example names) and shown in the skill.
9. **Recreated / review fact finds have no generic tool.** They were built per case by cloning the signed prior fact find (memory). README decision says "do not build a review variant", but the recreated case was a different method.
10. **Paraplanner corrections** to the fact find in SharePoint are not fed back to `ff_json`; the SOA Notes writer and SOA draft use `ff_json` (`writers.js:143, 157`), while the build-soa skill says to use the corrected SharePoint copy.
11. **Word PDF export can hang** (comments in `run.js:57-60`, `prep-soa-case.ps1:49-50`). Workaround: PDF failure is a warning; the .docx is the deliverable.
12. **Data file overwrite.** `legacy/file-notes/<slug>-ff.json` and the output .docx are overwritten on every regenerate/rebuild with the same meeting date; no history kept.
13. **Hand edits in Word are lost** if Generate or Save & rebuild runs again (the .docx is rebuilt from JSON).
14. **Leak scan is manual** and only for the master; outputs are never scanned, and nothing checks that a previous client's data is absent from a new fact find.
15. **DB write-back not built** (README/brief plan), so the client tables are not populated from the fact find.

### 14. Dependencies

- Python on PATH as `python`, with `python-docx` (`import docx`). NOT FOUND: a requirements file pinning it (looked for `requirements*.txt` in repo root and `server/`).
- Node server: `@anthropic-ai/sdk` (`ai.js`), Express, Postgres (`workbench_cases`, `clients`).
- Anthropic API key `ANTHROPIC_API_KEY`; model `ANTHROPIC_MODEL` (value not printed).
- Microsoft Word (COM) on Windows for PDFs; PowerShell.
- The master `.docx` on local disk (not in git).
- SharePoint library synced by OneDrive (only if known-facts read is on, or in Route B).
- Explorer for "reveal" (viewing only).

### 15. Questions for Tristan

1. The master's adviser signatory appears to name Joshua Davidson. Should every new fact find carry Tristan Biro as adviser, and should the builder replace it?
2. Should the "Agreed scope of advice" box keep the fixed first bullet "Review of your personal risk insurance needs:", or list only the agreed items (matching the SOA Included bullets)?
3. At Stage 2 there is no SOA yet. Should the Workbench fact find later be rewritten so "Why", "Scope of advice" and "Agreed scope" match the SOA word for word, and at what point?
4. Should the "no product, no top up, no cancel" rule for goals/why/scope be added to the in-app fact find prompt?
5. For a review client, should the fact find be built from the transcript (current app) or cloned from their last signed fact find with "Any changes" filled (as in the recreated case)? Who decides which?
6. Should SharePoint known facts be read for the fact find (Route B does, Route A does not)? If yes, which documents and how many?
7. Ages in "5 June 1982 (44)": age as at the meeting date or the date the fact find is completed?
8. Income and expenses: annual or monthly in the tables? Should totals be per frequency or per client?
9. Should "Adviser expertise" default to "Yes" and "Incomplete or inaccurate information" to "None" when nothing was said?
10. Health "Good" by default: is that acceptable when health was not discussed, or should it be "Not disclosed"/TBC?
11. When the paraplanner corrects the fact find in SharePoint, should the app's copy be updated, and which copy is the record?
12. Should the fact find write into the client tables (family members, income, expenses, assets, liabilities, insurance) as the README planned, or stay document-only?
13. Is there an approved list of labels for the per-client tables (personal, contact, employment, health, estate, other cashflow), or does the master's original row set define it?
14. For the file name stamp: meeting date (app) or build date (skill)?
15. Should the example client names in the schema and rules be replaced with fictional ones before this becomes a shared team skill?
16. Should each built fact find be leak-scanned for other clients' names before it is filed?

---

## Part 3. Statement of Advice (SOA), including SOA Notes

Description of the Legacy Risk Advice Statement of Advice (SOA) system as it stands on 27 October 2026. It is meant as the basis for a shared, versioned Claude skill. It describes the system and does not review it.

### How to read this

The repo has two separate SOA routes. They share some inputs, but they are different systems.

- **Route A: the in-app Workbench.** An Express + React app (`server/`, `client/`) that calls the Anthropic API from code. The Workbench runs five stages: Initial Meeting Notes, Fact Find, SOA Notes, a draft SOA, and the SOA pack. The SOA is written as Markdown and converted to Word. The app's own SOA screen calls this a first draft and says the house final SOA uses Route B.
- **Route B: the Claude Code skills.** Three project skills in `.claude/skills/` (`meeting-notes`, `build-soa`, `build-pack`) run inside a Claude Code session in VS Code. `build-soa` refers to Claude's memory files for the SOA method. Claude copies the client folder out of SharePoint and picks a completed firm SOA (.docx) by the same adviser. It rewrites that SOA in place with a per-client Python script, then finishes it in Word.

When this spec says "Route A" or "Route B", the statement applies to that route only.

Placeholders used in this file: `[CLIENT_1]`, `[CLIENT_2]` and so on for clients; `[AMOUNT]` for client figures; `[POLICY_NO]` for policy numbers; `[INSURER_A]` for insurers in examples I wrote myself. Where I replaced client details inside verbatim text, I say so.

---

### 0. Skipped under the client data rule

I did not open, read or summarise any of the following.

| Folder / file | Why skipped |
|---|---|
| `legacy/drop/soa-build/cases/*/` (11 client folders) | Real client case folders. These include the `.build/` subfolders, which hold the **per-client SOA build scripts** for Route B (for example `build_<client>_soa.py`, `finalise.ps1`, `build-pack.ps1`, `docxfill.mjs`, `leakscan.py`). The real Route B clone-and-rewrite code lives here. I listed file names only. |
| `legacy/drop/soa-build/examples/` (32 .docx) | Completed SOAs for real clients. Route B clones from these. |
| `legacy/drop/soa-build/.extracted/` | Text extracted from the 32 example SOAs. |
| `legacy/drop/soa-build/.logo-harvest/` | Working files taken from client folders. |
| `legacy/drop/initial-meeting-build/*/examples/`, `*/templates/`, `source-transcripts/` | Edited client documents. The fact find master is a blanked real client fact find (its README says so). |
| `legacy/soa/` | Generated client case folders and SOAs. |
| `legacy/file-notes/` | Client meeting notes and JSON data. **This includes `[couple-example]-sep14-cds.json` and `[single-example]-oct09-cds.json`, which Route A puts into the Stage 1 prompt as few-shot examples.** I did not read them. |
| `legacy/fact-finds/`, `legacy/follow-ups/`, `legacy/client-profiles/`, `legacy/risk-reports/` | Client documents. |
| `legacy/advisers/*/` (PDFs) | Adviser FSGs. They are not client data, but I didn't need their contents, so I listed file names only. |
| `server/scripts/build-[client-A]-soa.mjs`, `build-[client-A]-soa-v2.mjs`, `build-[client-B]-soa.mjs`, `build-[client-C]-soa.mjs`, `build-[client-D]-soa.mjs`, `export-[client-E]-*.mjs`, `export-[client-F]-docx.mjs` | Named after clients, so treated as client data. Whether they belong to the current SOA system: NOT FOUND. |
| `archive/outlook-and-email/` | Archived email code. Off limits under the standing Outlook/email rule. |
| Claude memory file `[client]-group-cover-review.md` | About one client. |
| The SharePoint library (`C:\Users\TristanBiro\Legacy Risk Advice\Legacy - Documents`) | Outside the repo. Client records. Not touched. |
| Database contents (`workbench_cases`, `training_data`, `clients`) | Would contain client data. Not queried. |

The memory and skill files mention clients by name. I read them because they are instruction files. Every client detail quoted from them below is replaced with a placeholder.

---

### 1. Inventory

#### Code

| Path | What it is | Read / written by |
|---|---|---|
| `server/src/services/ai.js` | Anthropic API wrapper: `complete()`, `completeOrStub()`. Sets the model, max tokens, adaptive thinking and effort. | Called by `riskSoaGenerator.js` and `workbench/writers.js`. |
| `server/src/services/riskSoaGenerator.js` | Route A SOA generator. Holds `RISK_GUARDRAILS` and the section system prompt. Makes one AI call per section. | Called by `routes/workbench.js` (`POST /cases/:id/soa`) and `routes/plans.js` (`POST /plans/generate-risk-soa`). |
| `server/src/services/legacySoaStructure.js` | `LEGACY_SECTIONS`: 12 section titles, each with a brief and the house wording keys it gets. Loads the house wording JSON. | Read by `riskSoaGenerator.js`. |
| `server/src/services/planGenerator.js` | `gatherClientContext()` (DB → client context), `contextToText()` (context → prompt text), `stripCodeFence()`. | Used by the SOA generator and the workbench route. |
| `server/src/services/planRender.js` | Markdown → inline-styled HTML (`marked`). | Workbench SOA route, before `html-to-docx`. |
| `server/src/services/documentExtractor.js` | Text extraction: PDF (`pdf-parse`), DOCX (`mammoth`), XLSX (`xlsx`), CSV/TXT. | `workbench/sources.js`. |
| `server/src/services/library/indexer.js` | `categoryOf()` sorts a file into a category by its path and name. Also `adviceYearOf()`. | `workbench/sources.js`, `pack.js`. |
| `server/src/services/library/fsGuard.js` | Read-only file access to the SharePoint and repo roots. Not read in detail. | `sources.js`, `pack.js`, `lookup.js`. |
| `server/src/routes/workbench.js` | Workbench API: cases, files, stage generators, SOA draft, pack. Streams NDJSON. | Client pages `client/src/pages/wb/*`. |
| `server/src/routes/plans.js` | Older endpoint `POST /api/plans/generate-risk-soa`. Saves the result to `financial_plans`. | Older (archived) screens. |
| `server/src/services/workbench/writers.js` | Stage 1–3 prompts (Meeting Notes, Fact Find, SOA Notes). `soaInstructions()` assembles the Stage 4 adviser notes. | `routes/workbench.js`. |
| `server/src/services/workbench/sources.js` | Lists SharePoint and repo case files. `sharepointText()` pulls text from chosen categories. | `routes/workbench.js`. |
| `server/src/services/workbench/paths.js` | Case, file and folder naming. `assertWritable()` blocks writes outside `legacy/` and Downloads, and inside SharePoint. | All workbench code. |
| `server/src/services/workbench/run.js` | Runs the builder scripts as child processes. Exports PDFs. | `routes/workbench.js`. |
| `server/src/services/workbench/lookup.js` | Existing-client check by name (DB rows and SharePoint folder names only). Builds the status line. | `routes/workbench.js`. |
| `server/src/services/workbench/pack.js` | SOA pack builder: slot detection, ordering, naming, SHA-256 copy check, READ ME. | `routes/workbench.js`. |
| `client/src/pages/wb/*.jsx` | Workbench UI (`Workbench.jsx`, `CaseView.jsx`, `DocStep.jsx`, `SoaDraft.jsx`, `PackTab.jsx`, `NewClientModal.jsx`, `ClientCheck.jsx`). | Browser. |
| `server/src/db/schema.sql` (lines 735–764) | Table `workbench_cases`: transcript, adviser_notes, cds_json, ff_json, soa_notes_json, soa_markdown, pack_dir, stage, client_kind. | Workbench route. |
| `server/scripts/generate-client-details-summary.mjs` | Builds the Initial Meeting Notes .docx from JSON. Not read in detail. | `run.js`, `prep-soa-case.ps1`. |
| `server/scripts/generate_fact_find.py` | Fills the fact find master from JSON with python-docx. Adds totals, highlights TBC, and drops the partner column for a single client. Its docstring is inserted into the Stage 2 prompt. | `run.js`, `prep-soa-case.ps1`. |
| `server/scripts/build_soa_notes.py` | Builds the SOA Notes .docx from JSON. Its docstring is inserted into the Stage 3 prompt. | `run.js`, `prep-soa-case.ps1`. |
| `server/scripts/prep-soa-case.ps1` | Route B runner for Stages 1–3: builds three .docx files and their PDFs. | Claude, via the `meeting-notes` skill. |
| `server/scripts/docx-to-pdf.ps1` | Exports .docx to PDF with Word COM, opening each file read-only. | `run.js`, `pack.js`. |
| `server/scripts/leakscan_docx.py` | Scans a .docx's XML for given words (client-data leak check). | Claude (Route B), when building masters. |
| `server/scripts/analyse-soa-examples.mjs` | One-off: reads the 32 examples and finds the contents-page structure and repeated paragraphs. Writes to `.extracted/`. | Run by hand, earlier. |
| `server/scripts/build-house-wording.mjs` | One-off: turns `.extracted/_boilerplate.json` into `legacy-house-wording.json`. | Run by hand, earlier. |
| `legacy/packs/fix_cancellation_letter.py` | Dates a cancellation letter and swaps in the "please cancel" line. | Claude (`build-pack` skill). |
| `legacy/packs/readme_to_docx.py` | Not read. The name suggests it converts the pack READ ME. | NOT FOUND. |
| `legacy/docusign/docusign.mjs` | Creates a **draft** DocuSign envelope from a pack manifest. Does not send. Not read in detail. | Run by hand. |

#### Prompts and instructions

| Path | What it is | Read by |
|---|---|---|
| `riskSoaGenerator.js`: `RISK_GUARDRAILS`, `SECTION_SYSTEM_PROMPT`, `writeSection()` | Route A SOA system prompt and per-section user prompt. | Anthropic API. |
| `legacySoaStructure.js`: `LEGACY_SECTIONS[].brief` | Per-section instructions. | Same. |
| `workbench/writers.js`: `GENERAL`, `FACT_FIND_RULES`, `SOA_NOTES_RULES` and the three writer prompts | Route A Stage 1–3 prompts. | Anthropic API. |
| `legacy/drop/initial-meeting-build/README.md` | House rules for Initial Meeting Notes. Inserted **whole** into the Stage 1 system prompt. | Anthropic API (Route A); Claude (Route B). |
| Docstrings of `generate_fact_find.py` and `build_soa_notes.py` | JSON schemas. Inserted into the Stage 2 and 3 system prompts. | Anthropic API. |
| `.claude/skills/meeting-notes/SKILL.md` | Route B Stages 1–3. | Claude Code. |
| `.claude/skills/build-soa/SKILL.md` | Route B Stage 4. | Claude Code. |
| `.claude/skills/build-pack/SKILL.md` | Route B Stage 5. | Claude Code. |
| `C:\Users\TristanBiro\.claude\projects\c--FPGod-Program\memory\*.md` | Claude's persistent memory. `build-soa` points to `legacy-soa-from-case-folder` for "the method and house conventions". The SOA wording rules are spread across several memory files (listed in §5). Outside the repo. | Claude Code (loaded into context each session). |
| `legacy/drop/soa-build/README.md`, `cases/README.md`, `templates/insurer-logos/README.md`, `legacy/advisers/README.md` | Folder instructions. | People and Claude. |

#### Templates

| Path | What it is | Read by |
|---|---|---|
| `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx` | Fact find master (a blanked real fact find). Skipped. | `generate_fact_find.py`. |
| `legacy/drop/initial-meeting-build/client-details-summary/templates/` | Meeting notes template. Skipped. | `generate-client-details-summary.mjs`. |
| `legacy/drop/soa-build/templates/` | **Empty** apart from `.gitkeep` and `insurer-logos/`. There is no blank SOA template. | — |
| `legacy/drop/soa-build/templates/insurer-logos/xplan/*.png`, `hires/*.png` | Insurer and super fund logos for the SOA portfolio table. | Claude (Route B). |
| `legacy/drop/soa-build/examples/*.docx` | 32 completed SOAs. Route B clones one per case. Skipped. | Claude (Route B); `analyse-soa-examples.mjs`. |
| `training_data` row with `kind='plan'`, `metadata.doc_type='risk_soa'`, `is_template='true'` | Optional imported SOA master for Route A. Whether one exists: NOT FOUND (DB not queried). Memory (`legacy-risk-advice-templates-pending`) says no blank template has been supplied. | `loadRiskTemplate()`. |

#### Reference material

| Path | What it is | Read by |
|---|---|---|
| `server/src/data/legacy-house-wording.json` | 78 house wording blocks under 15 keys, taken from the 32 SOAs. | `legacySoaStructure.js`. |
| `server/src/data/legacy-practice.json` | Team, client tiers, referral partners and their fees, insurer list, XPLAN threads. | CRM. **Not read by any SOA code** (checked: no import in `riskSoaGenerator.js` or `writers.js`). |
| `legacy/advisers/tristan-biro/*.pdf`, `legacy/advisers/josh-davidson/*.pdf` | FSG Part 1 v9.1, the adviser's Part Two, and a combined FSG. | `build-pack` skill. `pack.js` takes its FSG candidates from the SharePoint `Compliance` folder instead. |
| PDS files | Not stored in the repo. The `build-pack` skill takes them from recent client folders or insurer websites. `pack.js` offers PDFs it finds in Downloads. | Route B; `pack.js`. |

#### Configuration

| Path | What it is |
|---|---|
| `server/src/config/env.js` | Firm identity (name, legal name, AR 1296611, ABN, address), licensee (Synchron Advice Pty Ltd, AFSL 243313, ABN), adviser (name defaults to `Tristan Biro`; AR, email and phone default to blank), Anthropic model (default `claude-opus-5`), library roots. |
| `server/.env` | Contains `FIRM_NAME=Legacy Risk Advice`, `ANTHROPIC_MODEL=claude-opus-5` and an `ANTHROPIC_API_KEY` line (value not read). **There is no `ADVISER_AR` line.** |
| `WORKBENCH_READ_SHAREPOINT` env var | Off by default (`routes/workbench.js:26`). |
| `C:\Users\TristanBiro\.docusign\config.json` | DocuSign credentials (according to the README). Not read. |
| `.gitignore` | Keeps client documents out of git: `legacy/soa/*`, `legacy/file-notes/*`, `legacy/advisers/**`, `cases/*`, and the drop folders' .docx/.pdf/.md/.txt files. |

---

### 2. Entry point and trigger

#### Route A (Workbench)

These steps come from the route and UI code. How Tristan actually uses them day to day: NOT FOUND.

1. **Browser, the app's home page (`/`).** Click New client. Enter first and last name (required), partner names, meeting date, transcript and adviser notes (`POST /api/workbench/cases`). The app looks for a match in its own client list and in the SharePoint folder names.
2. **Browser, case page (`/case/:id`), step 1.** Paste the transcript if it isn't there yet, then click generate. This makes one AI call and builds `<First Last> <MONDD> - Initial Meeting Notes.docx` and its PDF. Both are copied to Downloads.
3. **Step 2, Fact Find.** Click generate. One AI call. Builds `<yyyy.MM.dd> - <Short> - Fact Find.docx` and its PDF.
4. **Step 3, SOA Notes.** Click "✨ Generate SOA Notes brief". One AI call. Builds `<yyyy.MM.dd> - <Short> - SOA Notes.docx` and its PDF. At any of steps 2–4, Tristan can edit the saved JSON and rebuild the document (`POST /cases/:id/data/:kind`). The UI for this is in `DocStep.jsx`, which I did not read.
5. **Manual, outside the system.** The paraplanner (Howard) gathers quotes, Risk Researcher runs, the Risk Checklist, the cover summary and other documents, and files them in the SharePoint client folder. Tristan or Howard moves the generated case folder from `legacy/soa/` into SharePoint by hand (the skill and `paths.js` comments both say so).
6. **Browser, Details tab.** Link the SharePoint folder name. Without it, the SOA draft uses only the SOA Notes and fact find (`SoaDraft.jsx:38-41`).
7. **Step 4, SOA.** Optionally type into the textarea ("Anything else for this SOA: recommended insurer, structure, what to replace, referral fee to disclose…"). Click "✨ Draft the SOA". This makes twelve AI calls. Output: `<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` and its PDF, in the case's compliance folder.
8. **Step 5, Pack.** Review the suggested files, then build. The pack goes to Downloads.

#### Route B (Claude Code skills)

1. **VS Code, Claude Code chat.** Tristan pastes a meeting transcript, or asks for "initial meeting notes", "do the fact find" or "prep the SOA" (phrases from the `meeting-notes` skill description). Claude writes three JSON files to `legacy/file-notes/` and runs `prep-soa-case.ps1`. Output: a case folder under `legacy/soa/`.
2. **Manual.** Howard files the documents in SharePoint. Someone moves the case folder across.
3. **VS Code, Claude Code chat.** Tristan types "build the SOA for X" (from the `build-soa` description). Claude:
   - copies the SharePoint folder to `legacy/drop/soa-build/cases/<client>/`;
   - reads every file;
   - asks whether a full Insurance Needs Analysis was done (per memory);
   - picks the closest same-adviser example SOA;
   - writes a per-client Python script in the case's `.build/` folder that rewrites the example;
   - runs Word COM to update the table of contents and export a PDF;
   - reports a review list.
4. **Word.** Tristan reviews and edits the draft himself. Memory (`legacy-soa-from-case-folder`, "Round 2") says later changes are applied on top of his edited copy, never regenerated over it.
5. **VS Code.** "build the pack for X" runs the `build-pack` skill. Output: `C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\`.
6. **Browser, DocuSign.** Optionally, `node legacy/docusign/docusign.mjs draft <manifest>` creates a draft envelope. Tristan checks it and sends it from DocuSign.

Which route Tristan uses for a live SOA: the Workbench UI text and the memory file `workbench-is-the-new-program` both say the final SOA is Route B.

---

### 3. Inputs

#### Route A

| Input | Format | Source | Required? | What is used |
|---|---|---|---|---|
| Meeting transcript | Pasted text (≤400,000 chars) | Workbench form | Required for Stages 1–2. Stage 3 needs the transcript or the fact find JSON. | Whole text, in the user prompt. |
| Adviser notes | Pasted text (≤20,000 chars) | Workbench form | Optional | Whole text. In Stages 1–3 it "take[s] precedence over the transcript". In Stage 4 it appears under "ADVISER NOTES". |
| Client names, partner names, meeting date | Form fields | Workbench form / `clients` row | Names required | File and folder names; couple vs single; the `who()` line. |
| Existing-client status | Computed | `lookup.js` (DB rows and SharePoint folder names) | Automatic | One status line in Stages 1–3. |
| SharePoint "known facts" | DOCX/PDF/XLSX/CSV/TXT/MD text | SharePoint client folder: categories `fact-find`, `schedule`, `cover-summary`, `meeting-notes`; max 5 files, 60,000 chars | Optional. **Off** unless `WORKBENCH_READ_SHAREPOINT=true`. | Whole extracted text (up to 40,000 chars per file). |
| House rules README | Markdown | `legacy/drop/initial-meeting-build/README.md` | Stage 1, automatic | Whole file. |
| Few-shot example | JSON | `legacy/file-notes/[couple-example]-sep14-cds.json` (couple) or `[single-example]-oct09-cds.json` (single) | Stage 1, automatic. A missing file becomes an empty string. | Whole file. **Real client data.** |
| Stage 1 output (`cds_json`) | JSON | DB | Optional for Stages 2–3 | Whole JSON. |
| Stage 2 output (`ff_json`) | JSON | DB | Stage 3 needs the transcript or ff_json. Stage 4 needs soa_notes_json or ff_json. | Whole JSON. |
| Stage 3 output (`soa_notes_json`) | JSON | DB | See the row above | Whole JSON, labelled "the adviser's strategy and reasons". |
| Paraplanner-filed documents | DOCX/PDF/XLSX/XLS/XLSM/CSV/TXT/MD text | SharePoint client folder: categories in order `soa-notes`, `risk-checklist`, `research`, `premium`, `cover-summary`, `schedule`, `application`; max 14 files, 180,000 chars, newest advice year first | Optional (only if a folder is linked) | Whole extracted text. The category comes from the file name (`indexer.js:147-163`). |
| SOA extra instructions | Pasted text (≤20,000 chars) | SOA step textarea | Optional | Appended to the adviser notes. |
| Client DB context | Text | `gatherClientContext()`: `clients`, `family_members`, `assets`, `liabilities`, `income_sources`, `expenses`, `insurance_policies`, `financial_goals`, `estate`, `documents.extracted_text`, `meeting_transcripts`, the follow-up correspondence table | Automatic | Everything, rendered by `contextToText()` (`planGenerator.js:156-259`). For a client created in the Workbench, the Workbench itself only sets the name fields. Whether other screens fill the other tables: NOT FOUND. |
| Imported SOA template | Text in `training_data` | DB | Optional | Split into sections on `N. Heading` lines; up to 9,000 chars per section. |
| House wording | JSON | `server/src/data/legacy-house-wording.json` | Automatic | The blocks for each section's keys. |
| Firm and adviser config | env | `env.js`, `server/.env` | Automatic | Inserted into guardrail 11. |
| `.doc` files | — | — | — | Not readable. The extractor does a best-effort ASCII decode; the READMEs say to re-save as .docx. |

#### Route B

From `build-soa/SKILL.md` and memory. What the per-case scripts actually read: NOT FOUND (skipped).

| Input | Format | Source | Required? | What is used (per the instructions) |
|---|---|---|---|---|
| SOA Notes | DOCX | SharePoint `2. Compliance docs` | Read "first". Memory notes some cases had none. | "The adviser's strategy and reasons." |
| Risk Checklist | DOCX/XLSX | SharePoint | Read "first" | "Final products, owners, premiums, commission." Commission is 66%/22% "as on the Risk Checklist". |
| Insurer quotes | PDF | `1. Research...` | Expected | Premiums. "Reconcile every premium against the quote." |
| Insurance Cover Summary / CvC | XLSX | SharePoint | Expected | The option sheets and the `CvC ` sheet. |
| Risk Researcher runs, Compare Ratings, One on One Comparison | PDF | SharePoint | Expected | Alternatives. The "Differences in Benefits" bullets are the provision names whose ratings differ. Memory says to render these pages as images, because text extraction scrambles the tables and provider names are logos. |
| Pre-assessments, insurer correspondence | PDF / MSG | SharePoint | Optional | Health and underwriting. |
| Existing policy schedules, renewal letters | PDF | SharePoint | Expected for replacements | Existing cover; "check schedules against the last signed insurer quote". |
| Latest Fact Find | DOCX | SharePoint | Expected | "Use the latest Fact Find in the folder, not the stage-1 draft." |
| Insurer applications | PDF (PPS: AcroForm) | SharePoint | Optional | Income history, travel and health answers, read from the form fields. |
| Saved client correspondence threads | MSG | SharePoint | Optional | The reasoning, when there are no SOA Notes. |
| Clone base SOA | DOCX | `legacy/drop/soa-build/examples/`, or a firm XPLAN merge in the client folder | Required | Structure, house wording, styles. |
| Adviser details and FSG | PDF | `legacy/advisers/tristan-biro/` | Required | Name, AR number, contact details. |
| Tristan's chat instructions | Typed text | Claude Code chat | Optional | For example cover amounts. One memory entry records him naming them in chat. |
| INA answer | Typed answer | Claude asks | Asked every SOA (per memory) | Decides the needs-analysis wording. |

---

### 4. The pipeline, step by step

#### Route A: settings shared by all calls (`ai.js`)

- Provider: the Anthropic Messages API, via `@anthropic-ai/sdk` ^0.69.0.
- Model: `env.anthropic.model` = `process.env.ANTHROPIC_MODEL || 'claude-opus-5'`. `server/.env` sets `claude-opus-5`.
- Temperature, top_p, top_k: **never sent** (`ai.js:67-70` says they are removed on current models).
- Thinking: `{ type: 'adaptive' }` on every call (`ai.js:90`).
- Effort: sent as `output_config.effort` when the caller passes one.
- Streaming: used when `maxTokens > 16000` (`ai.js:98`).
- System prompt caching: if any system message has `cache: true`, the whole system prompt is cached.
- JSON mode (`json: true`): strips a code fence, or slices from the first `{` to the last `}`. There is no schema validation.
- Failure fallback: `completeOrStub` returns stub text when the key is missing **or the call throws**. The SOA generator uses this. The Stage 1–3 writers call `complete()` directly, so a failure throws.

#### Route A, Stage 1: Initial Meeting Notes

1. `POST /cases/:id/generate/cds` (`routes/workbench.js:394`). Saves the transcript and date if they were sent. Runs `lookupClient()` and builds the status line.
2. `knownFacts()` returns empty unless a SharePoint folder is linked **and** `WORKBENCH_READ_SHAREPOINT=true`.
3. **AI call 1**, `writeMeetingNotes()` (`writers.js:73-100`). System prompt: GENERAL + the rules + the README + the labels + the few-shot JSON. User prompt: client line + date + extras + transcript. Settings: `maxTokens: 24000`, `effort: 'medium'`, `json: true`.
4. Code parses the JSON, forces `clientName`, and checks that `sections` is an array.
5. Saves the result to `workbench_cases.cds_json` and writes the JSON to `legacy/file-notes/<slug>-cds.json`.
6. Runs `node generate-client-details-summary.mjs <json> <out.docx>`, then `docx-to-pdf.ps1`. Both files are copied to Downloads.
7. Moves the case stage to `fact_find`.

#### Route A, Stage 2: Fact Find

1. Same route, with `kind=ff`.
2. **AI call 2**, `writeFactFind()` (`writers.js:112-126`). System prompt: GENERAL + "You fill the firm's 2026 Fact Find…" + the `generate_fact_find.py` docstring + FACT_FIND_RULES. User prompt: names, date, cds_json, extras, transcript. Settings: `maxTokens: 32000`, `effort: 'medium'`, `json: true`.
3. Saves the result to `ff_json`. `python generate_fact_find.py <json> <out.docx>` then fills the master:
   - rebuilds the tables and adds totals;
   - highlights TBC;
   - drops the partner column for a single client;
   - scrubs the XPLAN "Sample client:" text.
   Then exports the PDF.
4. Moves the case stage to `soa_notes`.

#### Route A, Stage 3: SOA Notes

1. Same route, with `kind=soa-notes`. Needs the transcript or ff_json.
2. **AI call 3**, `writeSoaNotes()` (`writers.js:136-151`). System prompt: GENERAL + "You write the draft SOA Notes…" + the `build_soa_notes.py` docstring + SOA_NOTES_RULES. User prompt: title line, ff_json, cds_json, extras (no known facts), transcript. Settings: `maxTokens: 24000`, `effort: 'medium'`, `json: true`.
3. Saves the result to `soa_notes_json`. `python build_soa_notes.py` builds the .docx, with TBC and `[ADVISER TO CONFIRM…]` highlighted yellow. Then exports the PDF.
4. Moves the case stage to `paraplanner`.

#### Manual step

Howard files the documents and the case folder is moved to SharePoint by hand. Tristan links the folder in the app.

#### Route A, Stage 4: Draft SOA

1. `POST /cases/:id/soa` (`routes/workbench.js:450-488`). Needs soa_notes_json or ff_json.
2. If a folder is linked, `sharepointText()` reads up to 14 files (see §3). The list of files read goes back to the UI as `sourcesRead`. It is not stored.
3. `gatherClientContext(client_id)` reads the DB.
4. `soaInstructions()` (`writers.js:154-161`) joins SOA NOTES, FACT FIND, ADVISER NOTES and the filed documents, then the textarea instructions are appended.
5. `generateRiskSoa()` (`riskSoaGenerator.js:192-222`) runs:
   - `loadRiskTemplate()` checks for an imported template. If one splits into at least 3 sections (and no more than 45 headings), its sections are used. Otherwise the 12 `LEGACY_SECTIONS` are used.
   - With no API key, a stub SOA is returned and no AI calls are made.
   - **AI calls 4–15: one per section** (12 with LEGACY_SECTIONS), at most 5 running at once (`mapLimit`). Each call's system prompt is `SECTION_SYSTEM_PROMPT(templateTitle)`, cached. Its user content has two blocks: a cached "stable" block (client file text, date, adviser notes) and a "volatile" block (the section brief or template excerpt, house wording, and "Now write the section…"). Settings: `maxTokens: 12000`, `effort: 'high'`.
   - Each section is written on its own; no call sees another section's output.
   - The sections are joined under an H1 header: `# Statement of Advice — <first> <last>` and `**Risk insurance advice** · Prepared <date> · <firm>`.
6. The Markdown is saved to `workbench_cases.soa_markdown`. This overwrites any earlier draft; the UI asks first.
7. `renderPlanHtml()` → `html-to-docx` (portrait, 720-twip margins) → `.docx` written to `2. Compliance docs…/<stamp> - <Short> - Statement of Advice (DRAFT).docx`. Then Word exports the PDF.
8. Moves the case stage to `soa`. From here the work is manual: the UI text says Tristan has Claude "build the SOA for X" for the final version.

**Total AI calls for one full Route A case: 15.** That is 3 for Stages 1–3 and 12 for the SOA. The older `/plans/generate-risk-soa` endpoint runs only the 12 SOA calls, with `instructions` taken from the request body.

#### Route A, Stage 5: Pack

No AI. `pack.js`:
- sorts files into slots by file name;
- orders them: SOA, FSG, Fact Find, Application Summary, letter, insurer form, PDS, FINAL Insurance Summary, Risk Checklist;
- copies them to Downloads with numbered names and checks the SHA-256 hashes;
- exports a PDF for firm documents that exist only in Word, then re-checks the .docx hash;
- writes a READ ME.

Tristan can change the suggested items on screen.

#### Route B

Route B's AI calls are made by the Claude Code session itself, so the model is whatever the session runs. Nothing in the repo pins it, and the repo sets no temperature or max tokens. The system prompt is Claude Code's own, plus the skill file and the memory files.

1. **`meeting-notes`.** Claude writes `<slug>-cds.json`, `<slug>-ff.json` and `<slug>-soa-notes.json` itself, following the skill and the README. It runs `prep-soa-case.ps1`, which uses the same builders as Route A plus Word COM PDFs. It checks the PDF pages, then reports the folder and the outstanding list. The number of model turns is not fixed.
2. **Manual.** Paraplanner filing; the folder is moved.
3. **`build-soa`.**
   - Copy the folder out with `robocopy` or `Copy-Item`.
   - Extract text with pdftotext, mammoth, extract-msg and pymupdf; read ratings tables as images.
   - Ask the INA question (per memory).
   - Pick the clone base.
   - Write the per-client python-docx script in `cases/<client>/.build/` and run it.
   - Word COM: update the TOC, save, export the PDF.
   - Review the rendered pages.
   - Output: `legacy/soa/<client>/…/<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` and `.pdf`.
   - Report a review list.
4. **Manual.** Tristan edits the SOA in Word. Further changes go on his copy, via `edit_on_tb.py`, a per-case script.
5. **`build-pack`.** Plain copies with hash checks, the cancellation letter fix, PDFs for Word-only documents, numbering, re-stamped file dates, a READ ME, output to Downloads.

---

### 5. Prompts and instructions, verbatim

Prompts are listed in the order they are used. In code blocks taken from JavaScript, `${...}` marks a substitution. Text in `⟦…⟧` is my note and not part of the prompt. Wherever I replaced a client detail, the placeholder is in square brackets and noted.

#### 5.1 Route A Stage 1–3 shared text (`writers.js:61-70`)

```js
const extras = (wb, known) =>
  (wb.statusLine ? `\n\n${wb.statusLine}` : '')
  + (wb.adviser_notes ? `\n\nADVISER NOTES (take precedence over the transcript):\n${wb.adviser_notes}` : '')
  + (known ? `\n\nKNOWN FACTS FROM THE CLIENT'S SHAREPOINT FOLDER (older documents; use to fill DOBs, addresses and existing cover, but the meeting wins where they differ):\n${known}` : '');

const GENERAL =
  `You work for ${env.firm.name}, an Australian risk insurance advice practice (life, TPD, trauma, income protection). `
  + `The adviser is ${env.adviser.name}. Australian spelling and AUD throughout. `
  + 'Never invent a fact: anything that should be known but was not said is TBC. '
  + 'Reply with the JSON document only: no prose, no code fence.';
```

The status line (`lookup.js:123-131`) is one of:

```js
`EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.`
`POSSIBLY AN EXISTING CLIENT: a record with the same name exists${look.inSharePoint ? ' in SharePoint' : ''}${look.inProgram ? ' in the program' : ''}, not yet confirmed. Do not assume it; go by the transcript.`
`NEW CLIENT: no existing client file was found for them at ${env.firm.name}.`
```

`who()` (`writers.js:54-59`):

```js
isCouple(client)
    ? `a couple: ${names[0]} (client 1) and ${names[1]} (client 2)`
    : `a single client: ${names[0]}`;
```

#### 5.2 Route A Stage 1: Initial Meeting Notes (`writers.js:20-25, 73-91`)

```js
const LABELS_SINGLE = ['Name', 'Mobile', 'Sex', 'Referred from', 'About the client', 'What is important to you',
  'Reasons for seeking advice', 'Current Insurance', 'Financial circumstances', 'Family', 'Super',
  'Estate Planning', 'Health', 'Height', 'Hobbies', 'UNDERWRITING', 'Insurance needs', 'Goals',
  'About the client', 'Reasons for seeking advice', 'Existing cover', 'Estate Planning', 'Super',
  'Outcome of meeting'];
const LABELS_COUPLE = ['Name', 'Mobile', 'Sex', 'Spouse Details', 'Name', 'Mobile', 'Sex', ...LABELS_SINGLE.slice(3)];

  const system = `${GENERAL}\n\nYou write the firm's Initial Meeting Notes (the Client Details Summary) from an initial meeting transcript. `
    + 'Follow every house rule below exactly; where rules disagree, the SEP14 rules win. '
    + 'Circumstances only: no strategy, sums insured or pricing.\n\n'
    + `===== HOUSE RULES =====\n${rules}\n\n`          ⟦rules = full text of legacy/drop/initial-meeting-build/README.md, §5.3⟧
    + 'OUTPUT SHAPE: {"clientName": string, "sections": [{"label": string, "value": string}, ...]}. '
    + 'The labels fill a Word template in document order, so use exactly these labels, in this order, each once '
    + `(a repeated label is the template's second occurrence):\n${JSON.stringify(labels)}\n`
    + 'Values: "\\n" splits paragraphs. A field with nothing known is "TBC". '
    + `Example of a finished file in the current house style (a different client; copy its form, never its facts):\n${example}`;
         ⟦example = full JSON of a real client's meeting notes (couple or single). Not read; client data.⟧
  const user = `Client: ${who(client)}. clientName must be "${notesName}". Meeting date: ${longDate(wb.meeting_date)}.`
    + `${extras(wb, known)}\n\nTRANSCRIPT:\n${wb.transcript}`;
```

#### 5.3 `legacy/drop/initial-meeting-build/README.md` (inserted whole into the Stage 1 system prompt)

Verbatim, with **client names in file names and references replaced**:
- `[CLIENT_A]` = the SEP14 couple
- `[CLIENT_B]` = the SEP10 couple
- `[CLIENT_C]` = the SEP02 single client
- `[CLIENT_D]` = the AUG03 review client
- `[CLIENT_E]` = the client whose fact find the master was made from
- `[CLIENT_F]` = the 2023 fact find client

One file path, to the archived follow-up email generator under `server/src/services/`, is also replaced with `[archived follow-up email generator]`. The email hook blocks that literal file name.

````markdown
# Task: initial meeting — transcript into the two house documents

One transcript in, **two documents** out:

1. **Client Details Summary** — "initial meeting notes". The record of the
   meeting itself.
2. **Fact find** — the client's full circumstances, captured on the house form.

Both are written from the same initial meeting, so they are built as one task.

## House style — derived from Tristan's edits of generated drafts

Three examples, each a generated draft **after he edited it**. The diff between draft and
issued document is the real specification.

| Example | Shape | Status |
|---|---|---|
| `client-details-summary/examples/[CLIENT_A]-SEP14-EDITED-BY-TRISTAN.md` | Couple; first-contact referral call, no cover details known | **Current — follow this** (2026-09-14) |
| `client-details-summary/examples/[CLIENT_B]-SEP10-EDITED-BY-TRISTAN.md` | Couple; adviser already held the client's details | Superseded where it disagrees with SEP14 |
| `client-details-summary/examples/[CLIENT_C]-SEP02-EDITED-BY-TRISTAN.md` | Single client, first-contact enquiry, most basics unknown | Superseded where the others disagree |

The SEP10 and SEP14 files each carry a full annotated diff. Rules below are the SEP10 set;
**read the SEP14 rules further down first — they take precedence where they overlap.**

1. **Never write about the transcript.** Cut "came through unclearly", "figure unclear on
   the call", "[CONFIRM spelling]" scattered through prose. Either state the fact, or mark
   the field `TBC`. This also killed in-prose flags like "stated as X and recorded as Y",
   "spelled verbally and is to be confirmed", "fund not known; to be confirmed" and
   "NOT CAPTURED" appended to a sentence. A `NOT KNOWN` **inside a structured cover
   listing survives** — that is data about a policy, not a note to self.

2. **Do not editorialise on significance.** State the fact and stop — he draws the
   conclusion himself.

3. **Outstanding items are `TBC`, highlighted, in the field they belong to.** Not a
   sentence, not a closing list. Fill everything that is known first — he fills DOB,
   mobile, email, postcode, smoker status and the spouse's details from the client file —
   then highlight the residue. Fall back to a closing `OUTSTANDING - TO BE OBTAINED` list
   only when the gaps are too many or too large to sit in a field, as on a first-contact
   enquiry where nothing is yet known (the SEP02 example). **On a normal meeting there is
   no closing list.**

4. **Header field formats:**

   | Field | Format |
   |---|---|
   | `DOB` | `dd/mm/yyyy` |
   | `Address` | street, then **suburb uppercase**, state, postcode — no commas |
   | `Smoker` | `N` or `Y` |
   | `Speciality` | industry, en dash, job title — `IT – Solutions Analyst` (illustrative) |
   | `Employer/self` | employment basis **and income** — `PAYG $000,000 + Super` |

5. **For a couple, add a `Spouse Details` header block** immediately under the client's,
   identically formatted, carrying the same nine fields. It is not in the blank template.
   When present, **delete the `Family / partner/ dependants:` heading** — the partner is
   header data, and the children survive as one or two italicised lines under `Income` in
   the financial section, with no heading of their own.

6. **Resolve a range to one figure where the client effectively gave one.** Ranges survive
   only where genuinely uncertain.

7. **`What is important to you` records what the money must DO, not what the client
   asked.** Education delivered in the meeting — trauma versus TPD, stepped versus level,
   how a rollover premium is paid — is not file-note content and gets deleted wholesale.
   Write purpose-per-cover instead, short and declarative: "Wants to clear total debt in a
   claimable Life event." / "TPD to clear home debt and provide excess monies post tax to
   fund house modifications or medical expenses." **This is the section that justifies the
   sums insured.**

8. **Strategy, structure and pricing come OUT.** The Client Details Summary records the
   client's **circumstances**. Indicative sums insured, premium figures, the funding split
   between super and cash flow, stepped-versus-level, the 15% rollover rebate, the
   deductibility argument, the 70%-of-income basis — all belong in the Statement of Advice
   and were deleted in full. Anything reading like an argument for a course of action is
   cut. Same for the intestacy explanation under Estate Planning, which reduces to one
   line, and the "outside the practice's authorisation" disclaimer.

9. **`Insurance needs` is repurposed as `UNDERWRITING`.** What survives is only what an
   underwriter needs: condition, medication and dose, when diagnosed, whether controlled,
   and the occupation rating still to be established. Nothing about sums insured.

10. **The document ends at `Goals`.** Delete the repeated second block outright — including
    the second `About the client.` and `Reasons for seeking advice`, not merely the
    repeated Existing cover / Estate Planning / Super.

11. **`Outcome of meeting` is dropped whenever no advice was given** — even where the
    meeting agreed concrete next steps. Adviser/client action lists and the
    service-and-remuneration explanation are not file-note content. Keep the section only
    for a meeting that decided something advice-bearing (see the [CLIENT_D] AUG03 review, where
    it was the point of the document).

12. **Compression device:** `Same as <spouse>.` appended where the spouse's position mirrors
    the client's, instead of repeating the detail.

13. **Small wording tell:** "life plus TPD and income protection" became "life plus TPD and
    income protection **as a minimum**". He leaves the door open on scope.

Net effect: **the draft is too wordy, too self-referential, and strays into advice.** Aim
shorter and more declarative, keep the reasoning out, and stop at the client's circumstances.

### SEP14 edit — these override the above where they overlap

From `client-details-summary/examples/[CLIENT_A]-SEP14-EDITED-BY-TRISTAN.md`
(2026-09-14). The draft was close — his words were "not many changes" — so these are the
residue, and they are the sharpest signal available.

14. **Never assert a negative as fact; record it as not disclosed.** "No investment
    properties, shares, managed funds, cash or savings **are held**" became "**have been
    disclosed**", and the same in the assets list. The client saying he holds nothing is
    not evidence that he holds nothing. Every absence in the document is an absence *of
    disclosure*.

15. **Qualify the standing cover clause when no cover is confirmed.** "EXISTING COVER
    REMAINS IN FORCE" becomes "**EXISTING COVER (IF ANY) REMAINS IN FORCE**" where nothing
    has yet been confirmed to exist.

16. **Financial circumstances does not repeat the header or About the client.** The whole
    `Income` block and the dependants line were deleted — both incomes already sit on the
    `Employer/self` header lines and the children are already in *About the client*. This
    **replaces SEP10 rules 4 and 8**, which moved the children into this section. It now
    reduces to: ASSETS, total, LIABILITIES, total, `Estimated net position approx. $X.`,
    then any `NOT CAPTURED` line and the one-line driver sentence.

17. **Delete any section with nothing real in it — `Goals` and `UNDERWRITING` included.**
    SEP14 **ends at `Height / weight`**: `Hobbies / pets`, `UNDERWRITING`, `Insurance
    needs`, `Goals` and the trailing repeated block all went. This **replaces SEP10 rule
    10** ("the document ends at Goals") — SEP10 ended at Goals because that meeting had
    goals. The test is **would this section exist if the draft could only use facts?** A
    heading is not a reason to synthesise content, and a first-contact call usually has
    nothing to underwrite and no goals yet explored.

18. **A `TBC` field can carry a qualifying line** where something partial is known —
    "Both to be explored further however, client has disclosed [a healthy] BMI for each."

19. **A long `Employer/self` value moves to its own line**, leaving `Sex` and `Speciality`
    on the row above. Short values keep all three on one line.

20. **Name the school type where fees are in play** — "one child still at school" became
    "one child still at **private** school".

21. **"No binding death benefit nominations discussed." stays out of `Super`.** He cut the
    same line from SEP10 and it came back in the SEP14 draft. It is a note about what the
    meeting did not cover, which rule 1 already forbids — the recurrence is the point.

22. **Stray empty labels are tolerated; invented content is not.** He left the empty
    `Family / partner/ dependants:` heading standing and spent his edits on deleting
    inferred prose instead. Do not pad a section to justify its heading.

### Generator gaps against this spec

`server/scripts/generate-client-details-summary.mjs` cannot yet produce three things the
SEP10 document needs, so they are hand-finished:

- **Yellow highlighting** for `TBC` — `contentParas()` emits plain runs with no `rPr`.
- **The `Spouse Details` header block** — it has no insertion point in the template.
- **Deleting unfilled labels** — it only inserts after a label, so every dropped section
  (`Family / partner/ dependants`, the repeated second block, `Outcome of meeting`) leaves
  a stray heading behind for him to delete by hand.

## Where things go

| Folder | What goes in it | Status |
|--------|-----------------|--------|
| `client-details-summary/templates/` | The **blank** Client Details Summary template. | Waiting |
| `client-details-summary/examples/` | **Completed** Client Details Summaries from real meetings. | **Two, both edited by Tristan — SEP10 is current** |
| `fact-find/templates/` | `Fact Find - master.docx`: a blanked [CLIENT_E] 2026.09.30 fact find (the firm's "Fact Find Template.docx" is a 2023 [CLIENT_F] one on the older, shorter form). Filled by `server/scripts/generate_fact_find.py`; the whole pipeline is the `/meeting-notes` skill. | **In use (2026-10-22)** |
| `fact-find/examples/` | **Completed** fact finds for real clients. | Coming later |
| `source-transcripts/` | The meeting transcripts / raw notes both documents were written **from**. | **None matching — do not chase** |

### No matched transcripts — work from live ones instead

Tristan has no *pre-existing* transcript that matches an existing Client Details
Summary or fact find (confirmed 2026-09-01). **Do not chase them.** The build
works from the completed documents for structure and house wording, and the
transformation gets tuned against real transcripts as meetings come through.

**Matched pairs now exist, produced by this process rather than found** — SEP02
and SEP10. For each, the generated draft is in `legacy/file-notes/<slug>-cds.json`
and the issued version is the `EDITED-BY-TRISTAN.md` example. That draft/issued
pair is the calibration signal; the transcript itself only needs saving into
`source-transcripts/` if a run is to be reproduced end to end.

Practically this means the first few runs are calibration: generate from a live
transcript, compare against how he would have written it, and adjust. Expect
the "what gets added that was never said out loud" part — the judgement a real
adviser applies — to need his correction rather than being inferable up front.

Examples covering **different client shapes** (single vs couple, employee vs
self-employed, existing cover vs none) are worth more than volume.

## The fact find template is being supplied — use it directly

Tristan is providing the **blank** fact find form (2026-09-01). Use it as the
clone-and-fill master. This supersedes the fallback below and is the better
option: a supplied blank carries no client data, so there is nothing to strip
and no risk of a stray value propagating into future fact finds.

His examples are all on the current Legacy form, so there is no
previous-licensee branding in play — unlike the archived Lakeside material,
which must never appear on a Legacy document (see commit `c879ef4`).

<details>
<summary>Fallback if the blank is ever unavailable</summary>

A form's blank is recoverable from completed copies: every copy shares identical
labels, section order and fixed wording, and only the client data varies. Take
one completed `.docx` and clear the client-specific cells — clone-and-fill
already operates on the document XML, so blanking a filled form is the same
operation in reverse.

**Required safeguard for that route.** Every client value must be stripped *and
verified stripped* — one value left in a cell propagates silently into every
future client's fact find. Blank programmatically, then scan for residual names,
dates, dollar figures and policy numbers. Do not rely on visual inspection.
</details>

## Decisions (2026-09-01, confirmed by Tristan)

- **Output is a Word document** — a `.docx` into the client file, like the
  client profile and insurance report generators produce.
- **One format each**, with sections included only when relevant.
- **Initial and review meetings use the same document** (confirmed 2026-09-01). In
  a risk-only practice they are usually one and the same — a review captures the
  same circumstances an initial meeting does. Do **not** build a review variant,
  add a meeting-type field, or branch the generator. Fields that read as
  initial-only ("Referred from", "About the client") simply carry review-context
  content. Verified against the [CLIENT_D] AUG03 transcript, which is a review meeting
  and fills the template unmodified.
- **Tristan writes these today; a VA takes them over once built.** That makes
  them the **first VA-assigned task type**, and so the first real case for the
  assignment/tracking model in
  [`../../va-workflow-build-brief.md`](../../va-workflow-build-brief.md).

## The fact find is not only a document

A Client Details Summary is prose — it is read by people. A fact find is
**structured data**: income, expenses, assets, liabilities, family, existing
cover. The app already has a table for every one of those, and
`gatherClientContext()` already reads them back out.

So generating a fact find from a transcript should do two things:

1. Produce the `.docx` on the house form, and
2. **Write the extracted detail into the client file** — `family_members`,
   `income_sources`, `expenses`, `assets`, `liabilities`,
   `insurance_policies`.

That second half is what makes the rest of the workflow pay off: the SOA brief
pack is assembled from exactly those tables, so a fact find done at the initial
meeting populates the pack automatically instead of being re-keyed later. It
also means the fact find that `soa-build/fact-finds/` currently expects as a
manual input becomes something this app produces.

Confirm the mapping against a real completed fact find before relying on it —
field names and how the form asks a question are read out of the template.

## Which .docx path each uses depends on its template

The repo has both, and the choice is made by looking at the template:

| Template shape | Path | Why |
|---|---|---|
| A **form** — labelled table rows and cells | **Clone-and-fill** (`JSZip`, as in `server/scripts/generate-client-profile.mjs`) | Opens the real `.docx` and rewrites cell text in place, so letterhead, fonts and brand colours survive byte-for-byte. `setCellText()` already splits on newlines, so a large free-text cell works fine. |
| **Prose under headings**, variable length | Build from `html-to-docx` / `docx` | Free-flowing content has no fixed cell to land in. |

A fact find is almost certainly a form, so clone-and-fill should suit it — the
client profile generator is the closest working model and its ledger/label
matching logic is directly reusable. The Client Details Summary may go either
way.

## Not the same thing as the follow-up email

The repo already generates a client-facing follow-up email from a transcript
([archived follow-up email generator]). These are different documents:
third-person and factual for the file, versus warm and second person to the
client. Same input, separate generators — do not merge them.

## Formats

`.docx`, `.pdf`, `.md` and `.txt` extract cleanly. `.doc` does **not** — open it
in Word and re-save as `.docx` first. See [`../README.md`](../README.md).

## Client data

Real client material. It stays on this machine, is read only to derive structure
and house wording, and is never used as content in another client's documents.
Everything in this folder except the READMEs is gitignored.
````

#### 5.4 Route A Stage 2: Fact Find (`writers.js:102-126`)

`[CLIENT_1]` and `[CLIENT_2]` replace two client first names in the example sentence.

```js
const FACT_FIND_RULES = `Rules, from the firm's Fact Find Process:
- "why", "story", goals and scope are written in the SECOND PERSON ("[CLIENT_1] and [CLIENT_2], you wish to review...").
- Health status defaults to "Good" unless a condition was disclosed.
- A fact that should be known but wasn't said is "TBC" (it gets highlighted). A whole section the meeting never touched goes in not_disclosed, or "Not disclosed" in cells.
- Dates of birth are written "5 June 1982 (44)". Addresses are STREET on one line, then SUBURB STATE POSTCODE, uppercase.
- Money is "$270,000". Income, expense, asset and liability totals are added for you; do not add Total rows.
- For a single client give one name in "clients"; the partner column is dropped.
- Per-client tables are [label, client1, client2] for a couple and [label, client1] for a single client.`;

  const system = `${GENERAL}\n\nYou fill the firm's 2026 Fact Find from an initial meeting. `
    + `The document builder reads this JSON:\n${schema}\n\n${FACT_FIND_RULES}`;
         ⟦schema = the docstring of generate_fact_find.py, below⟧
  const user = `Client: ${who(client)}. Preferred names for the column headers: ${JSON.stringify(firstNamesOf(client))}. `
    + `full_names: ${JSON.stringify(fullNamesOf(client))}. date_completed: "${longDate(wb.meeting_date)}".`
    + (wb.cds_json ? `\n\nINITIAL MEETING NOTES ALREADY WRITTEN:\n${JSON.stringify(wb.cds_json)}` : '')
    + `${extras(wb, known)}\n\nTRANSCRIPT:\n${wb.transcript}`;
```

The `generate_fact_find.py` docstring, inserted as `${schema}`. Client names in its examples are replaced.

```
Fill the Legacy 2026 fact find (XPLAN/Opex form) from a JSON file.

    python server/scripts/generate_fact_find.py <data.json> <out.docx> [--master <path>]

The master is a blanked copy of a real 2026 couple fact find, kept in
legacy/drop/initial-meeting-build/fact-find/templates/ (gitignored). Tables are
found by the Heading 1 / Heading 2 they sit under, not by index, and every
client table is rebuilt from the data: XPLAN prints only the rows that hold
something, so a row not in the data is not in the document.

JSON shape (every key optional; omitted text boxes are left empty):
  clients         ["[CLIENT_1]", "[CLIENT_2]"]           column headers (preferred names)
  full_names      ["[CLIENT_1 FULL NAME]", "[CLIENT_2 FULL NAME]"]
  date_completed  "22 October 2026"
  why, story, planning_preferences, future_changes          text
  goals           [[for, description, timeframe, amount, priority], ...]
  personal, contact, employment, health, other_cashflow, estate
                  [[label, client1, client2], ...]
  dependants      [[name, relationship, age, living at home, dependent], ...]
  income, expenses, assets, liabilities   [[description, owner, amount], ...]
                  a Total row is added from the amounts unless one is given
  super           [[plan, policy #, owner, balance, life, tpd, ip, beneficiaries], ...]
  insurance       [[description, owner, life insured, type, cover, premium], ...]
  scope           text for "Scope of advice" (defaults to `why`)
  scope_items     ["Life.", "TPD.", ...] for "Agreed scope of advice"
  incomplete_info "None"   expertise "Yes"
  not_applicable / not_disclosed   ["dependants", "super", ...] ticks the box
  changes / additional   {"dependants": "text", ...} the "Any changes" and
                  "Additional information" boxes, keyed like the tables

Text: "\n" splits paragraphs; a line starting "- " becomes a bullet.
```

#### 5.5 Route A Stage 3: SOA Notes (`writers.js:128-151`)

The code names two real clients' surnames as the source of the SOA Notes shape. Here they are `[CLIENT_G]/[CLIENT_H]`.

```js
const SOA_NOTES_RULES = `The shape is the firm's own SOA Notes ([CLIENT_G]/[CLIENT_H]):
- brief: "Hey Howard," then what to quote (each cover, sum insured options, waiting and benefit periods, inside/outside super), as the adviser discussed in the meeting.
- to_obtain: existing policy schedules, super statements, quotes, Risk Researcher run, pre-assessments for any disclosed condition.
- outstanding: every TBC in the fact find, in plain words.
- circumstances: short shorthand list (incomes, property and debt, savings, super, estate).
- sections, in this order: Goals; Reasons for Seeking Advice; Insurance Review and Cover Discussion; Cover Funding; Health Disclosure; Advice and Recommendations. Write what the meeting actually established. Anything not yet decided is [ADVISER TO CONFIRM].`;

  const system = `${GENERAL}\n\nYou write the draft SOA Notes: the adviser's brief to the paraplanner (Howard) and the notes the Statement of Advice is written from. `
    + `The document builder reads this JSON:\n${schema}\n\n${SOA_NOTES_RULES}`;
         ⟦schema = the docstring of build_soa_notes.py, below⟧
  const names = firstNamesOf(client).join(' and ');
  const user = `Client: ${who(client)}. title: "Statement of Advice Notes - ${names}".`
    + (wb.ff_json ? `\n\nFACT FIND:\n${JSON.stringify(wb.ff_json)}` : '')
    + (wb.cds_json ? `\n\nINITIAL MEETING NOTES:\n${JSON.stringify(wb.cds_json)}` : '')
    + `${extras(wb, '')}\n\nTRANSCRIPT:\n${wb.transcript || '(none)'}`;
```

The `build_soa_notes.py` docstring, inserted as `${schema}`. Client names are replaced.

```
Build the draft SOA Notes (.docx): the adviser's brief to the paraplanner plus
the Statement of Advice notes, laid out like the firm's own ([CLIENT_G], [CLIENT_H]).

    python server/scripts/build_soa_notes.py <notes.json> <out.docx>

JSON:
  brief         "Hey Howard,\n\n..."   the covering instructions
  to_obtain     ["Quotes: ...", ...]   documents the paraplanner must get (checkboxes)
  outstanding   ["[CLIENT_1]'s DOB", ...]   facts still TBC from the meeting (checkboxes)
  circumstances "Incomes -\n..."       the short financial summary under its heading
  title         "Statement of Advice Notes - [CLIENT_1] and [CLIENT_2]"
  sections      [{"heading": "Goals", "body": "- ..."}, ...]

Body text: "\n" splits paragraphs, "- " is a bullet, "  - " a sub-bullet.
TBC and [ADVISER TO CONFIRM] are highlighted yellow.
```

#### 5.6 Route A Stage 4: adviser notes for the SOA (`writers.js:154-161`)

```js
export function soaInstructions(wb, filed) {
  const parts = [];
  if (wb.soa_notes_json) parts.push(`SOA NOTES (the adviser's strategy and reasons):\n${JSON.stringify(wb.soa_notes_json)}`);
  if (wb.ff_json) parts.push(`FACT FIND:\n${JSON.stringify(wb.ff_json)}`);
  if (wb.adviser_notes) parts.push(`ADVISER NOTES:\n${wb.adviser_notes}`);
  if (filed) parts.push(`DOCUMENTS THE PARAPLANNER FILED (quotes, Risk Checklist, cover summary, research). Reconcile every premium against the quote; commission is disclosed per policy:\n${filed}`);
  return parts.join('\n\n');
}
```

`routes/workbench.js:468` combines them: `[soaInstructions(wb, filed), extra].filter(Boolean).join('\n\n')`, where `extra` is the SOA textarea text. Each filed file appears as `\n\n===== ${f.within} (${f.category}) =====\n${text}` (`sources.js:97`).

#### 5.7 Route A Stage 4: SOA system prompt (`riskSoaGenerator.js:26-62`)

```js
export const RISK_GUARDRAILS =
  'RISK ADVICE INTEGRITY — these rules are MANDATORY and override the template if it does something different:\n'
  + '1. NEVER state a premium, sum insured, occupation rating, loading or underwriting outcome that was not supplied in the client data or the adviser notes. Write [ADVISOR TO CONFIRM] instead. Premiums are indicative until the insurer confirms them in writing.\n'
  + '2. NEEDS ANALYSIS: a full needs analysis is completed for every client in the background, based on their situation. The SOA presents the REASONS for the recommended levels of cover, not the arithmetic. Reason each sum insured through against the client\'s debts, income, dependants, existing cover and stated objectives, then justify it in prose — do not print a component table that sums to the figure. NEVER state or imply that a needs analysis was declined, not undertaken, or waived. Any figure you do state must be arithmetically correct and consistent with the client data.\n'
  + '3. Ownership and structure must be stated for every recommended policy, with the tax consequence:\n'
  + '   - Life inside super: premiums are generally deductible to the fund, but a lump sum paid to a NON-tax-dependant is taxed on the taxable component (15% plus Medicare where applicable). Name the likely beneficiary and their dependant status.\n'
  + '   - TPD inside super: must satisfy a condition of release, so "any occupation" definition only. "Own occupation" TPD cannot be held inside super for policies issued from 1 July 2014.\n'
  + '   - Trauma / critical illness: CANNOT be held inside superannuation (it does not meet a SIS condition of release). Always recommend trauma cover outside super.\n'
  + '   - Income protection inside super: restricted to indemnity-style benefits, narrower definitions, and most ancillary benefits are unavailable. Outside super, premiums are generally tax-deductible to the individual.\n'
  + '4. REPLACEMENT OF EXISTING COVER: where a recommendation replaces or cancels existing cover you MUST include an explicit warning that the client must NOT cancel the existing policy until the new cover is confirmed in force and any exclusions or loadings are known; and you MUST compare old against new across definitions, waiting and benefit periods, exclusions, loadings, premium structure and any loss of loyalty or guaranteed-renewability benefits.\n'
  + '5. Refer to the duty to take reasonable care not to make a misrepresentation (Insurance Contracts Act 1984, as amended from 5 October 2021 for consumer insurance contracts) — NOT the superseded "duty of disclosure" wording.\n'
  + '6. State whether each premium is STEPPED or LEVEL and explain the long-run cost difference. Where affordability is a stated concern, address it explicitly rather than assuming it away.\n'
  + '7. Cover is not in force until the insurer accepts the application and confirms it. Underwriting may result in loadings, exclusions or decline — state this; never present acceptance as certain.\n'
  + '8. Disclose remuneration: adviser service fee and/or insurance commission (upfront and ongoing), in dollars where known, otherwise [ADVISOR TO CONFIRM]. Mark clearly where a figure is illustrative.\n'
  + '9. Use Australian terminology and AUD throughout. NEVER use US concepts (401k, IRA, Roth, HSA) or US insurance terms.\n'
  + '10. Never fabricate the client\'s personal details — name, date of birth, address, occupation, income, health or smoker status, existing policy numbers. If not supplied, write [ADVISOR TO CONFIRM].\n'
  + `11. FIRM IDENTITY — use these details and no others:\n`
  + `    Adviser: ${env.adviser.name}${env.adviser.ar ? `, Authorised Representative No. ${env.adviser.ar}` : ', Authorised Representative No. [ADVISOR TO CONFIRM]'}\n`
  + `    Firm: ${env.firm.legalName} ${env.firm.ar}, ABN ${env.firm.abn}\n`
  + `    ${env.firm.address}\n`
  + `    Authorised Representative of ${env.firm.licensee}, AFSL ${env.firm.licenseeAfsl}, ABN ${env.firm.licenseeAbn}\n`
  + `    ${env.firm.legalName} is a corporate Authorised Representative — the AFSL belongs to the licensee, never to the firm. Never describe the firm as holding an AFSL.\n`
  + `    Example documents in this system were written by OTHER advisers at this firm and by a PREVIOUS practice. Use them for structure, tone and house wording ONLY. Never reproduce another adviser's name, AR number or contact details, and never another firm's licensee or AFSL — issuing advice under the wrong licensee is a compliance breach. Where a detail is not given above, write [ADVISOR TO CONFIRM].\n`
  + '12. Never carry a client name, figure, policy or personal detail across from a reference document or template example into this client\'s advice.';

const SECTION_SYSTEM_PROMPT = (templateTitle) =>
  'You are a senior Australian risk insurance adviser writing ONE section of a Statement of Advice for a '
  + 'risk-only advice practice (life, TPD, trauma and income protection). '
  + (templateTitle
    ? `You are following the firm's own SOA template, "${templateTitle}". Mirror that section's structure, sub-headings, tables, tone and depth exactly, but populate everything with THIS client's real data. `
    : 'Write in plain English addressed directly to the client as "you" — professional but warm, with the reasoning spelled out rather than asserted. Use Markdown tables wherever figures are compared. ')
  + 'Write ONLY the requested section, in Markdown, starting with the section heading. '
  + 'Do NOT write investment, retirement-projection or broad superannuation strategy advice — this practice advises on risk insurance only. Superannuation appears only where it is the ownership vehicle for cover or the means of funding a premium. '
  + 'Where genuine adviser judgement or a figure you cannot derive is required, insert a clearly-marked [ADVISOR TO CONFIRM] placeholder rather than guessing. '
  + 'Do NOT wrap the output in code fences.\n\n'
  + RISK_GUARDRAILS;
```

With the current config, guardrail 11 resolves to:
- `Adviser: Tristan Biro, Authorised Representative No. [ADVISOR TO CONFIRM]`
- `Firm: Legacy Risk Advice Pty Ltd 1296611, ABN 22 655 978 046`
- `Level 3, 489-505 Toorak Road, Toorak VIC 3142`
- `Authorised Representative of Synchron Advice Pty Ltd, AFSL 243313, ABN 33 007 207 650`

#### 5.8 Route A Stage 4: per-section user prompt (`riskSoaGenerator.js:123-158`)

```js
  const guidance = sec.text
    ? `TEMPLATE SECTION (follow its structure, headings, tables and depth):\n"""\n${excerpt(sec.text, 9000)}\n"""`
    : `WHAT THIS SECTION MUST COVER:\n${sec.brief}`;

  const houseBlock = wording.length
    ? `\n\nHOUSE WORDING for this section — reproduce these blocks essentially verbatim, `
      + `adapting only names and pronouns. Do not paraphrase them, and do not omit one `
      + `because it reads as boilerplate; this is the firm's settled compliance language. `
      + `Order them naturally within the section:\n`
      + wording.map((w, i) => `  (${i + 1}) ${w}`).join('\n')
    : '';

  const frontMatterRule = sec.isFrontMatter
    ? '\n\nThis is the document FRONT MATTER (cover page, addressee, purpose, contents). '
      + 'Do NOT introduce your own numbered sections — the numbered sections come later in '
      + 'the document and your numbering would collide with theirs. Use unnumbered headings only.'
    : '';

  const stable =
    `CLIENT / HOUSEHOLD FILE:\n${contextText}\n\n`
    + `Date of advice (use for any preparation date): ${today}.`
    + (instructions ? `\n\nADVISER NOTES — these reflect the advice actually given and take precedence over inference: ${instructions}` : '');

  const volatile = `${guidance}${houseBlock}\n\nNow write the section "${sec.title}" for this client.${frontMatterRule}`;
```

`contextText` comes from `contextToText()` (`planGenerator.js:156-259`), which assembles it in code. Its fixed labels are: `### <name>`, `- Address:`, `- Email:`, `- Phone:`, `- Occupation:`, `- DOB:`, `- Risk profile:`, `- Annual income (profile):`, `- Partner / Spouse:`, `- Family & dependants:`, `- Assets:`, `- Investments:`, `- Liabilities:`, `- Income:`, `- Expenses:`, `- Insurance:`, `- Goals:`, `- Estate:`, `### Joint / Household`, `Household totals — …`, `### Meeting notes and file notes (what was actually discussed)`, `### Correspondence already sent to this client`, `### Source documents (extracts from uploaded client files)`.

The no-key stub (`riskSoaGenerator.js:177`) is: `## ${sec.title}\n\n_[Offline stub — set ANTHROPIC_API_KEY for AI generation.]_`

#### 5.9 Route A Stage 4: section briefs (`legacySoaStructure.js:53-143`)

When no imported template is in use, each brief is sent as `WHAT THIS SECTION MUST COVER:\n${sec.brief}`. Verbatim:

1. **About this document**. Wording keys: `['about', 'reliance']`.
   > Standard opening. What the SOA is, that it is based on the client's relevant personal circumstances and the Fact Find, that they should check the information and tell us if anything is wrong, and an invitation to ask questions. This section is almost entirely house wording — reproduce it, adapting only the client's name.
2. **Executive summary**. Wording keys: `[]`.
   > Two sub-headings, both client-specific and written fresh every time.
   > "Why are you seeking advice" — the client's situation in their own terms and what prompted them to come in now. Two to five short paragraphs, addressed to them by first name. This is the most personal writing in the document.
   > DRAW THIS FROM THE MEETING NOTES AND CORRESPONDENCE, not from the financial data. The numbers say what the client has; only the meeting says why they came in, what worries them, what they said in their own words and what they have already been told. Use their phrasing and their reasons where the notes give them. If a concern, life event or constraint is recorded in the notes — a new baby, a job change, a health scare, a budget limit, a bad claims experience — it belongs here. Where the notes are thin, say less rather than inventing motivation.
   > "Summary of our advice to you" — one line stating the advice has been prepared from recent discussions and the Fact Find, then "At this time, you have asked me to provide advice on:" followed by a short list of the advice areas.
3. **Scope of our advice**. Wording keys: `['scope']`.
   > What is in scope and what is not. Sub-heading "Included" listing the agreed areas, then the scope of advice — typically "Analysis of your personal risk insurance needs:" followed by the cover types being advised on (Life, TPD, Trauma, Income Protection). Then the excluded areas under the standard wording about limiting advice. Include the standard note that any tax advice is incidental.
4. **Your objectives**. Wording keys: `['objectives']`.
   > A table of the client's objectives with columns: Description | Priority and Target Date | Status. Each row is an objective in the client's terms, with priority (High/Medium/Low) and horizon (Short/Medium/Long Term). Introduced by the standard wording about taking their needs and objectives into consideration.
5. **Where you are now**. Wording keys: `['current-position']`.
   > The client's current position as tables, not prose: personal details for each person (age, occupation, employment basis, income, smoker status, dependants), then income and expenditure, assets and liabilities, and existing insurance cover in force — insurer, policy, owner, life insured, cover type, sum insured, premium and premium structure. Where a figure was not supplied write [ADVISOR TO CONFIRM] rather than estimating.
6. **Insurance recommendations**. Wording keys: `['recommendations', 'replacement', 'underwriting']`.
   > The core of the document.
   > Open with the standard paragraph about this section detailing the recommendations for their insurance portfolio.
   > "Strategy overview" — a numbered Step | Strategy table naming each strategy (for example "Life Insurance with Superlinked TPD and Income Protection insurance and linked Trauma Insurance").
   > Then write up EACH strategy in turn with: a review of existing cover where relevant; what is recommended and why, addressed to the client by name; a "Why you are likely better off with our recommendation" block covering the cover amount, waiting and benefit periods, premium structure and ownership, each with the reason; and a "Risks and consequences" block.
   > Close with the portfolio table: Description | Owner | Life Insured | Type | Cover | Inside Super | Outside Super | Premium | Features | Action — with an Action of Retain, Replace, Cancel or New for every line.
   > NEEDS ANALYSIS: a full needs analysis has been done for this client in the background. Work through it — their debts, income, dependants, existing cover and stated objectives — and use it to justify each recommended level of cover in the "Why you are likely better off" block. Present the REASONING, not the arithmetic: explain why this sum insured suits this client, without printing a component table that sums to it. Never state or imply that a needs analysis was declined or not undertaken.
7. **Alternatives**. Wording keys: `[]`.
   > What else was considered and why it was dismissed. Standard opening about having assessed various alternatives, then "Alternative insurance products" naming the insurers evaluated and the reason each was not recommended, and where relevant why increasing or adjusting cover under an existing policy was unsuitable. Appears in about a quarter of documents — include it where alternatives were genuinely considered.
8. **Important information**. Wording keys: `['important-info', 'duty-of-care', 'cooling-off', 'underwriting', 'reliance']`.
   > Almost entirely house wording — reproduce it. The PDS list for each recommended product; the duty to take reasonable care not to make a misrepresentation and its key elements; what happens if circumstances change before the policy issues; underwriting requirements and that cover does not commence until the insurer accepts; interim cover; the cooling-off period; the importance of regular review; and the standard reliance and currency statements.
9. **Fees and disclosures**. Wording keys: `['fees']`.
   > How the adviser is paid. Standard wording that the licensee and its representatives may receive payments, benefits and commission; the commission table showing initial and ongoing commission per policy; the standard explanation of how insurance commission is calculated as a percentage of the annualised policy cost; and the clawback wording — 100% of commission in the first year and 60% in the second, invoiced to the client if the policy is replaced, cancelled or reduced within two years, with the hardship waiver. Where a commission figure is not supplied, write [ADVISOR TO CONFIRM].
10. **Actions required**. Wording keys: `['actions']`.
    > A Steps to be actioned | Actioned by table: read the SOA and PDS (Clients), consider whether the advice is appropriate (Clients), sign the authority to proceed and application forms electronically (Clients), submit and follow up underwriting (Adviser), and confirm once cover is accepted. Introduced by the standard wording about undertaking the following steps.
11. **Authority to proceed**. Wording keys: `[]`.
    > The client's declaration and signature block: that they have received and read the SOA and the relevant PDSs, that the information about them is correct, and that they authorise the adviser to proceed with the advice set out. Signature and date lines for each client, and for the adviser.
12. **Appendix: Insurance quotes**. Wording keys: `[]`.
    > A placeholder heading for the insurer quotes attached to the document. State that the quotes for each recommended policy are attached, and list them. Do not fabricate quote figures — write [ADVISOR TO CONFIRM] where a premium has not been supplied.

One more brief is defined but not used by any code (`RISK_PROFILE_SECTION`, `legacySoaStructure.js:138-143`):
> Only where a risk profile was actually completed. The client's assessed profile and what it means for the advice. Omit entirely if no profile is on file — do not invent one.

#### 5.10 House wording sent into the SOA prompt

From `legacy-house-wording.json`. Only the keys named in `LEGACY_SECTIONS` are sent, each block as `  (n) <text>`. The verbatim text of every block that is sent is in §7.1. The keys `general` (34 blocks) and `needs-analysis-position` (2 blocks) are never sent.

#### 5.11 Route B: `.claude/skills/meeting-notes/SKILL.md`

Verbatim, with client names and slugs replaced.

````markdown
---
name: meeting-notes
description: Stages 1-3 of the Legacy SOA pipeline. From an initial meeting transcript, produce the Initial Meeting Notes, the filled 2026 Fact Find and the draft SOA Notes (paraplanner brief), filed in a case folder under legacy/soa/. Use when Tristan pastes a meeting transcript or asks for "initial meeting notes", "do the fact find" or "prep the SOA".
---

# Initial meeting → notes, fact find, SOA prep

One transcript in, one case folder out:

```
legacy/soa/<Surname, First [& Second]>/1. Advice/<Year> Advice & Service/
  1. Research, Financials, Medicals, Schedules/      (empty: for the paraplanner)
  2. Compliance docs (SOA, ROA, EO & Fact Find)/
     <First Last> <MON><DD> - Initial Meeting Notes.docx + .pdf
     <yyyy.MM.dd> - <Short> - Fact Find.docx + .pdf
     <yyyy.MM.dd> - <Short> - SOA Notes.docx + .pdf
  3. Signed documents - Implemented Audit/           (empty)
```

**Never write to SharePoint** (`C:\Users\TristanBiro\Legacy Risk Advice\...`). It is read-only.
Tristan or the paraplanner moves the folder across. Nothing goes into the app database.

## Steps

1. **Pull known facts first.** If the client already has a SharePoint folder, read it (copy
   files out to the scratchpad if you need to extract them): the latest fact find, insurer
   schedules and renewal letters fill DOBs, addresses and existing cover. Check DOBs against
   an insurer certificate where there is one.

2. **Write three JSON files** in `legacy/file-notes/` (gitignored), all with the same slug,
   e.g. `[client-1-slug]-oct22`:
   - `<slug>-cds.json`: Initial Meeting Notes. Follow every house rule in
     `legacy/drop/initial-meeting-build/README.md`; the SEP14 rules win. Circumstances only:
     no strategy, sums insured or pricing.
   - `<slug>-ff.json`: Fact Find. The schema is in the docstring of
     `server/scripts/generate_fact_find.py`. Rules, from the firm's Fact Find Process:
     - "Why are you seeking advice", "Your story", goals and scope are written in the
       **second person** ("[CLIENT_1] and [CLIENT_2], you wish to review...").
     - Health status defaults to `Good` unless a condition was disclosed.
     - A fact that should be known but wasn't said is `TBC` (it gets highlighted). A whole
       section the meeting never touched gets `not_disclosed`, or `Not disclosed` in cells.
     - Dates of birth are written `5 June 1982 (44)`. Addresses are `STREET` on one line,
       then `SUBURB STATE POSTCODE`, uppercase.
     - Money is `$270,000`. Income, expense, asset and liability totals are added for you.
     - For a single client give one name in `clients`; the partner column is dropped.
   - `<slug>-soa-notes.json`: Draft SOA Notes. The schema is in
     `server/scripts/build_soa_notes.py`. The shape is the firm's own ([CLIENT_G]/[CLIENT_H] SOA Notes):
     - `brief`: "Hey Howard," then what to quote (each cover, sum insured options, waiting and
       benefit periods, inside/outside super), as the adviser discussed in the meeting.
     - `to_obtain`: existing policy schedules, super statements, quotes, Risk Researcher run,
       pre-assessments for any disclosed condition.
     - `outstanding`: every TBC in the fact find, in plain words.
     - `circumstances`: short shorthand list (incomes, property and debt, savings, super, estate).
     - `sections`: Goals; Reasons for Seeking Advice; Insurance Review and Cover Discussion;
       Cover Funding; Health Disclosure; Advice and Recommendations. Write what the meeting
       actually established. Anything not yet decided is `[ADVISER TO CONFIRM]`.

3. **Run it:**
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File server/scripts/prep-soa-case.ps1 `
     -Slug <slug> -Client "<Surname, First & Second>" -Short "<Surname F&S>" -NotesName "<First Last MONDD>"
   ```
   It builds all three .docx files, exports PDFs (a PDF failure is a warning; the .docx is the
   deliverable) and prints the folder.

4. **Check** the fact find PDF pages render cleanly, then report to Tristan: the folder path and
   the outstanding list. Mention anything in the transcript that contradicts the file.

## Masters

- Fact find master: `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx`,
  a blanked [CLIENT_E] 2026.09.30 fact find (verified clean with `server/scripts/leakscan_docx.py`).
  If it is ever rebuilt from another client's fact find, leak-scan it for that client's names,
  address, phone, email, insurer and figures before use.
- Meeting notes template: `legacy/drop/initial-meeting-build/client-details-summary/templates/`.
````

#### 5.12 Route B: `.claude/skills/build-soa/SKILL.md`

Verbatim. It contains no client details.

````markdown
---
name: build-soa
description: Stage 4 of the Legacy SOA pipeline. On Tristan's command ("build the SOA for X"), copy the client's SharePoint folder out (read-only) once the paraplanner has filed quotes, research and notes, and write the Statement of Advice by cloning a same-adviser Legacy SOA. Use only when Tristan asks for the SOA to be generated.
---

# Build the SOA from the completed client folder

Only on Tristan's command. The paraplanner (Howard) has gathered the documents listed in the
SOA Notes brief and filed them in the SharePoint client folder.

1. **Copy the client folder out. Never work inside SharePoint.** Source:
   `C:\Users\TristanBiro\Legacy Risk Advice\Legacy - Documents\Clients\<Surname, First>\`.
   Copy the current year's `1. Advice\<Year> Advice & Service\` to
   `legacy/drop/soa-build/cases/<Surname, First>/` (gitignored) and extract there. Never create
   files, `.extracted/` folders or anything else in the SharePoint tree. Paths can pass 260
   characters and OneDrive files may download on demand, so copy with `robocopy` if
   `Copy-Item` fails.

2. **Read everything**, starting with the **SOA Notes** (the adviser's strategy and reasons) and
   the **Risk Checklist** (final products, owners, premiums, commission). Then read the quotes,
   Insurance Cover Summary / CvC, Risk Researcher runs, pre-assessments and existing cover. Use
   the latest Fact Find in the folder, not the stage-1 draft, because the paraplanner may have
   corrected it.

3. **Write the SOA** using the method and house conventions in memory (`legacy-soa-from-case-folder`):
   clone the closest same-adviser example SOA, rewrite in place, finish in Word (TOC, PDF), and
   review the rendered pages. **Adviser: Tristan Biro on every SOA from 23 Oct 2026** (name, AR
   number, contact details and FSG from `legacy/advisers/tristan-biro/`; Josh Davidson's folder is
   reference only). If the cloned SOA was another adviser's, replace every adviser detail. Reconcile every premium against the quote. Commission is disclosed
   per policy. Like-for-like comparisons are priced at the recommended cover levels. Where the
   file is silent, write `[ADVISER TO CONFIRM]`; never invent reasoning.

4. **Output** `legacy/soa/<Surname, First>/1. Advice/<Year> Advice & Service/2. Compliance docs
   (SOA, ROA, EO & Fact Find)/<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` + `.pdf`.

5. **Report** a review list: file inconsistencies (application answers, income mismatches,
   research on the wrong product variant), referral disclosure wording, and the compliance steps
   a Word build does not cover (peer review, XPLAN replacement step, APL/TMD evidence, Risk
   Checklist compliance block).
````

#### 5.13 Route B: memory files the SOA build follows

These files live in `C:\Users\TristanBiro\.claude\projects\c--FPGod-Program\memory\`, outside the repo and outside git. Claude Code loads the index (`MEMORY.md`) every session and opens individual files when they look relevant. The text below is verbatim with the front matter dropped. **Client names, figures, policy numbers and a phone number are replaced with placeholders.** Staff names (Tristan, Josh Davidson, Luke Fisher, Howard, Grant Conda) are kept.

##### `legacy-soa-from-case-folder.md` (named in `build-soa` step 3)

> On 2026-09-15 Tristan asked for SOA *writing* again: he drops a complete client folder and Claude writes the SOA "exactly how Legacy does it", using the 32 examples for style. Drop folder: `legacy/drop/soa-build/cases/<Client>/` (everything in it gitignored). First case: "[CLIENT_1] (AI Test)" — output `legacy/soa/2026.09.15 - [CLIENT_1] - Statement of Advice (DRAFT).docx`.
>
> **What a Legacy case folder contains** (XPLAN/Opex practice, Synchron licensee): `1. Research, Financials, Medicals, Schedules` (quotes per option, Risk Researcher runs, Insurance Cover Summary "Discussion Summary" option sheets, insurer pre-assessment correspondence, existing-cover correspondence) and `2. Compliance docs` (Fact Find, Initial Client Notes, **SOA Notes = the adviser's strategy and reasons**, **Risk Checklist = final products, owners, premiums, commission**, one-on-one comparison + compare-ratings PDFs, TAL pre-application summary, cancellation letter, SOA Checklist). A "Client Directed Amounts" subfolder means the client chose lower cover than first presented.
>
> **Method that worked:** read every file (pdftotext, mammoth, extract-msg, pymupdf for scans; render ratings tables as images — text layout scrambles them), then clone the closest *same-adviser* example SOA .docx with python-docx and rewrite in place, finish in Word COM (update TOC, save, export PDF), review rendered pages. Build tooling kept in the case's `.build/` folder. Pitfalls hit: text-box anchor paragraphs contain nested paragraphs; removing a paragraph leaves its image in the package unless the rel is dropped (template client PII leak); empty cells need borrowed run formatting.
>
> **Needs analysis wording:** where the file shows higher needs-based options were presented and the client directed lower amounts, say exactly that plus an underinsurance warning — do not use the house "declined a needs analysis" text (see [[legacy-risk-advice-templates-pending]]).
>
> ## Confirmed 2026-09-16, after reading the firm library ([[legacy-sharepoint-library]])
>
> Legacy's documented route is an XPLAN/Opex 13-page wizard bound to a Risk Researcher scenario; there is **no blank SOA master** in SharePoint (the two "SoA Template" files are other clients' completed SOAs). Tristan was told this and still wants **complete Word documents** produced the way [CLIENT_1]'s was. Do that; do not switch to drafting sections for pasting into XPLAN.
>
> House conventions confirmed against the firm's own [CLIENT_1] SOA — follow these:
> - Commission is disclosed **per policy** (super-owned and personally owned on separate lines), not as a single combined line.
> - The replacement "Like For Like" comparison is priced at the **recommended** cover levels, not the existing ones. The recommended product's like-for-like figure strips out any cover the existing fund cannot offer (for [CLIENT_1]: total less trauma less own-occ TPD = [AMOUNT] against Rest's [AMOUNT] from Rest's own cost-of-cover calculator).
>
> Steps the documented process requires that a Word build does not cover, so raise them: peer review before the client sees it, the XPLAN replacement step behind the gained/lost table, Approved Product List and TMD evidence, filling in the Risk Checklist compliance block, and **referral disclosure naming the dollar amount** (only PPA, The HOPE Fund and Tony Chen have approved wording — Allfin/[REFERRER_CONTACT], who referred [CLIENT_1], does not).
>
> **Why:** the case folder is the real input; the adviser's reasoning lives in SOA Notes, not the fact find. **How to apply:** for the next case, start from the SOA Notes and Risk Checklist, reconcile every premium against the quote, and give Tristan a review list of file inconsistencies (application answers, income mismatches, research on the wrong product variant) — those were the most valuable part of the first run.
>
> ## Second case, 2026-09-22: [CLIENT_2]
>
> Output `legacy/soa/2026.09.22 - [CLIENT_2] - Statement of Advice (DRAFT).docx`, cloned from Josh's [CLIENT_3] SOA (PPS, own-occ TPD, Trauma, IP Prime 70); script in the case's `.build/`. Folder shape differed: `1. Advice/2026 Advice & Service/...`, **no SOA Notes** — the reasoning was in the fact find "Your story" and the saved client correspondence thread `.msg` in Compliance docs. The PPS paper application is an AcroForm: read its fields with pymupdf `widgets()` (income history, travel, health answers live there, not in pdftotext). The firm's own finished SOA (Grant Conda, paraplanner) was in the folder: set aside unread, compared after — same recommendation and figures, but it had template leftovers (wrong client name "[OTHER_CLIENT]", Opex `Err:` block, Life suicide warning). House commission = 66% / 22% of the **total** annual premium (incl. plan fee and stamp duty), as on the Risk Checklist, even though the insurer quote shows lower. Layout pitfalls: the portfolio table's proposed rows are vMerged (split them and copy cells so the PPS logo follows the PPS row); extra text before a divider page spills onto its photo, so trim spacer paragraphs.
>
> ⟦Sections on pack assembly, Initial Client Notes, CvC and application details sheets omitted here. They are covered by the pack and meeting-notes specs. See the build-pack skill.⟧
>
> ## Fourth case, 2026-10-07: [CLIENT_7] (couple, no fact find, no SOA Notes)
>
> Output `legacy/soa/2026.10.07 - [CLIENT_7] - Statement of Advice (DRAFT).docx` (+pdf, 45pp). Tristan named the amounts himself ("[AMOUNT] life [AMOUNT] TPD [AMOUNT] trauma & IP with super continuance"); they matched Option 2 on the 5 Oct Insurance Summary sheets. Folder had only meeting notes, quotes, Risk Researcher runs and the existing-policy notice — inputs that thin are normal, so write the SOA with "Not provided / To be confirmed" cells and `[ADVISER TO CONFIRM]` where reasoning is missing. Best clone base for a couple + SMSF + two insurers: Josh's **[CLIENT_6] SOA (2026.09.30)**; graft the "Replacement advice" tables from **[CLIENT_5]**. Script `build_[client]_soa.py` in the case `.build/`. python-docx was missing again — `pip install --user python-docx` fixed it. Word COM finalise (TOC + PDF) worked fine this time (~1 min). Firm library scans are slow (OneDrive on-demand) and paths can exceed 260 chars. Risk Researcher provider names are logos: render pages to PNG to read them.
>
> ## Seventh case, 2026-10-23: [CLIENT_11], IP-only review SOA + recreated fact find
>
> The review files were in the `Oct 2026\` subfolder of `1. Research...`, including Howard's raw XPLAN merges of the SOA and fact find (placeholders, Opex `Err:` block, Josh Davidson as adviser). I used his **SOA merge as the clone base** because it has the current template, the right adviser and the RR replacement table. House wording came from Luke's May SOA. The fact find was cloned from the signed May one (same details, new goals and story, "Any changes" = no change). Builders: `cases/[CLIENT_11]/.build/build_[client]_soa.py` + `build_[client]_ff.py`. Tristan chose a **separate new OnePath IP policy** (RR figure) over the OnePath alteration quote. Watch for: the insurance schedule and CvC carried the pre-variation AIA premium ([AMOUNT]/m) after a signed variation ([AMOUNT] p.a.). Check schedules against the last signed insurer quote. **Adviser split (Tristan, 26 Oct):** the SOA, fact find, FSG and adviser profile carry Tristan Biro (Sub-AR 1313019). **His SOA contact details are P 0406 824 597, E Tristan@legacyriskadvice.com.au** (Tristan, 26 Oct). Do NOT use the mobile/gmail printed in his FSG Part 2 v8.0; those are out of date, and he needs a corrected profile from Synchron. Insurer applications and quotes stay under Josh Davidson. If a firm XPLAN merge names Josh, re-badge the SOA. **Round 2 (26 Oct):** once Tristan has edited the SOA himself, apply further changes ON TOP of his copy (`.build/edit_on_tb.py` on `tb_edit.docx`), never regenerate over it. Pitfalls hit: (1) his GAINS bullets were a nested table, so deleting `w:p` left empty cells and Word called the file corrupt; delete `w:tr` rows instead. (2) An image saved without an extension (`alt_bannerjpeg`) corrupts the docx when inserted with add_picture. Bisect corruption by saving after each step and opening in a timed Word job.

The verbatim file says "email" and "email thread" in three places. Here they read "correspondence" and "correspondence thread".

##### `soa-exec-summary-goals-not-recommendation.md`

> In an SOA's Executive summary, the "Why you are seeking advice" section describes the client's goals and motivations: what they no longer value, what concerns them, and what they want us to explore. It must not name the recommended insurer, product or action. Those belong in "Summary of our advice" and the recommendations.
>
> Example ([CLIENT_11], 26 Oct 2026). Wrong: "You would now like to top up your long-term income protection with OnePath... and cancel your AIA policy." Right: "You no longer see value in your AIA policy given its cost, even though it is not subject to the back exclusion, and you would like us to explore a more cost-effective alternative."
>
> **Why:** Tristan, 26 Oct 2026, reviewing the [CLIENT_11] SOA. Putting the recommendation in the goals makes the advice look predetermined. The goals should show the need, and the advice should answer it.
>
> **Same rule for "Scope of advice"** (SOA Included box and the Fact Find "Agreed scope of advice", Tristan 26 Oct 2026): list the advice areas, not the outcome. Right: "Review of your income protection insurance." + "Implement a new cost-effective income protection strategy." Wrong: "Implementation of new OnePath Income Secure cover of [AMOUNT] per month" / "Cancellation of your AIA policy".
>
> **Same for the "Your objectives" table:** write each row as the client's goal (e.g. "Replace your AIA IP, which you no longer see value in given its cost, with a more cost-effective alternative"), not as "top up with OnePath".
>
> **How to apply:** When drafting or editing the "Why you are seeking advice" section, write it in terms of the client's view: cost, value, concerns, and what they want explored. Keep the back-exclusion style acknowledgements framed as the client's acceptance, not as our recommendation.

##### `soa-ask-ina-every-time.md`

> Before writing the "Insurance needs analysis" section of any SOA, **ask Tristan whether a full INA was done**. Don't assume either way.
>
> If **no** (about 99% of cases, because the client directed the amounts), use the house wording from the firm's SOAs (e.g. [CLIENT_11] 26 May 2026):
> 1. "During our discussions, you indicated a range of goals and objectives that you are seeking to achieve in relation to your wealth protection. After a detailed discussion you were very clear about the level and types of cover that you want to meet your specific goals and objectives."
> 2. "As you were very specific about your insurance needs you declined to undertake a full Insurance Needs Analysis. Your goals are very specific and you have provided reasoning as to how the insurance recommendation was determined."
> 3. **Note:** "<Name>, please note that the insurance cover amounts outlined in this document have been based on the amounts you have requested. These cover levels are considered client-directed and reflect your expressed preferences."
> 4. "You have directed the following:" plus a bullet per action, covering **cancellations and retained cover as well as new cover**. Tristan liked the [CLIENT_11] version (26 Oct 2026): cancel AIA IP [POLICY_NO] (with terms), top up with a new policy [AMOUNT] pm to 65 / 30 days (product left generic here), retain the existing OnePath [AMOUNT] pm with no change, total IP [AMOUNT] pm. Then a line saying which covers weren't reviewed. Treat this as a template, not fixed text: Tristan (26 Oct) is happy for minor adjustments to fit the client's situation and cover levels, e.g. a couple, super vs personal ownership, reductions, or several insurers.
> 5. **Incomplete INA warning:** "We have recommended that you complete a full insurance needs analysis to determine the appropriate level of cover to meet your relevant circumstances, however you have declined this advice. As a result, you may be over or underinsured, and should you receive a claim it may not meet your required needs and objectives."
>
> Drop the XPLAN zero-filled needs table.
>
> **Why:** Tristan, 26 Oct 2026, reviewing the [CLIENT_11] SOA: "moving forward I need you to ask me if we do one or not for every SOA."
>
> **How to apply:** Ask the question during SOA build (add it to the build-soa questions). This supersedes the older "presented higher options, client directed lower" note in [[legacy-soa-from-case-folder]] unless Tristan says that applies.

##### `soa-strategy-overview-headings-only.md`

> The SOA "Strategy overview" table holds only the numbered step headings, one row each, for example:
> 1 Implement new OnePath OneCare Income Secure top-up cover of [AMOUNT] per month
> 2 Cancel your existing AIA income protection policy
> 3 Retain your existing OnePath cover
>
> Delete the Opex template's description row under each step. The detail, including exclusion acknowledgements, belongs in the recommendation sections that follow.
>
> **Why:** Tristan, 26 Oct 2026, [CLIENT_11] SOA. He trimmed my version, which had a description row under each step, down to headings only: "this can be a little more simple."
>
> **How to apply:** When filling the strategy table in any SOA build, remove the even (description) rows from the template table instead of filling them.

##### `soa-recommendation-wording.md`

> Rules for SOA recommendation wording (Tristan, 26 Oct 2026, [CLIENT_11] SOA review):
>
> - **Verb:** "we recommend implementing a new <insurer product> policy…". Never "apply for", "you should apply" or "we recommend you apply".
> - **No "should":** replace the Opex line "This policy should be selected with the following features:" with "**This policy will have the following levels of coverage & following features:**". Delete "Your cover should be owned in your own name."
> - **No "(self owned)"** (or similar ownership tags) in section headings. "Income protection insurance (self owned)" becomes "Income protection insurance".
> - **No "separate application" anywhere** (exec summary, strategy, recommendations, actions table). It's assumed that new cover means a new application.
> - **Box labels:** use "**Why you are likely better off with our advice**", not the Opex "Benefits", and "**Risks and Consequences**", not "Considerations". This matches Legacy's other SOAs ([CLIENT_10], [CLIENT_11] May). Content order: (1) a client-named lead bullet with the headline gain ("[CLIENT_A1] and [CLIENT_A2], the recommendation provides…"), (2) an insurer-specific feature if research supports one (e.g. PPS Profit Share), (3) what the cover type does, (4) a financial-security bullet (debts, lifestyle, wealth accumulation), then structure and ownership points. Keep the cost comparison specific ($/month and saving).
> - **Risks and Consequences style** (Tristan, 26 Oct 2026, from the [CLIENT_10] SOA): short bullets of one or two sentences in plain cause-and-consequence form, e.g. "The insurance premiums are not tax deductible. In return the claim proceeds will be paid to you tax-free." / "To qualify for a TPD payment you will need to satisfy the definition(s)…". No long explanatory paragraphs and no labels like "Lower back exclusion:". Only the points relevant to the cover. Always end with "Access to the recommended level of cover is subject to underwriting requirements and acceptance by the life insurance company." and "Initial and ongoing premiums apply in relation to your insurance policy."
> - **"Retain your existing cover" sections are a firm pattern. Keep them, in house style.** 5 of the 32 examples have one ([five client names]; in `legacy/drop/soa-build/.extracted/`). Shape: heading "Retain your existing <Insurer> <cover> cover" → one short paragraph ("We also discussed your existing… You advised that you are satisfied with this cover and do not wish to review it at this time… As a result, we have not recommended any changes", or "you have directed to retain… with no changes" plus a cover-amount list) → "Why are you likely better off with our recommendations": "Your existing level of cover continues to be consistent with your needs. You have indicated you are comfortable with the level of cover." plus one feature-specific bullet if relevant ([CLIENT]: Agreed Value) → "Risks and Consequences": the two fixed lines "There has been no change to the levels of cover and/or other terms of your personal risk insurance policy(ies)." and "If there are changes to your personal situation… we will reassess…". When unsure whether something is house practice, search the examples first (Tristan, 26 Oct: "look at other SOAs in YOUR database", meaning the repo examples, not SharePoint).
> - **Box label wording (Tristan's own edit, [CLIENT_11] 26 Oct):** "Why you are likely better off with our advice" and "**Risks, Considerations & Consequences**". Use these exact labels in every recommendation section (new cover, cancel, retain).
> - **Acknowledgement under the objectives table** is bold, and says "will likely carry the same … exclusion".
> - **Insurer logo in the portfolio table: on EVERY row, current and proposed** (Tristan put AIA and OnePath logos on all rows in the [CLIENT_11] SOA, 26 Oct 2026; this overrides the firm examples, which only had it on proposed rows). Size about 1.6 × 0.9 cm ([CLIENT] example). XPLAN merges leave `<:==ImageStorage[n]:>` placeholders instead of logos, so insert the logo yourself. Logo library: `legacy/drop/soa-build/templates/insurer-logos/` — `xplan/<name>.png` is XPLAN's own 60×34 transparent set (the exact images house SOAs embed; use these), covering 14 insurers + 13 super funds (`super-` prefix); `hires/` holds larger copies. See that folder's README for the list and gaps (Brighter Super, CFS, ART, MLC still missing). Examples with TAL/PPS/MetLife logos are in `legacy/drop/soa-build/examples/`.
> - **Owner of super-owned policies (portfolio and insurance tables):** never the member's name alone. Use the super fund trustee, with the member underneath: e.g. "Brighter Super Trustee / [CLIENT]" (OneCare Super), "OnePath Custodians Pty Ltd / [CLIENT]", "PPS Mutual Super Fund", "Mercer Superannuation (Australia) Limited", "NULIS Nominees Australia Limited / [CLIENT]". Take the trustee from the policy schedule or quote. XPLAN merges often put the member's name there by mistake ([CLIENT_11], Tristan 26 Oct 2026). Personally owned (non-super, SuperLink) policies stay in the client's name. OneCare Super policies are issued through Brighter Super (OnePath's own fund). The trustee is "Brighter Super Trustee" (formerly shown as OnePath Custodians Pty Ltd), funded by rollover from the client's main fund, so the owner is never the main fund (e.g. not CFS). Confirmed by Tristan 26 Oct: "do this moving forward".
> - **Replacement advice, gains and losses:** label them "Differences in Benefits - IMPROVEMENTS:" and "Differences in Benefits - DECREASES:". The bullets are just the **Risk Researcher provision names** (e.g. "• Future Insurability Benefit", "• Offsets") wherever the Compare Ratings / One on One Comparison rating differs between existing and recommended. When the old policies sit with several insurers, group the bullets under each existing insurer's name. Then "Other Note: A more extensive listing of comparable benefits is available on file". Do NOT use the long XPLAN auto-generated sentences ("Able to return to work multiple times…"). Examples: [CLIENT], [CLIENT]/[CLIENT_10] packs (Tristan, 26 Oct 2026).
> - **"Costs of replacement" (replacement advice table):** only the underwriting point, e.g. "The new <Insurer> policy is subject to underwriting, which may include a medical examination, blood test and financial evidence of your income." Do not add "No fees are payable to cancel your <old insurer> policy". Tristan removed that line ([CLIENT_11], 26 Oct 2026), since nothing in the file supports it.
> - **Alternatives get their own section**, not a box inside Replacement advice. The "What else you should know" divider lists "Alternatives / Important information / Fees and disclosures". Then a Heading1 "Alternatives" with the banner image, the line "In order to determine the recommendations made in this Statement of Advice (SOA) we assessed various alternatives:", and two side-labelled boxes. **Alternative strategies:** "We have considered and dismissed the following strategies:", each with a bold title (e.g. **Retain Existing Cover**), bullets, and "it was not recommended because:" with dash sub-points. **Alternative insurance products:** "We have considered and dismissed the following insurance products:", naming the researched insurers and why they were discounted (premium, contract terms). Model: [CLIENT_10] SOA and [CLIENT_11] May 2026 (Tristan, 26 Oct 2026).
> - Exclusion acknowledgements stay, as a separate paragraph after the features list.
>
> **Why:** Tristan rewrote my draft this way. "Should" reads as optional, and "apply" and "separate application" describe process, not advice.
>
> **How to apply:** Use this in every SOA build and any live wording edits.

##### `fact-find-mirrors-soa-wording.md`

> When the SOA and fact find are produced together, the fact find's "about the advice" boxes **reuse the SOA's wording**. Tristan's [CLIENT_11] edit, 26 Oct 2026:
>
> - **"Why are you seeking advice"** (top box): the client's motivation only, e.g. "He would like to explore alternative options given the costs associated with the AIA Income Protection policy." No product, no "top up", no "cancel".
> - **"Your financial goals" table:** one broad goal per client, e.g. "Review Income protection coverage and implement a cost effective strategy moving forward in line with 70% of your income." | Short Term | [AMOUNT] per month | High. No insurer names, and no exclusion acknowledgements in the goals.
> - **About our advice → Scope of advice (summary box)** = the SOA Executive summary "Why you are seeking advice" paragraphs, **word for word**: review request plus no-change confirmation, background (why AIA was kept, the OnePath exclusion), and the client's motivation plus exclusion acknowledgement.
> - **Agreed scope of advice** = the SOA "Scope of our advice → Included" bullets, word for word ("Review of your income protection insurance." / "Implement a new cost-effective income protection strategy.").
> - Facts the client confirms in the fact find (e.g. Will in place = Yes) must also flow into the SOA personal details table.
>
> **Why:** the fact find is the client's record of what they asked for. The SOA's advice has to answer it, so the two documents must say the same thing and the fact find must not pre-empt the recommendation.
>
> **How to apply:** write the SOA's exec summary and scope first, then copy them into the fact find boxes.

##### `tristan-is-adviser-on-all-soas.md`

> From 2026-10-23 every SOA is written with Tristan Biro as the adviser. His FSG, AR details and other adviser documents go in `C:\FPGod-Program\legacy\advisers\tristan-biro\`. Josh Davidson's go in `legacy\advisers\josh-davidson\`, kept for reference only. The folder is gitignored.
>
> Files (23 Oct 2026): each folder holds `FSG Part 1 - Synchron Advice v9.1.pdf`, the adviser's Part Two (Adviser Profile) and a 9-page "FSG Combined 2026" (Part 1 + Part Two). Tristan: AR 1313019 of Legacy Risk Advice (Legacy itself is AR 1296611 of Synchron, AFSL 243313), Part Two v8.0 dated 1 Oct 2026, office 1300 240 481. The SharePoint folder also holds a 03 9100 3225 variant of his Part Two; the 1300 one is the later save. His Part Two shows his gmail address as the contact email.
>
> **Why:** Tristan said all SOAs going forward are under him. Older example SOAs may name other advisers, so a cloned SOA can carry the wrong adviser details over.
>
> **How to apply:** when drafting an SOA or building a pack, take the adviser details and FSG from his folder and replace any other adviser's details in a cloned SOA. Use Josh's folder only if Tristan asks.

##### `soa-pipeline-built.md`

> Tristan's process (2026-10-22): after an initial meeting, Claude produces the meeting notes, fills the fact find, and prepares the SOA documents. The paraplanner (Howard) then gathers the rest into the SharePoint client folder, and Claude generates the SOA and later the pack **only on his command**.
>
> Built as project skills in `.claude/skills/`: `meeting-notes` (stages 1-3, runs `server/scripts/prep-soa-case.ps1`), `build-soa`, `build-pack`. Stage-3 output is a case folder under `legacy/soa/<Surname, First>/1. Advice/<Year> Advice & Service/` in the SharePoint layout. He said "drop the pack in SOA folder". The paraplanner brief and the draft SOA Notes are one document, as in the firm's own SOA Notes ("Hey Howard, ...").
>
> **Why:** he chose these constraints himself: no app database writes and no SharePoint writes "for the time being". SharePoint is only ever read, by copying out. **How to apply:** when he pastes a transcript, run the meeting-notes skill end to end. Never start the SOA without his say-so. Untested on a live transcript as of 2026-10-22, so the first real run is calibration: expect fact-find wording corrections and record them.

##### `legacy-risk-advice-templates-pending.md` (describes Route A; no client details)

> Tristan moved from Lakeside Financial to **Legacy Risk Advice** (risk insurance only — life, TPD, trauma, income protection). Lakeside material is archived under `archive/lakeside/`; the current practice lives under `legacy/`.
>
> ## Done (as at 2026-08-31)
>
> The SOA generator is rebuilt on the firm's real house structure, derived from 32 completed SOAs he supplied. 12 sections, strategy-based recommendations, 78 blocks of verbatim house wording in `server/src/data/legacy-house-wording.json`. Verified end to end. See `server/src/services/legacySoaStructure.js`.
>
> **Licensee details are known and configured** (`server/src/config/env.js`): Legacy Risk Advice Pty Ltd 1296611, ABN 22 655 978 046, Authorised Representative of Synchron Advice Pty Ltd, AFSL 243313. Legacy is a *corporate AR* — the AFSL is Synchron's, never Legacy's. Other advisers at the firm: Joshua Davidson, Luke Fisher.
>
> **His needs-analysis position** (he corrected me on this): every client gets a full needs analysis based on their situation, done in the background; the SOA presents the *reasons* for the cover levels, not the arithmetic. The 32 inherited SOAs all say the client *declined* a needs analysis — that is NOT his standard, and the guardrails now forbid implying it.
>
> ## Outstanding — do not re-ask each session
>
> 1. **Tristan's own AR number** — pending, he has only just left Lakeside. Renders as `[ADVISOR TO CONFIRM]`. One line in `server/.env` (`ADVISER_AR`) when it arrives.
> 2. **The blank firm SOA template** — he will supply when he has access. Drop folder is `legacy/drop/soa-build/templates/`. Import to `training_data` with `kind='plan'`, `metadata.doc_type='risk_soa'`, `is_template='true'` and the generator uses it automatically. Mostly it will confirm what was derived; it pins exact field labels.
> 3. **Client profile and risk report templates** — both generator pages are still `ready={false}`. The clone-and-fill scripts work and point at `legacy/templates/`.
>
> ## Worth raising again if relevant
>
> All 32 of his existing SOAs contain an unresolved template error in the body text: `include_schedules Err: ... is not defined`. It is going out to clients. Not caused by anything in this repo — it comes from whatever produces their current documents.
>
> Note `.doc` files cannot be extracted (no parser); they must be re-saved as `.docx`. Client documents in `legacy/drop/` are gitignored — real PII, ~300MB.

#### 5.14 Route B: `.claude/skills/build-pack/SKILL.md`

This skill assembles the pack; it does not write the SOA. Its verbatim text is in the repo at that path. It names one client in a file-name example (`04 - TAL Application Summary - Pre-Fill - [CLIENT]`). Its rules are summarised in §8 and §11. The memory files `soa-pack-format-confirmed.md`, `soa-pack-copy-firm-docs-unchanged.md` and `cancellation-letters-dated-and-say-cancel.md` restate the same rules.

#### 5.15 Few-shot examples

- **Route A, Stage 1:** one complete real meeting-notes JSON (`[couple-example]-sep14-cds.json` or `[single-example]-oct09-cds.json`). Not read, because it is client data, so it is not copied here.
- **Route A, Stage 4:** no few-shot examples. If an imported template exists, its section excerpts (up to 9,000 characters each) act as one.
- **Route B:** the cloned example SOA serves as a whole-document example. Memory names examples by client.

---

### 6. The SOA structure the system produces

#### Route A

Order is fixed by `LEGACY_SECTIONS` (`legacySoaStructure.js:53-135`) unless an imported template is in use. Each section call is told to start with its section heading. Code does not fix the heading level or the exact heading text the model writes.

| # | Heading given to the model | Included |
|---|---|---|
| — | `# Statement of Advice — <first> <last>` + `**Risk insurance advice** · Prepared <date> · <firm>` | Always. Code adds it (`riskSoaGenerator.js:213-214`). `renderPlanHtml` adds a second title block above it (§11). |
| 1 | About this document | Always |
| 2 | Executive summary (sub-headings "Why are you seeking advice", "Summary of our advice to you") | Always |
| 3 | Scope of our advice (sub-heading "Included") | Always |
| 4 | Your objectives | Always |
| 5 | Where you are now | Always |
| 6 | Insurance recommendations ("Strategy overview", per-strategy blocks, portfolio table) | Always |
| 7 | Alternatives | The call is always made. The brief says "include it where alternatives were genuinely considered", so **the model decides** what to write when none were. |
| 8 | Important information | Always |
| 9 | Fees and disclosures | Always |
| 10 | Actions required | Always |
| 11 | Authority to proceed | Always |
| 12 | Appendix: Insurance quotes | Always |
| — | Risk profile | Never. Defined (`RISK_PROFILE_SECTION`) but not used. |

Route A has no separate section for the needs analysis, replacement advice, or "retain existing cover". Replacement content goes inside section 6, at the model's discretion.

If a template exists in `training_data` and splits into 3–45 numbered headings, the sections are the template's own headings, with a "Cover, scope and summary" section in front. Whether such a template exists: NOT FOUND.

#### Route B

The structure is whatever the cloned example SOA has. The 32 examples were skipped, so the full section order is NOT FOUND. Headings named in the instructions:

- Executive summary: "Why you are seeking advice"; "Summary of our advice".
- "Scope of our advice" → "Included".
- "Your objectives" table, with a bold acknowledgement under it.
- "Insurance needs analysis" section.
- "Strategy overview" table: headings only.
- One recommendation section per step, including "Retain your existing <Insurer> <cover> cover" sections.
- Replacement advice tables: "Differences in Benefits - IMPROVEMENTS:" / "- DECREASES:"; "Costs of replacement".
- Portfolio table.
- "What else you should know" divider: "Alternatives / Important information / Fees and disclosures".
- "Alternatives" (Heading 1).
- Authority to Proceed, which holds the commission consent.

Route A's brief says "Why are you seeking advice"; Route B's memory says "Why you are seeking advice".

#### The five-part shape per recommendation

The five parts are: recommendation, why better off, features and benefits, risks and consequences, other things to consider.

| Part | Route A | Route B |
|---|---|---|
| Recommendation | Brief: "what is recommended and why, addressed to the client by name" (section 6). | "we recommend implementing a new <insurer product> policy…" (memory). |
| Why better off | Brief: a "Why you are likely better off with our recommendation" block. | Labelled "Why you are likely better off with our advice"; memory gives the content order. |
| Features and benefits | No separate block. House wording `recommendations.1` ("We have included the following features…") goes into section 6. | "This policy will have the following levels of coverage & following features:" (memory). |
| Risks and consequences | Brief: a "Risks and consequences" block. | Labelled "Risks, Considerations & Consequences" (Tristan's later edit). The same memory file says "Risks and Consequences" earlier in its list. |
| Other things to consider | Not mentioned. | Merged into "Risks, Considerations & Consequences". Exclusion acknowledgements go in a separate paragraph after the features list. |

Neither route enforces this shape in code. Route A asks for it in the brief. Route B relies on Claude following memory and on the cloned document's layout.

---

### 7. Warnings, disclosures and set wording

#### 7.1 Route A: house wording blocks sent to the model

Every block below is sent each time its section is written. Code does not check whether a block applies to the client. The prompt says "do not omit one because it reads as boilerplate", and the model places the blocks. Source: `server/src/data/legacy-house-wording.json`. The number in brackets is how many of the 32 examples contain the block.

**Section 1 "About this document"** (keys `about`, `reliance`)
- about.1 (32): "It is very important that you take full ownership of your financial decisions. To that end, we can assist you in making the appropriate decisions, but those decisions remain yours. If necessary, please seek more information and advice from us until you are comfortable to do so."
- about.2 (30): "Thank you for the opportunity to advise on your financial affairs. We have pleasure in presenting your Statement of Advice (SOA), which sets out our specific recommendations for your consideration."
- about.3 (30): "This Statement of Advice (SOA) is based on your relevant personal circumstances and serves as the foundation of our recommendations. If any information in this document is incorrect or if you have additional details to provide, please let us know before proceeding as this may impact the appropriateness of our advice for you."
- about.4 (30): "This Statement of Advice (SOA) has been prepared based on our discussions and the information you have provided in the Fact Find."
- about.5 (29): "In order to determine the recommendations made in this Statement of Advice (SOA) we assessed various alternatives:" ⟦This is the Alternatives lead-in, but it goes to section 1, not section 7.⟧
- reliance.1–3: listed under section 8 below. They are sent to both section 1 and section 8.

**Section 3 "Scope of our advice"** (`scope`)
- scope.1 (32): "As a result of the agreed subject matter of advice, we have identified the scope of advice to be:"
- scope.2 (32): "You have asked us to limit our advice to the areas listed above. It is important you know we have not provided advice on the following:"
- scope.3 (29): "After speaking with you, we agreed to include the following areas of advice as they link directly to what you want to achieve:"

**Section 4 "Your objectives"** (`objectives`)
- objectives.1 (32): "In preparing our recommendations we have taken into consideration your personal and financial needs and objectives. These are outlined below:"
- objectives.2 (32): "During our discussions, you indicated a range of goals and objectives that you are seeking to achieve in relation to your wealth protection. After a detailed discussion you were very clear about the level and types of cover that you want to meet your specific goals and objectives." ⟦This is line 1 of the client-directed INA wording in Route B memory. Route A sends it while also forbidding "declined" wording.⟧
- objectives.3 (31): "This section details our recommendations for your insurance portfolio, including how this assists you towards achieving your needs and objectives, the benefits to you, how our advice places you in a better position and key aspects you should be aware of." ⟦This is the recommendations opening paragraph, but it goes to section 4.⟧

**Section 5 "Where you are now"** (`current-position`)
- current-position.1 (32): "We have summarised the relevant aspects of your current situation that you have provided to us below. We take this into consideration when developing our advice, so if any information has changed, or is incomplete or incorrect, please advise us."

**Section 6 "Insurance recommendations"** (`recommendations`, `replacement`, `underwriting`)
- recommendations.1 (32): "The product/s we have recommended also need to be tailored to suit your specific needs. We have included the following features as part of our recommendations."
- recommendations.2 (31): "You should ensure you understand the features and limitations of any products we have recommended before proceeding."
- **Suicide exclusion**, replacement.1 (32): "You will temporarily lose the ability to make a life insurance claim in the event of suicide. A waiting period of 13 months will apply before a claim can be made for death resulting from suicide."
- **Non-disclosure period**, replacement.2 (32): "Upon entering a new contract with your new insurer, the insurer may have the right to void the contract within the first three years if you fail to comply with the duty to take reasonable care not to make a misrepresentation prior to the contract being entered into. This non-disclosure or misrepresentation can be made honestly and unintentionally. There is no requirement in this provision that the non-disclosure or misrepresentation be fraudulent."
- **Clawback lead-in**, replacement.3 (32): "Therefore, if you replace, cancel or reduce the cost of your insurance policy within the first two years we will invoice you the amount of commission that the insurance provider claws back from us. The clawback provisions are complex but as a general rule the rates are as set out below;" ⟦The rate table is not in the wording file. The Fees brief says 100%/60%. This block goes to section 6, not section 9.⟧
- **Health check**, replacement.4 (25): "We recommend you obtain a health check prior to proceeding with the reduction/cancellation of your insurances in the event that you may have health issues you are not aware of or are able to make a claim on the policies."
- **Continuity**, replacement.5 (25): "As you are replacing an existing policy with the recommended policy, you should maintain your existing cover until the new policy is established to ensure you have continuous cover."
- underwriting.1–5: listed under section 8 below. They are sent to both section 6 and section 8.

**Section 8 "Important information"** (`important-info`, `duty-of-care`, `cooling-off`, `underwriting`, `reliance`)
- important-info.1 (32): "Over time, your circumstances and need for insurance can change. It is important to regularly review your insurance arrangements with us to ensure you have the right cover in place to protect you and your family."
- important-info.2 (32): "Where I have recommended a financial product you should read the corresponding Product Disclosure Statement (PDS) which relates to that product before deciding to invest. Some financial products have a cooling off period of up to 14 days. This means you should you change your mind you may be able to receive your money back." ⟦**Flag:** investment wording ("before deciding to invest", "receive your money back").⟧
- **Duty to take reasonable care**, duty-of-care.1 (32): "When applying for any insurance, you have a legal duty to take reasonable care not to misrepresent any information to the insurer prior to any insurance contract being entered. This duty also extends to in-force policies when being changed or reinstated."
- duty-of-care.2 (32): "Please note the following information regarding your duty to take reasonable care to the Insurer. The key elements are:" ⟦The list of key elements is not in the file; the model writes it.⟧
- duty-of-care.3 (32): "Additionally, after the cover starts, if you believe that you may not have met the duty to take reasonable care, you must adviser the insurer immediately." ⟦The typo "adviser" is in the source.⟧
- **Cooling off**, cooling-off.1 (32): "Life insurance products have a cooling-off period during which you can check that it meets your needs. Within this period, you can cancel the cover. Details about the cooling-off period are set out in the Product Disclosure Statement."
- underwriting.1 (32): "Once the insurer has received your application, they will advise what other requirements they have of you. This can involve having a blood test or a medical examination or they may write to your doctor for a report. We will let you know what these requirements are as soon as we have been informed."
- underwriting.2 (32): "Your insurance does not commence until the insurer has completed their assessment, approved your application and issued the insurance policy."
- **Interim cover**, underwriting.3 (32): "Some insurers provide interim cover in certain circumstances while they are assessing your application. The terms and conditions of the cover are outlined in the Product Disclosure Statement. You do not pay an extra premium for this cover."
- underwriting.4 (28): "Important notePremiums are subject to underwriting requirements and approval from the insurer." ⟦The missing space is in the source.⟧
- underwriting.5 (23): "Access to the recommended level of cover is subject to underwriting requirements and acceptance by the life insurance company."
- reliance.1 (32): "In preparing this material we have relied on information supplied to us, which, where reasonable, we have assumed to be complete and accurate. While all reasonable efforts have been made to substantiate such information, no responsibility or liability can be accepted, if the information is incorrect or inaccurate."
- reliance.2 (32): "This analysis is prepared solely for your use and neither we nor any other company supplying information on which the analysis is based will accept any liability whatsoever to any third party."
- reliance.3 (31): "The recommendations in this analysis are based on information current as at the date of this SOA."

**Section 9 "Fees and disclosures"** (`fees`)
- fees.1 (32): "Synchron Advice Pty Ltd and its representatives may receive payments, benefits and commission for the services provided to you as shown below."
- fees.2 (32): "Our remuneration schedule may show that we are paid an upfront and ongoing commission by insurance providers. We have chosen this method of remuneration so that you do not have to pay us directly for our insurance advice and services. If you cancel or make changes to your insurance policy/ies within the first two years, we may be required to pay back all or some commission."
- fees.3 (31): "The insurance commission we will receive from the insurance provider in connection with these policy(ies) once they are in force is shown below."
- fees.4 (31): "Insurance commission is calculated as a percentage of part of your annualised policy cost (being the base premium, which is the premium you pay, less any stamp duty and policy fee). The actual commission amount paid will vary in line with any changes to the premium amount and may be lower than the rate disclosed."
- fees.5 (31): "Once the policy becomes active, insurance commission will be paid to Synchron Advice Pty Ltd by the insurer at the percentage rate and frequency shown above. This is included in the insurance premium you pay and is not an additional cost to you. Initial commission is paid for the first year the policy is in force, and ongoing commission is paid for each subsequent year until the policy ceases or we are removed as the servicing adviser, at which point the new servicing licensee or representative may continue to receive the ongoing commission."
- **Informed consent for commission**, fees.6 (22): "Understand that it is a requirement of the law that my consent must be obtained, and is now obtained, before the payment of an insurance commission, and this consent, once provided, is irrevocable." ⟦This is first-person declaration wording, but it goes to Fees, not to Authority to proceed.⟧

**Section 10 "Actions required"** (`actions`)
- actions.1 (32): "Once you understand and comfortable with the advice, you will be provided an electronic signature copy to sign the authority to proceed, fact find and FSG."
- actions.2 (32): "Once the case is accepted, we will discuss it again and discuss and ensure you are happy with everything."
- actions.3 (31): "After you have carefully read this Statement of Advice and the associated information, you will need to undertake the following steps to proceed with our advice:"

**Sections 2, 7, 11 and 12** get no house wording.

#### 7.2 Route A: fixed instructions in the prompt (the model writes the words)

| Topic | Instruction | Trigger | Where |
|---|---|---|---|
| Do-not-cancel warning on replacement | "must NOT cancel the existing policy until the new cover is confirmed in force…", plus an old-vs-new comparison | Model decides "where a recommendation replaces or cancels existing cover" | Guardrail 4, `riskSoaGenerator.js:35` |
| Duty of reasonable care, not "duty of disclosure" | ICA 1984 as amended 5 Oct 2021 | Always | Guardrail 5 |
| Stepped vs level | "State whether each premium is STEPPED or LEVEL and explain the long-run cost difference." | Always | Guardrail 6 |
| Cover not in force until accepted | — | Always | Guardrail 7 |
| Remuneration | "adviser service fee and/or insurance commission (upfront and ongoing), in dollars where known" | Always | Guardrail 8 |
| Super tax and ownership | Life in super: a lump sum to a non-dependant is taxed (15% plus Medicare). TPD in super: any-occupation only; no own-occ after 1 July 2014. Trauma: never in super. IP in super: restricted. | Each recommended policy (model decides) | Guardrail 3 |
| Clawback rates | "100% of commission in the first year and 60% in the second … with the hardship waiver" | Always (Fees section) | Fees brief, `legacySoaStructure.js:115` |
| Tax incidental note | "Include the standard note that any tax advice is incidental." The wording itself (`general.4`) is not sent. | Always (Scope) | Scope brief |
| Firm and licensee identity | See §5.7 | Always | Guardrail 11 |
| Needs analysis | Never say it was declined | Always | Guardrail 2; section 6 brief |

#### 7.3 Route B: fixed wording from memory

| Wording | Trigger | Where |
|---|---|---|
| INA lines 1–3 (quoted in §5.13), then "You have directed the following:" | Tristan answers "no" to the INA question | `soa-ask-ina-every-time.md` |
| **Incomplete INA warning**: "We have recommended that you complete a full insurance needs analysis … you may be over or underinsured…" | Same | Same file. Also `needs-analysis-position.2` in the wording file, which Route A does not use. |
| Risks box closing lines: "Access to the recommended level of cover is subject to underwriting requirements and acceptance by the life insurance company." and "Initial and ongoing premiums apply in relation to your insurance policy." | Every recommendation section | `soa-recommendation-wording.md` |
| Retain section: "Your existing level of cover continues to be consistent with your needs. You have indicated you are comfortable with the level of cover." / "There has been no change to the levels of cover and/or other terms of your personal risk insurance policy(ies)." / "If there are changes to your personal situation… we will reassess…" | Cover is retained | Same |
| "This policy will have the following levels of coverage & following features:" | Every new policy | Same |
| "Differences in Benefits - IMPROVEMENTS:" / "- DECREASES:" / "Other Note: A more extensive listing of comparable benefits is available on file" | Replacement | Same |
| "The new <Insurer> policy is subject to underwriting, which may include a medical examination, blood test and financial evidence of your income." | Replacement (Costs of replacement) | Same |
| Alternatives lead-ins: "In order to determine the recommendations made in this Statement of Advice (SOA) we assessed various alternatives:"; "We have considered and dismissed the following strategies:"; "it was not recommended because:"; "We have considered and dismissed the following insurance products:" | Always in Route B (Alternatives is its own section) | Same |
| Everything else (suicide exclusion, duty of care, cooling off, fees, Authority to Proceed) | Carried over from the cloned SOA | The example .docx (skipped). Exact text for Route B: NOT FOUND. |
| Cancellation letter: "Could you please cancel the above {policy\|policies} and refund any premiums if applicable." plus the build date | Every pack letter | `fix_cancellation_letter.py:19`; `build-pack` skill |

#### 7.4 Wording asked about that was not found

- **Level premium crossover / level premium disclaimer:** NOT FOUND. I searched `riskSoaGenerator.js`, `legacySoaStructure.js`, the house wording JSON, all three skills and the SOA memory files. Route A has only guardrail 6. One unused block (`general.31`) says: "Premium structure: Variable age-stepped premiums start low but rise yearly as you age, giving you initial savings but gradual cost increases."
- **QTRP (qualified tax relevant provider):** NOT FOUND in code, prompts, skills or memory.
- **Referral fee disclosure:** Route A's prompts have no referral wording. The partners and fee rates are in `legacy-practice.json` (PPA 25% of initial and ongoing incl. GST; The HOPE Fund 10% excl. GST; Tony Chen 10% of initial, one-off, incl. GST), but no SOA code reads that file. The Route A UI textarea placeholder does mention "referral fee to disclose…". Route B memory says the disclosure must name the dollar amount and that only PPA, The HOPE Fund and Tony Chen have approved wording. The wording itself: NOT FOUND in the repo.
- **Related-party disclosure:** NOT FOUND.
- **Separate informed consent form:** none in Route B packs ("commission consent is in the SOA Authority to Proceed"). Route A only sends `fees.6`.

#### 7.5 Investment or superannuation wording flagged

Sent to the model in Route A:
- `important-info.2`: "…before deciding to invest… you may be able to receive your money back."
- Guardrail 3's super tax statements (lump sum taxed when paid to a non-tax-dependant; premiums deductible to the fund). These are tax and super statements.
- `objectives.2` and the brief text both use "wealth protection".

In the wording file but **not sent** (key `general`). These would become a risk if the template or the wiring changed:
- general.1 "…attainment of your personal and investment objectives."
- general.12 "Several steps are involved in designing a strategy…"
- general.19 "…emails … relating to investment opportunities…"
- general.23 "increase the size of your estate to achieve your distribution goals for your desired beneficiaries."
- general.25 "…my Tax File Number(s) for the provision of financial planning and investment services."
- general.33 "…protect your long-term wealth accumulation strategy."
- general.30 names stale FSG versions: "Financial Services Guide Part One version V9.0 and Part Two version 8.1".

Route B memory asks for a "financial-security bullet (debts, lifestyle, wealth accumulation)" in every "Why you are likely better off" box.

---

### 8. Decision logic: what changes what

#### 8.1 Rule table

In the "Decided by" column, "Code" means code makes the decision and "Model" means the model makes it (or Claude, following instructions). "Route B" rules are instructions to Claude; the per-case scripts that carry them out were skipped.

| # | Condition (as tested) | What changes | Where | Decided by |
|---|---|---|---|---|
| 1 | `ANTHROPIC_API_KEY` unset | Route A SOA becomes a stub with `[ADVISOR TO CONFIRM] <brief>` for each section. Stages 1–3 throw. | `riskSoaGenerator.js:199-201`; `writers.js:50-52` | Code |
| 2 | One section's API call throws | That section becomes the offline-stub line; the rest of the SOA is still written. `ai: true` is still returned. | `ai.js:116-125`; `riskSoaGenerator.js:160-178, 216-220` | Code |
| 3 | A `training_data` row with `kind='plan'`, `doc_type='risk_soa'`, `is_template='true'` exists and splits into ≥3 sections (3–45 headings matching `/(\d{1,2})\.[ \t]+([A-Z][^\n]{2,80})/`) | Sections and order come from the template. The template excerpt replaces the brief. The system prompt switches to "Mirror that section's structure…". **House wording is no longer sent** (template sections have no `wording` key). | `riskSoaGenerator.js:65-98, 123-138, 193-197` | Code |
| 4 | `env.adviser.ar` empty (currently there is no `ADVISER_AR` in `.env`) | The prompt says "Authorised Representative No. [ADVISOR TO CONFIRM]" | `riskSoaGenerator.js:43` | Code |
| 5 | The section's `wording` keys | Which house wording blocks are sent (§7.1) | `legacySoaStructure.js:53-135` | Code picks the blocks; the model places them and decides whether to use the replacement blocks |
| 6 | `sec.isFrontMatter` | Adds the unnumbered-headings rule. **Never true**, because no section sets it. | `riskSoaGenerator.js:142-146` | Code (dead) |
| 7 | A recommendation replaces or cancels existing cover | Do-not-cancel warning and old-vs-new comparison | Guardrail 4 | Model |
| 8 | Replacement house wording (13-month suicide exclusion, 3-year avoidance, clawback, health check, continuity) | Sent to section 6 **every time, new cover included**, with "do not omit one" | `legacySoaStructure.js:90` | Code sends it; model decides |
| 9 | Cover held inside super | Ownership and tax statements per cover type; trauma always outside super; TPD any-occ only in super | Guardrail 3 | Model |
| 10 | Premium structure | State stepped or level and the long-run cost difference | Guardrail 6 | Model |
| 11 | Affordability is "a stated concern" | Address it explicitly | Guardrail 6 | Model |
| 12 | Any figure not supplied | `[ADVISOR TO CONFIRM]` | Guardrails 1, 8, 10; briefs | Model |
| 13 | Needs analysis | Never say it was declined; justify each sum insured in prose against debts, income, dependants, existing cover and objectives | Guardrail 2; section 6 brief | Model |
| 14 | Alternatives "genuinely considered" | What section 7 contains | Section 7 brief | Model |
| 15 | SharePoint folder linked (`wb.sharepoint_folder`) | Stage 4 reads up to 14 filed files; categories come from file names | `routes/workbench.js:457-464`; `indexer.js:147-163` | Code |
| 16 | `WORKBENCH_READ_SHAREPOINT === 'true'` and a folder is linked | Stages 1–2 read up to 5 "known facts" files | `routes/workbench.js:26, 378-391` | Code |
| 17 | Folder linked, or a name match in the DB or the SharePoint folder names | Status line EXISTING / POSSIBLY EXISTING / NEW in Stages 1–3 | `lookup.js:123-131`; `writers.js:61-64` | Code picks the line; the model acts on it |
| 18 | Partner name present (`isCouple`) | Stage 1 labels (Spouse Details block) and few-shot example; the `who()` line; the fact find keeps the partner column | `paths.js:39-71`; `writers.js:75-80` | Code |
| 19 | `len(clients) == 1` in the fact find JSON | Partner column removed from per-client tables; signatory table loses 3 columns | `generate_fact_find.py:316-323` | Code |
| 20 | Every amount in an income, expense, asset or liability table parses as money, and no Total row was given | A Total row is added | `generate_fact_find.py:232-235` | Code |
| 21 | Text contains `TBC` (fact find), or `TBC` / `[ADVISER TO CONFIRM…]` (SOA Notes) | Yellow highlight | `generate_fact_find.py:186-194`; `build_soa_notes.py:26-35` | Code |
| 22 | Fact find `scope` missing | The "Scope of advice" box uses `why` | `generate_fact_find.py:289` | Code |
| 23 | Fact find `scope_items` given | "Agreed scope" box = the fixed lead-in "As a result of the agreed subject matter of advice, we have identified the scope of advice to be:" + "- Review of your personal risk insurance needs: " + the items | `generate_fact_find.py:328-334` | Code |
| 24 | Signatory row already contains "Joshua Davidson" | Client names are not written into that table | `generate_fact_find.py:336-341` | Code |
| 25 | Pack file name matches a slot regex | Slot, order and pack name; quotes, SOA Notes and ROA are excluded | `pack.js:42-82` | Code |
| 26 | Insurer name in an application file name | Named `<Insurer> Application Summary - Pre-Fill - <person>`. The list is `TAL, MetLife, Zurich, AIA, NEOS, OnePath, MLC, ClearView, Encompass, Resolution Life, BT, MLC Life, Integrity`; anything else becomes "Insurer". | `pack.js:39-40, 59, 77` | Code |
| 27 | A firm document exists only in Word | A PDF is exported next to it and the .docx hash is re-checked | `pack.js` ~line 254; `build-pack` skill | Code (A) / Claude (B) |
| 28 | No FSG in the pack | READ ME review line "No FSG in the pack (2026 FSG is v9.1)." | `pack.js:262` | Code |
| 29 | Route B: an SOA is being built | Adviser = Tristan Biro (from 23 Oct 2026); replace any other adviser's details from the clone | `build-soa` step 3; `tristan-is-adviser-on-all-soas.md` | Route B |
| 30 | Route B: was an INA done? | "No" → client-directed wording plus the Incomplete INA warning; drop the XPLAN zero-filled needs table. "Yes" → NOT FOUND (no wording given). | `soa-ask-ina-every-time.md` | Route B (Tristan answers) |
| 31 | Route B: cover retained | "Retain your existing…" section with its fixed lines | `soa-recommendation-wording.md` | Route B |
| 32 | Route B: replacement | "Differences in Benefits" bullets from the Risk Researcher ratings that differ, grouped by old insurer if there are several. Costs of replacement = the underwriting line only. | Same | Route B |
| 33 | Route B: like-for-like comparison | Priced at the **recommended** cover levels. The recommended figure strips out cover the existing fund cannot offer. | `legacy-soa-from-case-folder.md`; `build-soa` step 3 | Route B |
| 34 | Route B: commission | Disclosed per policy (super-owned and personal on separate lines). 66% / 22% of the total annual premium including plan fee and stamp duty. | Same | Route B |
| 35 | Route B: policy owned in super | Owner = trustee / member (examples per fund). OneCare Super → "Brighter Super Trustee". | `soa-recommendation-wording.md` | Route B |
| 36 | Route B: the file is silent | `[ADVISER TO CONFIRM]`; "Not provided / To be confirmed" cells | `build-soa` step 3; memory | Route B |
| 37 | Route B: referral source | Review list item; disclose the dollar amount; approved wording exists only for PPA, HOPE Fund and Tony Chen | `legacy-soa-from-case-folder.md` | Route B (flagged to Tristan) |
| 38 | Route B: Tristan has already edited the SOA | Apply further changes on his copy; never regenerate | `legacy-soa-from-case-folder.md` | Route B |

#### 8.2 Insurer

**Neither route holds per-insurer SOA content.** Nowhere in the code, prompts, skills or memory are there per-insurer product names, PDS titles, definitions, feature text, exclusions, waiting or benefit periods, commission rates or clawback terms. Route A relies on the model's general knowledge plus whatever the filed documents say. Route B relies on the cloned example SOA, the filed quotes and research, and Claude's general knowledge. What does exist per insurer is listed below.

**If TAL is recommended, the SOA must say / include / calculate the following:**
- Logo `xplan/tal.png` (also `hires/tal.png`) in the portfolio table (Route B).
- Pack: use the current PDS (12 Dec 2025, `accelerated-protection-combined-pds.pdf`) from a recent client folder, not the template library (memory).
- Pack: leave out the direct debit form when the TAL application summary already holds the payment details (`build-pack`).
- Reduction: the instrument is TAL's signed quote illustration (memory).
- Nothing else found.

**If MetLife is recommended:**
- Logo `xplan/metlife.png`, `hires/metlife.png`.
- Pack: current MetLife Protect PDS, 16 Nov 2025, from metlife.com.au (memory).
- Nothing else found.

**If OnePath is recommended:**
- Logo `xplan/onepath.png`, `hires/onepath.png`.
- Super-owned OneCare Super: owner "Brighter Super Trustee" (formerly "OnePath Custodians Pty Ltd") / member. Funded by rollover from the client's main fund, so the owner is never the main fund (memory).
- No Brighter Super logo yet (logo README).
- Nothing else found.

**If PPS Mutual is recommended:**
- Logo `xplan/pps-mutual.png`.
- Super-owned owner example: "PPS Mutual Super Fund" (memory).
- Possible feature bullet "PPS Profit Share", if research supports it (memory, given as an example).
- The application is a paper AcroForm; read its fields with pymupdf (memory).
- Nothing else found.

**If AIA, Acenda, AMP Life, ClearView, Encompass, Futura, NEOS, NobleOak, Resolution Life or Zurich is recommended:**
- Logo in `xplan/` (Acenda and ClearView also in `hires/`).
- Pack application file names use the insurer name only for those in `pack.js`'s list (AIA, NEOS, ClearView, Encompass, Resolution Life, Zurich).
- Nothing else found.

**If Asteron, BT, MLC or Integrity is recommended:**
- Named in `legacy-practice.json` or `pack.js`. No logo (MLC is listed as missing). Nothing else found.

**Regardless of insurer, Route A always says:**
- All the house wording in §7.1, including the 13-month suicide exclusion and the 3-year avoidance period, both stated as fixed periods.
- That commission is calculated on the base premium, excluding stamp duty and policy fee (`fees.4`).
- Clawback of 100% in year one and 60% in year two (Fees brief).
- The guardrail rules in §7.2.

**Regardless of insurer, Route B always says:**
- Whatever the cloned SOA carries, plus the memory wording in §7.3.
- Commission of 66% / 22% of the total annual premium, including plan fee and stamp duty.

#### 8.3 Cover type

| Cover | Route A | Route B |
|---|---|---|
| Life | Guardrail 3 (super tax; name the likely beneficiary and their dependant status). The suicide house wording is sent regardless. | Memory records an unwanted "Life suicide warning" left over in a firm SOA's template. No rule found on when it applies. |
| TPD | Guardrail 3: any-occupation only in super; no own-occ in super after 1 July 2014. | Example risk bullet: "To qualify for a TPD payment you will need to satisfy the definition(s)…". SuperLink is mentioned. The like-for-like figure strips out own-occ TPD the fund cannot offer. |
| Trauma | Guardrail 3: never inside super. | The like-for-like figure strips out trauma the fund cannot offer. |
| Income protection | Guardrail 3: in super, indemnity-style and narrower; outside super, premiums generally deductible. | INA example "to 65 / 30 days"; goal example "in line with 70% of your income". |
| Business expenses | NOT FOUND in any prompt, skill or memory file. | NOT FOUND. |

No code changes the sections or tables by cover type.

#### 8.4 Inside or outside super

- **Route A:** guardrail 3 only, plus "Inside Super" and "Outside Super" columns in the portfolio table. Erosion-of-super warning: NOT FOUND. Premium funding is covered only by the phrase "the means of funding a premium". Beneficiaries: only "Name the likely beneficiary and their dependant status".
- **Route B:** owner = trustee / member; commission lines split super-owned from personal. Rollover authority forms go in the pack only when needed. Erosion warning and beneficiary nomination wording: NOT FOUND.
- **Stage 3** asks Howard to quote "inside/outside super".

#### 8.5 Stepped vs level

Route A has guardrail 6 only. **No crossover-year calculation exists** anywhere, and no level premium disclaimer was found. For Route B: NOT FOUND, apart from whatever the cloned SOA carries.

#### 8.6 New cover vs replacement vs increase vs reduction / cancellation

| Path | Route A | Route B |
|---|---|---|
| New | Portfolio Action "New". The replacement wording is still sent. | "we recommend implementing a new <insurer product> policy"; no "separate application". |
| Replacement | Guardrail 4 (do-not-cancel warning; compare definitions, waiting and benefit periods, exclusions, loadings, premium structure, loyalty and guaranteed renewability). Portfolio Action "Replace". Replacement house wording. | Replacement advice tables, Differences in Benefits, Costs of replacement, like-for-like at recommended levels. Review-list item "XPLAN replacement step". |
| Increase | NOT FOUND | NOT FOUND for the SOA. The CvC bottom row reads "Yearly Premium". |
| Reduction | `replacement.4` (health check) mentions "reduction/cancellation". | Pack: signed quote illustration plus an alteration letter. CvC bottom row reads "Yearly Saving". |
| Cancellation | Portfolio Action "Cancel". Guardrail 4. | Strategy step "Cancel your existing … policy". The cancellation letter is dated and says "cancel". |
| Retain | Portfolio Action "Retain". | "Retain your existing…" section. |

#### 8.7 Client circumstances

| Circumstance | Effect found |
|---|---|
| Smoker status | A field in "Where you are now". Guardrail 10 forbids inventing it. No other effect. |
| Occupation class | Guardrail 1 forbids stating an occupation rating that wasn't supplied. Stage 1's UNDERWRITING section keeps "the occupation rating still to be established". |
| Age bands | NOT FOUND. Ages are only printed. |
| Single vs couple | §8.1 rules 18 and 19. Route B's INA template is adjusted for a couple. |
| Dependants | Listed first in the client file text. Used in the needs reasoning (guardrail 2). |
| Existing cover | Rendered in full in the client file text. Triggers the replacement rules. |
| Loadings / exclusions | Guardrails 1, 4 and 7. Route B: exclusion acknowledgement paragraph; bold acknowledgement under the objectives table. |
| Declined or incomplete information | `[ADVISOR TO CONFIRM]` / `TBC`. The fact find's "Incomplete or inaccurate information" box defaults to "None". |
| Health | Fact find health defaults to "Good". SOA Notes ask for pre-assessments for any disclosed condition. |
| Existing client | Status line (§8.1 rule 17). |

#### 8.8 Scope

There is no limited-scope vs full-scope branch in either route. Route A always sends `scope.1–3`. Route B: scope bullets list the advice areas, not the outcomes. The fact find's "Advice limitations" box keeps the master's standard wording (`KEEP_TEXT`); its text was not read.

#### 8.9 Adviser

- **Route A:** name from `ADVISER_NAME`. The AR number comes from `ADVISER_AR`, which is not set, so the placeholder appears. `email` and `phone` are not used in any SOA prompt.
- **Route B:** Tristan from 23 Oct 2026; Sub-AR 1313019; P 0406 824 597, E Tristan@legacyriskadvice.com.au. Insurer applications and quotes stay under Josh Davidson.
- QTRP status: NOT FOUND. Adviser fee amounts: NOT FOUND.

#### 8.10 Referrals and related parties

See §7.4. No code triggers a referral disclosure. Related-party disclosure: NOT FOUND.

#### 8.11 Decisions made with no written rule (gaps)

1. Whether a recommendation is new cover, a replacement, an increase or a reduction. There is no field for it.
2. Whether the replacement house wording appears in a new-cover SOA. Route A sends it every time and says not to omit it.
3. Which insurer and product to recommend, and why.
4. Which product features, definitions, waiting periods and benefit periods to describe.
5. The duty-of-care "key elements" list.
6. The clawback rate table. The lead-in sits in section 6 and the rates in section 9.
7. The level vs stepped explanation and any long-run cost figures.
8. The needs-analysis reasoning for each sum insured (Route A).
9. Which insurers appear under Alternatives, and why each was dismissed.
10. The super tax consequences for the specific client, and "the likely beneficiary".
11. The section heading text and numbering the model writes.
12. The Authority to proceed wording.
13. How the model reconciles `objectives.2` with guardrail 2.
14. Route B: which example SOA counts as "closest".
15. Route B: what to write when an INA **was** done.
16. Route B: the order of sections that memory does not cover.

---

### 9. Figures and calculations

| Figure | Input | Calculation | Human or system |
|---|---|---|---|
| Ages | DOB in the DB | `ageFrom()` in `planGenerator.js` (not read in detail) | Code |
| Annualised income and expenses | DB amount and frequency | `toAnnual(amount, frequency)` | Code |
| Household totals (assets including investments, liabilities, net worth, income, expenses, surplus) | DB tables | `planGenerator.js:193-203` | Code; sent to the model |
| Fact find totals | Model-written JSON rows | Sum of the last column, if every amount parses; formatted `$n,nnn` with no cents (`generate_fact_find.py:232-235`) | Code |
| Fact find ages "(44)" | Transcript | The model writes them | Model |
| Premiums and premium totals | Filed quotes, adviser notes, DB `insurance_policies` | Read and written by the model. "Reconcile every premium against the quote" is an instruction, not a check. | Model / Claude |
| Sums insured | Adviser notes, SOA Notes, filed documents | Never derived ("present the REASONING, not the arithmetic") | Model / Claude |
| Commission, upfront and ongoing | Risk Checklist text, if filed | Route A: the model. Route B: 66% / 22% of the total annual premium including plan fee and stamp duty. | Model / Claude |
| Clawback | — | 100% in year 1, 60% in year 2 (brief text). No dollar calculation is asked for. | Model |
| Like-for-like replacement figure | Quotes; the fund's cost-of-cover calculator | Recommended total less the cover the existing fund cannot offer | Claude (Route B) |
| CvC Yearly Premium / Yearly Saving | Final quote; current premium | New annual cost; or (current − new) × 12 | Claude (Route B) |
| Crossover year | — | NOT FOUND | — |
| Cashflow tables | — | NOT FOUND. Route A section 5 asks for "income and expenditure" tables. | Model |

**Every SOA figure in Route A is written by the model.** The only numbers code computes are the ages, annualised amounts and household totals in the client file text. The per-case scripts that set Route B's figures were skipped.

Things that look wrong or inconsistent:
1. **Commission base conflict.** `fees.4` says commission is calculated on the base premium excluding stamp duty and policy fee. Route B memory says house commission is on the **total** premium including both.
2. **Household totals for a new Workbench client.** The Workbench only fills the name fields, but `contextToText()` always appends the `Household totals — …` line (`planGenerator.js:203`). The totals are likely to show zero amounts, which the model could repeat. I did not check how `money(0)` prints.
3. **Fact find totals drop cents** (`generate_fact_find.py:86-87`).
4. **Two date formats in one document.** The SOA body date is `en-AU`, but the Word header from `renderPlanHtml` is `en-US` ("October 27, 2026", `planRender.js:37`).

---

### 10. Where facts come from

- **There is no source-tracking mechanism** in either route. No fact or figure records which document or field it came from.
- Route A returns `sourcesRead` (the SharePoint files it read) to the browser. It is not stored.
- In the prompt, `===== <path> (<category>) =====` separators show the model where each piece of text came from. The output does not carry them.
- Route A precedence, as stated in the prompts:
  - adviser notes over the transcript (Stages 1–3);
  - "ADVISER NOTES — these reflect the advice actually given and take precedence over inference" (Stage 4);
  - the meeting over older SharePoint files (Stages 1–2);
  - meeting notes are placed ahead of uploaded documents in the client file text.
- Route B precedence: SOA Notes and the Risk Checklist first; the latest fact find over the Stage 1 draft; DOBs checked against insurer certificates; schedules checked against the last signed quote. Claude's review list is the only record of any conflicts.

Places where the system can state something that is in no source document:
1. Every Route A section is model-written. The Executive summary brief says "say less rather than inventing motivation", which limits this but does not prevent it.
2. Guardrail 2 asks the model to "reason each sum insured through", even when no needs figures were supplied.
3. Guardrail 3 asks it to "Name the likely beneficiary and their dependant status".
4. Section 7 asks it to name the insurers evaluated and why each was dismissed.
5. Product features and definitions come from model knowledge when no quotes or PDSs are filed.
6. The household totals line may show zeros (§9 item 2).
7. Replacement warnings may appear for new cover.
8. The Stage 1 few-shot example is a real client's file. The prompt says "copy its form, never its facts", but nothing checks this.
9. Route B: a cloned SOA carries another client's text, images and adviser details until each one is replaced. Memory records real leaks of this kind. `leakscan_docx.py` exists to check for this. Whether it runs on every SOA: NOT FOUND.

---

### 11. Template and rendering

#### Route A

- Pipeline: Markdown → `marked.parse` → inline-styled HTML (`renderPlanHtml`, accent `#1f6f9f`, tagline "Insurance & Risk Advice") → `html-to-docx` (portrait, 720-twip margins) → `.docx` → PDF via Word COM.
- **There is no Word template.** The output has no firm styles, cover page, table of contents, logos, header or footer, or page numbering.
- The model writes `[ADVISOR TO CONFIRM]` as plain text. Nothing highlights, counts or blocks it in the SOA. The SOA Notes builder highlights only the other spelling, `[ADVISER TO CONFIRM…]`.
- Problems visible in the code:
  - Two title blocks: one from `renderPlanHtml` (en-US date) and one at the top of the content (en-AU date).
  - The front-matter rule never applies (§8.1 rule 6).
  - Each section is written separately, so numbering across sections is up to the model.
  - Word's PDF export can hang. The code treats a failed export as a warning.

#### Route A, Stages 1–3 builders

- **Meeting notes.** The README lists three gaps: no TBC highlighting, no Spouse Details block, and stray headings that Tristan deletes by hand.
- **Fact find.** Filled by Heading 1 / Heading 2. Empty tables keep one blank row. The XPLAN "Sample client:" text is scrubbed.
- **SOA Notes.** A plain Calibri document.

#### Route B

- The method: clone a completed example SOA, rewrite it with python-docx in a per-client script, then update the TOC, save and export the PDF with Word COM.
- There are no placeholders as such. Client text is overwritten, and unfilled spots become `[ADVISER TO CONFIRM]` or "Not provided / To be confirmed".
- Known rendering problems, all from memory:
  - text-box anchor paragraphs that contain nested paragraphs;
  - images left in the package after their paragraph is removed (a client PII leak);
  - empty cells that need borrowed run formatting;
  - vMerged portfolio rows;
  - text spilling onto divider photos;
  - deleting nested-table paragraphs corrupts the file;
  - images saved without an extension corrupt the file;
  - `<:==ImageStorage[n]:>` placeholders and an Opex `Err:` block in XPLAN merges;
  - `include_schedules Err` in all 32 examples;
  - Word PDF export hangs;
  - python-docx sometimes missing;
  - paths over 260 characters.

---

### 12. Versioning and history

| Item | Version control |
|---|---|
| `riskSoaGenerator.js` | Git. Commits: `14dfebb` (Add the insurance-only SOA generator), `16639a6` (Move to Claude Opus 5), `09835e7` (Stream SOA progress), `c879ef4` (Stop generated documents going out under the previous firm's AFSL), `064247a` (Rebuild the SOA generator on the Legacy house structure). |
| `legacySoaStructure.js`, `legacy-house-wording.json` | Git. Commits `064247a` and `31941b6` (Feed meeting notes and correspondence into the SOA). |
| `server/src/services/workbench/*`, `client/src/pages/wb/*` | **Not committed** (untracked). `routes/workbench.js` has uncommitted changes. |
| `.claude/skills/*` | **Not committed** (untracked). |
| `legacy/packs/*.py`; `build_soa_notes.py`, `generate_fact_find.py`, `prep-soa-case.ps1`, `docx-to-pdf.ps1`, `leakscan_docx.py` | **Not committed** (untracked). |
| Claude memory files | Not in git. Each has a `modified` timestamp in its front matter. |
| Example SOAs, masters, logos, per-case `.build/` scripts | Gitignored or untracked. The example SOAs have dates in their file names. |
| Other | Weekly checkpoint commits (latest `f9e6f41`, 28 Sep 2026). A scheduled OneDrive mirror (`e1f3200`). |

You **cannot** tell which prompt version produced a given SOA. Route A stores only `soa_markdown`, overwritten on each re-draft. It records no model, prompt version, template or source list. The older `/plans/generate-risk-soa` route stores `metadata.sections` and `metadata.used_template`, but nothing more. In Route B, the per-case script records how one SOA was built, but not which version of the skill or memory files was in force.

---

### 13. Known problems and workarounds

1. Word COM PDF export hangs on this machine, so the .docx is shipped instead (`run.js:56-60`, `prep-soa-case.ps1:49-50`, memory).
2. The meeting notes generator can't highlight TBC, add the Spouse Details block or delete unfilled labels. Tristan finishes these by hand (`initial-meeting-build/README.md`).
3. `.doc` files can't be read; they have to be re-saved as `.docx` (READMEs).
4. There is no blank SOA template (memory; `soa-build/README.md` lists it as "Waiting").
5. Tristan's AR number isn't configured for Route A. Memory now records it as 1313019.
6. All 32 example SOAs contain `include_schedules Err` (memory).
7. Firm SOAs and XPLAN merges carry template leftovers: a wrong client name, the Opex `Err:` block, the wrong adviser, `ImageStorage` placeholders, and the member's name as owner instead of the trustee (memory).
8. The PDS copies in the template library are superseded. Current PDSs come from client folders or insurer sites (`build-pack`, memory).
9. Insurance schedules and the CvC can carry a pre-variation premium. Check them against the last signed quote (memory).
10. The fact find can be wrong. Check DOBs against insurer certificates (memory, `meeting-notes`).
11. python-docx goes missing; `pip install --user python-docx` fixes it (memory).
12. Risk Researcher tables scramble when extracted as text, so they are read as images (memory).
13. The case extractor once wrote `.extracted/` inside a SharePoint client folder (memory index).
14. Many Route B rules are Tristan's corrections from reviewing Claude's drafts on 26 Oct 2026 (memory). Each one was a manual fix.
15. Once Tristan has edited the SOA in Word, later changes go on his copy (memory).
16. `soa-pipeline-built.md`: "Untested on a live transcript as of 2026-10-22".
17. `workbench-is-the-new-program.md`: FSG auto-pick, the stage list and the auto-copy to Downloads are "Not yet confirmed by him".
18. Route A writes `[ADVISOR TO CONFIRM]`; Stages 1–3 and Route B write `[ADVISER TO CONFIRM]`.
19. Steps a Word build doesn't cover: peer review, the XPLAN replacement step, APL/TMD evidence, the Risk Checklist compliance block, and the referral disclosure (`build-soa` step 5).
20. Pack: duplicate "Final" documents. Ask Tristan if two disagree (`build-pack`).

---

### 14. Dependencies

- **Languages:** Node.js (ESM), Python 3, PowerShell 5.1.
- **Server packages:** `@anthropic-ai/sdk` ^0.69.0, `express` ^4.19.2, `pg` ^8.12.0, `marked` ^14.1.4, `html-to-docx` ^1.8.0, `docx` ^9.5.1, `mammoth` ^1.8.0, `pdf-parse` ^1.1.1, `xlsx` ^0.18.5, `multer`, `dotenv`, `cors`, `morgan`.
- **Python:** `python-docx`. Memory also names `pymupdf`, `extract-msg` and `pdftotext`. No `requirements.txt` was found.
- **Database:** PostgreSQL.
- **Local tools:** Microsoft Word (COM), Excel (COM), OneDrive sync of the SharePoint library, `robocopy`.
- **AI provider:** Anthropic, model `claude-opus-5`. The key `ANTHROPIC_API_KEY` is in `server/.env` (present; value not read). Which account or organisation it belongs to: NOT FOUND.
- **Route B model:** the Claude Code session's model. Not pinned.
- **DocuSign:** credentials in `C:\Users\TristanBiro\.docusign\`. Demo environment until go-live.

---

### 15. Questions for Tristan

1. Which route is the real SOA system going forward: the Workbench draft, the `build-soa` clone method, or both?
2. Has a full Insurance Needs Analysis ever been done for a client? If one has, what should the SOA say? Route A forbids "declined" wording; Route B uses it in about 99% of cases.
3. Is commission calculated on the total annual premium including plan fee and stamp duty (66% / 22%), or on the base premium excluding them, as house wording `fees.4` says?
4. Are 66% initial and 22% ongoing the rates for every insurer? If not, what are they per insurer?
5. What are the clawback rates per insurer? Is "100% in year one, 60% in year two" right for all of them?
6. Should the SOA show a level premium crossover year? If so, how is it calculated, and what disclaimer goes with it?
7. Which warnings should appear only on a replacement? Should the 13-month suicide exclusion and 3-year avoidance wording appear on brand-new cover?
8. Is the suicide exclusion always 13 months, whatever the insurer?
9. What are the "key elements" of the duty to take reasonable care that follow `duty-of-care.2`?
10. What is the exact referral fee disclosure wording for PPA, The HOPE Fund and Tony Chen? Where does it go in the SOA?
11. Is there a related-party disclosure the SOA must carry?
12. Do you hold QTRP status? Should the SOA say anything about it?
13. What wording is used when cover is held in super: erosion of retirement savings, beneficiary nominations, premium funding by rollover?
14. Does the firm advise on business expenses cover? If so, what changes in the SOA?
15. Does a limited-scope SOA differ from a full one? Which sections or wording change?
16. Which example SOA should Route B clone for each case shape (single, couple, replacement, super, IP-only)?
17. What is the full section order of a current house SOA, with its exact heading text?
18. Should Route A's AR number be set to 1313019 in `server/.env`?
19. Does the fact find master's signatory table name Joshua Davidson as adviser? The builder skips that table when it does.
20. Should the Important information block keep "before deciding to invest… receive your money back"?
21. Is "Risks, Considerations & Consequences" the final box label?
22. Should the heading be "Why you are seeking advice" or "Why are you seeking advice"?
23. Should the Workbench Stage 1 prompt keep using a real client's meeting notes as its example?
24. Which Anthropic account or organisation does the API key belong to?
25. Should the skills, the workbench code and the builder scripts be committed to git?
26. Do you run `leakscan_docx.py` on every cloned SOA before it goes out? With which words?
27. If Josh Davidson or Luke Fisher use the shared skill, which Route B memory rules apply to their SOAs?
28. Where should per-insurer product facts (PDS titles and dates, definitions, waiting and benefit periods) come from: a reference file, the quotes, or the model?

---

## Part 4. SOA Pack, Letters, CvC and DocuSign

Scope: everything after the SOA is written. That covers the SOA pack (DocuSign pack), cancellation and alteration letters, Change of Servicing Rights, the CvC / FINAL Insurance Summary, the "application details" sheet, the pack READ ME, renaming, numbering and date restamping, and DocuSign draft envelopes.

Read-only review, 27 Oct 2026. Client names, phone numbers, amounts and referrers in quoted text have been replaced with placeholders such as [CLIENT_1], [PHONE] and [AMOUNT]. Adviser contact details are replaced with [ADVISER_PHONE] and [ADVISER_EMAIL]. Licence and AR numbers are kept.

Cross-reference: `c:\FPGod-Program\SOA-SYSTEM-SPEC.md` already covers the Route A Stage 5 summary (around line 273), the Route B step 5 summary (line 301), §5.14 (the build-pack skill), decision rows 25–28 (lines 1431–1434), the CvC row in figures (line 1590), and known problems 8, 9 and 20 (lines 1694–1706). This part goes into more detail and corrects one item: SOA-SYSTEM-SPEC line 76 says `readme_to_docx.py` was "Not read". It is described below.

---

### 1. Inventory

**Code (repo, all untracked in git)**

| File | What it does |
|---|---|
| `c:\FPGod-Program\server\src\services\workbench\pack.js` | Route A pack builder. It sorts files into slots by name, pre-ticks a suggested set, copies files with SHA-256 checks, exports PDFs of Word-only documents, writes `0 - READ ME.txt` and restamps file times. |
| `c:\FPGod-Program\server\src\routes\workbench.js` (lines 490–519) | `GET /cases/:id/pack` returns the candidates. `POST /cases/:id/pack` builds the pack (streamed NDJSON), sets `workbench_cases.pack_dir` and moves the stage to `pack`. |
| `c:\FPGod-Program\server\src\services\workbench\paths.js` | `packNameOf()`, `fullNamesOf()`, `DOWNLOADS`, and `assertWritable()`, which allows writes only in repo `legacy/` and Downloads and never in SharePoint. |
| `c:\FPGod-Program\server\src\services\workbench\sources.js` | Lists the client's SharePoint folder (read-only) and the repo case folder. `belongsToCase()` is used by the POST route. |
| `c:\FPGod-Program\server\src\services\workbench\run.js` (lines 56–80) | `exportPdfs()` runs `docx-to-pdf.ps1` with a 240 s timeout. Failures come back as warnings. |
| `c:\FPGod-Program\server\scripts\docx-to-pdf.ps1` | Word COM. Opens each file read-only and exports it as PDF (format 17). |
| `c:\FPGod-Program\client\src\pages\wb\PackTab.jsx` | Stage 5 screen: candidate table, slot dropdown, editable pack name, "Add a PDF next to Word-only documents" checkbox, Build and Open pack folder buttons. |
| `c:\FPGod-Program\legacy\packs\fix_cancellation_letter.py` | python-docx. Fills the `____/____/____` date and swaps the "amend your records" line for a "please cancel" line. |
| `c:\FPGod-Program\legacy\packs\readme_to_docx.py` | Converts a Markdown `0 - READ ME ... .md` into .docx (python-docx, Arial 10), then to PDF through Word COM. Before export it narrows the columns of a 3-column table whose first header starts with "#". |
| `c:\FPGod-Program\legacy\docusign\docusign.mjs` | DocuSign eSignature REST v2.1, JWT grant. Commands: `consent`, `check`, `draft <manifest> [--dry-run]`. It only creates envelopes with status `created` (draft). |
| `c:\FPGod-Program\server\src\db\schema.sql` line 748 | `pack_dir TEXT` column on `workbench_cases`. |

**Prompts and instructions**

| File | Role |
|---|---|
| `c:\FPGod-Program\.claude\skills\build-pack\SKILL.md` | Route B Stage 5 skill (quoted in full in §5). |
| Memory `soa-pack-format-confirmed.md`, `soa-pack-copy-firm-docs-unchanged.md`, `cancellation-letters-dated-and-say-cancel.md`, `docusign-api-setup.md`, `tristan-is-adviser-on-all-soas.md` | Rules and status (quoted in §5). |
| Memory `legacy-soa-from-case-folder.md` (sections on the third job type, the fifth job type (CvC), the sixth job type (application details) and the seventh-case pack note) | Pack shape history, CvC rules, application details sheet (quoted in §5). |
| `c:\FPGod-Program\legacy\docusign\README.md` | DocuSign setup and use. |
| `c:\FPGod-Program\legacy\advisers\README.md` | Adviser folder rule. |

**Templates (house, in the SharePoint library; not opened)**

- `Documents & Templates\Change of Servicing Rights.docx` (has a logo; "fill it, don't rebuild", per memory).
- `Informed Consent Form v1.0 - Joshua Davidson.docx`. This is superseded: there are no commission consent forms in packs from 22 Oct.
- `Insurer Forms\<n>. <Insurer>\` (rollover authorities, direct debits and other insurer forms).
- The firm's own cancellation letter. This is the source of the `____/____/____` and "Could you please amend your records..." wording. Its exact template path was NOT FOUND (only the wording is known, from `fix_cancellation_letter.py`).
- The client's `Insurance Cover Summary ... .xlsx`, `CvC ` sheet (trailing space), titled "Insurance Review Summary". This is per client, not a shared template.
- No cancellation, alteration, servicing, CvC or application-details template exists in the repo. `legacy/drop/soa-build/templates/` holds only `insurer-logos/`.

**Reference**

- `c:\FPGod-Program\legacy\advisers\tristan-biro\`: `FSG Part 1 - Synchron Advice v9.1.pdf`, `Biro, Tristan - 20261001 - FSG Part Two v8.0.pdf`, `Biro, Tristan - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf`. Listed only. The folder is gitignored except the README.
- `c:\FPGod-Program\legacy\advisers\josh-davidson\`: the same three types (Part Two v8.4). Reference only. Listed only.
- PDS files are not stored in the repo. They come from recent client folders, insurer websites or Downloads.

**Config**

- `C:\Users\TristanBiro\.docusign\config.json` and `private.key`. Not read (credentials).
- `server/src/config/env.js`: `firm.name` (default "Legacy Risk Advice"), `adviser.name` (default "Tristan Biro"), `adviser.ar/email/phone` (blank by default).
- Env vars: `WORKBENCH_DOWNLOADS` (override for Downloads), `WORKBENCH_READ_SHAREPOINT` (gates SharePoint reading for other stages; the pack routes do not check it).
- `.gitignore` (modified, uncommitted) adds `legacy/advisers/**/*` with exceptions for subfolders and the README.

**Skipped, with reasons**

- `legacy/drop/soa-build/cases/*/.build/` (11 client case folders). These are client data. File names only, with client names removed: `build-pack.ps1` (6 cases), `build-pack-v2.ps1`, `build-pack-v3.ps1`, `build-pack-docs.mjs` (2), `build-pack-v2-icf.mjs`, `assemble-pack.sh`, `build_letters.py` (2), `docxfill.mjs`, `docusign-manifest.json` (1, the first one), `pack-readme.md`, `0 - READ ME - Pack contents, DocuSign routing and review notes.md`, `cvc_final.png`, and generated letters in the form `NN - <Insurer/fund> Cancellation Letter - <Client>.docx/.pdf` and `NN - TAL Change of Servicing Rights - <Client>.docx`. The model pack builder the memory names (the 22 Oct confirmed pack) is one of the `build-pack.ps1` files. It was not opened.
- Scratchpad builders `build_cvc.ps1` and `build_app_details.py`. The memory says they were "not kept". NOT FOUND on disk; not searched outside the repo.
- Downloads (the built packs, CvCs and application details sheets): client data.
- The SharePoint library: read-only rule plus client data.
- `legacy/soa/`, `examples/`, `.extracted/`, `legacy/file-notes/`, `legacy/fact-finds/`, `server/data/task-state/`: client data.
- `C:\Users\TristanBiro\.docusign\`: credentials.
- Adviser PDFs: listed only.

---

### 2. Entry point and trigger

**Route B (skill, the route that makes real packs)**

1. Tristan opens Claude Code in VS Code on `c:\FPGod-Program`.
2. He types a command like "build the pack for [CLIENT_1]" (the skill description: "On Tristan's command ('build the pack for X')"). The memory says the pack is built "only on his command".
3. Claude loads `.claude/skills/build-pack/SKILL.md` and the memory files. It writes a per-case builder (for example `build-pack.ps1`) in `legacy/drop/soa-build/cases/<Client>/.build/` and runs it.
4. Output: `C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\`.
5. Optional DocuSign step, run by hand: `node legacy/docusign/docusign.mjs draft "<manifest>" [--dry-run]`, then DocuSign → Agreements → Drafts → check → send.

Other Route B commands in this area (memory only, no skill):
- "CvC" / "the cover we're proceeding with" produces the FINAL Insurance Summary from the `CvC ` sheet. Output `Downloads\<Surnames> - CvC\`.
- "prepare X for an application" produces `Downloads\<Surnames> - Application Details.docx`.

**Route A (Workbench app)**

1. Start the server and client. Open the Workbench home, pick a client, and open the case.
2. Click the "SOA Pack" tab (step 5, `CaseView.jsx:22, 267`).
3. `PackTab` calls `GET /api/workbench/cases/:id/pack` and shows the candidate table with the "Pack documents" or "All files" filter.
4. Tristan ticks or unticks files, sets "Is a…" (the slot), edits "Name in the pack" and toggles "Add a PDF next to Word-only documents" (on by default). He can click "↻ Rescan".
5. He clicks "📦 Build pack (N files)". The build is refused if any ticked file has no slot (`PackTab.jsx:34-35`).
6. `POST /api/workbench/cases/:id/pack` streams steps. The result card lists the files and the review list. "📂 Open pack folder" opens the folder in Explorer.

Route A does not make letters, CvC, Change of Servicing Rights, application details or DocuSign envelopes. It says so in the READ ME review list.

---

### 3. Inputs

| Input | Source | Route |
|---|---|---|
| Final SOA (.docx and/or .pdf) | Client SharePoint folder, current year folder (`2026 SOA\` or `2. Compliance docs…`) | A, B |
| Fact Find | Same | A, B |
| Insurer application summaries (pre-fill PDFs) | Client folder, `2. Compliance docs` | A, B |
| FSG | B: `legacy/advisers/tristan-biro/` (copied unchanged). A: newest FSG PDFs in SharePoint `Compliance\` plus any `20xx FSG` in the client folder | A, B |
| Firm cancellation letters | Client folder | A (copied as is), B (copied, then edited) |
| PDS for each recommended product | B: recent client folder or insurer site, or a standalone copy. A: PDFs in Downloads whose name matches `pds` or `product disclosure` | A, B |
| `<year> Risk Checklist` | Client folder | A, B |
| Insurance Cover Summary xlsx (`CvC ` sheet) | Client folder | B (CvC) |
| Final insurer SOA quote | Client folder | B (CvC, application details) |
| Fact find / application (for missing phone numbers etc.) | Client folder | B (CvC) |
| SOA cover, quote numbers, file notes health, existing cover | Client folder | B (application details) |
| Client names, partner names | `clients` table (`first_name`, `last_name`, `partner_*`) | A (naming, READ ME signers) |
| Meeting date | `workbench_cases.meeting_date` (gives the advice year) | A |
| DocuSign manifest JSON | Per case `.build/docusign-manifest.json`, hand-made | B |
| DocuSign config and key | `~/.docusign/` | B |
| Build date (dd/mm/yyyy) | Typed as an argument to `fix_cancellation_letter.py` | B |

---

### 4. Pipeline step by step

**AI calls:** none in Route A (`pack.js` has no model call). In Route B the model is whatever the Claude Code session runs. Nothing in the repo pins a model, temperature or token limit for this stage.

**Route B (skill)**

1. Copy the client folder out of SharePoint read-only, "as in the build-soa skill". Never write into SharePoint.
2. Pick the newest final version of each document by date in the current year's folder. If two "Final"s disagree, ask Tristan.
3. Plain-copy the SOA, FSG, Fact Find, application summaries and Risk Checklist into the pack with numbered names. Check each copy with a hash (`Get-FileHash`) against its source.
4. For a firm document that exists only as Word, export a PDF with Word `ExportAsFixedFormat` (opened read-only). Then re-check that the .docx hash is unchanged.
5. Firm cancellation letter: copy it, run `fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]` on the pack copy, then export its PDF. In the READ ME it is marked as edited.
6. Generate only the items the firm has no file for (cancellation or alteration letter, Change of Servicing Rights, FINAL Insurance Summary / CvC) by filling house templates. Memory names the tooling: the `docx` npm package, a jszip whole-paragraph fill helper (`docxfill.mjs`), python-docx and `build_letters.py`.
7. Add the PDS (current version), an insurer form only if required, and no quotes.
8. Write `0 - READ ME` (Markdown in the case `.build`). Then, optionally, `readme_to_docx.py` makes the .docx and .pdf.
9. Last step: restamp every file's modified time to today, staggered so the READ ME is newest, then 01, 02, and so on.
10. Manual: Tristan reviews the pack in Explorer (sorted by Date modified, newest first). He builds or approves the DocuSign manifest, runs `docusign.mjs draft`, checks the fields in DocuSign and sends. He sends the FINAL Insurance Summaries to the clients himself, outside DocuSign.

**Route B: CvC (memory, no skill)**

1. Copy the client's Insurance Cover Summary xlsx out.
2. On the `CvC ` sheet, keep one New Cover block. Fill it from the final insurer SOA quote, with the plan fee on the Life/TPD row. Drop the other options.
3. Fill blank client details from the fact find or application.
4. Set the bottom row ("Yearly Premium" or "Yearly Saving"; see §9).
5. Save the xlsx and export the PDF with Excel COM, one per life insured.
6. Output: `Downloads\<Surnames> - CvC\`.

**Route B: application details sheet (memory, no skill)**

1. Word doc with the couple side by side: personal, contact, occupation/income, cover from the SOA plus quote numbers, health from file notes, existing cover/payment.
2. A red "check before lodging" list: a birthday before lodging, quotes over 60 days old, quote occupation vs real occupation.
3. Saved to `Downloads\<Surnames> - Application Details.docx`.

**Route A (`pack.js`)**

1. `packCandidates()` (line 118):
   - Advice year = the year of `meeting_date`, or `created_at`.
   - The pool is: SharePoint files whose path year is ≥ year−1 or unknown; repo case files; the 6 newest FSG PDFs under SharePoint `Compliance\`; and Downloads PDS PDFs. Only `.pdf .docx .doc .xlsx` are kept.
   - Each file gets a slot from `slotOf()` and a suggested `packName`.
   - Pre-tick rules: lines 133–161 (see §8).
   - The list is sorted by slot order, then newest first.
2. UI edits, then POST.
3. Route re-check (`workbench.js:503-511`):
   - A SharePoint item must be inside the client's folder, or its relPath must start with `Compliance\`.
   - A repo item must be in this case's folder.
   - The source must be `sharepoint`, `repo` or `downloads`.
4. `buildPack()` (line 195):
   - Create `Downloads\<packNameOf> - SOA Pack\`.
   - **Delete every file already in it** (lines 201–204).
   - Sort by slot order and number the files.
   - `fs.copyFile`, then SHA-256 of source and destination. Throw on mismatch.
5. Stale-PDF check (lines 237–242).
6. PDF export for Word-only copies, if `makePdfs` is on. Re-hash each .docx and throw if it changed.
7. Review list lines (lines 260–266).
8. Write `0 - READ ME.txt` (CRLF line ends, UTF-8).
9. Restamp all files: sort by numeric-aware name, then `utimes(now − i × 10 s)`.
10. The route stores `pack_dir` and advances the stage to `pack` (never backwards).

---

### 5. Prompts and instructions verbatim

#### 5.1 `.claude/skills/build-pack/SKILL.md` (full; one client name replaced)

```
---
name: build-pack
description: Stage 5 of the Legacy SOA pipeline. On Tristan's command ("build the pack for X"), assemble the send-ready DocuSign SOA pack. The SOA, Fact Find, application summaries and FSG are COPIED byte-for-byte, never regenerated. Use when Tristan asks for an SOA pack or DocuSign pack.
---

# Build the SOA pack

## Critical rule: copy, never regenerate

The **SOA, Fact Find, insurer application summaries and FSG** go into the pack as plain file
copies of the firm's files: no re-export to PDF, no Word, no docx/pdf tooling, no edits, no fixed
typos. After copying, prove each one with a hash match against its source
(`Get-FileHash`) and list the hashes in the READ ME. If one looks stale or wrong (for example a
PDF older than its .docx), copy it anyway and flag it in the READ ME review list for Tristan.

One exception (Tristan, 22 Oct 2026): when a firm document exists only as Word (usually the SOA
and Fact Find), also put a PDF of it next to the copied .docx. Export it with Word
(`ExportAsFixedFormat`, opened read-only), then confirm the .docx hash hasn't changed. Never
replace the .docx, and never edit before exporting.

Cancellation letters (Tristan, 23 Oct 2026): when the firm has written its own letter, copy it,
then on the pack copy (never the SharePoint file) fill the `____/____/____` date with the build
date and replace "Could you please amend your records accordingly and refund any premiums if
applicable." with a cancel instruction:
`python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]`.
Export the PDF after that, and list the letter in the READ ME as edited (date + cancel wording),
not as a byte-for-byte copy. Generated letters must also be dated and say "cancel".

Only the items the firm has no file for are generated (cancellation or alteration letter,
Change of Servicing Rights, FINAL Insurance Summary / CvC). Fill the house
templates; don't rebuild them.

## Steps

1. Copy the client folder out of SharePoint read-only (as in the build-soa skill). Never write
   into SharePoint.
2. Pick the newest final version of each document by date in the current year's folder. Watch
   for duplicate "Final"s and ask Tristan if two disagree.
3. Pack order (Tristan, 22 Oct 2026): **SOA, FSG, Fact Find, insurance application summaries,
   cancellation letters / change of servicing rights where relevant, then the PDS for each
   recommended product, then the FINAL Insurance Summaries, then the Risk Checklist** (plain copy
   of the firm's `<year> Risk Checklist`, plus a PDF if Word-only; outside the DocuSign envelope). **No quotes.** Add an insurer form
   (e.g. a rollover authority) only when it's actually required; ask if unsure. **No Informed
   Consent (commission) forms**: commission consent is in the SOA Authority to Proceed. The **FINAL Insurance Summaries go last and stay out of the
   DocuSign envelope**; Tristan sends them to the clients directly. Number the files in that order
   with **zero-padded numbers (01, 02 … 15)**, so "10 -" never sorts ahead of "2 -" in a DocuSign upload.
   File names (Tristan, 22 Oct 2026): the FSG is just `NN - FSG.pdf`. Applications are
   `NN - <Insurer> Application Summary - Pre-Fill - <Client full name>.pdf`, for example
   `04 - TAL Application Summary - Pre-Fill - [CLIENT_1 FULL NAME].pdf`.
   Leave out TAL direct debit forms when the TAL application summary already holds the payment
   details.
4. Current PDS: take it from a recent client folder or the insurer's site. The template library
   copies are often superseded. Point build scripts at a standalone PDS copy, not at another
   client's pack, because packs get renumbered. The 2026 FSG is v9.1. The FSG goes in from `legacy/advisers/tristan-biro/`
   (Tristan is the adviser on every SOA from 23 Oct 2026), copied unchanged.
5. Output `C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\` with
   `0 - READ ME` (contents, DocuSign signing routing per person, hashes of copied items,
   review list).
6. Last step, after the READ ME is written: set every file's modified time to today, staggered so
   the READ ME is newest, then 01, 02 and so on. Tristan views the folder sorted by Date modified
   (newest first), and copies otherwise keep their old SharePoint dates. Changing the timestamp
   doesn't change the hash.
```

#### 5.2 Memory `soa-pack-format-confirmed.md` (body; client names replaced)

```
On 2026-10-22 Tristan said the [CLIENT_SURNAME], K & D pack is "the process moving forward". Use its build script as the model: `legacy/drop/soa-build/cases/[CLIENT CASE FOLDER]/.build/build-pack.ps1`.

The pack:
- Order: SOA, FSG, Fact Find, application summaries, cancellation letters, PDS, FINAL summaries, Risk Checklist.
- No quotes. A rollover form goes in only when it's needed.
- Files are numbered 01, 02 and so on.
- File names: `FSG`, and `<Insurer> Application Summary - Pre-Fill - <Full Name>`.
- Add a PDF next to any firm document that only exists in Word.
- Re-stamp file dates so the pack sorts in order by date.

**Why:** He browses the pack in Explorer sorted by Date modified and uploads it into DocuSign, so names, numbering and dates all have to give the same order.

**How to apply:** Follow the build-pack skill, which holds every rule. Leave the template alone unless he asks for a change. Related: [[soa-pack-copy-firm-docs-unchanged]].
```

#### 5.3 Memory `soa-pack-copy-firm-docs-unchanged.md` (body)

```
When assembling an SOA pack, the **SOA, Fact Find, insurer application summaries and FSG** are
copied from the client folder (or firm library for the FSG) into the pack exactly as they are.
Do not regenerate, rebuild, re-export to PDF, rename the contents, fix typos, or alter them in any way.
Plain file copy only; verify with a hash match against the source.

**Why:** Tristan stated this as a critical rule on 2026-10-22. These are the firm's own
compliance documents; any change means the pack no longer matches what the firm signed off.
It overrides the earlier [CLIENT] pack note to "export fresh PDFs" of the SOA/fact find.

**How to apply:** in every pack builder, use Copy-Item for these four document types; never pass
them through Word COM, docx/jszip or pdf tools. If a document seems stale or wrong (e.g. the PDF
predates later .docx edits), copy it anyway and flag it in the READ ME review list for Tristan —
don't fix it. Generated items (letters, consent forms, CvC) are still built as before.
See [[legacy-soa-from-case-folder]].
```

Note: "never pass them through Word COM" here conflicts with the later 22 Oct exception in the skill, which exports PDFs of Word-only documents. The skill's version is the later one.

#### 5.4 Memory `cancellation-letters-dated-and-say-cancel.md` (body; client name replaced)

```
Every cancellation letter in an SOA pack must (1) be dated with the build date, not left as `____/____/____`, and (2) ask the insurer to cancel. The firm's template line "Could you please amend your records accordingly and refund any premiums if applicable." becomes "Could you please cancel the above policy/policies and refund any premiums if applicable." Tool: `legacy/packs/fix_cancellation_letter.py`. Rule also lives in the build-pack skill.

**Why:** Tristan, 23 Oct 2026, after the [CLIENT] pack went out with undated letters that never said "cancel". He said "do this moving forward".

**How to apply:** This is an allowed exception to [[soa-pack-copy-firm-docs-unchanged]]. Edit only the pack copy in Downloads, never the SharePoint file, and mark the letter as edited in the READ ME.
```

#### 5.5 Memory `docusign-api-setup.md` (body; client name replaced)

```
On 2026-10-22 Tristan chose the DocuSign eSignature API (JWT grant) for setting up SOA pack envelopes, over a connector or browser driving.
Script: `legacy/docusign/docusign.mjs` (consent | check | draft <manifest> [--dry-run]), with setup steps in `legacy/docusign/README.md`.
Credentials are kept outside the repo in `C:\Users\TristanBiro\.docusign\` (config.json + private.key).
Per-pack `docusign-manifest.json` lives in the case `.build/` folder; field x/y are PDF points found with pymupdf. First one: [CLIENT_1]/[CLIENT_2].

**Why:** envelopes reach clients, so the script only ever creates drafts (status "created") and Tristan sends them himself.
In demo, every signer's email is forced to `testEmail`.

**How to apply:** status at 2026-10-22: script and [CLIENT] manifest are built and dry-run tested. Waiting on Tristan to create the developer app
and config. The DocuSign app must pass Go-Live (20 demo calls) before it works against the real account. Josh's email is still needed for the countersignature.
Related: [[legacy-soa-from-case-folder]].
```

#### 5.6 Memory `tristan-is-adviser-on-all-soas.md` (body; contact numbers replaced)

```
From 2026-10-23 every SOA is written with Tristan Biro as the adviser. His FSG, AR details and
other adviser documents go in `C:\FPGod-Program\legacy\advisers\tristan-biro\`. Josh Davidson's
go in `legacy\advisers\josh-davidson\`, kept for reference only. The folder is gitignored.

Files (23 Oct 2026): each folder holds `FSG Part 1 - Synchron Advice v9.1.pdf`, the adviser's
Part Two (Adviser Profile) and a 9-page "FSG Combined 2026" (Part 1 + Part Two). Tristan: AR
1313019 of Legacy Risk Advice (Legacy itself is AR 1296611 of Synchron, AFSL 243313), Part Two v8.0 dated 1 Oct 2026, office [OFFICE_PHONE_1]. The
SharePoint folder also holds a [OFFICE_PHONE_2] variant of his Part Two; the [OFFICE_PHONE_1] one is the later save.
His Part Two shows his gmail address as the contact email.

**Why:** Tristan said all SOAs going forward are under him. Older example SOAs may name other
advisers, so a cloned SOA can carry the wrong adviser details over.

**How to apply:** when drafting an SOA or building a pack, take the adviser details and FSG from
his folder and replace any other adviser's details in a cloned SOA. Use Josh's folder only if
Tristan asks. This may unblock the missing AR number in [[legacy-risk-advice-templates-pending]].
Related: [[build-pack]], [[soa-pack-copy-firm-docs-unchanged]].
```

#### 5.7 Memory `legacy-soa-from-case-folder.md`: pack, CvC and application details sections (client details replaced)

```
## Third job type, from 2026-09-23: assemble a DocuSign **SOA pack** (not write the SOA)

[CLIENT_A] (23 Sep) then [CLIENT_B] (24 Sep). Here the SOA already exists in the client folder —
the job is the send-ready pack. Output folder: `C:\Users\TristanBiro\Downloads\<Surname> - SOA Pack\`
(that is where the [CLIENT_A] one lives and where he wants them). Numbered items, `.docx` kept
alongside `.pdf` for anything generated, plus a `0 - READ ME` with the signing routing and a
review list.

Shape of a pack: SOA, fact find, FSG, the insurer application, Informed Consent Form
(commission), beneficiary nomination, rollover authority, direct debit, cancellation or
alteration letter, change of servicing rights per person, the reduction quote if cover is being
reduced, quotes, PDS. House templates: `Documents & Templates\Change of Servicing Rights.docx`
(has a logo — fill it, don't rebuild), `Informed Consent Form v1.0 - Joshua Davidson.docx`,
`Insurer Forms\<n>. <Insurer>\`. **The current TAL PDS (12 Dec 2025) is NOT in the templates or
`Insurance Companies\PDS and Adviser Guide\TAL` — both are superseded; recent client folders
have the current one** (`accelerated-protection-combined-pds.pdf`).

Tooling that worked: generate .docx with the `docx` npm package in `server/node_modules`, and
fill firm templates by rewriting whole paragraphs in `word/document.xml` with jszip — helper at
the case's `.build/docxfill.mjs` (placeholders split across runs, so per-run replacement fails;
`<w:br/>` round-trips as `\n`). **python-docx is not installed on this machine.**

**Word COM PDF export is unreliable here:** it converted five small letters in ~3s each, then
every subsequent `ExportAsFixedFormat` hung forever (open still took 1s, so it is the export
engine, not the file). Killing Word and `splwow64` did not clear it; it wants a reboot. Don't
burn time on it — DocuSign accepts `.docx`, so ship those and say so.

**Where a "reduction" is the advice:** the insurer's own signed quote illustration is the
instrument (TAL says so on its "How to apply" page for "Reduce sum insured"), so it goes in the
pack as a signing item with a covering alteration letter — not a cancellation letter.

[CLIENT_C] pack (16 Oct): `Downloads\[CLIENT_C] - SOA Pack\`, builder in `cases/[CLIENT_C]/.build/`.
The firm had no copy of the current MetLife Protect PDS (16 Nov 2025). It was downloaded from metlife.com.au
(`/content/dam/metlifecom/au/pds/MET-R_MetLife-Protect-and-Combined-PDS_Policy-Terms.pdf`). The 2026 FSG v9.1 is in the [CLIENT_D] pack.
Word COM export worked fine. "Most current stuff" = newest file by date in `2026 SOA\`; watch for duplicate "Final"s.

**Pack order (Tristan, final word 22 Oct):** SOA, FSG, Fact Find, insurer application summaries, then cancellation
letters / change of servicing where relevant, then any missing insurer forms, quotes, PDS. NO commission consent
forms (22 Oct: "not required given it's on the SOA"). FINAL Insurance Summaries go LAST and
are kept OUT of the DocuSign envelope (he sends them to clients directly). The build-pack skill has this order. **Superseded 2026-10-22:**
SOA, fact find, application summaries and FSG are now plain-copied, never re-exported. See
[[soa-pack-copy-firm-docs-unchanged]]. (Earlier: fresh PDFs were exported because the .docx is often edited after the firm's PDF was made.) Leave out TAL direct debit forms when the TAL application summary already holds the payment details. Builder:
`cases/[CLIENT_D].../.build/build-pack-v2.ps1`. Output went to `Downloads\[CLIENT_D] - SOA Pack FINAL\` because the old
pack folder was locked.

## Fifth job type, 2026-10-21: CvC ([CLIENT_D])

"CvC" = the **`CvC ` sheet** (trailing space in the name) of the client's `Insurance Cover Summary ... .xlsx`, titled
"Insurance Review Summary": Current Policy Details block, then New Cover blocks, gross monthly, yearly saving/increase.
The firm does one per life insured. For "the cover we're proceeding with", copy the xlsx out, keep one block, fill it from
the final insurer SOA quote (the plan fee goes on the Life/TPD row), drop the other options, then save the xlsx and
export the PDF with Excel COM. Output goes to `Downloads\<Surnames> - CvC\`. Builder: scratchpad `build_cvc.ps1` (not kept).
In PowerShell, assigning a double to `.Value2` throws "cannot cast Double to String", so set `.Formula = [string]` instead.

**Tristan's corrections to that first CvC (2026-10-22). Follow these from now on:**
- **Bottom row depends on the direction of the change.** If cover goes **up**, show **"Yearly Premium"** = the new cover's annual cost ([CLIENT_1] [AMOUNT], [CLIENT_2] [AMOUNT]). If the change **saves** money (a switch or reduction, like [CLIENT_E]), show **"Yearly Saving"** = (current − new) × 12. Never use "Yearly Increase".
- **File name:** `FINAL Insurance Summary - <First Last>.pdf`, one per life insured.
- **Fill missing client details.** [CLIENT_2]'s phone ([PHONE]) was blank in the firm sheet. Look in the fact find or the application rather than leaving it blank.
- He kept: TAL named as the insurer (not "Market Option"), the "Proceeding Cover - <Insurer product>" heading, the plan fee on the Life/TPD row, whole dollars, and the current block above the proceeding block.

## Sixth job type, 2026-10-22: "prepare X for an application" ([CLIENT_F] & [CLIENT_G])

Means an application details sheet: a Word doc with the couple side by side (personal, contact, occupation/income,
cover from the SOA + quote numbers, health from the file notes, existing cover/payment) plus a red "check before
lodging" list. Saved to `Downloads\<Surnames> - Application Details.docx`. Builder: scratchpad `build_app_details.py`
(not kept). Check for: a birthday before lodging, quotes over 60 days old, and the quote occupation vs the real one.
```

From the seventh case (23 Oct), pack-related lines only:

```
Watch for: the insurance schedule and CvC carried the pre-variation AIA premium ([AMOUNT]/m) after a signed variation
([AMOUNT] p.a.). Check schedules against the last signed insurer quote. ... Pack built 26 Oct: `Downloads\[CLIENT_H] - SOA Pack\`.
**Adviser split (Tristan, 26 Oct):** the SOA, fact find, FSG and adviser profile carry Tristan Biro (Sub-AR 1313019).
**His SOA contact details are P [ADVISER_PHONE], E [ADVISER_EMAIL]** (Tristan, 26 Oct). Do NOT use the
mobile/gmail printed in his FSG Part 2 v8.0; those are out of date, and he needs a corrected profile from Synchron. Insurer applications and
quotes stay under Josh Davidson.
```

#### 5.8 `legacy/advisers/README.md` (full)

```
# Adviser documents

One folder per adviser. Drop the adviser's own documents here: FSG (current version),
AR / ASIC certificate, credentials, signature block, adviser profile.

- `tristan-biro/` : **default adviser for all SOAs from 23 Oct 2026.**
- `josh-davidson/` : reference only. Use only when Tristan asks.

Files here are local only (gitignored). SOA drafting and pack building take the adviser's
details and FSG from here, not from another client's SOA or pack.
```

#### 5.9 `legacy/docusign/README.md`

This file covers setup and is summarised in §14, not quoted. Its points that matter here:
- Both clients sign in parallel, then the adviser countersigns.
- While `env` is `demo`, every signer's email is replaced with `testEmail`.
- The config example has `"adviser": { "name": "Joshua Davidson", ... }`.
- Go-Live needs 20 successful demo calls within 30 days.

---

### 6. Output structure

**Folder:** `C:\Users\TristanBiro\Downloads\<pack name> - SOA Pack\`.
- Route A pack name (`paths.js:62-67`, `packNameOf`):
  - single client: `Surname, F`;
  - couple with the same surname: `Surname, F & F`;
  - couple with different surnames: `Surname1 F1 & Surname2 F2`.
- Route B: `<Surname(s)> - SOA Pack`. The exact pattern is set per case by Claude.

**Order (both routes)**

| # | Item | Always / conditional | In DocuSign envelope |
|---|---|---|---|
| 0 | `0 - READ ME` (A: `.txt`; B: `.md`, optionally `.docx` + `.pdf`) | Always | No |
| 01 | Statement of Advice (.docx, .pdf, or both; PDF exported if Word-only) | Always | Yes (Authority to Proceed signed) |
| 02 | FSG (`NN - FSG.pdf`) | Always | Yes |
| 03 | Fact Find (+ PDF if Word-only) | Always (A warns if missing) | Yes |
| 04… | `<Insurer> Application Summary - Pre-Fill - <Full name>.pdf`, one per application | When applications exist | Yes (signed per life insured) |
| next | Cancellation letters / alteration letter / Change of Servicing Rights (.docx + .pdf) | When existing cover is cancelled, reduced or transferred | Yes (per the B skill; the A READ ME says "up to and including the PDS") |
| next | Insurer form (e.g. rollover authority) | Only when required | Yes |
| next | PDS for each recommended product | Always for recommended products | Yes |
| next | `FINAL Insurance Summary - <First Last>.pdf`, one per life insured | When made | **No**. Tristan sends them to the clients directly. |
| last | `Risk Checklist - <pack name>` (+ PDF if Word-only) | Always (B) | **No** |

Never included: quotes, Informed Consent (commission) forms, TAL direct debit forms when the application summary holds the payment details, SOA Notes, ROA. Route A's `slotOf` returns null for quotes, SOA Notes, ROA and any checklist other than the Risk Checklist.

Exception: when the advice is a reduction, the insurer's signed quote illustration goes in as a signing item with an alteration letter (memory, 23 Sep). Route A's `slotOf` drops anything named "quote", so this needs a manual slot in the UI.

**Numbering:** zero-padded two digits (`01 - `). In Route A a .docx and .pdf with the same slot and base name share one number when they sit next to each other in the sort (`pack.js:214-218`).

**Route A file names (`pack.js:70-82`)**

| Slot | Name |
|---|---|
| soa | `Statement of Advice - <pack name><ext>` |
| fsg | `FSG<ext>` |
| fact_find | `Fact Find - <pack name><ext>` |
| application | `<Insurer> Application Summary - Pre-Fill - <person full name><ext>` |
| final_summary | `FINAL Insurance Summary - <person full name><ext>` |
| risk_checklist | `Risk Checklist - <pack name><ext>` |
| letter, form, pds | Original file name |

If two names collide, ` (2)`, ` (3)` and so on are added. Characters `<>:"/\|?*` are stripped.

**Route A READ ME (`pack.js:269-288`)**, in order:

1. Folder name.
2. `Built <en-AU date time> by the FPGod workbench for <firm>.`
3. `CONTENTS`: every copied file, then each exported PDF with `  (PDF of the Word copy, exported read-only)`.
4. `DOCUSIGN`: three lines (see §7).
5. `FIRM DOCUMENTS: PLAIN COPIES, SHA-256 MATCHED TO SOURCE`: for each soa, fsg, fact_find, application, risk_checklist and final_summary item, the first 16 hex characters of its hash, the name, then `from <source path>`.
6. `REVIEW LIST`: bullets.

**Route B READ ME:** per the skill, it holds contents, DocuSign signing routing per person, hashes of copied items and a review list. Letters are marked as edited (date plus cancel wording). The `readme_to_docx.py` table rules mean the READ ME has a contents table with 3 columns whose first header starts with "#". The exact Route B layout is in the case `pack-readme.md` files, which were not opened.

**CvC / FINAL Insurance Summary (memory)**

- Excel `CvC ` sheet, "Insurance Review Summary".
- Blocks, top to bottom: Current Policy Details; then "Proceeding Cover - <Insurer product>" with the insurer named (not "Market Option"); gross monthly; bottom row "Yearly Premium" or "Yearly Saving".
- The plan fee goes on the Life/TPD row. Whole dollars.
- One xlsx plus PDF per life insured.
- Named `FINAL Insurance Summary - <First Last>.pdf`.
- The exact cell layout is NOT FOUND (builder not kept; the sheet is in client files).

**Letters:** the layout of the generated cancellation, alteration and servicing letters is NOT FOUND in the repo. They come from house templates and per-case builders that were skipped.

**Application details sheet:** see §4. Layout beyond that description is NOT FOUND.

---

### 7. Fixed wording inserted

| Text (exact) | Trigger | Location |
|---|---|---|
| Date `<dd/mm/yyyy>` replacing a paragraph whose first run is exactly `____/____/____` | Every firm cancellation letter in a B pack | `fix_cancellation_letter.py:16-17` |
| `Could you please cancel the above {policy\|policies} and refund any premiums if applicable. ` (trailing space; `policy` by default, 3rd argument `policies`) replacing a paragraph that starts `Could you please amend your records` | Same | `fix_cancellation_letter.py:18-20` |
| Generated letters "must also be dated and say 'cancel'" (no fixed text in the repo) | Generated letters | Skill |
| `Built <date> by the FPGod workbench for <firm name>.` | Every A pack | `pack.js:271` |
| `  (PDF of the Word copy, exported read-only)` | Per exported PDF | `pack.js:275` |
| `  Signers: <full names>.` | Every A pack | `pack.js:278` |
| `  Envelope: the numbered documents up to and including the PDS. Leave out the FINAL Insurance Summaries and the Risk Checklist.` | Every A pack | `pack.js:279` |
| `  Signing: the SOA Authority to Proceed (includes commission consent) and each application summary for the life insured named on it.` | Every A pack | `pack.js:280` |
| `FIRM DOCUMENTS: PLAIN COPIES, SHA-256 MATCHED TO SOURCE` | Every A pack | `pack.js:282` |
| `<name> is older than its .docx in the client folder; it was copied as is. Check it matches.` | PDF source older than the .docx with the same pack name | `pack.js:240` |
| `No Statement of Advice in the pack.` | No soa slot | `pack.js:261` |
| `No FSG in the pack (2026 FSG is v9.1).` | No fsg slot | `pack.js:262` |
| `No Fact Find in the pack.` | No fact_find slot | `pack.js:263` |
| `No insurer application summaries in the pack.` | No application slot | `pack.js:264` |
| `Generated items are not built here: cancellation / alteration letters, Change of Servicing Rights and the FINAL Insurance Summary / CvC. Add them if this advice needs them.` | Always (A) | `pack.js:265` |
| `FINAL Insurance Summaries and the Risk Checklist stay OUT of the DocuSign envelope; send the summaries to the clients directly.` | Always (A) | `pack.js:266` |
| `PDF export: <docx>: <reason>` / `PDF export did not run: <message>` | Word export failure | `run.js:75, 78` |
| CvC labels: `Yearly Premium`, `Yearly Saving` (never `Yearly Increase`), `Proceeding Cover - <Insurer product>`, insurer name instead of `Market Option` | Every CvC | Memory only |
| Application details: a red "check before lodging" list | Every application details sheet | Memory only; exact text NOT FOUND |
| DocuSign `emailSubject`, `emailBlurb` | From the manifest | `docusign.mjs:134-135`; the text is per manifest, NOT FOUND in the repo |

---

### 8. Decision logic table

| # | Condition as tested | Effect | Where | Code / model |
|---|---|---|---|---|
| 1 | Name matches `/\bquote\|quotation/` | No slot (excluded) | `pack.js:44` | Code |
| 2 | `/soa notes\|record of advice\|\broa\b/` | No slot | `pack.js:45` | Code |
| 3 | `/risk checklist/` | risk_checklist | `pack.js:46` | Code |
| 4 | Any other `/checklist/` | No slot (e.g. SOA Checklist) | `pack.js:47` | Code |
| 5 | `/statement of advice\|\bsoa\b/` | soa | `pack.js:48` | Code |
| 6 | `/\bfsg\b\|financial services guide/` | fsg | `pack.js:49` | Code |
| 7 | `/fact ?find/` | fact_find | `pack.js:50` | Code |
| 8 | `/application ?summary\|pre-?fill\|applicationsummary/` | application | `pack.js:51` | Code |
| 9 | `/cancel\|servicing rights\|alteration letter/` | letter | `pack.js:52` | Code |
| 10 | `/\bpds\b\|product disclosure/` | pds | `pack.js:53` | Code |
| 11 | `/insurance cover summary\|final.*summary\|\bcvc\b/` | final_summary | `pack.js:54` | Code |
| 12 | Insurer word in the name (TAL, MetLife, Zurich, AIA, NEOS, OnePath, MLC, ClearView, Encompass, Resolution Life, BT, MLC Life, Integrity) | Insurer in the application name, else "Insurer" | `pack.js:39-40, 59` | Code |
| 13 | A full name has a part longer than 2 characters that appears in the file name | That person names the application or FINAL summary; else the first person | `pack.js:61-65` | Code |
| 14 | Extension not in `.pdf .docx .doc .xlsx` | Not listed | `pack.js:84, 124` | Code |
| 15 | SharePoint file path year < advice year − 1 | Not listed (no year = listed) | `pack.js:122` | Code |
| 16 | soa, fact_find or risk_checklist slot, from SharePoint, year ≥ advice year | Newest one pre-ticked, plus any file with the same base name (its .docx/.pdf twin) | `pack.js:133-139` | Code |
| 17 | FSG score: +4 if from the client SharePoint folder (not Compliance) and named `20xx FSG`; +2 if the name holds the adviser's surname; +1 if `9.1` | Top FSG pre-ticked only if score ≥ 2 | `pack.js:141-146` | Code |
| 18 | application, letter or final_summary slot, SharePoint, year ≥ advice year, `.pdf`, path contains `2. compliance docs` | Newest per name (with any leading date stripped) pre-ticked; "Insurer …" applications are not pre-ticked | `pack.js:149-161` | Code |
| 19 | PDS from Downloads; letter or form .docx | Never pre-ticked | `pack.js` (no rule) | Code |
| 20 | Ticked item has no slot | Build blocked in the UI | `PackTab.jsx:34-35` | Code |
| 21 | SharePoint item outside the client folder and not under `Compliance\` | Throw | `workbench.js:505-508` | Code |
| 22 | Pack folder already has files | All deleted before the build | `pack.js:201-204` | Code |
| 23 | Copy hash ≠ source hash | Throw, build stops | `pack.js:230-231` | Code |
| 24 | Copied PDF source older than the copied .docx with the same name | Review line | `pack.js:237-242` | Code |
| 25 | `makePdfs` and a .docx with no .pdf of the same name | Export a PDF; throw if the .docx hash changed | `pack.js:246-258` | Code |
| 26 | Not Windows | No PDF export, silently | `run.js:64` | Code |
| 27 | Missing soa / fsg / fact_find / application slot | Review line | `pack.js:261-264` | Code |
| 28 | Firm letter exists (B) | Copy, run the fix script, export PDF, mark as edited | Skill | Model |
| 29 | Fix script does not find exactly one date and one amend line | Exits with an error and does not save | `fix_cancellation_letter.py:22` | Code |
| 30 | No firm file for a letter, servicing letter or CvC (B) | Generate it from a house template | Skill | Model |
| 31 | Two "Final"s disagree (B) | Ask Tristan | Skill | Model |
| 32 | Insurer form required? Unsure (B) | Ask | Skill | Model |
| 33 | TAL application summary holds payment details | Leave out the TAL direct debit form | Skill | Model |
| 34 | Advice is a reduction | Signed quote illustration plus alteration letter, not a cancellation letter | Memory | Model |
| 35 | Cover goes up / change saves money | CvC "Yearly Premium" / "Yearly Saving" | Memory | Model |
| 36 | `cfg.env !== 'prod'` | Every signer's email is replaced by `testEmail`; throw if it is missing | `docusign.mjs:98-101` | Code |
| 37 | Signer is `"config"` | Adviser from config, `routingOrder: 2` | `docusign.mjs:91-94` | Code |
| 38 | Tab has `anchor` | Anchor tab (pixels, must be present); else page/x/y | `docusign.mjs:117-120` | Code |
| 39 | `--dry-run` | Print the envelope with file sizes instead of base64; no API call | `docusign.mjs:164-168` | Code |

**Gaps**

- Line 55 (`risk checklist` again) can never be reached. It is harmless.
- Rule 13: for a couple with the same surname, the surname matches the first person, so the partner's application or FINAL summary is named after the first person. The duplicate-name rule then adds " (2)". Tristan must rename it by hand.
- Rule 11 also catches the firm's multi-option `Insurance Cover Summary` sheets, not just the FINAL one. Rule 18 limits pre-ticking to PDFs in Compliance docs.
- Rule 17: the comment says another adviser's FSG must never go out. But a `20xx FSG` in the client folder scores 4 regardless of adviser. Route A also never looks in `legacy/advisers/tristan-biro/`, which the skill names as the FSG source.
- Rule 15: `adviceYearOf` takes the highest 20xx in the path. The file name's own date counts too.
- Route A does not apply the cancellation letter rule (date plus cancel wording). Letters are copied unedited.
- Route A re-checks Downloads items only for directory traversal (`pack.js:176-177`).
- Rule 22 deletes any letters or CvC added to the folder by hand before a rebuild.
- Route A does not list or mark edited letters in the READ ME hash section (letters are not in `FIRM_DOCS`).
- It also treats `final_summary`, which the skill calls generated, as a firm document.

---

### 9. Figures and calculations

| Figure | Rule | Where | Notes |
|---|---|---|---|
| CvC "Yearly Premium" | The new cover's annual cost | Memory | Used when cover goes up. The calculation method is not stated (monthly × 12 or the quote's annual figure). |
| CvC "Yearly Saving" | (current monthly − new monthly) × 12 | Memory | Used for a switch or reduction. Multiplying the monthly gap by 12 assumes monthly figures for both. A quote with an annual premium that differs from monthly × 12 (frequency loading) would give a different number. Not checked. |
| CvC gross monthly | From the final insurer SOA quote; plan fee on the Life/TPD row; whole dollars | Memory | The rounding method is NOT FOUND. |
| CvC current premium | From the current policy | Memory | Known problem: it carried a pre-variation premium once. Check it against the last signed insurer quote. |
| Hash | SHA-256, uppercase hex. The READ ME shows the first 16 characters only. | `pack.js:183-187, 283` | Route B: `Get-FileHash` (SHA-256 default); whether it prints the full hash is NOT FOUND. |
| Numbering | `n` goes up when `slot\|base(name)` changes from the previous item; `padStart(2,'0')` | `pack.js:207-218` | The twin rule depends on sort order. The sort is by slot only, and items in the same slot keep their input order. In practice the UI passes them newest-first, so a .docx and .pdf of one document are adjacent only if nothing else in the same slot is newer than one and older than the other. |
| Restamp | Sorted with `localeCompare(..., {numeric:true})`; time = now − i × 10 s; atime and mtime both set | `pack.js:292-297` | `0 - READ ME.txt` sorts first, so it is newest. Exported PDFs are included. |
| READ ME build time | `new Date().toLocaleString('en-AU')` | `pack.js:271` | Uses the server's time zone. |
| Letter date | dd/mm/yyyy typed by hand | Fix script argument | The script does not check the format. |
| Application details check | Quote over 60 days old; a birthday before lodging | Memory | Not coded. |
| DocuSign JWT | `exp = iat + 3600`; scope `signature impersonation` | `docusign.mjs:36-41` | |

---

### 10. Where facts and documents come from

- **Firm documents** (SOA, Fact Find, application summaries, FSG, Risk Checklist): plain copies from the client's SharePoint folder (A reads it in place; B copies it out first). The FSG comes from `legacy/advisers/tristan-biro/` (B) or SharePoint `Compliance\` and the client folder (A).
- **Hash proof:**
  - A: SHA-256 of source and copy, compared right after the copy. The build stops on a mismatch.
  - A: each .docx is re-hashed after PDF export.
  - A: the READ ME lists the shortened hash and source path.
  - B: `Get-FileHash`, listed in the READ ME.
  - Restamping does not change hashes.
- **Edited copies:** cancellation letters only (B), on the pack copy. They are marked as edited in the READ ME, not listed as byte-for-byte.
- **Generated:** letters, Change of Servicing Rights and CvC, from house templates plus case facts. Their content comes from the SOA, the quote, the existing policy, and the fact find or application for missing details. No source tracking or hash for generated items.
- **PDS:** B uses a recent client folder or the insurer website (one known download URL is in memory). A uses PDFs in Downloads. Template library PDS copies are often out of date.
- **Stale documents:**
  - Stale firm documents are copied as is, never fixed.
  - A: a PDF older than its .docx gets a review line.
  - B: flagged in the READ ME review list.
  - Duplicate "Final"s: ask Tristan.
  - CvC current premium: check against the last signed quote.
- **Adviser details:** Tristan's folder. Insurer applications and quotes stay under Josh Davidson (memory, 26 Oct).

---

### 11. Template and rendering

- **House templates:** in SharePoint (see §1). "Fill, don't rebuild."
  - Fill method (memory): rewrite whole paragraphs in `word/document.xml` with jszip (`docxfill.mjs`), because placeholders are split across runs. `<w:br/>` round-trips as `\n`.
  - New .docx files are made with the `docx` npm package. python-docx is used for the letter fix and the READ ME.
- **PDF export of Word documents:**
  - `docx-to-pdf.ps1`: `Documents.Open($f, $false, $true)` (read-only), `ExportAsFixedFormat($pdf, 17)`, `Close(0)` (no save), `DisplayAlerts = 0`. It prints `OK`/`FAIL` lines. Called with a 240 s timeout.
  - `readme_to_docx.py`: opens the READ ME .docx in Word (not read-only), sets table widths 28/200/220 points, saves, then exports PDF.
- **PDF export of the CvC:** Excel COM. Use `.Formula = [string]` rather than `.Value2 = double` in PowerShell (memory).
- **Word COM issues (memory):**
  - On some days, `ExportAsFixedFormat` hangs after a few exports. Killing Word and `splwow64` does not clear it; a reboot does.
  - Fallback: ship the .docx (DocuSign accepts it) and say so.
  - Other days it worked fine (about 1 minute).
  - Route A treats an export failure as a warning, not an error.
- **DocuSign rendering:**
  - Tabs on PDFs use page and x/y in PDF points from the top left, found with pymupdf.
  - For .docx, use anchor text, which must be unique across the envelope.

---

### 12. Versioning and history

- Every file in this area is **untracked** (`??`):
  - `.claude/skills/build-pack/`
  - `server/src/services/workbench/`
  - `server/src/routes/workbench.js`
  - `client/src/pages/wb/`
  - `legacy/packs/`
  - `legacy/docusign/`
  - `legacy/advisers/`
  - `server/scripts/docx-to-pdf.ps1`
- `.gitignore` is modified, not committed (it adds the adviser folder rule).
- `git log` for these paths is empty. The last repo commit is `f9e6f41 Weekly checkpoint - Monday 28 September 2026`. All pack work dates from 22–26 Oct 2026.
- History lives only in memory dates:
  - 23–24 Sep: first packs, then including consent forms, quotes and fresh PDFs.
  - 16 Oct: the MetLife PDS from the website.
  - 21–22 Oct: CvC and its corrections.
  - 22 Oct: confirmed format, copy-unchanged rule, no consent forms, DocuSign API chosen.
  - 23 Oct: cancellation letter rule; Tristan becomes adviser.
  - 26 Oct: adviser split.
- The skill and memory carry dated "(Tristan, <date>)" tags but no version number.
- Per-case builders are versioned by file name (`build-pack.ps1`, `-v2`, `-v3`) inside gitignored case folders.

---

### 13. Known problems and workarounds

1. Word COM export hangs (see §11). Workaround: ship the .docx; Route A turns it into a warning.
2. python-docx was not installed at times. Workaround: `pip install --user python-docx`. The fix script and `readme_to_docx.py` need it.
3. A locked pack folder: output went to `... - SOA Pack FINAL\` instead. Route A has no handling for this and would throw when deleting or copying.
4. The template library PDS copies are superseded. Use client folders or insurer sites, and point builders at a standalone PDS copy because packs get renumbered.
5. Duplicate "Final" documents: ask Tristan.
6. The CvC or schedule can carry a pre-variation premium. Check it against the last signed quote.
7. Blank client details in the firm's CvC sheet. Fill them from the fact find or the application.
8. A pack went out with undated letters that never said "cancel". Fixed by the 23 Oct rule and script.
9. Route A wipes the pack folder on every build (see §8).
10. Route A names a same-surname partner's application after the first person (see §8).
11. Route A skips the cancellation-letter fix and does not generate letters, the CvC or Change of Servicing Rights.
12. The DocuSign README and the script comment still name "Joshua Davidson" as the adviser in the example config. The memory still says "Josh's email is still needed for the countersignature".
13. The DocuSign setup is not finished as of 22 Oct (waiting on the developer app and config). Go-Live needs 20 demo calls. No "check" success is recorded.
14. Tristan's FSG Part Two v8.0 shows out-of-date contact details. A corrected profile from Synchron is pending, but the FSG is still copied unchanged.

---

### 14. Dependencies

- **Node** (server): built-ins `fs`, `crypto`, `path`, `child_process` (`execFile`). Express route with an NDJSON stream. `pg` for `workbench_cases.pack_dir` and `stage`.
- **Node** (DocuSign script): built-in `fetch` (Node 18+), `crypto.sign` RSA-SHA256. No npm packages.
- **Python:** `python-docx` (`fix_cancellation_letter.py`, `readme_to_docx.py`); `pymupdf` (finding DocuSign field positions, by hand).
- **npm (per-case builders, memory):** `docx`, `jszip` (in `server/node_modules`).
- **Windows:**
  - PowerShell 5.1.
  - Microsoft Word (COM `Word.Application`) for PDFs.
  - Microsoft Excel (COM) for the CvC PDF.
  - `Get-FileHash`.
- **File locations:**
  - OneDrive-synced SharePoint library (`env.library.sharepointRoot`), read-only, through `fsGuard`.
  - Downloads (`WORKBENCH_DOWNLOADS` override).
  - `legacy/advisers/`.
- **DocuSign:**
  - eSignature REST API v2.1.
  - OAuth hosts `account-d.docusign.com` (demo) and `account.docusign.com` (prod).
  - JWT grant with scope `signature impersonation`.
  - Config keys: `env`, `integrationKey`, `userId`, `accountId`, `privateKeyFile`, `redirectUri`, `adviser.name`, `adviser.email`, `testEmail`.
  - Values are kept in `C:\Users\TristanBiro\.docusign\` (not read; no secrets printed).
- **Env:** `FIRM_NAME`, `ADVISER_NAME`, `WORKBENCH_DOWNLOADS`.

---

### 15. Questions for Tristan

1. Should the app route (Workbench "SOA Pack" tab) also run the cancellation letter fix (date plus "please cancel"), or is the app pack only a first pass before Claude finishes it?
2. Should the app take the FSG from `legacy/advisers/tristan-biro/` like the skill does? Right now it looks in SharePoint `Compliance\` and the client folder.
3. Which FSG file goes in the pack: `FSG Part 1 - Synchron Advice v9.1.pdf` alone, or the "FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0)"? And should it still go in while the Part Two shows out-of-date contact details?
4. In DocuSign, who countersigns: you or Josh Davidson? The README example and the memory still name Josh, but you are now the adviser on every SOA, while applications stay under Josh.
5. Are cancellation letters, alteration letters and Change of Servicing Rights inside the DocuSign envelope and signed by the clients? Which signer signs each one?
6. Has the DocuSign developer app and config been set up? Has `check` succeeded, and how many demo calls have been made towards Go-Live?
7. Who writes the `docusign-manifest.json` for each pack, and should field positions come from a standard per-document template (e.g. the same SOA Authority to Proceed page each time)?
8. CvC "Yearly Premium": is it the quote's annual premium, or the monthly × 12? Same question for the "Yearly Saving" when the current policy is billed annually.
9. Should the CvC and the application details sheet become named commands or skills? Today they rely on memory only, and their builders were not kept.
10. Which exact house template should generated cancellation and alteration letters use, and what is its path in the library?
11. Should a rebuild in the app keep files you added to the pack folder by hand (letters, CvC)? Today it deletes everything first.
12. For a couple with the same surname, should the app name applications from the first name only? Today the partner's application can be named after the first person.
13. When the advice is a reduction, should the signed quote illustration get a fixed pack name and position (it is a quote, which the app excludes by default)?
14. Should the READ ME show the full SHA-256, or are 16 characters enough for the audit trail?
15. Should the READ ME be `.txt` (app), `.md`, or `.docx` + `.pdf` (`readme_to_docx.py`)? Which one do you open?
16. Is the date on cancellation letters always the pack build date, or the date the client signs?

---

## Part 5. Document Scanning and Extraction

Scope: how client documents get into the system and become text or structured data. Covers the in-app upload and AI scan, the client-profile import, the training/reference importers, the SOA example analysis, the CFS statement and spreadsheet importers, the SharePoint text reads used by the Library and Workbench, and the manual case-folder extraction method Claude uses in chat.

Read-only description as at 2026-10-27. Line numbers are from the working tree. None of the files below are modified in the working tree (git status). Client names found in code comments are replaced with [CLIENT_n] placeholders.

### 1. Inventory

**Code (server)**

| File | Role |
|---|---|
| server/src/services/documentExtractor.js | Buffer to plain text. PDF, DOCX, XLSX/XLS/XLSM, CSV, TXT. Everything else is a raw byte decode. |
| server/src/services/documentScan.js | AI scan of extracted text into client/financial JSON. Holds the system prompt and an offline regex fallback. |
| server/src/services/ai.js | Anthropic Messages wrapper (`complete`, `completeOrStub`). Model, thinking, effort, JSON coercion, stub fallback. |
| server/src/services/storage.js | Local disk driver. Writes uploads to `UPLOAD_DIR` (default `server/uploads`). |
| server/src/services/generatedDocs.js | Files a generated artefact as a Markdown document row, text already in `extracted_text`. |
| server/src/middleware/upload.js | multer, in-memory, MIME allow-list, size limit. |
| server/src/routes/documents.js | `/api/documents` list, get, upload, scan, download, delete. |
| server/src/routes/clients.js (lines 98-245) | `/api/clients/import` (scan a file without saving) and `/api/clients/:id/scan-documents` (re-scan all a client's docs and merge). |
| server/src/routes/transcripts.js | Plain CRUD over `meeting_transcripts`. No extraction, no AI. |
| server/src/routes/trainingData.js | `/api/training-data` CRUD, bulk import of files as text, master template upload. |
| server/src/services/cfsStatementText.js | Deterministic parser for CFS "Statement Report" PDFs. |
| server/src/services/cfsStatement.js | Statement reader: structural parser first, AI fallback second. Holds a second system prompt. |
| server/src/services/cfsImport.js | CFS spreadsheet (xlsx/xls/csv) reader: header detection, column mapping, account build, roll-up. |
| server/src/services/cfsMatch.js | Matches CFS account names to client rows. |
| server/src/services/cfsCampaign.js | Groups CFS accounts by person, age bands, call-list ranking, checks for existing outreach drafts on disk. |
| server/src/routes/cfs.js | `/api/cfs` preview, remap, commit, book, campaign, account edit, import history. Still mounted. |
| server/src/services/library/text.js | Reads SharePoint/repo files for the Client Library, caches text in `library_file_text`. |
| server/src/services/library/indexer.js (`categoryOf`, `adviceYearOf`, lines 147-169) | Classifies library files by path name. |
| server/src/services/library/fsGuard.js | Read-only, path-confined file access to SharePoint and repo roots. |
| server/src/services/workbench/sources.js | Lists and extracts SharePoint/repo files for a Workbench case. |
| server/src/services/legacySoaStructure.js | Consumer of the house-wording JSON (not read in detail; belongs to the SOA area). |

**Scripts (server/scripts)**

| File | Role |
|---|---|
| import-reference-material.mjs | Imports archived previous-practice material into `training_data`. Dry run unless `--confirm`. |
| import-cfs-statements.mjs | Bulk CLI import of a folder of CFS statement PDFs. `--dry-run` supported. |
| analyse-soa-examples.mjs | Extracts text from the 32 Legacy example SOAs, finds section structure and repeated boilerplate. |
| build-house-wording.mjs | Filters that boilerplate into `server/src/data/legacy-house-wording.json`. |
| prep-soa-case.ps1 | Generation, not extraction. Listed because it shapes the case folder layout. |

**Code (client)**

| File | Role |
|---|---|
| client/src/pages/Documents.jsx | Upload/scan/download page. Not routed in App.jsx (orphan). |
| client/src/pages/ClientDetail.jsx (lines 56-110, 307-340) | Upload to a client, auto-scan, review modal; "Fill Details from Client Profile" modal. |
| client/src/pages/Clients.jsx (lines 25-40) | Drag a profile onto Clients to pre-fill a new client. |
| client/src/components/ClientForm.jsx (lines 96-140) | Same import inside the create form; merges several drops. |
| client/src/pages/HouseholdDetail.jsx (lines 38-55) | Upload to a household member or joint. No scan trigger. |
| client/src/components/DocumentReviewModal.jsx | Review screen. Edits personal fields, ticks rows, then applies. |
| client/src/lib/scanApply.js | Cleans AI values (dates, numbers, booleans, enums) and POSTs rows to the client file. |
| client/src/components/BulkImportTraining.jsx | Settings bulk import into `training_data`, batches of 20. |
| client/src/pages/Meetings.jsx | Paste a transcript by hand. Summary is typed by hand. |
| client/src/pages/PlanGenerator.jsx (lines 226-246) | Master template upload/clear. |

**Prompts / instructions**

- documentScan.js lines 3-36 (system prompt, in section 5).
- cfsStatement.js lines 13-33 (system prompt, in section 5).
- .claude/skills/build-soa/SKILL.md step 1-2: copy the client folder out of SharePoint, then extract. No extraction commands named.
- .claude/skills/meeting-notes/SKILL.md step 1: read the existing SharePoint folder, copying files out to scratch to extract.
- Memory: legacy-soa-from-case-folder.md (the extraction method), legacy-sharepoint-library.md, case-extractor-writes-into-source-folder.md, xplan-live-browse-not-export.md.

**Templates:** none in this area.

**Reference data**

- server/src/data/legacy-house-wording.json. Tracked. 32 source documents. Section counts: general 34, fees 6, about 5, replacement 5, underwriting 5, scope 3, objectives 3, duty-of-care 3, reliance 3, actions 3, needs-analysis-position 2, recommendations 2, important-info 2, current-position 1, cooling-off 1. Content not quoted here.
- `KNOWN` word list in cfsStatementText.js lines 25-31. Contains client surnames and email fragments (see section 13).

**Config:** server/src/config/env.js (`anthropic`, `storage`, `library`). server/.env not read.

**Tests (listed, not opened, may contain fixtures):** server/src/__tests__/cfsImport.test.js, cfsStatementText.test.js, cfsRoutes.test.js, cfsCampaign.test.js, client/src/lib/scanApply.test.js.

**Skipped, with reasons**

| Path | Reason |
|---|---|
| legacy/drop/** (cases/, examples/, .extracted/, .logo-harvest/, initial-meeting-build) | Client data rule. This includes the case extractor script inside a client case folder's `.build/`. |
| legacy/soa/, legacy/file-notes/, legacy/fact-finds/, legacy/follow-ups/ | Client data rule. |
| server/uploads/, server/data/ | Client data rule (stored uploads, task state). |
| CFS statement folders, Downloads, the SharePoint library | Client data rule. |
| archive/lakeside/** incl. retired-app/ (CFS Book, CFS Campaign, CFSImportReview UI) and db-snapshot/ | Previous-practice material, "if unsure, skip". The retired CFS UI moved there in commit 719d259. |
| archive/outlook-and-email/ | Archived email scanning code (archived 16 Sep 2026). Off limits. Not opened. |
| generated-plans/client-emails/ | Client outreach drafts read by cfsCampaign. Client data. |
| Test fixtures | May hold real statement text. |

### 2. Entry point and trigger

There is no single entry point. Six routes in, each started by Tristan by hand.

1. **Upload onto a client (main in-app path).** Clients → open a client → documents area → drop files. The client page posts each file to `POST /api/documents` with `doc_type=client_profile`, then calls the scan. One file: `POST /api/documents/:id/scan`. Several: `POST /api/clients/:id/scan-documents`. The review modal opens. Nothing is written to the client until he clicks "Apply to client".
2. **Pre-fill from a profile.** Drag a profile onto the Clients page, into the create form, or the "Fill Details from Client Profile" modal on a client. Calls `POST /api/clients/import`. The file is not stored. Result pre-fills a form.
3. **Household upload.** HouseholdDetail posts to `/api/documents` against a member or the household. No scan is triggered there.
4. **Training/reference.** Settings → bulk import (`POST /api/training-data/import`), or Plan Generator → master template upload. CLI: `node scripts/import-reference-material.mjs [--confirm] [--emails-only]`.
5. **CFS.** CLI: `node scripts/import-cfs-statements.mjs <folder> [--dry-run]`. API: `/api/cfs/import/preview` → `/remap` → `/commit`. The UI for the API was retired on 2026-08-31; only the CLI and raw API remain.
6. **SOA examples.** CLI: `node scripts/analyse-soa-examples.mjs [--dir] [--out]`, then `node scripts/build-house-wording.mjs`.

Out of app, the main real-world route is chat with Claude Code. Tristan says "build the SOA for X" (build-soa skill) or drops a case folder. Claude copies the SharePoint client folder out, then extracts text with command-line tools (section 4.H).

Transcripts: pasted into Meetings by hand, or pasted into chat for the meeting-notes skill. No file upload or speech-to-text exists.

XPLAN: not a document source in this area. Memory says Claude reads XPLAN live through the `xplan` MCP server in Tristan's logged-in session. Do not ask him for exports.

### 3. Inputs

**Accepted formats (upload.js lines 5-14)**

PDF, DOC (`application/msword`), DOCX, XLSX, XLS, CSV, TXT, and `application/octet-stream`. Anything else is rejected with "Unsupported file type: … Allowed: PDF, DOC, DOCX, XLSX, XLS, CSV, TXT." Size limit `MAX_UPLOAD_MB`, default 25 MB. Not accepted: images, .msg, .eml, .md, .rtf, .pages.

**Extractor branches (documentExtractor.js)** — see section 8.

**Document types (`documents.doc_type`, schema CHECK):** client_profile, statement, tax, identification, insurance, estate, plan, soa, email, other. The type is chosen by the user, never inferred. The client page always sends `client_profile`. The Documents page offers all except soa and email.

**Fields the AI scan extracts (documentScan.js prompt)**

- `client`: first/middle/preferred/last name, email, phone, address, date_of_birth, occupation, annual_income, net_worth, risk_profile, marital_status, smoker, employment_status, employment_basis, employer_name, super_balance, super_provider, super_contributions, health_notes, goals_scope, historic_context, other_details, and the same set prefixed `partner_`.
- `family[]`: first_name, last_name, relationship, date_of_birth, is_dependent, notes.
- `investments[]`: fund_name, ticker, account_type, balance, allocation_pct, asset_class, fee_pct, provider.
- `assets[]`: category, name, value, owner.
- `liabilities[]`: liability_type, name, balance, interest_rate, monthly_payment, lender, owner.
- `income[]`: income_type, name, amount, frequency, owner.
- `expenses[]`: category, name, amount, frequency.
- `insurance[]`: policy_type, provider, cover_amount, premium, frequency, policy_number.
- `goals[]`: name, target_amount, current_amount, target_date, priority.
- `estate`: has_will, will_date, will_location, executor, has_poa, poa_type, poa_attorney, has_testamentary_trust, trust_details, beneficiaries.
- `notes`.

The review modal only shows 16 personal fields plus risk profile (DocumentReviewModal.jsx lines 10-27). Other `client` fields (health_notes, smoker, employment, super, goals_scope…) are extracted but not shown in that modal. They are also not sent on apply, because the modal sends only its own `personal` state (line 79). ClientForm handles some of them under "extra" fields (EXTRA_KEYS, not read in detail).

**CFS statement fields (cfsStatementText.js):** account number, account name (member name above "Statement Report"), product, account value / closing balance, opening balance, "As at" date, report period, adviser (preamble), adviser service fee line amount, holdings (option name, 3-digit option code, APIR code, units, unit price, value, weight %), asset allocation (asset class, growth/defensive bucket, $ value, %), and from the 14 lines above each account: email address and date of birth.

**CFS spreadsheet fields (cfsImport.js FIELDS, lines 74-162):** account_number, account_name, product, option_code, option_name, asset_class, units, unit_price, holding_balance, account_balance, allocation_pct, adviser_fee_pct, adviser_fee_amount, mgmt_fee_pct, as_at_date, account_type. Matched by heading regex, not fixed names.

**Training/reference sources:** Word/PDF/TXT via UI. CLI reads archive/lakeside subfolders (.md emails, .md insurance reviews, .docx/.pdf historical plans). 199 legacy .doc files are skipped by that script.

**Case folders (out of app):** the SharePoint client folder `Clients\<Surname, First>\1. Advice\<Year> Advice & Service\` with `1. Research, Financials, Medicals, Schedules` and `2. Compliance docs`. Contents per memory: quotes, Risk Researcher runs, Insurance Cover Summary / CvC xlsx, pre-assessment emails saved as .msg, fact find, initial notes, SOA Notes, Risk Checklist, comparison and ratings PDFs, insurer application PDFs (some AcroForms), schedules.

### 4. Pipeline step by step

**A. Upload (POST /api/documents)**

1. multer holds the file in memory and checks MIME (upload.js line 22).
2. storage.save writes `<epoch-ms>-<uuid><ext>` to the upload dir (storage.js lines 30-37).
3. extractText runs. Any error is logged and swallowed; text becomes '' (documents.js lines 64-69).
4. Row inserted into `documents` with `scan_status='pending'`, `extracted_text` = text.
5. No AI call at upload.

**B. Scan one document (POST /api/documents/:id/scan)**

1. Rejects if `extracted_text` is empty: "No extracted text to scan for this document".
2. Sets `scan_status='processing'`.
3. `scanDocument(text)`: text is cut to the first 12,000 characters (documentScan.js line 44).
4. **AI call 1.** `completeOrStub` → `complete`:
   - Model: `ANTHROPIC_MODEL`, default `claude-opus-5` (env.js line 68).
   - `max_tokens`: 16,000 (ai.js default, line 82; not overridden).
   - Thinking: `{ type: 'adaptive' }` (ai.js line 90).
   - Effort: `low` (documentScan.js line 53), sent as `output_config.effort`.
   - Temperature etc.: never sent.
   - System prompt: documentScan.js lines 3-36. User message: `Document text:\n<text>`.
   - Non-streaming (streaming only above 16,000 max tokens).
   - `json: true`: response text has a code fence stripped, or the outermost `{…}` is cut out (ai.js lines 51-61).
5. If there is no API key, or the call throws, the regex stub runs instead (ai.js lines 116-125). The stub finds the first email, the first phone-like run, and up to 10 "Capitalised words … number > 100" lines as investments. It sets `notes: 'Heuristic offline scan (no OpenAI key).'`.
6. `JSON.parse`. On failure the whole text goes into `{ notes: <text> }`.
7. `scan_status='done'`, `scan_result` = JSON. The `ai` flag is returned to the browser, not stored.
8. The browser opens the review modal with `scan_result`.

**C. Scan all of a client's documents (POST /api/clients/:id/scan-documents)**

1. Selects every document for the client with non-empty text. client_profile first, then newest first (clients.js line 170).
2. **AI call 1 per document**, same settings as B. One call per document, run one after another. Results are not saved to `documents.scan_result`.
3. Merge (clients.js lines 199-230): first non-empty value per client field wins; list items de-duplicated by key fields (LIST_SPECS line 178); estate booleans OR-ed true; estate text first non-empty wins.
4. Returns `{ ai, scanned, sources, parsed }`. Nothing saved.

**D. Pre-fill import (POST /api/clients/import)**

1. extractText on the in-memory file. Empty text → 400 "No readable text found in that document".
2. **AI call 1**, same settings.
3. Returns `parsed` with fixed keys. The file is not stored and no document row is created.

**E. Review and apply (browser)**

1. DocumentReviewModal shows personal fields pre-filled (document value overrides the client's existing value when non-empty) and ticked rows per category. All rows ticked by default.
2. On "Apply": `PUT /api/clients/:id` with sanitised personal fields; then `applyScan` (scanApply.js lines 265-304): per category, GET existing rows, skip duplicates by key, sanitise, coerce enums, POST each row. A failed POST counts as "skipped". Estate is PUT if it carries anything.
3. For a brand-new client (ClientForm submit) `applyScan` runs with `dedupe: false`.

Manual steps: choose client and type (Documents page only), click Scan, review, untick, Apply.

**F. CFS statements**

API path (cfs.js lines 32-118):
1. PDFs and spreadsheets cannot be mixed in one drop. Only one spreadsheet at a time.
2. Each PDF: extractText (pdf-parse). Empty → warning "no readable text (likely a scanned image)".
3. `parseStatement`: structural parser first (cfsStatementText). If it returns at least one account, no AI.
4. **AI call 2 (fallback only)** when the structural parser finds nothing: text cut to 14,000 characters; system prompt cfsStatement.js lines 13-33; user message `Statement text:\n<text>`; `json: true`; no effort set; default 16,000 max tokens; adaptive thinking; same model. Stub fallback: regex for account number, product, balance, as-at date, with note "Heuristic offline read (no Anthropic key) — verify every field."
5. `matchAccounts` against all clients.
6. Preview returned with summary. `/remap` rebuilds spreadsheet accounts from an edited column map. `/commit` writes in a transaction.

CLI path (import-cfs-statements.mjs): reads every .pdf in the folder with pdf-parse, structural parser only (no AI fallback), matches, prints totals, then upserts accounts by account number and replaces holdings and allocations. Progress printed every 25 files.

Spreadsheet path (cfsImport.parseWorkbook): every sheet read; header row = row in the first 40 that maps the most fields and has an identity column plus a balance or option column; rows grouped into accounts; best sheet = most accounts. No AI.

Counts (code comments, not verified): parser "verified against 252 real statements (258 accounts, 1,300 holdings)". Commit 719d259 says the DB holds 250 CFS accounts, 1,271 holdings, 1,251 allocations.

**G. Training/reference import**

UI: each file → extractText → empty text reported as failed → row in `training_data` with `kind` plan or email, title = filename without extension. No AI.

CLI import-reference-material.mjs: walks four archive/lakeside subfolders in a fixed order (outreach emails, insurance reviews, historical plans, follow-ups last). Skips names starting readme/_template/_sample/index/notes. Strips NUL bytes. Drops text under 400 characters. Inserts with tags and metadata (`source`, `category` or `doc_type`, `archived`, `file`). The order matters because the downstream email-style picker takes the newest rows. No AI.

**H. SOA example analysis**

1. analyse-soa-examples.mjs reads every .docx in `legacy/drop/soa-build/examples` with mammoth.
2. Writes one .txt per example into `legacy/drop/soa-build/.extracted/` (gitignored).
3. Contents-page lines (`text<TAB>page number`, under 70 characters) are counted per document.
4. Paragraphs of 90+ characters are reduced to a "skeleton" (digits → `#`, dollar figures collapsed, lower-cased). A skeleton in at least 60% of documents is boilerplate.
5. Writes `_structure.json` and `_boilerplate.json`.
6. build-house-wording.mjs filters `_boilerplate.json` (section 8) and writes `server/src/data/legacy-house-wording.json`. No AI.

**I. SharePoint reads in the app**

- Library (library/text.js): picks up to `LIBRARY_MAX_FILES` (25) files per question, newest advice year first then by category priority, size ≤ 12 MB, never 'product' (PDS/FSG). Text cached in `library_file_text` keyed on size and mtime. 30,000 characters per file, 420,000 total. The AI call that uses this text lives in library/ask.js (Client Library area, not covered here).
- Workbench (workbench/sources.js lines 79-104): picks up to 10 files in wanted categories, 40,000 characters each, 120,000 total. .doc is not in its readable set. Errors (placeholder will not download, corrupt file) are skipped silently.

**J. Case-folder extraction by Claude in chat (memory: legacy-soa-from-case-folder)**

1. Copy the current year's advice folder from SharePoint to `legacy/drop/soa-build/cases/<Surname, First>/` (build-soa skill) or to the scratchpad. Use robocopy if Copy-Item fails (paths over 260 characters, on-demand download).
2. Read every file:
   - PDF text: `pdftotext` (installed at /clangarm64/bin, xpdf 4.06).
   - DOCX: mammoth.
   - Saved emails (.msg): extract-msg. **Not installed** on this machine as at 2026-10-27 (import fails).
   - Scanned PDFs: pymupdf (installed).
   - AcroForm insurer applications: read field values with pymupdf `widgets()`; pdftotext misses them.
   - Ratings and Risk Researcher tables: render pages to PNG and read the image, because text layout scrambles them and provider names are logos.
   - Spreadsheets (Insurance Cover Summary, `CvC ` sheet): opened per case; method not fixed in memory.
3. Start with SOA Notes and Risk Checklist. Use the latest fact find.
4. The model reading the text is Claude Code itself. No fixed prompt; the skill text and memory are the instructions.

No script for steps 1-2 is tracked in the repo. Per-case build scripts live in each case's `.build/` folder (gitignored, skipped).

### 5. Prompts verbatim

**documentScan.js lines 3-36 (system prompt, joined from string concatenation):**

```
You extract structured data from financial documents. Given the raw text of a client document, return a JSON object with any of these keys you can confidently populate. Use exactly these field names so they map to our system:
- client {first_name,middle_name,preferred_name,last_name,email,phone,address,date_of_birth,occupation,annual_income,net_worth,risk_profile,marital_status,smoker,employment_status,employment_basis,employer_name,super_balance,super_provider,super_contributions,health_notes,goals_scope,historic_context,other_details,partner_first_name,partner_middle_name,partner_preferred_name,partner_last_name,partner_email,partner_phone,partner_date_of_birth,partner_occupation,partner_annual_income,partner_risk_profile,partner_marital_status,partner_smoker,partner_employment_status,partner_employment_basis,partner_employer_name,partner_super_balance,partner_super_provider,partner_super_contributions} (partner_* is the spouse/partner if the document describes a couple; smoker fields are booleans; employment_status is employed/self-employed/retired/unemployed/home-duties; employment_basis is full-time/part-time/casual/contract; health_notes is any health/medical background, goals_scope is what the client wants advice on, historic_context is relevant background/history, other_details is anything else notable)
- family [{first_name,last_name,relationship,date_of_birth,is_dependent,notes}] — children and other dependants; relationship one of child,stepchild,dependent,parent,sibling,grandchild,other; is_dependent boolean
- investments [{fund_name,ticker,account_type,balance,allocation_pct,asset_class,fee_pct,provider}]
- assets [{category,name,value,owner}] — category one of cash,property,vehicle,business,investment,superannuation,collectible,other
- liabilities [{liability_type,name,balance,interest_rate,monthly_payment,lender,owner}] — liability_type one of mortgage,personal_loan,auto_loan,credit_card,student_loan,tax,business_loan,other
- income [{income_type,name,amount,frequency,owner}] — income_type one of salary,rental,pension,dividends,business,government,trust,other; frequency one of weekly,fortnightly,monthly,quarterly,annual
- expenses [{category,name,amount,frequency}] — category one of housing,utilities,living,transport,insurance,education,discretionary,other
- insurance [{policy_type,provider,cover_amount,premium,frequency,policy_number}] — policy_type one of life,tpd,income_protection,trauma,health,home,auto,other
- goals [{name,target_amount,current_amount,target_date,priority}] — priority one of low,medium,high
- estate {has_will,will_date,will_location,executor,has_poa,poa_type,poa_attorney,has_testamentary_trust,trust_details,beneficiaries} — has_* are booleans; poa_type one of financial,medical,both,enduring
- notes (string)
Omit any key, array item, or field you cannot determine. Do NOT invent values. NEVER output placeholder text such as "Not provided", "N/A", "Unknown", "TBC" or similar — if you do not know a value, OMIT that field entirely. Numbers must be plain numbers (no currency symbols, words or commas); never put text in a number field. Dates must be valid YYYY-MM-DD; never put words in a date field. Respond with JSON only.
```

User message: `Document text:\n` + first 12,000 characters.

**cfsStatement.js lines 13-33 (system prompt):**

```
You extract data from Colonial First State (CFS) superannuation, pension and investment statements. Return JSON only, with this exact shape:
{"account_number":string,"account_name":string,"product":string,"account_type":"super"|"pension"|"investment"|"other","balance":number,"adviser_fee_pct":number,"adviser_fee_amount":number,"as_at_date":"YYYY-MM-DD","holdings":[{"option_name":string,"option_code":string,"asset_class":string,"units":number,"unit_price":number,"balance":number,"allocation_pct":number,"mgmt_fee_pct":number}]}
Rules:
- account_name is the member/investor name exactly as printed.
- product is the CFS product, e.g. "FirstChoice Wholesale Personal Super".
- balance is the CLOSING account balance for the period.
- adviser_fee_amount is the total ongoing adviser/advice service fee charged for the period (a positive number); adviser_fee_pct only if the statement states a percentage. Do not treat administration fees, investment/management costs or insurance premiums as adviser fees.
- holdings is one entry per investment option held at the close of the period.
- as_at_date is the closing/valuation date of the statement.
- Numbers must be plain (no $, %, commas or words). Omit any field you cannot determine — never guess, and never output "N/A", "Unknown" or similar.
```

User message: `Statement text:\n` + first 14,000 characters.

No other AI prompts exist in this area. The documents are never classified by AI. Library and Workbench prompts that consume extracted text belong to other areas.

### 6. Output structure

**Database (server/src/db/schema.sql)**

| Table | Columns written here | Written by |
|---|---|---|
| `documents` | client_id, group_id, original_name, storage_key, doc_type, mime_type, size_bytes, extracted_text, scan_status (pending/processing/done/failed), scan_result JSONB | documents.js upload/scan; generatedDocs.js (scan_status 'done', `.md`) |
| `clients` | personal fields | browser PUT after review |
| `current_investments`, `assets`, `liabilities`, `income`, `expenses`, `insurance`, `goals`, `family_members`, estate row | one row per applied item | browser POSTs via scanApply.js endpoints `/investments/current`, `/assets`, `/liabilities`, `/income`, `/expenses`, `/insurance`, `/goals`, `/family`, `PUT /clients/:id/estate` |
| `training_data` | kind (plan/email), title, content, tags, metadata (is_template, source, category, doc_type, archived, file) | trainingData.js, import-reference-material.mjs |
| `meeting_transcripts` | title, meeting_date, content, summary, action_items | Meetings page CRUD (typed by hand) |
| `cfs_imports` | filename, source (spreadsheet/pdf), as_at_date, account_count, holding_count, total_fum, total_fees, column_map | cfs.js commit, CLI |
| `cfs_accounts` | client_id, import_id, account_number (unique when not null), account_name, product, account_type, balance, adviser_fee_pct, adviser_fee_amount, fee_basis, as_at_date, match_status, match_confidence, notes, fee_status (paying/not_paying/unknown), email, date_of_birth, opening_balance, growth_pct, report_period_start/end | cfs.js commit, CLI |
| `cfs_holdings` | option_name, option_code, asset_class, units, unit_price, balance, allocation_pct, mgmt_fee_pct, as_at_date | replaced per account when the import carries holdings |
| `cfs_allocations` | asset_class, bucket (growth/defensive), value, pct | replaced per account when present |
| `library_file_text` | text, chars, src_size, src_modified, error | library/text.js |

**Files**

- Uploads: `server/uploads/<epoch-ms>-<uuid><ext>` (gitignored). Original file bytes.
- Generated documents: same folder, `.md`.
- `legacy/drop/soa-build/.extracted/*.txt`, `_structure.json`, `_boilerplate.json` (gitignored).
- `server/src/data/legacy-house-wording.json` (tracked): `{ note, sourceDocuments: 32, sections: { <section>: [{ documents, text }] } }`.
- Case-folder extraction: whatever Claude writes in the case `.build/` or scratchpad. No fixed output.

### 7. Fixed wording/labels inserted

- Offline scan note: `Heuristic offline scan (no OpenAI key).` (documentScan.js line 73). The app uses Anthropic, so "OpenAI" is stale.
- Offline CFS note: `Heuristic offline read (no Anthropic key) — verify every field.` (cfsStatement.js line 161).
- AI-read CFS account with no name: `Unknown account` (cfsStatement.js line 128).
- CFS warnings: "No account number found — this looks like an empty or closed-account statement.", "<name>: no account value found — skipped.", "No accounts could be read from this statement.", "Nothing readable was found in this document.", "<file>: no readable text (likely a scanned image).", "Drop statements and spreadsheets separately — this batch mixed both.", "Drop one spreadsheet at a time.", "No recognisable header row found on this sheet.", "<n> row(s) skipped — no account name or number.", "<n> account(s) came through with a $0 balance — check the balance column mapping.", "Holdings total X vs account balance Y.".
- Match notes: "Entity (SMSF / trust / company) — link manually.", "Surname match only — confirm before linking."
- Generated document original_name: `<title>.md`.
- UI: "Read in offline mode — please double-check every field", "Heuristic scan complete (AI off)", "Pulled from your document(s). Review, untick anything wrong, then apply. Existing data is only overwritten where the document had a value."
- CFS age band labels (cfsCampaign.js lines 23-31): Under 40; 40 – 54; 55 – 59 (preservation age); 60 – 64 (tax-free pension); 65 – 69; 70 and over; Age unknown.

### 8. Decision logic table

| # | Rule | File:line | Code or model |
|---|---|---|---|
| 1 | PDF (MIME or `.pdf`) → pdf-parse lib file | documentExtractor.js:20-23 | Code |
| 2 | DOCX → mammoth raw text | documentExtractor.js:25-31 | Code |
| 3 | XLSX/XLS/XLSM → each sheet as CSV under `# Sheet: <name>` | documentExtractor.js:33-45 | Code |
| 4 | CSV, TXT → UTF-8 | documentExtractor.js:47-53 | Code |
| 5 | Anything else (incl. .doc, .md if no MIME, .msg) → UTF-8 decode, non-printable bytes to spaces | documentExtractor.js:55-58 | Code |
| 6 | MIME allow-list | upload.js:5-14, 22 | Code |
| 7 | Extraction error → empty text, upload still succeeds | documents.js:64-69 | Code |
| 8 | Scan refused when text empty | documents.js:100 | Code |
| 9 | Scan text truncated at 12,000 chars | documentScan.js:44 | Code |
| 10 | What fields and enum values come back | documentScan.js:3-36 | Model |
| 11 | No key or API error → regex stub | ai.js:116-125 | Code |
| 12 | Multi-doc merge: client_profile docs first, then newest; first non-empty wins | clients.js:170, 205-211 | Code |
| 13 | List de-dupe keys: family first_name+relationship; investments fund_name; assets name+category; liabilities/income/expenses/goals name; insurance policy_type+provider | clients.js:178-187 | Code |
| 14 | Apply de-dupe keys differ: investments fund_name+balance; assets name+value; liabilities name+balance; income/expenses name+amount; insurance policy_type+provider+cover_amount; goals name+target_amount; family first_name+relationship | scanApply.js:100-222 | Code |
| 15 | Placeholder strings → null (not provided, n/a, unknown, none, nil, tbc, tba, dashes) | scanApply.js:28 | Code |
| 16 | Enum coercion: exact → alias → loose contains-match → alias contains → fallback | scanApply.js:60-70 | Code |
| 17 | Enum fallbacks: asset/liability/income/expense/insurance → `other`; goal priority → `medium`; family relationship → `child`; status → `prospect`; risk → dropped | scanApply.js:80-222 | Code |
| 18 | Insurance row with no policy_type kept as `other`; other categories dropped if required field missing | scanApply.js:236-239 | Code |
| 19 | CFS: PDFs vs spreadsheet route | cfs.js:42-46, 88 | Code |
| 20 | CFS statement: structural parse first; AI only when zero accounts | cfsStatement.js:47-58 | Code |
| 21 | Ligature NUL repair: try fi, fl, ffi, ff against KNOWN list, else `fi` | cfsStatementText.js:24-48 | Code |
| 22 | Account split on lines starting `Account number:`; personal details from up to 14 lines above | cfsStatementText.js:112-146 | Code |
| 23 | Holding row regex (name, 3-digit code, APIR, units, $price, $value, %) | cfsStatementText.js:80-81 | Code |
| 24 | Adviser fee = a line starting "(ongoing) adviser/advisor service fee … $x.xx" | cfsStatementText.js:84 | Code |
| 25 | Structural fee_status: fee > 0 → paying, else not_paying | cfsStatementText.js:193 | Code |
| 26 | AI fee_status: fee > 0 → paying, else unknown | cfsStatement.js:136 | Code |
| 27 | Account type: pension/allocated/ABP/TTR/annuity → pension; super/accumulation/SMSF/rollover → super; invest/wrap/IDPS/trust/share → investment; else other | cfsImport.js:354-360 | Code |
| 28 | Spreadsheet header: best of first 40 rows; must have name or number plus balance or option | cfsImport.js:179-200 | Code |
| 29 | Noise rows skipped: total, sub total, grand total, new business, ongoing, adjust… | cfsImport.js:203 | Code |
| 30 | Entity names (pty, ltd, super fund, smsf, trust, trustee, fund, nominees, holdings, company, foundation, estate) never auto-matched | cfsMatch.js:14, 134-137 | Code |
| 31 | Match: unique first+last → high, auto-linked; unique initial+last → medium, auto-linked; surname only → low, suggestions only | cfsMatch.js:142-178 | Code |
| 32 | Commit match_status: client_id → matched; else ignored if sent as ignored; else unmatched | cfs.js:200 | Code |
| 33 | Commit upsert: by account_number, else by lower(name)+lower(product) | cfs.js:174-182 | Code |
| 34 | Holdings/allocations replaced only when the import carries some | cfs.js:249-280 | Code |
| 35 | Spreadsheet import does not blank email/DOB/opening/growth/period from an earlier statement (COALESCE) | cfs.js:224-228 | Code |
| 36 | Library category by path: soa notes → risk checklist → cover/discussion summary → fact find → meeting notes/file note/CDS/initial client notes → PDS/FSG (product) → SOA/ROA → schedule → research/quote/ratings → application/underwriting → certificate/welcome pack/policy n → authority/servicing rights → premium summary/CvC → other. First match wins | library/indexer.js:147-163 | Code |
| 37 | Advice year = highest `20xx` anywhere in the path | library/indexer.js:166-169 | Code |
| 38 | Library never reads `product` category; readable ext includes .doc and .json | library/text.js:40-41 | Code |
| 39 | Workbench readable ext excludes .doc | workbench/sources.js:73 | Code |
| 40 | Training kind: `email` only if posted as email, else `plan` | trainingData.js:51 | Code |
| 41 | Reference import: skip readme/_template/_sample/index/notes; drop < 400 chars; skip .doc | import-reference-material.mjs:47, 52, 125-126, 143 | Code |
| 42 | Boilerplate = 90+ char paragraph skeleton in ≥ 60% of example SOAs | analyse-soa-examples.mjs:98, 108 | Code |
| 43 | House wording reject: `Err: Handling`, `include_schedules`, `Docnote:`, `Version:`, `templateVariable`, `businessRisk True/False`, two named advisers, any `$` figure, under 60 chars | build-house-wording.mjs:24-33, 73 | Code |
| 44 | House wording section: first matching regex of 14 (scope, needs-analysis-position, objectives, current-position, recommendations, replacement, underwriting, duty-of-care, cooling-off, fees, important-info, reliance, actions, about), else general | build-house-wording.mjs:39-59 | Code |

**Gaps**

- No document-type classification. doc_type is whatever the user picked. The client page always sends `client_profile`, so every client upload is treated as a profile and sorts first in merges.
- No OCR anywhere in the app. Image-only PDFs give empty text.
- No .msg, image or .md (by MIME) handling in the app.
- No language or currency handling beyond AUD assumptions.
- No limit on how many documents `scan-documents` sends to the model. One call per document each time.
- The 12,000 / 14,000 character cut is silent. Nothing tells the user the rest was not read.
- The structural CFS parser has no version check. If CFS changes the template, the parser returns zero accounts and the AI fallback runs, with weaker fee evidence.
- Library and Workbench classification is by file and folder name only. A mis-named file is mis-ranked or never read.

### 9. Figures and calculations

| Figure | How | File:line | Concern |
|---|---|---|---|
| Statement adviser_fee_pct | fee amount ÷ closing balance × 100, 4 dp | cfsStatementText.js:178-180 | **Wrong unless the period is one year.** The fee is for the report period, but schema comments say `% p.a.` and `$ p.a.`. report_period_start/end are stored but not used to annualise. |
| Statement fee_status | any adviser service fee line > 0 → paying | cfsStatementText.js:193 | A fee charged on a related account or under another label reads as not_paying. Code relies on one regex. |
| growth_pct | sum of growth-bucket allocation % | cfsStatementText.js:174-176 | OK. |
| Spreadsheet balance | account column first; else sum of holdings | cfsImport.js:311-317 | Mismatch over max($1, 1%) noted, account figure kept. |
| Holding balance from units × price | filled after allocation % and holdings total are computed | cfsImport.js:319-327 | **Order bug.** Those holdings get allocation 0% and are left out of a derived account balance. |
| Fee pct ↔ amount | derive the missing side from balance | cfsImport.js:330-336; cfsStatement.js:111-118 | Assumes annual. |
| AI fee amount | `Math.abs` | cfsStatement.js:113 | OK. |
| Book total_fees | SUM(adviser_fee_amount, else balance × pct / 100) | cfs.js:346-347 | Mixes period amounts from statements with annual amounts from exports. |
| Benchmark rate | user rate; else total fees ÷ paying FUM × 100 if ≥ 0.10%; else 0.55% | cfs.js:368-377 | Inherits the period problem above. |
| Book "opportunity" | not-paying FUM × rate ÷ 100 | cfs.js:400 | Annual figure built from possibly non-annual inputs. |
| Campaign "opportunity" | selected FUM × rate ÷ 100, rate default 0.55% | cfs.js:457, 474 | Does not use the book-derived rate. Book and campaign can show different rates. |
| Age | whole years at today | cfsCampaign.js:39-48 | OK. Ages over 119 → null. |
| Person grouping key | first name reading of the account name | cfsCampaign.js:51-56 | **Splits people.** "SURNAME FIRST" and "First Surname" give different first readings, so one person can become two call-list rows. Two different people with the same name merge. |
| Household growth | balance-weighted average | cfsCampaign.js:159-163, 170 | OK. |
| Two-digit year | `20yy` | cfsImport.js:59 | **Wrong for birth dates** (e.g. `65` → 2065). |
| Written dates | `Date.parse` then `toISOString().slice(0,10)` | cfsImport.js:63-64, 45 | Possible one-day-early shift in Australian time, because local midnight is the previous day in UTC. Not tested. Same risk for Excel Date cells. |
| scanApply numbers | strip every non-digit except `.` and `-` | scanApply.js:46-48 | **"$1.2m" → 1.2, "120k" → 120, "1,200 p.a." → 1200.** No unit handling. A phone-like string in a number field becomes one long number. |
| Heuristic investments | "Capitalised words … number > 100", max 10 | documentScan.js:83-92 | Picks up postcodes, street numbers and years as "investments". Only used offline. |
| Loose enum contains-match | `s.includes(a) \|\| a.includes(s)` | scanApply.js:66 | "life_&_tpd" → life (TPD lost). A short value can match the first allowed value by substring. |

### 10. Where facts come from

- `documents` keeps the original file, the full extracted text and the last single-document `scan_result`. That is the only link between a fact and its source.
- `scan-documents` returns a `sources` list of documents scanned, but not which document gave which field. The merged result is not stored.
- Applied rows (assets, insurance, etc.) and client field updates carry no document id, no "from scan" flag and no AI/heuristic flag. After Apply, provenance is lost.
- `scan_result` does not record whether AI or the heuristic produced it, except the heuristic's `notes` string.
- `/clients/import` keeps nothing. The source file is discarded after the call.
- CFS: preview rows carry `source_file`, but `cfs_accounts` does not store it. `cfs_imports.filename` is the folder name (CLI) or "<n> statements" (API batch). `import_id` points at the last import that touched the account.
- training_data from the CLI keeps `metadata.file` (path relative to archive/lakeside). From the UI only the title (file name) is kept.
- Library text cache keeps file id, size and mtime. The context block sent to the model labels each file with name, category, year and path.
- House wording keeps a per-block count of source documents, not which documents.
- Case-folder extraction in chat: no stored provenance. The skill asks Claude to report file inconsistencies to Tristan.

### 11. Rendering/output formats

- API: JSON.
- Documents page: raw `scan_result` as pretty-printed JSON and the first 4,000 characters of extracted text.
- Review modal: form inputs and tick-box lists with currency labels.
- Download: original bytes with stored MIME and `Content-Disposition: attachment`.
- Generated documents: Markdown files.
- CLI scripts: console text. analyse-soa-examples prints a section table and the first 25 boilerplate blocks (300 chars each).
- House wording: JSON.

### 12. Versioning and history (git, read-only)

| Date | Commit | Change |
|---|---|---|
| 2026-06-03 | f811647 | First build: extractor, scan, storage, documents route. |
| 2026-06-03 | 928fb3e | Training import and templates. |
| 2026-07-21 | e0e3136 | Extractor and scan changes, training data, ai.js. |
| 2026-07-28 | 045e439 | Drag a client profile onto Clients; scanApply.js added. |
| 2026-07-28 | a047238 | CFS import/statement/match/campaign, cfs route, CLI importer, generatedDocs.js. |
| 2026-08-31 | 16639a6 | Move to Claude Opus 5; ai.js call shape (adaptive thinking, effort, no temperature). |
| 2026-08-31 | c6695f4 | Reset DB for Legacy; import-reference-material.mjs. |
| 2026-08-31 | 3a389fd | analyse-soa-examples.mjs; client documents kept out of git. |
| 2026-08-31 | 064247a | build-house-wording.mjs; SOA generator rebuilt on house structure. |
| 2026-08-31 | 719d259 | CFS, investments and financial plan UI retired to archive/lakeside/retired-app. CFS API left mounted. |
| 2026-09-16 | (memory) | Email scanning archived. Code is at archive/outlook-and-email/ and is off limits. |

No prompt versioning. Prompts are string constants in code; changes are visible only in git diffs. The model name comes from env, so the model can change without a code change. Weekly checkpoint commits exist up to 2026-09-28; none of the files here changed after 2026-08-31.

### 13. Known problems and workarounds

1. **.doc is unreadable.** The extractor has no .doc parser and returns byte soup with control characters replaced by spaces. Upload accepts .doc anyway, stores the junk as `extracted_text`, and the scan sends it to the model. The Library reader also lists .doc as readable. The reference importer skips 199 .doc files on purpose. Workaround: convert to .docx.
2. **Scanned PDFs give no text.** No OCR in the app. Upload succeeds with empty text; scan then fails with "No extracted text". In chat Claude uses pymupdf and page images instead.
3. **NUL bytes from PDFs.** pdf-parse writes NUL for ligatures. The CFS parser repairs them and the reference importer strips them. The upload route, training import and library cache do not strip them. Postgres text columns reject NUL, so those inserts would fail. From code reading, not tested. If the documents insert fails, the file is already on disk with no row (orphan).
4. **OneDrive placeholders.** SharePoint files are Files On-Demand. Reading one downloads it, so bulk reads are slow and can fail. Library caches text by size and mtime. Workbench skips files that will not download, silently. Paths can exceed 260 characters; build-soa says use robocopy.
5. **Source-folder write incident (2026-09-18).** A per-case extractor script writes `.extracted/` inside whatever folder it is given. It was run against a client folder inside the SharePoint library and created 17 .txt files there. They were copied out and the folder deleted about four minutes later. Tristan was told. Rule since: copy the folder out to scratch first, or pass an explicit out-dir; never run a tool that writes beside its inputs against the library. `analyse-soa-examples.mjs` has the same shape: its default out-dir is beside its input (`legacy/drop/soa-build/.extracted`), and `--dir` can point it anywhere, though `--out` is separate.
6. **SharePoint is read-only, absolutely.** fsGuard exports no write. Nothing from the library goes into git.
7. **extract-msg is not installed** on this machine (checked 2026-10-27). The memory method names it for .msg emails. Note also that reading saved client emails may conflict with the permanent no-email rule; see Questions.
8. **Silent truncation** at 12,000 characters (scan) and 14,000 (CFS AI). Long fact finds lose later sections.
9. **Review modal drops extracted fields.** Only 16 personal fields and risk profile are shown and saved. Health, smoker, employment, super, goals_scope and other client fields from the scan are discarded on the existing-client path.
10. **Documents page is orphaned.** Not routed in App.jsx. Its drop zone says "PDF, DOC, DOCX, TXT" but accepts xlsx/xls/csv.
11. **Offline fallback is quiet.** An API error falls back to the heuristic stub; the row is saved as `done`. Only a toast tells the user.
12. **Stale label** "no OpenAI key" in the heuristic note.
13. **Client data in code.** cfsStatementText.js lines 25-31 `KNOWN` holds client surnames and email-name fragments for ligature repair. Code comments in cfsMatch.js (lines 4, 54), cfsCampaign.js (lines 50, 61-62) and library/indexer.js (line 29) use what look like real client names as examples ([CLIENT_1] … [CLIENT_5]). These are in tracked files.
14. **CFS campaign reads outreach drafts on disk.** cfsCampaign.readDrafts lists `generated-plans/client-emails/*.md` to mark people as "drafted". These are client outreach emails. Flagged for the email rule. It reads file names only.
15. **Medium-confidence CFS matches are auto-linked**, although the module header says anything below high is reviewed. The retired UI did the review; with the UI gone, a CLI import commits medium matches straight to client files.
16. **CLI import has no AI fallback** and does not store `fee_basis` or holding asset_class/mgmt_fee_pct. API and CLI can give different results for the same PDF.
17. **Word COM PDF export hangs** on this machine at times (memory). Affects case outputs, not extraction.
18. **Stray file** named `$null` at the repo root (seen in `ls`). Likely a shell redirect mistake. Not opened.

### 14. Dependencies

**npm (server/package.json):** `pdf-parse` ^1.1.1 (imported from `pdf-parse/lib/pdf-parse.js` to avoid its debug block), `mammoth` ^1.8.0, `xlsx` ^0.18.5, `multer` ^2.1.1, `@anthropic-ai/sdk` ^0.69.0, `docx` ^9.5.1 (generation). PostgreSQL via server/src/config/db.js.

**Environment variables (names only):** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `STORAGE_DRIVER`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`, `LEGACY_LIBRARY_ROOT`, `LEGACY_LIBRARY_CLIENTS_DIR`, `LEGACY_REPO_ROOT`, `LIBRARY_MAX_FILES`, `LIBRARY_MAX_FILE_MB`, `LIBRARY_MAX_CONTEXT_CHARS`, plus DB variables. Values not printed.

**External service:** Anthropic Messages API (only when the key is set).

**Local tools for chat extraction (checked 2026-10-27):** pdftotext (xpdf 4.06) present; Python 3.14 with pymupdf and python-docx present; extract-msg missing; mammoth via server/node_modules; Word and Excel COM; robocopy.

**MCP:** `xplan` server (automation/xplan) for live XPLAN reads. Not part of document extraction.

**Data roots:** SharePoint synced library under the user's profile (`Legacy Risk Advice\Legacy - Documents`, not the partial OneDrive shortcut); repo `legacy/`.

### 15. Questions for Tristan

1. Is the in-app upload → scan → apply flow still used, or is chat with Claude now the only way documents get read? Should the shared skill include the app flow at all?
2. Should the shared skill carry a fixed extraction script for case folders (pdftotext, mammoth, pymupdf, page images), with a hard-coded out-dir outside SharePoint? Today there is none in the repo.
3. .msg files in case folders: the method lists extract-msg, but it is not installed and the permanent rule is no reading of email. Are saved client emails inside a SharePoint case folder allowed to be read?
4. Should .doc files be converted (for example via Word COM) before reading, or skipped?
5. Is OCR needed for scanned medicals and signed forms, or are page images read by Claude enough?
6. The CFS book: is it still needed, or can the CFS code be retired with its UI? If kept, are the fee figures meant to be annual? Statement fees are per report period.
7. Should medium-confidence CFS name matches still auto-link without review?
8. The `KNOWN` word list and code comments hold client names in tracked files. Remove or replace them before the code is shared with a team?
9. Should every applied fact record which document it came from?
10. Should the scan show the fields it currently drops (health, smoker, employment, super) on the existing-client review screen?
11. Is the 12,000-character scan limit acceptable, or should long documents be read in parts?
12. Which model and effort should the shared skill use for extraction? Code uses `ANTHROPIC_MODEL` (default `claude-opus-5`) at low effort for the scan and default effort for CFS.
13. Should the house-wording build be re-run on newer example SOAs (it is from 32 SOAs, 31 Aug 2026), and who owns that refresh?

---

## Part 6. Client Library and Chat

Scope: the Client Library (ask a question about one client, get a summary from SharePoint + repo `legacy/` + the app DB) and the chat refinement assistant (`/api/chat`). Read only. No code was run, no DB queried, no network used.

Client data note: several code comments and one prompt example contain real client names. They are replaced below with `[CLIENT_n]` placeholders. Where this was done it is marked "(names replaced)".

### 1. Inventory

**Code (server)**

| File | Role | Git state |
|---|---|---|
| `server/src/services/library/fsGuard.js` | Only door to the document roots. Read-only, path-confined. | Committed in 5b07300 (21 Sep 2026), unchanged since |
| `server/src/services/library/match.js` | Name normalising, folder-name parsing, client ranking from a question | Committed 5b07300 |
| `server/src/services/library/indexer.js` | Pass 1 (client names), pass 2 (one client's file list), file category and year rules | Committed 5b07300 |
| `server/src/services/library/text.js` | File selection, text extraction with DB cache, context bundle | Committed 5b07300 |
| `server/src/services/library/ask.js` | The ask pipeline, the AI prompt, stub answer, history | Committed 5b07300 |
| `server/src/routes/library.js` | `/api/library/*` routes | Committed 5b07300 |
| `server/src/services/chat.js` | Plan / follow-up message refinement chat (`refine`) | Last changed 16639a6 |
| `server/src/routes/chat.js` | `/api/chat/:targetType/:targetId` | Last changed e0e3136 |
| `server/src/services/ai.js` | Anthropic wrapper (`complete`, `completeOrStub`) used by both | — |
| `server/src/services/documentExtractor.js` | `extractText` (pdf, docx, xlsx/xls/xlsm, csv, txt, fallback decode) | — |
| `server/src/services/planGenerator.js` lines 330-338 | `CALC_GUARDRAILS`, appended to the plan chat prompt | — |
| `server/src/routes/index.js` lines 13, 17, 45, 48 | Mounts `/chat` and `/library` | — |
| `server/src/app.js` line 33 | Mounts the router under `/api`; JSON body limit 2mb (line 26) | — |

Other users of the library modules (not part of the ask feature):
- `server/src/services/workbench/lookup.js` — existing-client check from SharePoint folder NAMES (uses `listDir`, `rootAvailable`, `normalise`, `peopleOf`).
- `server/src/routes/crm.js` lines 17, 119-145 — CRM SharePoint folder picker (uses `listDir`, `statFile`, `absolutePathOf`).
- `server/src/services/workbench/sources.js`, `pack.js` — use `walkFiles`, `readFileBuffer`, `categoryOf`, `adviceYearOf` for the SOA draft and pack (outside this part).
- `server/src/services/crm/names.js`, `crm/practice.js` — use `normalise`.

**Code (client)**
- `client/src/components/ChatPanel.jsx` — chat UI for plan refinement. Only mounted in `client/src/pages/PlanGenerator.jsx` line 207 with `targetType="plan"`.
- Client Library page: NOT FOUND. Looked for `Library.jsx` and any `/library` call in `client/src/**` (Glob of `client/src/pages/*.jsx`, Grep for `library`, `/ask`). No route in `client/src/App.jsx`, no nav entry in `client/src/components/Layout.jsx`.
- No UI mounts `ChatPanel` with `targetType="email"`. Grep of `client/src` found only the plan use.

**Prompts**
- Library ask system prompt: `server/src/services/library/ask.js` lines 16-38 (`SYSTEM`).
- Plan refinement prompt: `server/src/services/chat.js` lines 27-35, plus `CALC_GUARDRAILS` (`planGenerator.js` 330-338).
- Follow-up message refinement prompt: `server/src/services/chat.js` lines 36-37.

**Templates**: none. No document templates in this area.

**Reference / memory**
- `memory/client-library-page-in-progress.md` (dated 2026-09-21, 35 days old).
- `memory/legacy-sharepoint-library.md` (2026-09-16).
- `memory/workbench-is-the-new-program.md` (2026-10-22, lookup paragraph 2026-10-26).

**Config**
- `server/src/config/env.js` lines 66-72 (`anthropic`) and 86-97 (`library`).
- `server/src/db/schema.sql` lines 271-279 (`chat_messages`), 612-672 (`library_clients`, `library_files`, `library_file_text`).

**Tests**: none for this area. `server/src/__tests__/` holds api, cfs*, crm*, riskSoaGuardrails tests only. No test for `fsGuard`, `match`, `indexer`, `text`, `ask`, or `chat`.

**Skills**: no `.claude/skills/*` file references the library or chat (Grep for `assistant|/ask|library/ask`).

**Skipped, with reasons**
- SharePoint library itself (`C:\Users\TristanBiro\Legacy Risk Advice\...`): client data rule.
- `legacy/drop/**`, `legacy/soa/`, `legacy/file-notes/`, `legacy/fact-finds/`, `server/uploads/`, `server/data/`, Downloads: client data rule. Note that `repoRoot` = `legacy/`, so the repo index would read these at run time; contents not examined.
- `archive/lakeside/db-snapshot/chat_messages.json`: likely holds real chat content; not opened.
- Any mail-related code: email rule. The follow-up message target of the chat is described only generically.

### 2. Entry point and trigger

**Client Library**
- HTTP only. No UI calls it (page not built). No skill or schedule calls it.
- `POST /api/library/ask` body `{question, clientId?}` — the question box (`routes/library.js` 82-104).
- `POST /api/library/reindex` — rebuild the client name index (24-38). Manual; nothing calls it automatically.
- `GET /api/library/status`, `GET /api/library/clients?q=&limit=`, `GET /api/library/clients/:id/files`, `GET|DELETE /api/library/clients/:id/history`, `GET /api/library/files/:id/download`, `GET /api/library/files/:id/path`.

**Chat**
- `POST /api/chat/:targetType/:targetId` body `{message}`; `GET` same path for history (`routes/chat.js`). `targetType` must be `plan` or `email` (line 8).
- Triggered by the Send button or Enter in `ChatPanel.jsx` (lines 28-47) on the Plan Generator page (an archived screen per the workbench memory).

**General chat assistant**: NOT FOUND as a separate feature. The only chat is the plan / follow-up message refinement above, and the library ask (which keeps per-client chat history). Looked in `server/src/routes/*.js`, `client/src/**/*.jsx`, `.claude/skills/**`.

### 3. Inputs

**Library ask**
- `question` (string, required, trimmed).
- `clientId` (optional `library_clients.id`). If absent, the client is resolved from the question text.
- The `library_clients` index (must be built first by `/reindex`).
- Files under the SharePoint root `Clients\<folder>` or repo `legacy/` files, read on demand.
- App DB rows: `clients`, `insurance_policies`, `financial_plans` (via `dbFacts`).
- Prior turns from `chat_messages` where `target_type='library'` and `target_id=client.id` (up to 12).

**Chat refine**
- `targetType`, `targetId`, `message`.
- Current document: `financial_plans.content` (plan) or the follow-up message table's `body`.
- Up to 20 prior turns from `chat_messages` for that target.

### 4. Pipeline step by step

**Library: reindex (`indexer.indexClients`)**
1. SharePoint pass (`indexSharepoint`, indexer.js 64-76). If the root is missing, returns `skipped: 'root-unavailable'`. Lists one level of `Clients\` (names only). Upserts one `library_clients` row per folder with `display_name` and `search_key`. Progress every 100 folders.
2. Repo pass (`indexRepo`, 83-129). `walkFiles('repo','', maxDepth 3, maxFiles 3000)`. Skips paths starting with `drop`. Derives a client name from each file name (`clientNameFromFileName`). Files with no name are "leftovers"; each joins the best-ranked derived client if score >= 0.8. Upserts one row per derived client with `rel_path` = common parent dir, then writes its file list (`replaceFiles`).
3. Response is NDJSON lines: `{type:'progress',...}`, then `{type:'done', sharepoint, repo, roots, indexed}` or `{type:'error', message}`.

**Library: ask (`ask.ask`, ask.js 88-195)**
1. Reject empty question (`'Ask a question first'`).
2. Resolve client. If `clientId` given, load it. Otherwise progress `resolving`; load all `library_clients`; if none, return `{status:'not-indexed'}`. Run `resolveClient`. If no confident winner, return `{status:'not-found'|'ambiguous', candidates}`. No AI call in this step.
3. If `files_indexed_at` is null: progress `indexing`; `indexClientFiles` walks the client folder (maxDepth 6, maxFiles 800) and writes `library_files`. Repo clients skip this (done at reindex).
4. `selectFiles` picks up to `maxFilesPerAsk` (25) files. Rules in section 8.
5. In parallel: `gatherContext` (reads each file through the text cache, progress `reading` per file) and `dbFacts(display_name)`.
6. Load up to 12 prior library turns for this client (oldest first).
7. Progress `thinking` with the count of files that gave text.
8. Build context string and messages (section 5).
9. **AI call 1 (only call).** `completeOrStub({messages, json:true, maxTokens:8000, effort:'medium'}, stubAnswer)`.
   - Model: `env.anthropic.model` = `ANTHROPIC_MODEL` or default `'claude-opus-5'` (env.js 68).
   - Thinking: `{type:'adaptive'}` always (ai.js 90).
   - Effort: `output_config: {effort:'medium'}`.
   - Max tokens: 8000. Under 16000, so non-streaming `messages.create` (ai.js 98-105).
   - No temperature/top_p/top_k (stripped by design, ai.js 67-70).
   - Caching: the context user block carries `cache_control: {type:'ephemeral'}`. The system prompt is not cached (no `cache: true` flag).
   - JSON: response text passed through `coerceJson` (strips ``` fences, else slices first `{` to last `}`).
   - On no key or any API error: deterministic `stubAnswer`, `ai:false`.
10. `JSON.parse`. On failure, the raw text becomes `answer` and other fields are empty.
11. Insert two `chat_messages` rows: the question (user) and `parsed.answer` (assistant).
12. Return the result object (section 6). Route sends `{type:'done', ...result}` as the last NDJSON line.

Counts per ask: 1 AI call. 0 AI calls on not-indexed / not-found / ambiguous.

**Chat refine (`chat.refine`, chat.js 12-91)**
1. Load the target row; throw `"<type> not found"` if missing.
2. Load up to 20 prior turns.
3. Build system prompt by target type (section 5).
4. Messages: system, user `"Current <type>:\n<content or (empty)>"`, history, new message.
5. **AI call (only call).** `completeOrStub({messages, json:true, maxTokens:12000, effort:'medium'}, stub)`. Same model, adaptive thinking, non-streaming. No caching.
6. Parse `{reply, content}`. Empty reply -> `'Done — updated the document.'`. Non-string or blank content -> keep current. Parse failure -> raw text is the reply, document unchanged.
7. Insert user and assistant (short reply only) rows into `chat_messages`.
8. If content changed, `UPDATE financial_plans SET content` or update the follow-up message body.
9. Return `{reply, updatedContent | null, ai}`.

**Manual steps**: run `/reindex` before the first ask. Run `npm run db:migrate` for the tables (memory says done 2026-09-21). No other manual step.

### 5. Prompts verbatim

**5.1 Library ask system prompt** — `server/src/services/library/ask.js` lines 16-38. (names replaced: one example source file name contained a real client name, now `[CLIENT_1]`.)

```
You are the client research assistant inside FPGod, the practice system of Legacy Risk Advice — an Australian personal risk (life insurance) advice firm, corporate authorised representative of Synchron. You are reading a client's own file and answering the adviser's question about them.

GROUND RULES
- Use ONLY the supplied client files and database records. If something is not in them, say so plainly — "the file doesn't say" — and never estimate, infer or fill a figure from general knowledge.
- Every number (sum insured, premium, income, debt) must be traceable to a supplied file. Quote it as written.
- Australian context throughout: AUD, "superannuation", "income protection", "TPD", "trauma", insurer names as written.
- Where files disagree (a quote at one premium, a checklist at another), say so and name both files. Inconsistencies are the most useful thing you can surface.
- Be concise and specific. The reader is the adviser who owns this client; they want facts, not preamble.
- This is an internal research note, not advice to a client.

Respond with JSON ONLY, in this shape:
{
  "headline": "one sentence: who this client is and where things stand",
  "identity": [{"label": "Age", "value": "38"}, {"label": "Occupation", "value": "Pharmacist and pharmacy owner"}],
  "cover": [{"type": "Life", "insurer": "TAL", "amount": "$2,000,000", "owner": "Superannuation", "premium": "$3,420 pa", "status": "In force"}],
  "latestAdvice": {"date": "October 2025", "summary": "what was advised and what happened"},
  "openItems": ["anything outstanding, in progress, or awaiting the client"],
  "flags": ["inconsistencies between files, missing compliance documents, stale data"],
  "answer": "Markdown answering exactly what the adviser asked. Reference file names inline where a fact comes from one.",
  "sources": [{"name": "2025 Statement of Advice - [CLIENT_1].docx", "why": "cover levels and premiums"}]
}

Leave "cover" as an empty array if the files show no insurance. Keep "identity" to the handful of facts that matter (age, occupation, income, household, health/smoker status). Omit nothing you found, invent nothing you didn't.
```

The firm name and licensee are hard-coded in this prompt, not taken from `env.firm`.

**5.2 Library ask context message** — ask.js 128-132. Sent as the first user turn, cached:

```
CLIENT: ${client.display_name} (filed as "${client.folder_name}", source: ${client.source === 'repo' ? 'repo working folders' : 'SharePoint client library'})
\nAPP DATABASE RECORD:\n${JSON.stringify(facts, null, 1)}        <- when dbFacts found a row
\nAPP DATABASE RECORD: none — this client is not in the app database.   <- otherwise
\nFILES ON RECORD (${files.length} read):\n${text || '(no readable text)'}
```

Each file block inside `text` (text.js 125-127), joined by `\n\n---\n\n`:

```
### ${file.name}
(${file.category}${file.advice_year ? `, ${file.advice_year}` : ''} — ${file.rel_path})

${body}
```

Truncated files end with `\n…[truncated]` (text.js 122).

Message order: system `SYSTEM`; user context (cached block); prior turns (user question / assistant prose answer); user `question`.

**5.3 Plan refinement system prompt** — chat.js 28-35, then `CALC_GUARDRAILS`.

```
You are collaboratively building and refining a client financial plan with the adviser, live. Apply the adviser's instruction to the document. Respond with JSON ONLY in this shape: {"reply": "a brief, friendly 1-2 sentence summary of exactly what you changed, for the chat", "content": "the COMPLETE revised plan in Markdown (the whole document, not a diff)"}. In "content" keep everything that was already good, apply the requested change, preserve [ADVISOR TO CONFIRM] markers, and keep the Australian SOA style and AUD. If the adviser is only asking a question (not requesting an edit), answer it in "reply" and return the document unchanged in "content".

CALCULATION INTEGRITY — these rules are MANDATORY and override the template if it shows a calculation done differently:
1. Show the working for every dollar figure you derive. After any table of components or any tax figure, RE-CHECK it before writing: the parts must sum to the stated total, and every tax amount must equal the rate applied to the correct base. If a check fails, fix the numbers — never output a figure you have not verified.
2. Superannuation proportioning rule (ITAA 1997 s307-125): every super lump sum, withdrawal or rollover is drawn from the tax-free and taxable components in the SAME proportion they bear to the whole interest. NEVER assume a withdrawal comes wholly or disproportionately from the taxable component. (E.g. withdrawing from an interest that is 95% taxable removes 95% taxable / 5% tax-free — not 100% taxable.)
3. Re-contribution strategy: a non-concessional re-contribution is 100% tax-free component, but the preceding withdrawal is proportional (rule 2). Recompute BOTH components from the proportioning rule; do not subtract the whole withdrawal from the taxable component.
4. Super death benefits tax — taxed element of the taxable component paid to a non-dependant: 15% + 2% Medicare = 17% if paid directly from the fund, or 15% (no Medicare) if paid via the deceased estate. The tax-free component is always nil-taxed. State which payment path you assume.
5. Non-concessional contributions (NCC) cap & bring-forward — use the cap for the financial year the contribution falls in: 2024-25 and 2025-26 = $120,000/yr (3-year bring-forward $360,000); from 1 July 2026 = $130,000/yr (3-year bring-forward $390,000). Bring-forward also needs age < 75 on 1 July of the trigger year and a Total Super Balance under the threshold. Flag any figure that changes at a 1 July boundary near the advice date.
6. CGT main residence exemption: covers the dwelling plus adjacent land up to 2 hectares TOTAL including the land under the dwelling (ITAA 1997 s118-120). For land over 2 ha, you select which 2 ha is exempt and apportion the remainder by relative VALUE where parts can be separately valued (otherwise by area), and the split must be reasonable (TD 1999/67). Individuals get the 50% CGT discount on assets held > 12 months.
7. Every tax, CGT, super or projection figure is ILLUSTRATIVE: state the assumptions it rests on, mark it [ADVISOR TO CONFIRM], and never present it as a guaranteed outcome.
```

(The source joins the first paragraph and `CALC_GUARDRAILS` with `\n\n`. The code comment says the thresholds are date-sensitive and must be reviewed each FY.)

**5.4 Follow-up message refinement system prompt** — chat.js 36-37.

```
You are refining a follow-up email with the adviser. Respond with JSON ONLY: {"reply": "a brief summary of what you changed", "content": "the COMPLETE revised email body (plain text, no subject line)"}.
```

**5.5 Chat first user turn** — chat.js 41: ``Current ${targetType}:\n${currentContent || '(empty)'}``.

**5.6 ai.js filler turn** — if no user turn comes first, ai.js 34-36 inserts a user turn `Proceed.`.

### 6. Output structure

**Library ask, `status:'ok'`** (ask.js 165-194):
- `ai` (boolean: true = model answered, false = stub).
- `client`: `id, displayName, folderName, source, relPath, latestYear, fileCount`.
- `summary`: `headline` (string), `identity` [{label,value}], `cover` [{type, insurer, amount, owner, premium, status}], `latestAdvice` {date, summary} or null, `openItems` [string], `flags` [string].
- `answer`: Markdown string.
- `sources`: model's [{name, why}], each enriched with `id` and `relPath` when `name` exactly equals a file that was read; else `null`.
- `filesRead`: every selected file [{id, name, category, year, chars, skipped, relPath}]. `chars:0` + `skipped` reason for unreadable/empty.

Other statuses: `{status:'not-indexed'}`, `{status:'not-found', candidates:[]}`, `{status:'ambiguous', candidates:[client rows + score]}`.

Transport: NDJSON. Progress lines `{type:'progress', step}` with steps `resolving`, `indexing` (+client), `reading` (+done,total,file), `thinking` (+files). Final `{type:'done',...}` or `{type:'error', message}`.

Citations: two layers. Inline file names in `answer` (asked for by the prompt). The `sources` array (model-written, matched to real file ids by exact name). `filesRead` is the code's own record of what was actually put in context.

UI: NOT FOUND (page not built). The memory records the agreed shape: a fixed risk-adviser card (identity, cover held, latest advice, open items, flags) plus a free-text answer with sources.

**Chat refine**: `{reply, updatedContent, ai}`. `ChatPanel` shows `reply` as a bubble and calls `onUpdate(updatedContent)` when non-null; errors show as an assistant bubble prefixed with a warning sign.

### 7. Fixed wording inserted

Library:
- Stub answer (ask.js 73-82), when AI is off or the call fails:
  - headline: `` `${display_name} — ${n} file(s) indexed from ${'the working folders' | 'the client library'}.` ``
  - flags: `'AI is off (no ANTHROPIC_API_KEY), so this is a file listing rather than a summary.'` (shown even when the cause was an API error, not a missing key.)
  - answer: `"I can see this client's file but can't read it into a summary without AI enabled.\n\nWhat's on file:\n\n"` + lines `- **<category>** — <names>` or `- (no readable documents)`.
  - sources: first 10 files, `why` = category.
- Context lines: `APP DATABASE RECORD: none — this client is not in the app database.`, `(no readable text)`, `…[truncated]`.
- Errors: `'Ask a question first'`, `'Client not in the library index'`, `'File not in the index'`, `'Absolute paths are not accepted'`, `'Path escapes the library root'`, `'Not a file'`, `` `File is ${n}MB, over the ${m}MB read limit` ``, `` `Unknown library source: ${source}` ``.

Chat:
- Stub: `` `(Offline stub) Noted: "${message}". Set ANTHROPIC_API_KEY to apply AI edits automatically.` ``
- Defaults: `'Done — updated the document.'`, `'Sorry, I could not apply that — please try rephrasing.'`.
- Errors: `'targetType must be "plan" or "email"'`, `'message is required'`.
- ChatPanel empty-state text (lines 58-61): "Talk to the AI to build this {targetType} together. Ask for changes in plain English — e.g. “Add an SMSF strategy section”, “Expand the retirement projections”, “Make the tone warmer”, or “Shorten the summary”. Each change is applied to the document live in the preview, and I’ll confirm what I changed here." Header "✨ Build & refine with AI". Placeholders "Type an instruction…" / "Select an item first". Busy text "Thinking…".

Workbench lookup status lines (lookup.js 125-130), passed to the workbench writers:
- `` `EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.` ``
- `` `POSSIBLY AN EXISTING CLIENT: a record with the same name exists${' in SharePoint'?}${' in the program'?}, not yet confirmed. Do not assume it; go by the transcript.` ``
- `` `NEW CLIENT: no existing client file was found for them at ${env.firm.name}.` ``

### 8. Decision logic table

All rules below are in code. The model decides only the content of the JSON answer.

| Rule | Where | Code / model |
|---|---|---|
| Only two roots: `sharepoint`, `repo`; any other source throws | fsGuard.js 21-27 | Code |
| No write, rename, delete or mkdir is exported | fsGuard.js 10-13, 160-170 | Code (by absence) |
| Leading slashes stripped; absolute path rejected; resolved path must stay inside root (case-insensitive on Windows) | fsGuard.js 30-49 | Code |
| Symlinks/junctions resolved with `realpath` and re-checked; missing path falls back to lexical check | fsGuard.js 56-66 | Code |
| Directory listing skips `~$*`, `.DS_Store`, `Thumbs.db`, and entries that fail `stat` | fsGuard.js 88-96 | Code |
| `walkFiles` breadth-first queue (comment says depth-first), default maxDepth 8, maxFiles 2000; unreadable subfolders skipped | fsGuard.js 114-134 | Code |
| `readFileBuffer` refuses dirs and files over `maxFileBytes` (12 MB) | fsGuard.js 147-155 | Code |
| Library routes never write to roots; `/files/:id/download` sends a copy `inline`; `/files/:id/path` returns absolute path with `readOnly:true` | routes/library.js 10-16, 133-154 | Code |
| SharePoint clients = one per folder directly under `Clients` | indexer.js 64-76 | Code |
| Repo: walk depth 3, max 3000 files; skip anything whose normalised path starts with `drop` | indexer.js 85-92 | Code |
| Repo client name from file name, 4 patterns in order: `<Name> MMMdd -`; `YYYY.MM.DD - <Name> -`; `- Surname, First [and Surname, First]` at end; slug `name-name-mmmdd` | indexer.js 26-46 | Code |
| Repo leftover file joins a client if `rankClients` score >= 0.8 | indexer.js 110-113 | Code |
| Client file pass (SharePoint): depth 6, max 800 files; keep if textual extension OR size > 0 | indexer.js 201-206 | Code |
| Category from full relative path (folder names included), first match wins: soa-notes, risk-checklist, cover-summary, fact-find, meeting-notes, product (PDS/FSG), soa (incl. ROA), schedule, research, application, policy-doc, authority, premium, other | indexer.js 147-163 | Code |
| Advice year = highest `20xx` anywhere in the relative path | indexer.js 166-169 | Code |
| Name normalising: NFD, strip accents, lowercase, non-alphanumerics to space | match.js 12-20 | Code |
| Folder parsing: parentheticals removed; split on `and`/`&`; a chunk without a comma inherits the previous surname | match.js 33-60 | Code |
| `search_key` = unique sorted tokens, minus `and`/`&` | match.js 86-91 | Code |
| Question tokens: drop ~100 filler words (incl. `cover`, `insurance`, `policy`, `premium`, `soa`, `advice`, `review`, `last`, `new`) and 1-char tokens | match.js 96-120 | Code |
| A single matched token shorter than 4 chars is ignored | match.js 130-133 | Code |
| Confident match needs score >= 0.8 and >= 0.2 ahead of the runner-up; else `ambiguous` | match.js 161-171 | Code |
| Files never read: category `product` | text.js 40 | Code |
| Readable extensions: .docx .doc .pdf .xlsx .xls .xlsm .csv .txt .md .json (`.msg` is indexed as textual but never read) | text.js 41; indexer.js 171 | Code |
| File must have size > 0 and <= 12 MB | text.js 54-60 | Code |
| Sort: newest advice year first (null = 0, last), then category priority, then newest modified | text.js 24-38, 61-67 | Code |
| Take first 25 | text.js 68 | Code |
| Text cache hit when cached size AND mtime equal the index row; else re-read (this downloads a placeholder) | text.js 72-99 | Code |
| Extraction errors are cached too, and the file is reported `skipped` | text.js 86-98, 118-121 | Code |
| DB facts: tokens of display name > 2 letters; any `clients` row whose first/last/partner name equals any token; LIMIT 5; prefer row with both first and last name in tokens, else first row | ask.js 41-62 | Code |
| History: last 12 library turns (actually the first 12 by `created_at ASC LIMIT 12`) | ask.js 119-124 | Code |
| Answer content, flags, inconsistencies, sources | ask.js 16-38 | Model |
| Chat: target must be `plan` or `email`; history `ASC LIMIT 20`; document only overwritten when JSON parses and `content` is a non-blank string that differs | chat.js 17-22, 57-88; routes/chat.js 8 | Code |
| Workbench lookup: SharePoint folder names cached 10 min; a folder is a "name" hit when surname equal and first name equal, prefix of >= 3 chars, or a parenthetical nickname; auto-suggest only when exactly one name hit; max 8 folders returned | lookup.js 22-32, 43-72, 103-111 | Code |

**Gaps**
- `chat_messages.target_type` has `CHECK (target_type IN ('plan', 'email'))` (schema.sql 273). The library inserts `'library'` (ask.js 157, 161). No migration found that widens the check (Grep over `server/`). As written, the INSERT after the AI call would fail and the ask would end with `{type:'error'}`. Not verified against the live DB (not queried).
- History query is `ORDER BY created_at ASC LIMIT 12` in ask.js and `LIMIT 20` in chat.js. This takes the OLDEST turns, not the latest, once history passes the limit.
- `dbFacts` falls back to `clients[0]` when no row matches both names, so a surname-only or first-name-only match can attach another person's DB record. No ORDER BY on the LIMIT 5.
- The repo index walks all of `legacy/` except `drop`. That includes `legacy/soa/`, `legacy/file-notes/`, `legacy/fact-finds/` and also non-client folders (e.g. `legacy/advisers/`, `legacy/packs/`, `legacy/docusign/`). Whether files there get attributed to wrong "clients" by the name regexes is not checked.
- Category is matched against the full path. A folder name containing a keyword (e.g. "Research" in the firm's `1. Research, Financials, Medicals, Schedules` folder per the SharePoint memory) sets the category of every file in it that does not match an earlier rule.
- `.doc` and unknown types use a raw UTF-8 decode with control bytes stripped (documentExtractor.js 55-58). Legacy Word text will be noisy.
- `.md` and `.json` are not handled explicitly by `extractText`; they fall to the same raw decode (non-ASCII characters become spaces).
- `stubAnswer` says "no ANTHROPIC_API_KEY" even when the key is set and the call failed.
- Stub answer is stored in `chat_messages` as if it were a model turn and replayed as history.
- No cross-client search. Memory says the index was designed so it "can be switched on later". No code for it.
- No auth or per-user scoping seen on these routes (not examined beyond the route files).

### 9. Figures and calculations

| Figure | Value | Where |
|---|---|---|
| Max files read per ask | 25 (`LIBRARY_MAX_FILES`) | env.js 94 |
| Max file size read | 12 MB (`LIBRARY_MAX_FILE_MB`) | env.js 95 |
| Total context budget | 420,000 chars (`LIBRARY_MAX_CONTEXT_CHARS`) | env.js 96 |
| Per-file cap | 30,000 chars, then `…[truncated]` | text.js 101, 122 |
| Budget accounting | each file body is cut to remaining budget; loop stops at budget <= 0. Header lines and separators are not counted. | text.js 112-129 |
| Library max output tokens | 8000, effort medium | ask.js 143 |
| Chat max output tokens | 12000, effort medium | chat.js 52 |
| Streaming threshold | > 16000 max tokens (neither call reaches it) | ai.js 98 |
| History turns | 12 (library), 20 (chat) | ask.js 122, chat.js 20 |
| `/clients` limit | default 50, max 200 | routes/library.js 44 |
| Walk caps | default depth 8 / 2000 files; repo 3 / 3000; client 6 / 800 | fsGuard.js 114; indexer.js 85, 203 |
| Lookup folder cache | 10 minutes | lookup.js 22 |
| Workbench / CRM SharePoint index size | "~1,278" client folders (comment and memory; not counted) | indexer.js 12; routes/library.js 22 |

Ranking score (`rankClients`, match.js 135-149), per indexed client:
- base = matched name tokens / all name tokens of the client
- +0.3 if 2 or more tokens matched
- +0.1 if the longest matched token is >= 6 chars
- +0.25 if two matched tokens are adjacent in the question (once)
- +0.2 if every name token matched
- rounded to 3 decimals; sort by score desc then display name A-Z; top 8 (default).

Example: folder "Surname, First" asked as "first surname": 2/2 = 1.0 + 0.3 + 0.25 + 0.2 (+0.1 if a token is >= 6 chars) = 1.75-1.85.

### 10. Where facts come from

- Every client fact in the answer is meant to come from the context message: extracted file text (SharePoint or repo) and the `APP DATABASE RECORD` JSON. The prompt says use only these, quote numbers as written, and say "the file doesn't say".
- Nothing in code checks this. No post-check compares figures in the answer to the file text.
- `sources` and inline file references are written by the model. Code only links a source to a real file id when the name is an exact match. A model-invented or slightly altered name stays in `sources` with `id: null`. It is not dropped or flagged.
- `filesRead` is the code's own list and is the reliable provenance record.
- Where unsupported statements could appear:
  - `headline`, `latestAdvice.summary`, `openItems`, `flags`, `answer` — free model text.
  - A truncated file (30k chars) can lose the part that holds the fact; the model sees only `…[truncated]`.
  - A wrong `dbFacts` row (see gaps) puts another person's DB data in the context labelled as this client's.
  - History replays prior prose answers (not JSON), so earlier unsupported claims can be carried forward.
  - The prompt example values (age 38, pharmacist, TAL, $2,000,000, $3,420 pa, October 2025) could be copied if files are thin.
- Chat refine: the plan prompt says keep `[ADVISOR TO CONFIRM]` markers and apply `CALC_GUARDRAILS`. No code check of the revised figures.

### 11. Rendering

- Library: no renderer. Page not built. The answer `answer` is Markdown; how it would be rendered is NOT FOUND.
- `/files/:id/download` serves the source file with a MIME type from a fixed map (pdf, docx, doc, xlsx, xls, csv, txt, md, json, png, jpg, jpeg; else `application/octet-stream`) and `Content-Disposition: inline`.
- Chat: `ChatPanel` renders each message as plain text in a `div.chat-msg` (no Markdown rendering). The revised plan is shown by the parent page's preview via `onUpdate`.

### 12. Versioning and history (git, read only)

- Library files (`services/library/*`, `routes/library.js`) first and only appear in commit `5b07300` "Weekly checkpoint - Monday 21 September 2026". No change since.
- The memory file says they were uncommitted; that is out of date.
- The library tables in `schema.sql` are in HEAD. The current uncommitted `schema.sql` diff (+37 lines) is outside the library section (not read in detail).
- `services/chat.js`: `f811647` (initial build), `e0e3136`, `16639a6` ("Move to Claude Opus 5 and adapt the call shape to it").
- `routes/chat.js` and `ChatPanel.jsx`: `f811647`, `e0e3136`.
- Commits are weekly checkpoints, so there is no per-change history for the library.
- No version number on the prompts.

### 13. Known problems and workarounds

Half built (from memory dated 2026-09-21, checked against code today):
- Server done. Still missing: `client/src/pages/Library.jsx`, its route in `App.jsx`, a nav entry in `Layout.jsx`, tests for the path guard and name matching, and a first live run. All confirmed still missing.
- Indexer and ask code is "unexercised" per memory. Only `fsGuard.listDir` has been run live (via the CRM folder search).
- Tables exist in the `fpgod` DB, empty (per memory; not queried).
- Paused 2026-09-18, to resume weekend of 2026-09-26. No later work found.
- Since 2026-10-22 the app home is the Workbench and memory says new features go into it. The Library page has no place in the workbench yet. The workbench lookup reuses the library's name matching but reads folder names only; Tristan said "don't draw from SharePoint yet but we will eventually", and `WORKBENCH_READ_SHAREPOINT` defaults off.

Problems found in code (see section 8 gaps): the `chat_messages` CHECK constraint vs `'library'`; oldest-first history limit; `dbFacts` fallback; stub flag text; `.msg` indexed but never read; breadth-first walk labelled depth-first.

Chat:
- The `email` target exists in server code but no UI uses it.
- ChatPanel is only on the Plan Generator, an archived screen.

Workarounds in code:
- AI off or failing -> stub answer, app stays usable.
- Malformed JSON -> raw text shown, document not overwritten.
- OneDrive placeholder downloads limited by the text cache, the 25-file cap and the 12 MB cap.

### 14. Dependencies

- Runtime: Node >= 20, Express 4, `pg` (PostgreSQL), `@anthropic-ai/sdk` ^0.69.0, `mammoth` (docx), `xlsx` (spreadsheets), `pdf-parse` (imported from `pdf-parse/lib/pdf-parse.js` to avoid its test block), `dotenv`.
- Env vars (values not printed): `ANTHROPIC_API_KEY` (enables AI), `ANTHROPIC_MODEL` (default `claude-opus-5`), `LEGACY_LIBRARY_ROOT` (default `<home>\Legacy Risk Advice\Legacy - Documents`), `LEGACY_LIBRARY_CLIENTS_DIR` (default `Clients`), `LEGACY_REPO_ROOT` (default repo `legacy/`), `LIBRARY_MAX_FILES`, `LIBRARY_MAX_FILE_MB`, `LIBRARY_MAX_CONTEXT_CHARS`, DB connection vars.
- External: the OneDrive client syncing the firm SharePoint library as Files On-Demand. Memory says use the `Legacy Risk Advice\Legacy - Documents` path, not the partial `OneDrive - Legacy Risk Advice` shortcut.
- DB tables: `library_clients`, `library_files`, `library_file_text`, `chat_messages`, `clients`, `insurance_policies`, `financial_plans`, the follow-up message table.
- Client: React, `api/client.js` wrapper.
- Shared module: `services/ai.js` (also used by every other generator).

### 15. Questions for Tristan

1. Does the live `chat_messages` table still have the `plan`/`email` CHECK? If so, should library history move to its own table or should the check be widened?
2. Is the Client Library still wanted, and if so, does it go inside the Workbench (e.g. on the case page) rather than as a separate page?
3. Is it still single client per question? When should cross-library search ("which clients hold a given insurer's IP?") come in?
4. Should the repo `legacy/` folders stay a source, given they now hold SOA cases, packs, adviser docs and DocuSign material?
5. Should the app DB record be attached only when both first name and surname match?
6. Should XPLAN stay out of the sources (memory says it was left out "for now")?
7. Are the read caps right: 25 files, 12 MB per file, 30,000 chars per file, 420,000 chars total?
8. Should `.msg` files ever be read, given the permanent rule on mail? (They are currently indexed but never read.)
9. Should the prompt take the firm and licensee from config instead of the hard-coded text?
10. Is the plan/follow-up message refinement chat still in use, given those screens are archived?
11. For the shared team skill: who may ask about which clients? No access control exists in this code.

---

## Part 7. CRM, Task Tracker, XPLAN and Automation

Scope: the CRM tab, the Task Tracker, XPLAN access (browser MCP and the unfinished Custom API connector), the Workbench client list and stage shell, scheduled backups. Read only. Repo at `c:\FPGod-Program`, branch `claude/financial-planning-app-8GWYC`, read on 2026-10-27.

Client names that appear in code comments and READMEs are replaced with placeholders such as `[CLIENT A]`. That was done in every quote below.

---

### 1. Inventory

**Code: server**

| File | Lines | What it does |
|---|---|---|
| `server/src/routes/crm.js` | 794 | `/api/crm/*`: meta, contacts, activity log, Task Tracker import, SharePoint folder search. |
| `server/src/services/crm/stages.js` | 67 | Pipeline stages, activity kinds, call outcomes, stale days, contact statuses. |
| `server/src/services/crm/practice.js` | 59 | Loads `legacy-practice.json`. Tier lookup, referral partner lookup, adviser list. |
| `server/src/services/crm/names.js` | 198 | Name parsing and matching between Task Tracker names, CRM contacts and SharePoint folder names. |
| `server/src/routes/tasks.js` | 172 | `/api/tasks`: list, add, patch. Auto-links a task to a CRM contact. |
| `server/src/services/taskStore.js` | 173 | Reads and writes the task JSON file and the append-only archive. |
| `server/src/routes/clients.js` | 295 | `/api/clients`: older client records, dossier, AI document import and scan, estate plan. |
| `server/src/routes/clientGroups.js` | 110 | `/api/client-groups`: households with members and totals. |
| `server/src/routes/dashboard.js` | 40 | `/api/dashboard`: counts for the old (archived) home screen. |
| `server/src/routes/workbench.js` | 521 | `/api/workbench/*`: case list, create, patch, lookup, files, generators, pack. Only the shell parts are covered here. |
| `server/src/services/workbench/lookup.js` | 131 | Existing-client check against `clients` rows and SharePoint folder names. |
| `server/src/services/documentScan.js` | 96 | AI prompt used by `clients.js` import and scan. |
| `server/src/services/ai.js` | 127 | Anthropic call wrapper (`complete`, `completeOrStub`). |
| `server/src/db/schema.sql` | lines 675–764 | CRM columns on `clients`, `crm_activities` table, `workbench_cases` table. |
| `server/src/config/env.js` | — | Model, adviser, library paths, task state folder. |

**Code: client**

| File | What it does |
|---|---|
| `client/src/pages/wb/Workbench.jsx` | Home screen (`/`): client list with stage chips and stat tiles. |
| `client/src/pages/wb/CaseView.jsx` | `/case/:id`: per-client workspace, stage select, tabs, Details tab. |
| `client/src/pages/wb/NewClientModal.jsx` | Add a client with a live existing-client check. |
| `client/src/pages/wb/ClientCheck.jsx` | Shows the existing-client result and Link buttons. |
| `client/src/pages/wb/wb.js` | Step keys, stage label, relative time. |
| `client/src/pages/Archive.jsx` | `/archive`: cards for the older screens. |
| `client/src/pages/Crm.jsx` | `/crm`: Contacts, Pipeline, Activity views. |
| `client/src/pages/CrmContact.jsx` | `/crm/:id`: one contact record. |
| `client/src/pages/Tasks.jsx` | `/tasks`: Task Tracker. |
| `client/src/pages/Dashboard.jsx` | `/archive/dashboard`: old home screen. |
| `client/src/components/crm/*` | ActivityComposer, ActivityFeed, ContactModal, ImportModal, PipelineBoard, SharePointPicker, StagePath, TasksPanel, TierBadge, Timeline. |
| `client/src/lib/crm.js` | Kind icons, stage colours, date formats, meta cache, tier lookup, counterparties. |
| `client/src/lib/taskNotes.js` | Parses the pipe-delimited task notes. |

**Code: automation**

| File | What it does |
|---|---|
| `automation/xplan/src/mcp.mjs` | MCP server `xplan-browse` with 8 tools. |
| `automation/xplan/src/browser.mjs` | Playwright session, read-only guards, access log. |
| `automation/xplan/src/config.mjs` | Loads `.env`, session paths. |
| `automation/xplan/src/login.mjs` | Manual login, press Enter to save session. |
| `automation/xplan/src/login-auto.mjs` | Login that saves the session by itself once logged in. |
| `automation/xplan/src/record.mjs` | Playwright codegen to record a Risk Researcher quote. |
| `automation/xplan/src/quote.mjs` | Placeholder quote runner. |
| `automation/xplan-api/src/*.mjs` | Unfinished XPLAN Custom API MCP server (OAuth PKCE, 7 tools, placeholder endpoints). |
| `automation/backup/sync-onedrive.ps1` | Robocopy mirror of the repo into OneDrive. |
| `automation/backup/install-backup-task.ps1` | Registers the hourly backup task. |
| `automation/backup/weekly-checkpoint.ps1` | Weekly `git add -A`, client-material check, commit, push. |
| `automation/backup/install-checkpoint-task.ps1` | Registers the weekly checkpoint task. |

**Prompts**
- `server/src/services/documentScan.js` lines 3–36: `SYSTEM_PROMPT` for client document extraction (used by `clients.js`).
- `server/src/services/workbench/lookup.js` lines 123–131: `clientStatusLine`, a sentence injected into the Workbench writer prompts.
- MCP tool descriptions in `automation/xplan/src/mcp.mjs` and `automation/xplan-api/src/server.mjs`. Claude reads these when choosing tools.
- The CRM, Task Tracker and backups make no AI calls.
- The Workbench writer prompts (meeting notes, fact find, SOA Notes, SOA draft) are in `server/src/services/workbench/writers.js` and `riskSoaGenerator.js`. They belong to the SOA pipeline part and are not repeated here.

**Templates**
- None in this area.

**Reference data**
- `server/src/data/legacy-practice.json`: team, tiers, renewal window, referral partners, other referral sources, insurers, XPLAN thread names. Firm-level only.

**Config**
- `.mcp.json` (repo root): registers one server, `xplan`, run as `node automation/xplan/src/mcp.mjs`, with an empty env. `xplan-api` is not registered.
- `automation/xplan-api/mcp.config.snippet.json`: an entry for `xplan-api` that has not been added. Its comment names an `h:/FPGod-Program/.mcp.json` path.
- `automation/xplan-api/.env.example`: variable names only (listed in section 14).
- `.claude/settings.json`:
  - Allow rules: WebSearch, a few read-only shell commands (port listing, git status, find, template unzip), and reads of the SharePoint library path. Several allow rules name specific client folders or client first names. Those names are withheld here.
  - Deny rules: launching the desktop mail client from Bash or PowerShell, creating its COM object, and reading the two OneDrive mail drop folders.
  - Hooks: one `SessionStart` hook, `.claude/hooks/session-start.sh`. It only runs when `CLAUDE_CODE_REMOTE=true`. It runs `npm install` for `server` and `client`.
- User-level PreToolUse hook `~/.claude/hooks/block-outlook-email.sh` (described in memory, not opened). It blocks any write whose content contains archived mail script names or the mail URI scheme.
- `server/vitest.config.js`: test env blanks `ANTHROPIC_API_KEY` and points `DATABASE_URL` at `fpgod_test`, `UPLOAD_DIR` at `./uploads-test` and `TASK_STATE_DIR` at `./data-test/task-state`.
- Windows Task Scheduler: two FPGod tasks (section 2).

**Memory files read**
- `crm-tab-built.md`, `task-tracker-next-xplan-sync.md`, `xplan-live-browse-not-export.md`, `workbench-is-the-new-program.md`, `legacy-va-workflow-direction.md`, `do-not-touch-outlook.md`, `firm-is-legacy-risk-not-lakeside.md`, `fpgod-test-suite-writes-to-dev-db.md`.

**Skipped, with reasons**

| Item | Reason |
|---|---|
| `server/data/task-state/` (`tasks.json`, `archive.jsonl`) | The live task list. It holds client names. |
| `server/data-test/` | Test fixtures. Not needed. |
| `automation/xplan/.env` | Site config. Not opened. |
| `automation/xplan/out/access-log.jsonl` | Holds the URLs of client files opened in XPLAN. |
| `automation/backup/logs/backup.log`, `checkpoint.log` | The checkpoint log lists flagged file paths, which may name clients. |
| `.claude/settings.local.json` | Not in scope, and it may hold client paths. |
| `legacy/**` including `legacy/va-workflow-build-brief.md` | Client data folders. Unsure, so skipped. |
| SharePoint `Threads broken down.xlsx`, Renewal & Review Process document | SharePoint library. Off limits. |
| The archived mail code folder, mail drop folders | Off limits (email rule). |
| The Iress API access request draft in `automation/xplan-api/` | A mail draft. Not opened. |
| `server/src/__tests__/crmNames.test.js`, `crmPractice.test.js`, `crmRoutes.test.js` | Not opened. They may hold name fixtures. |
| Database contents, OneDrive mirror, Downloads | Client data rule. |
| `server/src/services/workbench/writers.js`, `pack.js`, `run.js`, `sources.js`, `paths.js` | SOA pipeline part. Only the status-line join in `writers.js` was read. |

---

### 2. Entry point and trigger

| What | How it starts |
|---|---|
| Workbench | The app's home route `/` (`client/src/App.jsx:28`). Side menu: Clients, New client (`/?new=1`), Archive, Settings (`client/src/components/Layout.jsx:7-11`). |
| CRM | `/crm` and `/crm/:id`. It is off the main menu since 22 Oct 2026. You reach it from `/archive`. |
| Task Tracker | `/tasks`. Also off the main menu, reached from `/archive` and from the CRM task panel ("Task Tracker →"). |
| Old dashboard | `/archive/dashboard`. |
| API | Mounted in `server/src/routes/index.js`: `/tasks`, `/dashboard`, `/clients`, `/client-groups`, `/crm`, `/workbench`. |
| XPLAN browse | Claude Code loads the `xplan` MCP server from `.mcp.json`. Tristan first runs `npm run login` (or `npm run login:auto`) in `automation/xplan` and completes 2FA. Then he asks a question in chat. |
| XPLAN API | Not wired. It needs Iress credentials, `npm run login` in `automation/xplan-api`, and a `.mcp.json` entry. |
| OneDrive backup | Scheduled task `\FPGod OneDrive Backup`. Daily, repeats every 1 hour for 17 hours. `schtasks` shows a start time of 8:00 AM; the script default is 07:00. Interactive logon only. Last run 27/10/2026 11:43 AM, result 0. |
| Weekly checkpoint | Scheduled task `\FPGod Weekly Checkpoint`. Weekly on FRI. `schtasks` shows 5:30 PM; the script default is 16:30. Last run 23/10/2026 5:12 PM, **result 2**. Exit 2 means the script found client material staged and aborted. |
| Task scanner | No scheduled task exists now. The mail-fed scanner was archived on 16 Sep 2026. |

---

### 3. Inputs

**Workbench, new client** (`NewClientModal.jsx`):
- Fields: first name, surname, "Couple: add a partner" (partner first name and surname), mobile, email, adviser (default from `ADVISER_NAME`, which defaults to "Tristan Biro"), referred by, initial meeting date (default today), SharePoint client folder, optional transcript.
- **Case Details tab** (`CaseView.jsx:71-118`): the same person fields, plus adviser notes. The hint reads: "Given to Claude with every document. They take precedence over the transcript."

**CRM contact** (`ContactModal.jsx`, `CrmContact.jsx` DetailsPanel):
- Fields: first name (required), last name, partner names, email, phone, partner phone and email, address, stage, status, XPLAN thread, client tier, next review (anniversary) date, adviser, referral source, SharePoint folder, notes.
- Server caps per field are in `crm.js:262-268`.

**CRM activity** (`ActivityComposer.jsx`):
- Fields: kind, direction, call outcome, subject, body, with whom, duration in minutes, when (date and time).
- Optional follow-up task: task, due date, priority.

**Task** (`Tasks.jsx` form, or the CRM TasksPanel):
- Fields: who, task, due, notes. Type and priority are set by the CRM panel or take their defaults.
- Patch fields: status, due, `addNote`, `clientId`.

**Task Tracker import**: the existing unlinked tasks in the task file.

**Firm settings**: `legacy-practice.json`, read once at server start.

**SharePoint**: client folder *names* only, listed from `<LEGACY_LIBRARY_ROOT>/Clients`. No file is opened by the CRM or by the lookup.

**XPLAN browse**: Tristan's question in chat, his saved browser session, and the pages of his XPLAN site.

**Client document import** (`clients.js`): an uploaded PDF, Word or TXT file, or the extracted text of documents already attached to the client.

**How tasks get in now.** There is no automatic feed. Tasks come from four places:
1. Typed on the Task Tracker page (`POST /api/tasks`).
2. Added from the CRM contact's Tasks panel.
3. Created as a follow-up when an activity is logged in the CRM.
4. Existing tasks linked to contacts by "Import from Task Tracker". This creates no tasks; it only sets `clientId`.

The mail-scanning feed is archived and off limits.

---

### 4. Pipeline step by step

**A. Workbench shell**
1. Tristan clicks "＋ New client". As he types the names, after 350 ms the modal calls `GET /api/workbench/lookup` (`NewClientModal.jsx:94-114`).
2. If exactly one SharePoint folder matches on first name and surname, it is linked automatically, unless he has already picked a folder (`NewClientModal.jsx:104-108`).
3. "Add client" sends `POST /api/workbench/cases` (`workbench.js:174-204`).
   - It inserts a new `clients` row with `status='prospect'`, `crm_stage='initial_meeting'` and `crm_stage_changed_at=now()`.
   - It inserts a `workbench_cases` row with `case_name`, `short_name`, meeting date, transcript and adviser notes.
   - It runs the lookup again and stores `client_kind` as `existing` or `new`.
   - There is no server-side duplicate check.
4. The case opens at `/case/:id`.
5. A stage select lets Tristan set any of the 8 Workbench stages by hand (`CaseView.jsx:192-195`).
6. The generators move the stage forward, never back (`workbench.js:91-95`):
   - Meeting notes built → `fact_find`.
   - Fact find built → `soa_notes`.
   - SOA Notes built → `paraplanner`.
   - SOA drafted → `soa`.
   - Pack built → `pack`.
   - `sent` and `done` are set by hand only.
7. The generators call Claude through `complete()`. The `clientStatusLine` (section 5) is added to their prompts. Model and prompts are covered in the SOA pipeline part.
8. Archive or restore is a button on the Details tab (`archived` flag). The list has a "Show archived" box.

**B. CRM**
1. `GET /api/crm/meta` returns stages, kinds, tiers, team, referral partners, insurers, threads and advisers. The client caches it for the session (`lib/crm.js:107-117`).
2. `GET /api/crm/contacts` returns every `clients` row with:
   - last contact, the next upcoming activity and the activity count (SQL at `crm.js:187-211`);
   - a task summary from the task file;
   - attention reasons (`crm.js:88-108`);
   - header tallies.
3. New contact: `POST /api/crm/contacts`.
   - It defaults `crm_stage` to `lead` if the field is absent, and status to `active` if the stage is `in_force`, otherwise `prospect`.
   - If a last name is given and `force` is not set, it checks for a duplicate name and returns 409 with the matches. The modal then offers to open the existing contact or create anyway.
   - It writes a `stage` activity.
4. Moving a stage (drag on the board, StagePath click or Details) sends `PATCH /api/crm/contacts/:id`.
   - It sets `crm_stage_changed_at`.
   - If the new stage is `in_force` and the contact is a `prospect`, status becomes `active`.
   - It writes a `stage` activity: "Moved to <label>" with body "From <label>", or "Taken off the pipeline".
5. Logging contact: `POST /api/crm/contacts/:id/activities`.
   - Notes and meetings have their direction cleared.
   - A subject, body or outcome is required.
   - An optional follow-up writes a task to the task file with `type: 'Client'` and the contact's `clientId`.
6. Activities can be edited (`PATCH`) or hard-deleted (`DELETE`). Stage activities cannot be edited.
7. Import from Task Tracker:
   - `GET /api/crm/import/tasks` groups unlinked non-Internal tasks by `who`, merges name variants and suggests contact fields.
   - It marks a row "likely" (pre-ticked) when it looks like a household.
   - It offers a link instead when exactly one contact matches.
   - `POST` creates or links contacts in one transaction, then sets `clientId` on every live task with that `who`. Archived tasks are not changed.
8. SharePoint folder link: `GET /api/crm/sharepoint/folders?q=` returns up to 20 folder names where every typed word starts a word in the folder name. On save, the server checks that the folder exists in the listing.

**C. Task Tracker**
1. `GET /api/tasks` returns live tasks plus archived ones, sorted, with counts.
2. `POST /api/tasks` adds a task.
   - If there is no `clientId` and the type is not Internal, the server looks for exactly one contact whose full first and last name match `who`. If it finds one, it links it.
   - The due date defaults to tomorrow (`dueSource: 'default'`).
3. `PATCH /api/tasks/:id` changes status (sets or clears `completedAt`), due date (`dueSource: 'user'`), notes (`addNote` appends a stamped entry) or the link (`clientId: null` unlinks).
   - A task that exists only in the archive is refused with 404: "Task <id> is archived and cannot be edited".
4. Every write is synchronous, from read to write, and uses a temp-file rename (`taskStore.js:5-14, 78-83`).

**D. XPLAN browse (Claude driving the session)**
1. Tristan runs a login once.
   - `login.mjs`: Chrome opens; he logs in with 2FA and presses Enter; the session is saved to `.session/auth.json`.
   - `login-auto.mjs`: polls every 2 s. It saves after 2 clean checks in a row where the browser is on the XPLAN host, shows no password box, has a logout link, and has more than 400 characters of text. It times out after `LOGIN_TIMEOUT_MS` (default 10 min).
2. Claude calls `xplan_status`, then `xplan_open`, `xplan_click`, `xplan_fill` + `xplan_press("Enter")`, `xplan_read`, `xplan_back` or `xplan_screenshot`.
3. Each read returns the text of all frames (default cap 20,000 characters), up to 200 links and up to 40 inputs. A password field on the page returns `sessionExpired: true`.
4. Each read, click and screenshot is appended to `out/access-log.jsonl`.
5. Claude answers in chat. Nothing is written back to the app.

**E. XPLAN API (not live)**
- OAuth 2.0 authorisation code with PKCE. The callback listens on `http://localhost:8765/callback`. Tokens are saved in `.session/tokens.json` and refreshed 60 s before expiry. A 401 triggers one refresh and retry.
- Tools: `xplan_whoami`, `xplan_search_clients`, `xplan_get_client`, `xplan_get_current_cover`, `xplan_list_quotes`, `xplan_run_risk_quote`, `xplan_get_comparison`.
- `to-report.mjs` maps a quote result into rows for `server/scripts/generate-insurance-report.mjs` and runs it.

**F. Backups**
1. Hourly: `robocopy <repo> "<OneDrive - *>\FPGod-Backup" /MIR`.
   - Excluded folders: `node_modules`, `.git`, `dist`, `build`, `.vite`, `.next`, `coverage`, `uploads-test`.
   - Excluded files: `*.tmp`, `*.log.lock`, `Thumbs.db`, `.DS_Store`.
   - Settings: `/R:1 /W:1`. Exit codes of 8 or more count as failure.
2. Weekly:
   - If the tree is clean, it pushes local commits if there are any.
   - Otherwise it runs `git add -A` and checks the staged paths with `Test-ClientMaterial`. If anything is flagged, it runs `git reset`, logs "ABORTED" and exits 2.
   - Otherwise it commits "Weekly checkpoint - <day d month yyyy>" with up to 40 file names listed, then pushes to `origin/<branch>`.
   - A failed push exits 3.

**AI calls in this area**

| Call | Where | Model / settings | Prompt location |
|---|---|---|---|
| Client document extraction (`POST /api/clients/import`, `POST /api/clients/:id/scan-documents`) | `documentScan.js:43-66` via `completeOrStub` | `env.anthropic.model` = `ANTHROPIC_MODEL` or `claude-opus-5` (`env.js:68`). `thinking: {type:'adaptive'}`, `effort: 'low'`, `json: true`, `max_tokens` 16000 (default). Input capped at 12,000 characters. Temperature is never sent. Without a key or on error, a regex fallback runs. | `documentScan.js:3-36` |
| Workbench writers | `writers.js` | `effort: 'medium'`; `maxTokens` 24000 / 32000 / 24000 | SOA pipeline part. `clientStatusLine` from `lookup.js:123-131` is appended. |
| XPLAN browsing | Claude Code itself, through the MCP tools | The session's own model | Tool descriptions in `mcp.mjs` |

**Manual steps**
- XPLAN login and 2FA, each session.
- All CRM logging is typed by hand.
- Setting the client tier, thread and next review date.
- Workbench `sent` and `done` stages.
- Linking SharePoint folders when the match is not unique.
- Re-running a failed push by hand.

---

### 5. Prompts and instructions verbatim

**5.1 `server/src/services/documentScan.js` lines 3–36, system prompt (string joined as written)**

```
You extract structured data from financial documents. Given the raw text of a client document, return a JSON object with any of these keys you can confidently populate. Use exactly these field names so they map to our system:
- client {first_name,middle_name,preferred_name,last_name,email,phone,address,date_of_birth,occupation,annual_income,net_worth,risk_profile,marital_status,smoker,employment_status,employment_basis,employer_name,super_balance,super_provider,super_contributions,health_notes,goals_scope,historic_context,other_details,partner_first_name,partner_middle_name,partner_preferred_name,partner_last_name,partner_email,partner_phone,partner_date_of_birth,partner_occupation,partner_annual_income,partner_risk_profile,partner_marital_status,partner_smoker,partner_employment_status,partner_employment_basis,partner_employer_name,partner_super_balance,partner_super_provider,partner_super_contributions} (partner_* is the spouse/partner if the document describes a couple; smoker fields are booleans; employment_status is employed/self-employed/retired/unemployed/home-duties; employment_basis is full-time/part-time/casual/contract; health_notes is any health/medical background, goals_scope is what the client wants advice on, historic_context is relevant background/history, other_details is anything else notable)
- family [{first_name,last_name,relationship,date_of_birth,is_dependent,notes}] — children and other dependants; relationship one of child,stepchild,dependent,parent,sibling,grandchild,other; is_dependent boolean
- investments [{fund_name,ticker,account_type,balance,allocation_pct,asset_class,fee_pct,provider}]
- assets [{category,name,value,owner}] — category one of cash,property,vehicle,business,investment,superannuation,collectible,other
- liabilities [{liability_type,name,balance,interest_rate,monthly_payment,lender,owner}] — liability_type one of mortgage,personal_loan,auto_loan,credit_card,student_loan,tax,business_loan,other
- income [{income_type,name,amount,frequency,owner}] — income_type one of salary,rental,pension,dividends,business,government,trust,other; frequency one of weekly,fortnightly,monthly,quarterly,annual
- expenses [{category,name,amount,frequency}] — category one of housing,utilities,living,transport,insurance,education,discretionary,other
- insurance [{policy_type,provider,cover_amount,premium,frequency,policy_number}] — policy_type one of life,tpd,income_protection,trauma,health,home,auto,other
- goals [{name,target_amount,current_amount,target_date,priority}] — priority one of low,medium,high
- estate {has_will,will_date,will_location,executor,has_poa,poa_type,poa_attorney,has_testamentary_trust,trust_details,beneficiaries} — has_* are booleans; poa_type one of financial,medical,both,enduring
- notes (string)
Omit any key, array item, or field you cannot determine. Do NOT invent values. NEVER output placeholder text such as "Not provided", "N/A", "Unknown", "TBC" or similar — if you do not know a value, OMIT that field entirely. Numbers must be plain numbers (no currency symbols, words or commas); never put text in a number field. Dates must be valid YYYY-MM-DD; never put words in a date field. Respond with JSON only.
```

User turn (line 51): `` `Document text:\n${trimmed}` ``

Fallback note text (line 73): `'Heuristic offline scan (no OpenAI key).'`

**5.2 `server/src/services/workbench/lookup.js` lines 123–131, `clientStatusLine` (prompt fragment)**

```js
if (wb.sharepoint_folder) {
  return `EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.`;
}
if (look?.inSharePoint || look?.inProgram) {
  return `POSSIBLY AN EXISTING CLIENT: a record with the same name exists${look.inSharePoint ? ' in SharePoint' : ''}${look.inProgram ? ' in the program' : ''}, not yet confirmed. Do not assume it; go by the transcript.`;
}
return `NEW CLIENT: no existing client file was found for them at ${env.firm.name}.`;
```

`writers.js:61-64` joins it as `\n\n${wb.statusLine}`. Adviser notes follow as `ADVISER NOTES (take precedence over the transcript):`.

**5.3 MCP tool descriptions, `automation/xplan/src/mcp.mjs` (server name `xplan-browse`, version 0.1.0)**

| Tool | Description (verbatim) | Params |
|---|---|---|
| `xplan_status` | Check the XPLAN connection: site URL, whether a login session is saved, and the page currently open. | none |
| `xplan_open` | Open a page in XPLAN. Accepts a path ("/factfind/list") or a full URL on your XPLAN site. Returns the page text plus its links and inputs. | `target` "Path or full URL on the XPLAN site"; `maxChars` "Cap on returned text (default 20000)" |
| `xplan_read` | Re-read the page currently open, without navigating. Use a larger maxChars to pull the full text of a long file note. | `maxChars` |
| `xplan_click` | Click a link, button or tab by its visible text, then return the resulting page. Read-only: anything that looks like a write is refused. | `text` "Visible text of the link/button/tab, e.g. "Notes" or a client name"; `maxChars` |
| `xplan_fill` | Type into an input, identified by its label, placeholder, name or aria-label. Use with xplan_press("Enter") to search. | `field`, `value` |
| `xplan_press` | Press a key on the current page (e.g. "Enter" to submit a search), then return the resulting page. | `key` |
| `xplan_back` | Go back to the previous page. | `maxChars` |
| `xplan_screenshot` | Screenshot the current page to a local file. Use when the text extraction is not enough to understand the layout. | `fullPage` |

Error text returned to Claude:
- `XPLAN: <message>`
- `Refused: "<text>" looks like it changes data. These tools are read-only; set XPLAN_ALLOW_WRITE=1 only if you intend to write to the client file.`
- `Refused: <origin> is outside your XPLAN site (<origin>).`
- `No saved XPLAN session. Run \`npm run login\` in automation/xplan, then try again.`
- `Your XPLAN session has expired — this is the login page. Run \`npm run login\` in automation/xplan to sign in again.`
- `Nothing clickable matching "<text>" on this page.`
- `No input matching "<field>" on this page.`

**5.4 MCP tool descriptions, `automation/xplan-api/src/server.mjs` (server name `xplan-api`, not registered)**

| Tool | Description (verbatim) |
|---|---|
| `xplan_whoami` | Confirm the XPLAN connection and show the authenticated user. |
| `xplan_search_clients` | Search XPLAN clients/entities by name. (`query`: "Name or partial name to search for") |
| `xplan_get_client` | Get an XPLAN client/entity by id. (`entityId`: "XPLAN entity id") |
| `xplan_get_current_cover` | Get a client's in-force insurance policies (IPS). |
| `xplan_list_quotes` | List existing Risk Researcher quotes for a client. |
| `xplan_run_risk_quote` | Run a Risk Researcher quote/comparison for a client. (`entityId`: "XPLAN entity id to quote on"; `payload`: "Risk Researcher quote request (covers, sums insured, insurers, options) per the API spec") |
| `xplan_get_comparison` | Retrieve a Risk Researcher comparison result. |

Not-logged-in error: `` Not logged in. Run `npm run login` in automation/xplan-api first. ``

**5.5 Standing instructions from memory (not in code)**
- `xplan-live-browse-not-export.md`: "Don't propose 'export from XPLAN to CSV and I'll index it' as the way to answer client questions." The XPLAN MCP is the working path. The Custom API stays blocked on Iress.
- `do-not-touch-outlook.md`: never touch the mail client or email in any way: no opening, reading, scanning, drafting or sending. "Reading the repo's mail *code* is fine; running it is not." The hook blocks writes that name archived scripts.
- `firm-is-legacy-risk-not-lakeside.md`: every sign-in, including XPLAN, must target the Legacy account, never Lakeside. "Ask which account to use rather than assuming the one already signed in."
- `legacy-va-workflow-direction.md`: "XPLAN stays the system of record". Do not archive `automation/xplan/` or `automation/xplan-api/`.
- `workbench-is-the-new-program.md`: "new features go into the workbench, not the archived screens."

---

### 6. Output structure

**`clients` CRM columns** (`schema.sql:684-698`):
- `crm_stage` TEXT
- `crm_stage_changed_at` TIMESTAMPTZ
- `adviser` TEXT
- `referral_source` TEXT
- `sharepoint_folder` TEXT
- `client_tier` TEXT
- `crm_thread` TEXT
- `next_review_date` DATE
- Index on `crm_stage`.
- Status values used by the CRM: `prospect`, `active`, `inactive`, `archived`.

**`crm_activities`** (`schema.sql:703-717`):

| Column | Type / rule |
|---|---|
| `id` | UUID |
| `client_id` | FK, cascade |
| `kind` | CHECK: call, email, meeting, sms, letter, note, stage |
| `direction` | outbound / inbound / null |
| `subject` | TEXT |
| `body` | TEXT |
| `outcome` | TEXT |
| `with_whom` | TEXT |
| `duration_min` | integer, 0 or more |
| `occurred_at`, `created_at`, `updated_at` | timestamps; `updated_at` set by a trigger |

**`workbench_cases`** (`schema.sql:735-764`):
- `id`, `client_id` (UNIQUE, so one case per client)
- `case_name` ("Surname, First & Second")
- `short_name` ("Surname F&S")
- `stage` (default `meeting`)
- `meeting_date`, `transcript`, `adviser_notes`
- `cds_json`, `ff_json`, `soa_notes_json`, `soa_markdown`, `pack_dir`
- `archived`, timestamps
- `client_kind` (`existing` / `new`)

**Task record** (`taskStore.js:144-166`):

```json
{ "id": "T0001", "created": "<ISO>", "task": "<≤500>", "who": "<≤120>",
  "type": "Client|Internal", "priority": "High|Medium|Low", "due": "YYYY-MM-DD",
  "dueSource": "user|default", "status": "Open", "notes": "<≤500>",
  "origin": "manual", "source": null, "clientId": "<uuid, optional>",
  "completedAt": "<ISO, when Done/Cancelled>" }
```

- Task file wrapper: `{ version: 1, lastRun, nextId, <seen-mail map>, tasks: [] }`. The seen-mail map and `lastRun` are left over from the archived scanner.
- Archive: `archive.jsonl`, one task per line, append-only. A later line wins.

**API outputs**
- `GET /api/crm/contacts`:
  - `summary`: `contacts`, `pipeline`, `attention`, `openTasks`, `overdueTasks`, `loggedThisWeek`, `renewalsDue`, `byStage`.
  - `contacts[]`: each with `display_name`, `open_tasks`, `overdue_tasks`, `next_task`, `attention[]`, `last_contact_*`, `upcoming_*`, `activity_count`.
- `GET /api/crm/contacts/:id`:
  - `contact`, `activities`, `transcripts`, `documents`, `tasks`, `suggestedTasks`;
  - `sharepoint {folder, path, exists}`;
  - `legacy {referralPartner, annualPremium, suggestedTier, daysToAnniversary}`;
  - `stats`.
- `GET /api/tasks`:
  - `lastRun`, `configured`, `tasks`;
  - `counts {total, open, overdue, dueToday, client, internal, high}`.
- `GET /api/workbench/cases`: case rows with `display_name` and `has {transcript, meeting_notes, fact_find, soa_notes, soa, pack}`. The large JSON fields are removed.
- `GET /api/workbench/lookup`:
  - `existing`, `inProgram`, `inSharePoint`;
  - `program[]` (id, display_name, case_id, case_stage, status, sharepoint_folder, created_at);
  - `sharepoint {available, folders[{folder, match:'name'|'surname', allPeople}] (max 8), suggested}`.
- `GET /api/dashboard` (old): counts of clients, groups, plans, documents, transcripts, follow-up drafts and training rows; AUM; 5 recent clients, plans and drafts.

**Dashboards**
- **Workbench tiles**: Active clients; Meeting → brief; With paraplanner; SOA & pack.
- **CRM banner**: Contacts; In the pipeline; Need attention; Open tasks; Overdue; Logged this week; Anniversaries (30 days).
- **CRM contact facts**: Last contact; Open tasks; Overdue; In this stage; Logged; Anniversary.
- **Task Tracker banner**: To do; Overdue; Due today; High priority; Client; Internal; "<n> tracked"; "Last scan <date>".

---

### 7. Fixed wording and labels

**CRM stages** (`stages.js:16-43`). The order is the firm's XPLAN "Review" thread.

| key | label | open | XPLAN mapping text |
|---|---|---|---|
| lead | New lead | yes | New Prospect — referral or enquiry not yet worked |
| research | Research & schedule | yes | Generate Schedule / Research |
| initial_meeting | Initial meeting & CVC | yes | Make contact with Client; Present Initial findings/CvC |
| fact_find | Fact find | yes | Prepare FF; Present FF for signing & start SOA |
| soa | SOA in progress | yes | SOA being written |
| peer_review | Peer review | yes | Present SOA for peer review |
| soa_presented | SOA presented | yes | Present SOA to client for signing |
| application | Application | yes | Application / Submission Checklist |
| underwriting | Underwriting | yes | Underwriting; Amended Terms |
| completion | Completion | yes | Checklist / update XP; Send welcome letter |
| in_force | Cover in force | no (won) | Thread complete — client on the books |
| on_hold | On hold | no | — |
| not_proceeding | Not proceeding (NPW) | no (lost) | NPW — not proceeding with |

- An unknown key shows as "Unknown stage".
- Stage colours (`lib/crm.js:36-41`):
  - teal: lead, research
  - blue: initial_meeting, fact_find, soa, peer_review
  - purple: soa_presented, application, underwriting, completion
  - green: in_force
  - amber: on_hold
  - red: not_proceeding

**Workbench stages** (`workbench.js:43-52`), with labels:

| key | label |
|---|---|
| meeting | Initial meeting |
| fact_find | Fact find |
| soa_notes | SOA Notes |
| paraplanner | With paraplanner |
| soa | SOA drafting |
| pack | SOA pack |
| sent | Sent to client |
| done | Complete |

**Workbench tabs** (`CaseView.jsx:16-23`): Client files; 1 Initial Meeting Notes; 2 Fact Find; 3 SOA Notes; 4 SOA; 5 SOA Pack. A done step shows ✓ and "Done"; otherwise "To do".

**XPLAN threads** (`legacy-practice.json`): New Prospect, Review, Partner Cover, Increase, Reduction, Policy Cancellation, Declined CPI, Servicing Rights, Dishonour, Claim.

**Tiers** (`legacy-practice.json`):

| Tier | Premium | Floor | Initial contact | Follow-up email | Phone call | Meeting | Rule |
|---|---|---|---|---|---|---|---|
| Platinum | over $25k | 25000 | Adviser | N/A | Adviser | Ideally | Adviser-first. Admin does not make initial contact; flag it to the adviser with the schedule attached. |
| Gold | $15k–$25k | 15000 | Admin Assistant | Adviser | Adviser | If required | — |
| Silver | $5k–$15k | 5000 | Admin Assistant | No | No | If required | — |
| Bronze | under $5k | 0 | Admin Assistant | No | No | If required | — |

**Team** (`legacy-practice.json`):

| Name | Roles |
|---|---|
| Josh Davidson (JD) | Managing Director, Adviser |
| Gary Douglas | Adviser |
| Tristan Biro | Adviser |
| Rubi Carao | Reporting Administrator |
| Josh Arellano (JA) | Renewals Administrator |
| Enis Vural | Head of Operations |
| Howard Cortes | VA (SOA drafting) |

**Referral partners and fees** (firm-level):
- PPA (Performance Property), legal name Performance Property Pty Ltd: "25% of the initial and ongoing remuneration, including GST".
- The HOPE Fund, legal name The Hepatobiliary Oesophagogastric Pancreatic Fund Ltd: "10% of the initial and ongoing remuneration, excluding GST (the Fund cannot accept GST)".
- Tony Chen: "10% of the initial remuneration as a one-off fee, including GST".
- Other referral sources: Allfin, Existing client, Accountant, Website enquiry, Conference.

**Insurers**: Acenda, AIA, Asteron, BT, ClearView, Encompass, Futura, MetLife, NEOS, OnePath, PPS, Resolution Life, TAL, Zurich.

**Activity kinds and wording**
- Call outcomes: Spoke, Left voicemail, No answer, Wrong number.
- Titles (`lib/crm.js:20-32`):
  - Outgoing call / Incoming call (with " · <outcome>")
  - Email sent / Email received
  - Text sent / Text received
  - Letter sent / Letter received
  - Meeting
  - File note
- Composer placeholders (`ActivityComposer.jsx:16-23`):
  - call: "What was it about?" / "What was said, and what happens next"
  - email: "Subject line" / "A summary, or paste the part that matters"
  - meeting: "Purpose — e.g. Present SOA" / "Meeting notes"
  - sms: body "The message"
  - letter: "What was sent — e.g. Servicing rights letter" / "Notes"
  - note: "Title (optional)" / "File note"
- Counterparty list: each team member as "<name> (<first role>)", then "<insurer> underwriting" and "<insurer> new business" for each insurer.

**Attention reasons** (`crm.js:88-108`):
- "Anniversary passed N day(s) ago"
- "Anniversary today"
- "Anniversary in N day(s)"
- "N overdue task(s)"
- "No contact in N days"
- "No contact logged in N days"

**CRM contact flags** (`CrmContact.jsx:141-160`):
- "Referral fee to disclose in the SOA. <partner> referred this client: <fee>. The SOA needs client-specific “will pay / has paid” wording with the dollar amount."
- "Anniversary passed N days ago (<date>). Update the next review date once the renewal is done."
- "Anniversary in N days (<date>). Inside the 14-day renewal window, so follow-up is due now."

**CRM filters**: Everyone; Needs attention; In the pipeline; Clients; Prospects; Anniversaries (30 days); Archived.

**CRM sorts**: Name; Longest without contact; Next task due; Recently contacted.

**Task values**
- Statuses: Open, In Progress, Waiting, Done, Cancelled.
- Priorities: High, Medium, Low.
- Types: Client, Internal.
- Task Tracker filters: To do; Overdue; Clients; Internal; Done; Everything.

**Existing-client check** (`ClientCheck.jsx`)
- Badges: "Existing client" / "New client".
- Lines:
  - "SharePoint client file linked: <folder>"
  - "A record with this name already exists. Check it is the same person."
  - "SharePoint is not synced to this computer, so only the program was checked."
  - "No record in the program and no SharePoint client folder with this name."
  - "same surname only"
  - "Information isn’t pulled from the SharePoint file yet. The notes are written from the transcript only."

---

### 8. Decision logic table

| Rule | Where | Code or model |
|---|---|---|
| New CRM contact defaults to stage `lead` when `crm_stage` is absent. `null` keeps it off the pipeline. | `crm.js:342` | code |
| New contact status: `active` if stage is `in_force`, else `prospect`. | `crm.js:343`, `727` | code |
| Modal defaults: stage `lead`, status `prospect`, thread `New Prospect`. | `ContactModal.jsx:10-15` | code |
| Duplicate on create: 409 if any non-archived contact matches the full first+last name. Skipped when there is no last name or `force` is set. | `crm.js:345-356` | code |
| Stage change sets `crm_stage_changed_at` and logs a `stage` activity. A prospect moved to `in_force` becomes `active` unless the status was sent too. | `crm.js:467-479` | code |
| Stage activities cannot be edited. Notes and meetings have no direction. | `crm.js:589`, `522` | code |
| Attention: anniversary passed, or within `renewalWindowDays` (14). Archived contacts are skipped. | `crm.js:90-96` | code |
| Attention: any overdue open task (`due < today`, local date). | `crm.js:97-99` | code |
| Attention: open stage and 14 or more days since last contact, else since the stage change, else since creation. | `crm.js:100-106`, `stages.js:65` | code |
| "Last contact" counts only call, email, meeting, sms and letter at or before now. Notes and stages do not count. | `stages.js:60`, `crm.js:200` | code |
| A future activity shows as "upcoming". | `crm.js:203-207` | code |
| Header `renewalsDue`: anniversary within 0–30 days (hard-coded 30). | `crm.js:248-252`; `Crm.jsx:40-45` | code |
| Suggested tier: sum of premium × frequency factor (weekly 52, fortnightly 26, monthly 12, quarterly 4, else 1). Policies with action `replace` or `cancel` are left out. The highest tier whose floor is at or below the sum wins. Null if the sum is 0 or less. A hint only; the tier is set by hand. | `crm.js:400-407`; `practice.js:56-59` | code |
| Referral partner flag: the normalised source equals a partner name or legal name, or (source ≥3 characters) one contains the other. | `practice.js:40-50` | code |
| Default adviser: `ADVISER_NAME` if it is one of the team's Advisers, else blank. | `crm.js:170` | code |
| SharePoint folder on save: one path segment, must exist in the listing when the library is available. | `crm.js:131-134`, `312-322` | code |
| Folder search: every typed word must start a word in the folder name. Max 20 results. | `names.js:193-198`; `crm.js:789` | code |
| Task auto-link on create: only when there is no `clientId`, the type is not Internal, and exactly one contact has a full first+last match. | `tasks.js:30-38`, `94-97` | code |
| Task due default: tomorrow, local date. | `taskStore.js:115-119`, `153` | code |
| Task notes: appended as "YYYY-MM-DD HH:MM: text", joined with " \| ", capped at 500 characters with the oldest text dropped. | `taskStore.js:92-109`; `tasks.js:155` | code |
| Archived-only tasks cannot be edited. | `tasks.js:139-147` | code |
| Task sort: status (In Progress, Open, Waiting, Done, Cancelled), then priority, then due (blank last), then received. | `taskStore.js:121-136` | code |
| Suggested tasks on a contact: unlinked, not Internal, `who` fully matches the contact. | `crm.js:412-414` | code |
| Name parse: brackets become a note. Split on "&" or "and". A lone first name before the joiner borrows the following surname. | `names.js:28-47` | code |
| "Likely household" (pre-ticked on import): 1–2 people, no digits, "/" or "@", no org words, the first person has a surname, each first name is at most 2 words. | `names.js:50-63` | code |
| Org words: `pty, ltd, advice, adviser(s), referral(s), insurance, insurer, consulting, group, pharmacy, onepath, zurich, tal, aia, mlc, metlife, synchron, opex, legacy, allfin, pre-assessment, underwriting` | `names.js:50-51` | code |
| Import grouping: names sharing a full person merge. A bare first name joins a group only when exactly one other group has that first name with a surname. | `names.js:121-160` | code |
| Import suggestion: the variant with the most people, then the most surnames, then the longest. A bracket note containing "referr" becomes the referral source. | `names.js:166-187` | code |
| Import offers a link only when exactly one contact matches. Candidates are sorted by open tasks, then total tasks. Max 500 rows per post. | `crm.js:693`, `697`, `713` | code |
| Import links live tasks only. Archive lines are not changed. | `crm.js:759-769` | code |
| Workbench create: new client gets `prospect` and `crm_stage='initial_meeting'`. No duplicate check. | `workbench.js:183-197` | code |
| Workbench `client_kind`: `existing` if a folder is linked or the lookup finds a program or SharePoint name hit, else `new`. | `workbench.js:199-201`, `264` | code |
| Workbench stage moves only forward on generation. The manual select can move it anywhere. | `workbench.js:91-95`, `219-221` | code |
| Case and short names are re-derived on a name edit only before any document JSON exists. | `workbench.js:239-242` | code |
| Lookup in the program: full first+last match (exact, normalised), excluding archived clients and the case's own client. | `lookup.js:83-100` | code |
| Lookup in SharePoint: same surname, plus a first name that is equal, or a prefix match when the shorter one is 3+ characters, or a bracket nickname → `name`. Surname alone → `surname`. Ranked by exact, then surname, then fewer people, then alphabetical. Max 8. | `lookup.js:42-72`, `104-108` | code |
| Lookup auto-suggests a folder only when exactly one `name` hit exists. `existing` = any program hit or any SharePoint `name` hit. | `lookup.js:110-114` | code |
| SharePoint reading in the Workbench writers is off unless `WORKBENCH_READ_SHAREPOINT=true`. | `workbench.js:26`, `378-391` | code |
| XPLAN navigation is locked to the `XPLAN_URL` origin. | `browser.mjs:32-40` | code |
| XPLAN click refused if the text matches `save, submit, delete, remove, archive, send, approve, create, update, confirm, pay, merge, cancel`, unless `XPLAN_ALLOW_WRITE=1`. | `browser.mjs:21`, `155-160` | code |
| XPLAN session expired = the page has a password input. | `browser.mjs:124`, `132-141` | code |
| Which XPLAN page to open and what to read | Claude in chat | model |
| Checkpoint client-material check: anything under `legacy/` except README.md and .gitkeep; `automation/tasks/state/*`; any `logs/` path; `.env` and `.env.*` except `.env.example`; `intake/*`. | `weekly-checkpoint.ps1:62-76` | code |
| Backup failure = robocopy exit code 8 or more. | `sync-onedrive.ps1:84-88` | code |

**Gaps**
- No rule moves a CRM stage from Workbench progress. A case advanced to `fact_find` or `pack` leaves `crm_stage` at `initial_meeting`.
- No rule sets `client_tier`. The suggestion is display only.
- No rule sets or rolls `next_review_date` after a renewal. The UI only says to update it.
- No XPLAN sync of tasks or stages. NOT FOUND in code. Looked in `server/src`, `automation/xplan`, `automation/xplan-api`.
- No server-side duplicate check on Workbench create.
- `xplan_fill` and `xplan_press` have no write guard. Pressing Enter on a form could submit it.
- The checkpoint guard checks `automation/tasks/state/*`, not the current `server/data/task-state/`. That folder is covered by `.gitignore` line 74 instead.
- Renewal windows differ: 14 days for attention and flags, 30 days for the header and filter.
- The tier "premium" text says "over $25k", but the code treats exactly 25000 as Platinum (`>=`).

---

### 9. Figures and calculations

| Figure | Value | Where |
|---|---|---|
| Tier floors | Platinum 25000, Gold 15000, Silver 5000, Bronze 0 (annual premium, AUD) | `legacy-practice.json` |
| Annualising factors | weekly 52, fortnightly 26, monthly 12, quarterly 4, other 1 | `crm.js:401-402` |
| Renewal window | 14 days | `legacy-practice.json` `renewalWindowDays`; fallback 14 in `practice.js` and `CrmContact.jsx:53` |
| Anniversaries header | 0–30 days | `crm.js:248-252` |
| Stale contact | 14 days | `stages.js:65` |
| Logged this week | activities (not stage) in the last 7 × 86,400,000 ms | `crm.js:231-235` |
| Days to date | UTC midnight difference of `YYYY-MM-DD` values, rounded | `crm.js:77-80` |
| Folder cache | 10 minutes (two separate caches) | `crm.js:115`; `lookup.js:22` |
| SharePoint folder count | "~1,300 clients" (comment) | `crm.js:120` |
| Field caps | task 500, who 120, notes 500; activity body 20000, subject 300; transcript 400000; adviser notes 20000 | `taskStore.js`, `crm.js:505`, `workbench.js:194` |
| Activity feed limit | default 100, max 200 | `crm.js:635` |
| Task ID | `T` + 4-digit zero-padded `nextId` | `taskStore.js:147` |
| Workbench tiles | Meeting → brief = meeting + fact_find + soa_notes; With paraplanner = paraplanner; SOA & pack = soa + pack | `Workbench.jsx:52-54` |
| Name-lookup debounce | 350 ms | `NewClientModal.jsx:112` |
| XPLAN read | 20000 characters default, 200 links, 40 inputs, 400 ms settle | `browser.mjs:81-127` |
| XPLAN login poll | every 2 s, 2 clean checks, more than 400 characters, 10-minute timeout | `login-auto.mjs:53-55`, `106` |
| OAuth refresh | 60 s before expiry | `oauth.mjs` `saveTokens` |
| Backup | every 60 min for 17 h from 07:00, 30-min limit | `install-backup-task.ps1` |
| Checkpoint | Friday 16:30, 15-min limit, lists 40 files in the message | `install-checkpoint-task.ps1`, `weekly-checkpoint.ps1:116-118` |
| Document scan input | first 12000 characters | `documentScan.js:44` |

---

### 10. Where facts come from

| Fact | Source |
|---|---|
| Contacts, stage, tier, thread, review date | `clients` table, typed by hand or created by the Workbench |
| Communication history | `crm_activities`, typed by hand. Nothing is read from a mailbox. |
| Tasks | `server/data/task-state/tasks.json` + `archive.jsonl` (path set by `TASK_STATE_DIR`) |
| Annual premium for the tier hint | `insurance_policies` rows for the client |
| Transcripts and documents on the timeline | `meeting_transcripts`, `documents` tables |
| Team, tiers, partners, insurers, threads | `legacy-practice.json`. Its `sources` list names: the Renewal & Review Process (issued 4 Sep 2026: Appendix A, Section 7, Section 8, 14-day window), "Client classification in XP", "Referral Partner Disclosure", "Documents & Templates\Insurer Forms", "Threads broken down.xlsx". |
| Stage list | The firm's XPLAN "Review" thread, from SharePoint `Documents & Templates\Threads broken down.xlsx` (`stages.js:4-10`). Unconfirmed by Tristan (memory). |
| Existing client | `clients` rows and SharePoint folder names under `Clients` |
| XPLAN answers | Live pages of Tristan's XPLAN site, read through his saved session |
| Adviser and firm names | `env.js` (`ADVISER_NAME` default "Tristan Biro"; `FIRM_NAME` default "Legacy Risk Advice") |

---

### 11. Rendering and UI

- **Look**: light blue in both themes (memory). Workbench styles are in `client/src/styles/workbench.css`.
- **Workbench list** (`/`):
  - Header "Clients", subtitle "<firm> · SOA workbench".
  - Hero "From first meeting to signed pack" with the text: "Add a client, paste the meeting transcript, and build the Initial Meeting Notes, Fact Find and SOA Notes. Once Howard has filed the quotes, draft the SOA and assemble the DocuSign pack. SharePoint is only ever read."
  - 4 stat tiles, then stage chips with counts, then a search box ("Search clients, advisers, SharePoint folders…") and a "Show archived" box.
  - Table columns: Client (initials avatar, name, Existing/New badge, case name), Stage badge, Progress (5 dots: Notes · Fact find · SOA Notes · SOA · Pack), Adviser, SharePoint ("📁 Linked" / "Not linked"), Updated (relative time).
- **Case view** (`/case/:id`):
  - Header with name and "Clients / <case_name>". Buttons "📁 SharePoint" and "📂 Case folder" (open Explorer).
  - Head card: adviser, phone, email, folder, Existing/New badge, Archived badge, Stage select, "✎ Details".
  - Step tabs.
  - Files tab: two cards, "Case folder" and "SharePoint: <folder>". The SharePoint card says "Read only. Nothing here is ever changed by this program." with alerts for not synced or missing.
- **Archive** (`/archive`): 9 cards: Old dashboard, Task Tracker, CRM, Clients (full profiles), Insurance & Risk Planning, Client Profile, Insurance Report, Advice Documents, Meetings.
- **CRM** (`/crm`):
  - Header "CRM", subtitle "Clients, every conversation, and what is owed to them". Buttons "Import from Task Tracker <n>" and "+ New contact".
  - Banner note: "Communication is logged by hand / Tasks are shared with the Task Tracker".
  - Tabs Contacts / Pipeline / Activity.
  - Contacts table: Contact, Tier, Stage (+ thread), Last contact (+ "Next: …"), Next task (overdue in red, "+N more"), Adviser.
  - Pipeline: one column per open stage, drag-and-drop. The column title tooltip is "XPLAN: <mapping>". Cards show name, tier, thread, next task, last contact and days in stage. Cards needing attention sort first, then the longest waiting. Under the board, "Off the board:" chips for the closed stages and "Not in the pipeline".
  - Activity: a practice-wide feed grouped by day, with "Upcoming" first.
- **CRM contact** (`/crm/:id`):
  - Hero with status, tier, thread tag, stage badge, adviser, referrer, fact tiles.
  - StagePath row with ✓ on done steps and a "Close the file" group for the outcomes.
  - Flags. Details panel showing the tier protocol (Initial contact / Follow-up email / Phone call / Meeting) and the tier hint "Cover on file totals $X a year, which is <Tier>." Copy buttons. SharePoint "Copy path to open in Explorer".
  - Composer (Ctrl+Enter saves). Timeline filters: Everything, Calls, Emails, Meetings, Texts, Letters, Notes, Tasks done, Stage; grouped by month.
  - Tasks panel with "Attach to this contact" for suggested tasks.
  - The "Full client profile" button links to the archived `/clients/:id`.
- **Task Tracker** (`/tasks`):
  - Header "Task Tracker", subtitle "Built from your mailbox every hour" (stale). Buttons "+ Add task" and "Refresh".
  - Banner stats, "<n> tracked / Last scan <date>".
  - Filter pills with counts. A sheet of tasks with notes log, due cell, status select and CRM link.
- **Dates**: `en-AU` locale throughout. Local calendar day, not UTC.

---

### 12. Versioning and history (git, read only)

| Commit | Date | Message |
|---|---|---|
| `430ad17` | 2026-09-07 | Lay the task tracker out top down |
| `0e5971e` | 2026-09-07 | Build the mail-driven task tracker (also the last commit touching `automation/xplan` and `automation/xplan-api`) |
| `5f29059` | 2026-09-14 | Editable dates, notes and an archive for the task tracker |
| `e1f3200` | 2026-09-14 | Mirror the project into OneDrive on a schedule |
| `3b2bbf5` | 2026-09-14 | Weekly checkpoint |
| `5b07300` | 2026-09-21 | Weekly checkpoint |
| `f9e6f41` | 2026-09-28 | Weekly checkpoint. CRM files first appear here: `routes/crm.js`, `services/crm/*`, `legacy-practice.json`, `Crm.jsx`. |
| `e0e3136` | earlier | Add follow-on-from-meeting draft + save all working files (touches `automation/xplan*`) |

- No commits since 28 Sep 2026. The 23 Oct scheduled checkpoint exited 2 (aborted on client material).
- **Uncommitted** (git status at session start):
  - Untracked: `server/src/routes/workbench.js`, `server/src/services/workbench/`, `client/src/pages/wb/`, `client/src/pages/Archive.jsx`, `client/src/styles/workbench.css`, `.claude/skills/`, `legacy/advisers/`, `legacy/docusign/`, `legacy/packs/`.
  - Modified: `client/src/App.jsx`, `client/src/components/Layout.jsx`, `server/src/db/schema.sql` (+37 lines, the workbench table), `server/src/routes/index.js`, `.gitignore`.
- History of the archived mail scanner exists in `0e5971e`. Not opened.

---

### 13. Known problems and workarounds

1. **Task Tracker UI still describes the mail scanner.**
   - The subtitle says "Built from your mailbox every hour" (`Tasks.jsx:157`).
   - The banner shows "Last scan" from `lastRun`, which nothing updates now.
   - The empty state tells the user to check a log under the archived scanner folder and says the scanner writes every 30 minutes (`Tasks.jsx:268-272`).
   - The task file still carries a seen-mail map key in its default shape (`taskStore.js:28`).
2. **The XPLAN sync plan is stale.** `task-tracker-next-xplan-sync.md` (2026-09-07) planned to push mail-fed tasks into XPLAN. The mail feed was archived on 16 Sep. No sync code exists.
3. **The CRM stages are unconfirmed.** The memory says to ask Tristan before building more on them. The Workbench stage list is also unconfirmed.
4. **There are two stage systems.**
   - CRM `crm_stage` has 13 values. Workbench `stage` has 8.
   - They are linked only at Workbench create (`initial_meeting`). After that they drift apart.
5. **Duplicate client rows.** Workbench create always inserts a new `clients` row. If the person is already a CRM contact, the lookup warns in the UI, but a second row is still created.
6. **XPLAN write guard gaps.**
   - Only `xplan_click` checks text.
   - `xplan_fill` and `xplan_press` are not guarded.
   - A click on an icon with no matching words is not guarded.
   - The fallback `getByText(..., {exact:false})` can click a partial match.
7. **Licensee conflict.** Both XPLAN READMEs name "Pareto Group, AFSL 418700" as licensee. `env.js` and memory name Synchron Advice Pty Ltd, AFSL 243313.
8. **The XPLAN API connector is a skeleton.**
   - All endpoint paths are marked `CONFIRM`.
   - It is not registered in `.mcp.json`.
   - The snippet comment points at an `h:/` drive path.
   - `to-report.mjs` hard-codes the adviser "Tristan Biro".
   - `quote.mjs` is a placeholder that pauses in the Inspector.
9. **The XPLAN session is not present right now.** No `.session/auth.json` was listed in `automation/xplan`. Tristan must log in before any lookup.
10. **The OneDrive mirror copies everything not excluded.** That includes `.env` files, the XPLAN `.session` folders (saved login and tokens), the XPLAN access log, the task file and `legacy/` client documents. It all goes to `OneDrive - <tenant>\FPGod-Backup`. `/MIR` also deletes from the backup what is deleted locally. OneDrive's 30-day recycle bin is the stated safety net.
11. **The backup comment is stale.** It names `automation/tasks/state/` as the task store. The live store is `server/data/task-state/`.
12. **The checkpoint is failing.** Last result 2 on 23 Oct. Untracked `legacy/advisers/`, `legacy/docusign/` and `legacy/packs/` would be flagged by the `legacy/*` rule unless they are ignored. The flagged list is in `automation/backup/logs/checkpoint.log` (not opened).
13. **The schedule times differ from the script defaults.** `schtasks` shows 8:00 AM and 5:30 PM against 07:00 and 16:30 in the scripts. Cause not confirmed.
14. **Demo data.** The memory records six "Test" contacts and one "TEST —" task in the real `fpgod` database and task file, to be removed after trying the CRM out. Current state unknown (DB not queried).
15. **The old dashboard and `clients.js` still read the follow-up drafts table** from the archived mail feature (`dashboard.js:19,25`; `clients.js:79`).
16. **The fallback wording in `documentScan.js` names a different AI provider** ("no OpenAI key"). The service uses Anthropic.
17. **Folder caching is duplicated.** `crm.js` and `lookup.js` each cache the SharePoint folder list for 10 minutes. The two use different matching rules (exact first name in the CRM, prefix or nickname in the lookup).
18. **Activity delete is a hard delete.** There is no history.
19. **Test isolation is in place.** Tests use `fpgod_test` and `./data-test/task-state` (`vitest.config.js`). The older memory still says to check `training_data` for stragglers after a run.

---

### 14. Dependencies

**Runtime and libraries**
- Server: Node.js, Express, PostgreSQL (`pg`; DB `fpgod`, tests `fpgod_test`), Anthropic SDK, `html-to-docx` (workbench).
- Client: React, `react-router-dom`.
- `automation/xplan`: `playwright` ^1.61.1 (Chromium), `@modelcontextprotocol/sdk` ^1.12.0, `zod` ^3.23.8.
- `automation/xplan-api`: `@modelcontextprotocol/sdk` ^1.12.0, `zod` ^3.23.8, Node `fetch`, `http`, `crypto`.

**Windows**
- PowerShell 5.1, `robocopy.exe`, Task Scheduler (interactive logon, standard user), OneDrive business sync, Git with Git Credential Manager (cached credentials needed for an unattended push).

**External services**
- Anthropic API (document scan, Workbench writers).
- Iress XPLAN site and Auth0-based SSO at the Iress auth host.
- The Iress Custom API (pending: needs an API Agreement and a Custom Integration app key).
- GitHub `origin`.

**Environment variable names** (values not printed)

| Area | Variables |
|---|---|
| Server | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ADVISER_NAME`, `ADVISER_AR`, `ADVISER_EMAIL`, `ADVISER_PHONE`, `FIRM_NAME`, `TASK_STATE_DIR`, `LEGACY_LIBRARY_ROOT`, `LEGACY_LIBRARY_CLIENTS_DIR`, `LEGACY_REPO_ROOT`, `WORKBENCH_READ_SHAREPOINT`, `DATABASE_URL`, `TEST_DATABASE_URL` |
| XPLAN browse | `XPLAN_URL`, `XPLAN_HEADLESS`, `XPLAN_ALLOW_WRITE`, `LOGIN_TIMEOUT_MS` |
| XPLAN API | `XPLAN_BASE_URL`, `XPLAN_CLIENT_ID`, `XPLAN_CLIENT_SECRET`, `XPLAN_AUTH_URL`, `XPLAN_TOKEN_URL`, `XPLAN_SCOPES`, `XPLAN_REDIRECT_URI` |
| Remote session hook | `CLAUDE_CODE_REMOTE`, `CLAUDE_PROJECT_DIR` |

**Secrets on disk (not read)**
- `automation/xplan/.env`
- `automation/xplan/.session/` (when present)
- `automation/xplan-api/.env` and `.session/tokens.json` (when present)
- `server/.env`

**Internal**
- `services/library/fsGuard.js` (read-only SharePoint access: `listDir`, `statFile`, `absolutePathOf`, `rootAvailable`).
- `services/library/match.js` (`normalise`, `peopleOf`).

---

### 15. Questions for Tristan

1. Are the 13 CRM stages, taken from the "Review" thread, right? Should other threads (Partner Cover, Increase, Claim and so on) have their own stage lists?
2. Should the CRM stage follow the Workbench stage automatically, or are they separate on purpose?
3. Is the CRM still in use now that it is under `/archive`, or should its features (activity log, tiers, renewals) move into the Workbench?
4. How should tasks reach the Task Tracker now that the mail feed is gone: typed only, or from another source?
5. Is syncing tasks into XPLAN still wanted? If so, should it go through the browser MCP with writes enabled, or wait for the Custom API?
6. Which licensee is correct for the XPLAN and Iress paperwork: Pareto Group (AFSL 418700) as in the XPLAN READMEs, or Synchron Advice (AFSL 243313) as in the app?
7. Has the Iress Custom API request been sent or answered? Are there endpoint specs?
8. Should `xplan_fill` and `xplan_press` also be write-guarded?
9. Should the OneDrive mirror leave out `.env` files, XPLAN session folders and the XPLAN access log?
10. The weekly checkpoint has aborted since 23 Oct, and nothing has been committed since 28 Sep. Should `legacy/advisers/`, `legacy/docusign/` and `legacy/packs/` be git-ignored, or committed in part?
11. Should the anniversary window be 14 days everywhere, or 30 days for the header and filter?
12. Should the client tier be set automatically from the premium total, or stay manual?
13. Can the "Test" demo contacts and the "TEST" task be removed?
14. Should the Workbench refuse, or offer to reuse, an existing `clients` row when adding a client who is already in the CRM?
15. When should `WORKBENCH_READ_SHAREPOINT` be switched on?

---

## Part 8. Other Generators and Shared Plumbing

Scope: every document generator except the risk SOA, plus the shared server plumbing. I only read files. Nothing was run, and the database was not queried. Client details are replaced with placeholders like `[CLIENT]`, and each place is marked.

---

### 1. Inventory

**Code: generators**

| File | What it is | Status |
|---|---|---|
| `server/scripts/generate-client-profile.mjs` | Client Profile (information and consent form). Clones a Word template and fills its cells. CLI only. | Works only if a template exists. No template is in the repo (`legacy/templates/` holds only `.gitkeep`). |
| `server/scripts/generate-insurance-report.mjs` | Risk / Insurance Report (current cover and indicative cover tables). Clones a Word template and fills its cells. CLI only. | Same. No template. |
| `server/src/services/planGenerator.js` | General financial plan / "SOA style" plan generator. AI. Also exports `gatherClientContext`, `contextToText`, `CALC_GUARDRAILS` and `stripCodeFence`, which other modules use. | Live at `/api/plans/generate`. Reached from the archived "Advice Documents" screen. |
| `server/src/services/planRender.js` | Markdown to inline-styled HTML, used for Word export. | Live. |
| `server/scripts/markdown-to-docx.mjs` | Markdown to .docx using the `docx` library. Calibri font, `1F3864` accent. | Current. Its header says it is used for the fact find. |
| `server/scripts/md-to-docx.mjs` | Markdown to .docx using the `docx` library. Hard-coded **Lakeside Financial** banner. | Lakeside era. |
| `server/scripts/build-docx.mjs` | Guide markdown to .docx using `docx`. Green Lakeside palette. | Lakeside era. Reads `generated-plans/`, which is NOT FOUND at the repo root. |
| `server/scripts/export-docx.mjs` | Any .md to .docx using `renderPlanHtml` and `html-to-docx`. Hard-coded Lakeside firm name, and a tagline naming a real client couple `[CLIENT NAMES REDACTED]`. | Lakeside era, one-off. |
| `server/scripts/build-combined-guide.mjs` | Joins four general-advice guides into one "Financial Strategy Guide" (.md and .docx). | Lakeside era. Hard-coded Lakeside licensee text. |
| `server/scripts/emit-guide-html.mjs` | Writes HTML for each guide, to be opened and re-saved in Word. | Lakeside era. |
| `server/scripts/export-guide-docx.mjs` | One guide to .docx, through `html-to-docx`. | Lakeside era. |
| `server/scripts/export-super-guide-docx.mjs` | Superannuation guide to .docx. A one-off. | Lakeside era. |
| `server/scripts/reset-for-legacy.mjs` | Snapshots the DB, then purges demo clients and synthetic training rows. | One-off maintenance. |
| 10-year premium summary | **NOT FOUND.** No generator exists. Searched the whole repo (excluding archive, node_modules, uploads, data) for "10-year", "10 year", "ten year", "premium summary" and "premium projection". The only hit in code is a filename-parsing regex comment in `server/src/services/library/indexer.js:37`. That comment shows a SharePoint file called "<date> 10-Year Premium Summary - [CLIENT NAMES REDACTED]". The document exists in SharePoint but is made outside this repo. Nothing in `.claude/skills/` mentions it. | — |
| Group cover review job (`[CLIENT]` business) | **NOT FOUND in code.** I searched for "group cover" in server, client and .claude. Described from the memory index line only (see §13). | — |

**Code: shared plumbing**

- `server/src/index.js`: starts the server. Disables request timeouts.
- `server/src/app.js`: Express app. CORS, JSON limit 2 MB, `/health`, `/api`, serves the SPA from `client/dist` when it exists.
- `server/src/config/env.js`: all configuration, including firm, licensee, adviser and model.
- `server/src/config/db.js`: pg pool. NUMERIC is parsed as float. DATE is kept as a string.
- `server/src/services/ai.js`: the only Anthropic wrapper (`complete`, `completeOrStub`, `aiEnabled`).
- `server/src/services/generatedDocs.js`: files each generated plan as a `.md` document row.
- `server/src/routes/index.js`: mounts every router, plus `/api/meta`. It has one uncommitted change (+3 lines) that mounts `/workbench`.
- `server/src/routes/plans.js`: plan CRUD, interview, generate, regenerate, Word export, risk SOA.
- `server/src/routes/financials.js`: CRUD for assets, liabilities, income, expenses, insurance and goals.
- `server/src/routes/investments.js`: current and recommended investments, plus a comparison endpoint.
- `server/src/routes/family.js`: CRUD for family members.
- `server/src/routes/crudFactory.js`: the generic CRUD router used by the four routers above.
- `client/src/pages/generate/ClientProfile.jsx` and `InsuranceReport.jsx`: both `ready={false}`.
- `client/src/components/GeneratorScaffold.jsx`: shows `readyNote` in place of the Generate button when `ready` is false.
- `client/src/pages/PlanGenerator.jsx`, `PlanPresent.jsx`, `client/src/lib/template.js`: plan UI and export styling.

**Prompts**

All in `server/src/services/planGenerator.js`: `CALC_GUARDRAILS` (lines 330–338), `SYSTEM_PROMPT` (340–357), `QUESTION_SYSTEM_PROMPT` (359–367), `sectionSystemPrompt` (512–518), and the user-message builders (375–379, 442–448, 521–526). `CALC_GUARDRAILS` is also imported into `server/src/services/chat.js:3,35` (the plan refinement chat). The client profile, insurance report, guide and converter scripts make no AI calls.

**Templates**

- `legacy/templates/Client Profile.docx`: NOT FOUND (folder has only `.gitkeep`).
- `legacy/templates/Risk Report.docx`: NOT FOUND.
- Plan master template: a `training_data` row with `kind='plan'` and `metadata.is_template='true'`. It lives in the DB and was not inspected.
- Export look: `client/src/lib/template.js`. Themes are modern, classic and minimal. Accent presets are listed there. Defaults are firm name "Your Firm" and tagline "Financial Advisory", stored in browser localStorage.

**Reference**

- `README.md`, `MIGRATION.md`.
- Memory files `legacy-risk-advice-templates-pending.md`, `firm-is-legacy-risk-not-lakeside.md`, `fpgod-test-suite-writes-to-dev-db.md`.
- The guide markdown sources (`generated-plans/*.md`): NOT FOUND at the repo root. Probably under `archive/lakeside/`, which I did not open.

**Config**

`server/.env.example` (variable names only), `client/.env.example`, `server/vitest.config.js`, `server/nodemon.json`, `docker-compose.yml`, and the three `package.json` files.

**Skipped, with reasons**

- Named after clients, listed only: `server/scripts/build-[client-A]-soa.mjs`, `build-[client-A]-soa-v2.mjs`, `build-[client-B]-soa.mjs`, `build-[client-C]-soa.mjs`, `build-[client-D]-soa.mjs`, `export-[client-E]-docx.mjs`, `export-[client-E]-compliance-docx.mjs`, `export-[client-F]-docx.mjs`.
- Client data: `legacy/**` data folders, `archive/lakeside/**`, `server/uploads/`, `server/data/`, Downloads, SharePoint, all DB contents.
- Memory file `[client]-group-cover-review.md`: index line only.
- Email-related code and folders: not opened, because of the standing rule.
- `server/src/db/seed-demo-client.js`: checked, and the data is fictional ("John & Mary Test", `@example.com` addresses, 555 phone numbers). `seed.js` is also fictional (the Harrison household, `@example.com`). Neither is described further.
- `MIGRATION.md`: contains one real client file name as a long-path example. Not quoted.

---

### 2. Entry points and triggers per generator

| Generator | Trigger | Who triggers |
|---|---|---|
| Client Profile | `node scripts/generate-client-profile.mjs <filled.json> ["<output.docx>"]`, run from `server/`. The UI page `/generate/client-profile` shows "Awaiting the Legacy Risk Advice client profile Word template…" and has no button (`ClientProfile.jsx:11`). | Manual CLI |
| Insurance Report | `node scripts/generate-insurance-report.mjs <data.json> [output.docx]`. The UI page `/generate/insurance-report` has `ready={false}` (`InsuranceReport.jsx:11`). | Manual CLI |
| Financial plan: interview | `POST /api/plans/interview` `{clientId, instructions?}` (`plans.js:31`). **No caller in the client.** I searched `client/src` for "interview". | None |
| Financial plan: generate | `POST /api/plans/generate` `{clientId, title?, instructions?, answers?, save=true, docType='plan'}` (`plans.js:51`). Called from the "Generate Financial Plan" modal (`PlanGenerator.jsx:298`). That page is at route `/plans` and is listed under `/archive`. | Adviser, UI |
| Financial plan: regenerate | `POST /api/plans/:id/regenerate` (`plans.js:94`). Called from `PlanGenerator.jsx:81` after a confirm dialog. | Adviser, UI |
| Plan Word export | `POST /api/plans/:id/export/docx` `{theme, accent, firmName, tagline}` (`plans.js:118`). Called from `PlanGenerator.jsx:98` and `PlanPresent.jsx:43`. | Adviser, UI |
| Plan chat refine | Chat endpoint (`services/chat.js`), with `targetType='plan'`. | Adviser, UI |
| markdown-to-docx | `node scripts/markdown-to-docx.mjs <input.md> ["<output.docx>"]`. | Manual CLI, or other scripts |
| md-to-docx | `node scripts/md-to-docx.mjs <in.md> <out.docx> [title] [tagline]`. | Manual CLI |
| build-docx | `node scripts/build-docx.mjs [basenames…]`. Defaults to 5 guide basenames. | Manual CLI |
| export-docx | `node scripts/export-docx.mjs <input.md> [title]`. | Manual CLI |
| Guides | `build-combined-guide.mjs`, `emit-guide-html.mjs`, `export-guide-docx.mjs <base> "<Title>" "<Tagline>"`, `export-super-guide-docx.mjs`. | Manual CLI |
| reset-for-legacy | `node scripts/reset-for-legacy.mjs` (dry run) or with `--confirm`. | Manual CLI |
| 10-year premium summary | NOT FOUND | — |
| Group cover review | NOT FOUND in code. Done in a chat session (see §13). | — |

---

### 3. Inputs

**Client Profile** (`generate-client-profile.mjs`): a JSON file. Keys used:

- `meta.adviser`, `meta.date`
- `yourDetails.<key>.{client,spouse}`, where key is one of: fullName, residentialAddress, mobileNumber, emailAddress, dateOfBirth, maritalStatus, previousOccupation, occupation, employmentBasis, employer, annualIncomeIncBonus, estMonthlyExpenditureSurplus, privateHealthInsurance, superContributionsPct, smoker
- `yourDetails.childrenDependents`
- `estatePlanning.{hasWill, willAllowsTestamentaryTrust, hasPowersOfAttorney, dateLastReviewed}`
- `goals.{shortTerm, longTerm}`
- `assets[] {asset, location, value, owner}`
- `debts[] {debt, location, balance, bank, fixedOrVariable, ratePct, monthlyPayment}`
- `familyProtection.{desiredOngoingIncome, clearInvestmentDebt, privateSchooling}`
- `consent.{fsg, privacy, electronicCommunications, tfn, disclosureInformation, disclosureToSpouse, authorisationToRenew, clientName, signature, date}`

The header comment says the blank JSON lives at `archive/lakeside/templates/client-profile.template.json` (not opened). It does **not** read the database.

**Insurance Report** (`generate-insurance-report.mjs:14-32`): a JSON file:

- `{adviser, date, current[], indicative[], totalPremium}`
- Each policy is `{type, startDate, product, lifeInsured, sumInsured, owner, premium, premiumType, replace}`. `replace` is used in the current table only.
- Every value is a preformatted string.

It does not read the database.

**Financial plan** (`gatherClientContext`, `planGenerator.js:38-95`). It reads:

- the client row
- the client group
- all group members
- per person: current_investments, recommended_investments, assets, liabilities, income_sources, expenses, insurance_policies, financial_goals, estate_plans, family_members
- joint rows (group_id set, client_id NULL)
- `documents.extracted_text` for every household document
- meeting transcripts
- the follow-up correspondence table

On top of that:

- the master template and up to 2 reference plans from `training_data` (`selectExamples`, lines 294–321)
- the adviser's `instructions`
- `answers`, but only in the single-pass path (see §8 gaps)

**Plan export:** `financial_plans` row, `clients` row, and the body `{theme, accent, firmName, tagline}` from browser localStorage (`client/src/lib/template.js`).

**Guides:** markdown files in `generated-plans/` (NOT FOUND at the root).

**reset-for-legacy:** the live database named by `server/.env`.

---

### 4. Pipeline per generator

**Client Profile** (no AI):

1. Check that the template exists, otherwise throw (line 334).
2. Unzip it and read `word/document.xml`.
3. Run 10 fillers in order: adviser, your details, estate, goals, assets ledger, debts ledger, net wealth, family protection, consent, signature (lines 343–359).
4. Each filler finds its table by marker text.
5. Zip with DEFLATE.
6. Write to `legacy/client-profiles/<fullName> - Client Profile.docx` by default.

AI calls: 0. Manual steps: fill the JSON by hand, then run the CLI.

**Insurance Report** (no AI):

1. Check that the template exists.
2. Classify tables by text (lines 115–124):
   - "Adviser Name" is the adviser table.
   - "INDICATIVE INSURANCE COVER" sets a marker flag.
   - "Total premium" is the total table.
   - "Policy Type" plus "To Be Replaced" is the current-cover table.
   - "Policy Type" after the marker is the indicative table.
3. Fill the adviser/date cells.
4. For each cover table, keep the header row, clone row 1 for each policy and fill it.
5. Write the total premium cell, in bold.
6. Write to `Insurance Report.docx` in the current directory by default.

AI calls: 0. Manual steps: build the JSON by hand.

**Financial plan: interview** (`generateQuestions`, lines 373–408):

- AI calls: 1.
- `completeOrStub` with `QUESTION_SYSTEM_PROMPT`, effort `low`, `json: true`, maxTokens 8000.
- Model: `env.anthropic.model` (default `claude-opus-5`). Adaptive thinking.
- Falls back to a fixed 5-question stub.
- Saves nothing.

**Financial plan: generate / regenerate** (`generatePlanSectioned`, lines 546–560):

1. Load the newest master template (`kind='plan'`, `is_template='true'`).
2. Split it into sections (`splitTemplateSections`, lines 478–496). The regex matches numbered headings `^\d{1,2}\.\s+[A-Z]…`. The split is used only if it finds 3–45 headings. Text before the first heading becomes a "Cover, scope & summary" section.
3. If AI is off, or there is no template, or fewer than 3 sections: use `generatePlan` (single pass).
   - **Single pass:** 1 call. `SYSTEM_PROMPT`, effort `high`, maxTokens 14000. Template excerpt up to 100,000 chars. References up to 4,000 chars each (7,000 with no template). Stub: `buildStubPlan`.
   - **Sectioned:** N calls, one per template section, at most 5 at once (`mapLimit`). Each uses `sectionSystemPrompt(tplTitle)`, effort `high`, maxTokens 12000. Template section excerpt up to 9,000 chars. The full context text is sent with every call. Section stub: `## <title>\n\n_[Offline stub — set ANTHROPIC_API_KEY for AI generation.]_`.
4. Strip code fences from each output and join the sections with blank lines.
5. Route: insert a `financial_plans` row with status `draft` and completeness 95 if `ai`, else 60. Then `saveGeneratedDocument` writes a `.md` file to storage and a `documents` row (`docType` is `plan`, or `soa` if `docType='soa'`).
6. Regenerate updates `content`, `generated_by_ai` and `completeness` in place, with no history.

Timing: `index.js:14-16` sets `requestTimeout=0`, `timeout=0` and `headersTimeout=620000` so these long runs are not cut off.

**Plan export** (`plans.js:118-143`): `renderPlanHtml` produces HTML, `html-to-docx` converts it (portrait, 720 twip margins), and the file name is slugified from the title. No AI.

**markdown-to-docx:** `marked.lexer` (GFM) tokens are mapped to `docx` objects (headings 1–3, paragraphs, tables with a `1F3864` header fill and white text, lists, multi-paragraph blockquotes, hr). HTML entities are unescaped. Calibri 10 pt. 720 twip margins. No AI.

**md-to-docx:** a line-based parser that does its own inline regex for bold, italic, code and links. It removes a "# LAKESIDE FINANCIAL / *Advice for life*" header and then adds its own Lakeside banner. Green `4C9A2A`. No AI.

**Guides:** `build-combined-guide.mjs` takes `## 2.` up to "General risks" from each of 4 guides, demotes `## n.` to `###`, adds a fixed front section and a fixed back section, writes the .md, then renders it through `renderPlanHtml` and `html-to-docx`. The other three guide scripts render one file each. No AI.

**reset-for-legacy:**

1. Snapshot **every** public table to `archive/lakeside/db-snapshot/<table>.json` plus `_manifest.json`. This happens on the dry run too.
2. Report the counts.
3. With `--confirm`, run one transaction that deletes:
   - clients where `email LIKE '%@example.com'`
   - the groups "The Harrison Household" and "The Test Household (Demo)"
   - training_data where `length(content) < 1000`
   - financial_plans where both client_id and group_id are NULL

No AI.

**ai.js** (shared):

- `complete()` is the only API path.
- `system`-role messages are hoisted into the top-level `system`. Any message with `cache: true` caches the whole system prompt (ephemeral).
- If the first message is not a user turn, a `"Proceed."` user turn is added.
- Always sends `thinking: {type:'adaptive'}`.
- Sends `output_config: {effort}` when effort is given.
- Default maxTokens is 16000. It streams when maxTokens > 16000.
- `temperature`, `top_p` and `top_k` are never forwarded.
- `json: true` runs `coerceJson`, which strips a fence or slices from the first `{` to the last `}`.
- `completeOrStub()` returns the stub when there is no key **or on any error**, and logs `[anthropic] falling back to stub:`.

---

### 5. Prompts verbatim

**`CALC_GUARDRAILS`** (`planGenerator.js:330-338`):

```
CALCULATION INTEGRITY — these rules are MANDATORY and override the template if it shows a calculation done differently:
1. Show the working for every dollar figure you derive. After any table of components or any tax figure, RE-CHECK it before writing: the parts must sum to the stated total, and every tax amount must equal the rate applied to the correct base. If a check fails, fix the numbers — never output a figure you have not verified.
2. Superannuation proportioning rule (ITAA 1997 s307-125): every super lump sum, withdrawal or rollover is drawn from the tax-free and taxable components in the SAME proportion they bear to the whole interest. NEVER assume a withdrawal comes wholly or disproportionately from the taxable component. (E.g. withdrawing from an interest that is 95% taxable removes 95% taxable / 5% tax-free — not 100% taxable.)
3. Re-contribution strategy: a non-concessional re-contribution is 100% tax-free component, but the preceding withdrawal is proportional (rule 2). Recompute BOTH components from the proportioning rule; do not subtract the whole withdrawal from the taxable component.
4. Super death benefits tax — taxed element of the taxable component paid to a non-dependant: 15% + 2% Medicare = 17% if paid directly from the fund, or 15% (no Medicare) if paid via the deceased estate. The tax-free component is always nil-taxed. State which payment path you assume.
5. Non-concessional contributions (NCC) cap & bring-forward — use the cap for the financial year the contribution falls in: 2024-25 and 2025-26 = $120,000/yr (3-year bring-forward $360,000); from 1 July 2026 = $130,000/yr (3-year bring-forward $390,000). Bring-forward also needs age < 75 on 1 July of the trigger year and a Total Super Balance under the threshold. Flag any figure that changes at a 1 July boundary near the advice date.
6. CGT main residence exemption: covers the dwelling plus adjacent land up to 2 hectares TOTAL including the land under the dwelling (ITAA 1997 s118-120). For land over 2 ha, you select which 2 ha is exempt and apportion the remainder by relative VALUE where parts can be separately valued (otherwise by area), and the split must be reasonable (TD 1999/67). Individuals get the 50% CGT discount on assets held > 12 months.
7. Every tax, CGT, super or projection figure is ILLUSTRATIVE: state the assumptions it rests on, mark it [ADVISOR TO CONFIRM], and never present it as a guaranteed outcome.
```

**`SYSTEM_PROMPT`** (`planGenerator.js:340-357`). Single-pass plan. `CALC_GUARDRAILS` is appended after two newlines:

```
You are a senior Australian financial planner writing a Statement of Advice (SOA). A MASTER TEMPLATE plan is provided: mirror its structure, section order, headings, tone, formatting and level of detail as closely as possible, adapting all content to THIS client/household. Use the strategies demonstrated in the template and reference plans where they suit the client (e.g. superannuation contribution strategies, salary sacrifice, transition to retirement, SMSF, investment structures, surplus funds, insurance, Centrelink, estate planning) — but NEVER invent figures that are not supported by the client data. Write in Markdown, be comprehensive and specific, and show calculations/projections where the template does. Where genuine adviser judgement or a figure you cannot derive is needed, insert a clearly-marked [ADVISOR TO CONFIRM] placeholder. Use Australian terminology and AUD. Do NOT use US concepts (401k, IRA, Roth, HSA). CRITICAL: never fabricate the client's personal details. If a client address, date of birth, contact detail, account number, or similar is not provided in the client data above, write [ADVISOR TO CONFIRM] rather than inventing one. You MAY reproduce the adviser/firm letterhead and disclaimers from the master template (that is the advising firm's own branding), but all CLIENT-specific facts must come only from the supplied client data or be marked [ADVISOR TO CONFIRM]. For the document's preparation date, use the supplied "Date of advice" — never copy a date from the template.

<CALC_GUARDRAILS>
```

**`QUESTION_SYSTEM_PROMPT`** (`planGenerator.js:359-367`):

```
You are a senior Australian financial planner. Before writing a Statement of Advice you must review the client/household file and identify the key questions to ask the adviser — the decisions, missing facts, goals, preferences and assumptions that materially change the advice (e.g. target retirement age, income needs in retirement, risk tolerance confirmation, priorities between goals, appetite for SMSF, contribution amounts, insurance needs, Centrelink/age pension considerations, time horizons, any constraints). Base questions on what is MISSING or AMBIGUOUS in the supplied data — do not ask what is already answered. Return JSON only: {"questions":[{"question":"...","why":"short reason it matters","suggestion":"a sensible default answer the adviser can accept or edit"}]}. Return the 5-8 most important questions. Do NOT write the plan.
```

**Interview user message** (`planGenerator.js:375-379`):

```
Client/household file:
<contextToText(ctx)>

Detected focus areas: <topics joined by ", " or "general">.
[if template:]

The plan will follow the structure/style of the master template "<tpl.title>".
[if instructions:]

Adviser instructions: <instructions>
```

**Interview stub** (lines 381–389): five fixed questions. They ask for target retirement age (suggestion "Age 65"), retirement income (suggestion "$80,000 p.a."), goal priority, whether the risk profile is confirmed, and appetite for an SMSF.

**Single-pass user message** (`planGenerator.js:418-448`):

```
[if template:]
MASTER TEMPLATE — this is the BLUEPRINT. You MUST reproduce its section headings in the SAME order, its tone, formatting, tables and depth, populating every section with THIS client/household's data and appropriate strategies. Do not drop sections. The full template follows:
Title: <tpl.title>
"""
<template, up to 100000 chars, then "\n…[truncated]">
"""

[if references:]
ADDITIONAL REFERENCE PLANS — for relevant strategies only (do not copy their structure):

Reference <n> (<title>):
"""
<excerpt, 4000 chars with template / 7000 without>
"""

Detected focus areas: <topics>.

Date of advice — use THIS as the document's "Prepared on" / preparation date (do NOT copy the template's date): <today en-AU, e.g. 27 October 2026>.

Now write a complete Statement of Advice style financial plan for the following client/household:
<contextToText(ctx)>
[if answers:]

The adviser has answered the following clarifying questions — treat these as confirmed decisions and build the advice around them:
Q: <question>
A: <answer>
[if instructions:]

Additional advisor instructions: <instructions>
```

**`sectionSystemPrompt(tplTitle)`** (`planGenerator.js:512-518`):

```
You are a senior Australian financial planner writing ONE section of a comprehensive Statement of Advice titled "<tplTitle>". Write ONLY the requested section, in Markdown. Mirror the template section's structure, sub-headings, tables and depth, but populate everything with THIS client/household's real data and figures. Apply and explain the strategies the template section demonstrates wherever they suit the client; if a strategy or sub-section genuinely does not apply, say so in one line rather than dropping it. Show the same kind of worked numbers, tables and legislative references the template uses, adapted to the client. NEVER fabricate the client's personal facts — write [ADVISOR TO CONFIRM] for anything not supplied. Use Australian terminology, AUD and current FY thresholds; do NOT use US concepts. Do NOT wrap the output in code fences.

<CALC_GUARDRAILS>
```

**Section user message** (`planGenerator.js:521-526`):

```
TEMPLATE SECTION (follow its structure, headings, tables and depth):
"""
<section text, up to 9000 chars>
"""

CLIENT / HOUSEHOLD DATA:
<contextToText(ctx)>

Date of advice (use for any preparation date): <today>.
[if instructions:]

Adviser instructions: <instructions>

Now write the section "<sec.title>" for this client/household.
```

**Plan chat system prompt** (`services/chat.js`, plan branch). It reuses `CALC_GUARDRAILS`:

```
You are collaboratively building and refining a client financial plan with the adviser, live. Apply the adviser's instruction to the document. Respond with JSON ONLY in this shape: {"reply": "a brief, friendly 1-2 sentence summary of exactly what you changed, for the chat", "content": "the COMPLETE revised plan in Markdown (the whole document, not a diff)"}. In "content" keep everything that was already good, apply the requested change, preserve [ADVISOR TO CONFIRM] markers, and keep the Australian SOA style and AUD. If the adviser is only asking a question (not requesting an edit), answer it in "reply" and return the document unchanged in "content".

<CALC_GUARDRAILS>
```

Chat settings: `json: true`, maxTokens 12000, effort `medium`.

**Context text** (`contextToText`, lines 156–259). This is not a prompt, but every plan prompt includes it. Fixed labels:

- `Household: <name> (<type>)`
- `### <First Last>` with Address, Email, Phone, Occupation, DOB (age), Risk profile, Annual income (profile), Partner / Spouse
- Per-person sections in this order: Family & dependants (`[DEPENDENT]`), Assets, Investments, Liabilities, Income, Expenses, Insurance (full policy detail, `EXCLUSIONS:`, `LOADING:`, `ACTION:` upper-cased), Goals, Estate
- `### Joint / Household`
- `Household totals — Assets …, Liabilities …, Net worth …, Annual income …, Annual expenses …, Surplus ….`
- `### Meeting notes and file notes (what was actually discussed)`: budget 14,000 chars, at most 6,000 per transcript
- `### Correspondence already sent to this client`: budget 6,000, at most 2,000 each
- `### Source documents (extracts from uploaded client files)`: budget 12,000, at most 3,000 each

No AI prompts exist for the client profile, insurance report, guides, converters or reset script.

---

### 6. Output structure per document

**Client Profile .docx:** the template's own layout. Filled areas:

- Adviser Name and Date
- Your Details: label, client and spouse columns, plus children/dependants
- Estate planning: Will, testamentary trust, POA, "Date Last Reviewed: …"
- Planned expenditure and goals: short term and long term
- Assets ledger: location, value, owner, TOTAL ASSETS
- Debts ledger: location, balance, bank, fixed/variable, rate %, monthly payment, TOTAL DEBTS
- TOTAL NET WEALTH
- Family protection: 3 answers under 3 questions
- Consent: 7 tick boxes, ☐ changed to ☑
- Signature block: Client Name, Signature, Date

**Insurance Report .docx:**

- Adviser/date row.
- Current cover table. Columns: type (bold), start date, product, life insured, sum insured, owner, premium, premium type, replace.
- Indicative cover table. Same columns without replace.
- Total premium cell, in bold.
- Text is set in Lato 9 pt, colour `2A2A22`, centred.

**Financial plan (markdown):**

- With a master template: one block per template section, in template order. The first block is "Cover, scope & summary" if there is text before the first numbered heading.
- With no template: whatever the single-pass model returns. In stub mode it is `# Financial Plan — <name>`, a stub notice, then Executive Summary, Goals & Objectives, Current Position, Recommendations, Next Steps (lines 567–586).
- Default title: `Financial Plan — <first> <last>`, or `Statement of Advice — …` when `docType='soa'`. The UI uses `Financial Plan — <household>` for couples.

**Plan Word export:**

- Header block: firm name in the accent colour, tagline in grey 10 px, title at 26 px bold, then "Prepared for <client> · <date>".
- The date is formatted `en-US` (for example "October 27, 2026"), in `planRender.js:37`.
- Then the rendered body. H1 and H2 use the accent colour. H3 is `#333333`.

**Combined guide:** front matter (title, document-type table, General Advice Warning, How to use, Contents), then Parts A–D, then Glossary, Legislation, Disclaimer, and "— End of Financial Strategy Guide (General Advice) —".

**reset-for-legacy:** JSON snapshot files and console counts.

---

### 7. Fixed wording inserted

- Profile and report: none added. All wording comes from the template. The only fixed text is the `Date Last Reviewed: ` prefix (`generate-client-profile.mjs:171`), and the error message about the missing template, which names the archived Lakeside template.
- Plan stub text (`planGenerator.js:569-585`), including `> _Generated in offline stub mode (no Anthropic key configured). Set ANTHROPIC_API_KEY for full AI generation._`, a "Review superannuation structure and contribution capacity." recommendation, and "Optimise asset allocation to the stated risk profile."
- Section stub: `_[Offline stub — set ANTHROPIC_API_KEY for AI generation.]_`.
- `[ADVISOR TO CONFIRM]` is required by the prompts.
- Combined guide (`build-combined-guide.mjs:31-98`), all Lakeside-era fixed text:
  - "Prepared by Lakeside Financial Pty Ltd".
  - Licensee "Pareto Group Pty Ltd · ABN … · AFSL No. 418700".
  - A Lakeside phone number (not reproduced here).
  - "Current as at 2025–26 financial year".
  - A long GENERAL ADVICE WARNING.
  - A 16-entry glossary, a legislation list, and a disclaimer naming Lakeside as AR of Pareto Group.
- Banners: `md-to-docx.mjs:77-78` writes "LAKESIDE FINANCIAL" and the default tagline "Advice for life". `export-docx.mjs:26-27`, the guide scripts and `emit-guide-html.mjs` pass `firmName: 'Lakeside Financial'`.
- Firm and licensee constants in `env.js:42-64` (used by the risk SOA, not by `planGenerator.js`):
  - Legacy Risk Advice Pty Ltd, AR 1296611, ABN 22 655 978 046, Toorak address
  - Licensee Synchron Advice Pty Ltd, AFSL 243313, ABN 33 007 207 650
  - Adviser Tristan Biro, AR blank

---

### 8. Decision logic table, then gaps

| Decision | Where | Code or model |
|---|---|---|
| Sectioned or single pass | `planGenerator.js:551` (AI on, template present, ≥3 sections) | Code |
| Section split is valid | `planGenerator.js:487` (3–45 numbered headings) | Code |
| Master template choice | `planGenerator.js:295-299`, `547-549`: newest `kind='plan'` with `is_template='true'` | Code |
| Reference plan choice | `planGenerator.js:300-320`: score is the count of TOPICS found in the **title** only. Top 2 by score, topped up with the most recent. | Code |
| Focus topics | `deriveTopics` lines 271–287: from instructions, occupation, goal names, asset names; "insurance" if any policy; "estate" if will or testamentary trust; age ≥55 adds TTR/retirement; age ≥50 adds contribution/salary sacrifice. **Always adds a "superannuation investment structure retirement" baseline (line 284).** | Code |
| Which strategies to use, all figures, wording | prompts | Model |
| Completeness value | `plans.js:74,107`: 95 if AI else 60 | Code (fixed numbers, not measured) |
| Stub fallback | `ai.js:116-125`: no key **or any error** | Code |
| Client Profile table location | marker regexes, `generate-client-profile.mjs:103,134,162,183,207,262,275,303,318` | Code |
| Profile ledger row matching | `norm()` label match first, extras go into blank rows (lines 225–240) | Code |
| Consent tick | the item's flag is truthy and the row contains ☐ (line 307) | Code |
| Report table identity | `generate-insurance-report.mjs:115-124` | Code |
| Demo data to purge | `reset-for-legacy.mjs:38-42` | Code |

**Gaps**

1. `answers` are dropped. `/plans/generate` reads `answers` (`plans.js:54`) but calls `generatePlanSectioned(ctx, instructions)` (`plans.js:61`). `generatePlanSectioned` falls back to `generatePlan(ctx, instructions)` with no answers (`planGenerator.js:552`), and the sectioned path never uses answers. The answer block (lines 435–440) is unreachable from the routes. The `/interview` endpoint also has no UI caller.
2. The master template query does not filter `doc_type` (`planGenerator.js:297`, `548`). The risk SOA template is meant to be `kind='plan'`, `doc_type='risk_soa'`, `is_template='true'` (README, `riskSoaGenerator.js:69-70`). Once it is imported, the general plan generator will also pick it as its master template.
3. Reference plan candidates are every non-template `kind='plan'` row. That includes archived Lakeside financial plans (`import-reference-material.mjs:78`, `doc_type: 'financial_plan', archived: true`) and risk references. Nothing excludes archived rows.
4. In sectioned mode `ai: true` is returned even if some sections fell back to the stub (`planGenerator.js:536,559`), so completeness shows 95 for a partly stubbed plan.
5. Generated plans are filed as `documents` with `extracted_text` (`generatedDocs.js:23-30`). `gatherClientContext` then reads them back as "Source documents (extracts from uploaded client files)" (lines 66–73). So earlier AI drafts become source facts for the next generation.
6. There is no firm or licensee instruction in the plan prompts. `SYSTEM_PROMPT` says "You MAY reproduce the adviser/firm letterhead and disclaimers from the master template". If the template is Lakeside material, the plan carries Lakeside letterhead. `env.firm` is not passed to `planGenerator.js`.
7. Regenerate overwrites content with no version kept (`plans.js:104-108`).

---

### 9. Figures and calculations

**Code calculations**

- `toAnnual` (`planGenerator.js:4-5`, and the same in `FinancialBreakdown.jsx:12-13`): any unknown or null frequency counts as ×1 (annual).
- `ageFrom` (`planGenerator.js:8-13`): divides by 365.25 days. Can be one year off near a birthday.
- Household totals (`planGenerator.js:193-203`):
  - Assets = assets.value + current_investments.balance.
  - Surplus = annual income − annual expenses.
  - Possible issue: if income is entered gross (the client profile label is "Annual income (inc. bonus)"), "Surplus" ignores tax and overstates spare cash. Insurance premiums are not counted in expenses unless they were entered as an expense. Not confirmed. See §15.
- Investment comparison (`investments.js:43-58`): balance-weighted fee to 3 dp. The test (`api.test.js:75-79`) covers it.
- Client Profile totals (`generate-client-profile.mjs:204,258-265`): sum of parsed numbers. `num()` strips everything except digits, `.` and `-`. A value like "$1.2m" parses as 1.2. A range like "500-600k" parses as `parseFloat("500-600")` = 500. Net wealth = assets − debts. `ratePct` and `monthlyPayment` are written unformatted. `fillValueCells` has an unused `totalRow` parameter (line 245).
- Insurance Report: no calculation. `totalPremium` is a free-text string supplied by hand, so it is not checked against the policy rows.

**Rules stated to the model** (`CALC_GUARDRAILS`) and in the guide glossary. I checked them against legislation as I know it. I did not verify the FY 2026-27 indexed figures.

- s307-125 proportioning, death benefit 15% + 2% Medicare to non-dependants, the 2 ha main residence rule, and the 50% CGT discount match the rules as stated.
- NCC $120,000 for 2024-25 and 2025-26 matches.
- NCC "$130,000 from 1 July 2026" is a forward indexation figure. Its source is not stated. Flagged in-code as "DATE-SENSITIVE — review each FY" (line 329).
- The rule 5 bring-forward description omits the TSB tiers ("a Total Super Balance under the threshold" only).
- Guide glossary (`build-combined-guide.mjs:69-75`): carry-forward needs TSB < $500,000; preservation age 60 for those born on or after 1 July 1964; TBC $2.0M for 2025-26. All are fixed to 2025-26.

**Not suited to a risk-only practice**

- `CALC_GUARDRAILS` rules 2–6: super proportioning, re-contribution, NCC caps, CGT main residence.
- `SYSTEM_PROMPT` strategy list: salary sacrifice, TTR, SMSF, Centrelink, investment structures.
- `QUESTION_SYSTEM_PROMPT` examples: retirement age, retirement income, SMSF.
- `deriveTopics` baseline that always adds superannuation, investment structure and retirement (line 284).
- The stub plan recommendations about super and asset allocation.
- `investments.js` (current vs recommended funds and fee comparison).
- The interview stub (retirement at 65, $80k retirement income).
- `CALC_GUARDRAILS` is also injected into the plan chat (`chat.js:35`), which is used to refine risk SOAs as well.
- All guide content except Part D (insurance).

---

### 10. Where facts come from

| Fact | Source |
|---|---|
| Client personal details, financials, cover | Postgres tables through `gatherClientContext`. Entered by hand in the UI or by document-scan auto-fill. |
| What was discussed | `meeting_transcripts` (content, summary, action_items) |
| What was already sent | the follow-up correspondence table |
| Document extracts | `documents.extracted_text`. Includes earlier generated plans (gap 5). |
| Structure, tone, strategies | the `training_data` master template and 2 reference plans |
| Date of advice | server clock, `en-AU` long date |
| Tax and super thresholds | hard-coded in `CALC_GUARDRAILS`, otherwise the model's own knowledge ("current FY thresholds") |
| Firm, licensee, adviser | `env.js` (not used by the plan generator). Lakeside text is hard-coded in the guide and export scripts. |
| Client Profile and Insurance Report values | a JSON file written by hand. No DB link. |
| Export look | browser localStorage (`fpgod.planTemplate`), default "Your Firm" |

---

### 11. Templates and rendering

- Clone-and-fill (profile and report): JSZip plus regex over `word/document.xml`. Tables are matched with `/<w:tbl>[\s\S]*?<\/w:tbl>/`, which is non-greedy, so a nested table would break the match. Cell styling is kept by copying `tcPr`. The profile copies `rPr` and `pPr`. The report forces Lato 9 pt.
- Template paths: `legacy/templates/Client Profile.docx` and `legacy/templates/Risk Report.docx`. Both NOT FOUND. The code comments say the cell and marker mapping was built against the archived Lakeside templates and must be checked once against the Legacy templates.
- Three different Markdown-to-Word engines are in use:
  1. `html-to-docx` through `renderPlanHtml`: the app export (`plans.js:132`), `export-docx.mjs`, `build-combined-guide.mjs`, `export-guide-docx.mjs`, `export-super-guide-docx.mjs`. The comments in `markdown-to-docx.mjs:14-18`, `build-docx.mjs:2` and `emit-guide-html.mjs:1-2` say html-to-docx output can be rejected by Word ("Word experienced an error trying to open the file") because of schema violations. **The live app's plan export still uses it.**
  2. The `docx` library through `marked` tokens: `markdown-to-docx.mjs`, `build-docx.mjs`.
  3. The `docx` library through a hand-written line parser: `md-to-docx.mjs`.
- Workaround in the code: `emit-guide-html.mjs` writes HTML, which is then opened in Word by hand and re-saved as DOCX or PDF.
- `docx-to-pdf.ps1` exists in `server/scripts/`. Not read; outside this part.

---

### 12. Versioning and history (git, read only)

- Branch `claude/financial-planning-app-8GWYC`, 67 commits. The last commit is f9e6f41 "Weekly checkpoint - Monday 28 September 2026".
- `planGenerator.js`: 6 commits, from f811647 (2026-06-03, first build) to 31941b6 (2026-09-01, "Feed meeting notes and correspondence into the SOA").
- `ai.js`: 2 commits. 16639a6 (2026-08-31) "Move to Claude Opus 5 and adapt the call shape to it". MIGRATION.md says `main` still has the older OpenAI wrapper.
- `planRender.js`: 1 commit, 928fb3e (2026-06-03).
- `env.js`: 7 commits. c879ef4 (2026-08-31) "Stop generated documents going out under the previous firm's AFSL". Last change f9e6f41.
- Client profile and report scripts: created e0e3136 (2026-07-21). Last change 9816441 (2026-08-31) "Archive the last Lakeside templates and set up the Legacy workspace".
- `markdown-to-docx.mjs`: 1 commit, 0e5971e (2026-09-07).
- `md-to-docx`, `build-docx`, `export-docx` and all guide scripts: 1 commit each, e0e3136 (2026-07-21). Unchanged since. All Lakeside-branded.
- `reset-for-legacy.mjs`: 1 commit, c6695f4 (2026-08-31).
- `vitest.config.js`: 5 commits. 0a55fca (2026-08-31) "Stop the test suite writing into the working database". Last change f9e6f41.
- Uncommitted: `server/src/routes/index.js` (+3 lines, the workbench mount), plus a new `routes/workbench.js` and `services/workbench/`.
- No version or history is kept for generated documents. `financial_plans` has no revision table. Regenerate overwrites the row.

---

### 13. Known problems and workarounds

- **`ready={false}` generators:** Client Profile (`client/src/pages/generate/ClientProfile.jsx:11`) and Insurance Report (`InsuranceReport.jsx:11`). Both are waiting for Legacy Word templates. The UI shows the readyNote text in place of a button. The scripts are CLI-only and are not connected to the DB or to any route. Memory `legacy-risk-advice-templates-pending.md` item 3 lists this as outstanding.
- **Adviser AR number:** `env.adviser.ar` defaults to `''` and renders as `[ADVISOR TO CONFIRM]`. Memory item 1 says to set it as one line in `server/.env` (`ADVISER_AR`) when it arrives. MEMORY.md says from 23 Oct 2026 the FSG/AR documents are in `legacy/advisers/tristan-biro/` (not opened). The memory file body may be stale.
- **Blank firm SOA template still pending** (memory item 2). When it is imported, it will also become the general plan generator's master template (§8 gap 2).
- **Lakeside branding:** `md-to-docx.mjs`, `export-docx.mjs`, `build-docx.mjs` (Lakeside colours), `build-combined-guide.mjs`, `emit-guide-html.mjs`, `export-guide-docx.mjs` and `export-super-guide-docx.mjs` all hard-code Lakeside Financial. The combined guide also states the Pareto Group AFSL. Memory `firm-is-legacy-risk-not-lakeside.md` says Lakeside branding on a Legacy document is a compliance breach. `export-docx.mjs:27` also hard-codes a real client couple's name in the tagline `[CLIENT NAMES REDACTED]`.
- **Guide source folder missing:** the scripts read `<repo>/generated-plans/`, which does not exist at the root.
- **Plan export engine:** html-to-docx is still in use. See §11.
- **Plan export date is US format** (`planRender.js:37`, `en-US`).
- **Default export branding** is "Your Firm / Financial Advisory" (`client/src/lib/template.js:15-16`) unless the adviser changed it in the browser.
- **Silent stub on error:** `completeOrStub` turns any API error into stub text. In sectioned mode that stub becomes part of a "complete" plan.
- **Test suite DB:**
  - `server/vitest.config.js` sets `DATABASE_URL` to `TEST_DATABASE_URL` or `postgres://postgres:@localhost:5432/fpgod_test`. It blanks `ANTHROPIC_API_KEY` and redirects `UPLOAD_DIR` to `./uploads-test` and `TASK_STATE_DIR` to `./data-test/task-state`.
  - `fileParallelism: false`, testTimeout 20 s, hookTimeout 30 s.
  - `api.test.js` `beforeAll` applies `schema.sql`. Tests create clients and plans, and import two `training_data` rows (`plan-a`, `plan-b`) into whichever DB is configured.
  - Memory `fpgod-test-suite-writes-to-dev-db.md` still says the tests hit the live `fpgod` database and that the fix "has not been scoped or approved". The config (commit 0a55fca) and the MEMORY.md index line say it is now isolated to `fpgod_test`. The memory file body is stale.
  - Risk: if `TEST_DATABASE_URL` is set to the working DB, the old problem returns.
  - The test user is `postgres` with an empty password, while docker-compose creates user `fpgod`/`fpgod`. They do not match.
  - One test title still says "no OpenAI key" (`api.test.js:81`).
- **`seed.js` truncates** `clients`, `client_groups`, `financial_plans`, `documents`, `training_data` and others (`seed.js:13-16`). Running `npm run db:seed` on the working DB wipes real data. `seed-demo-client.js` does not truncate.
- **`reset-for-legacy.mjs` dry run still writes** a full snapshot of every table, including real client rows, to `archive/lakeside/db-snapshot/`. That folder is inside the repo. Whether it is gitignored was not checked.
- **README** still lists a follow-up email feature and describes the risk SOA as "14 sections" `DEFAULT_SECTIONS`. Memory says the house structure is 12 sections (`legacySoaStructure.js`). That belongs to another part and was not reconciled here.
- **MIGRATION.md** describes the Lakeside-era move (dated 12 Aug 2026). It states the client data belongs to the Lakeside licensee, and that commits were authored with the old firm's domain address. Reference only.
- **Memory note, "worth raising again":** the 32 inherited SOAs contain an unresolved template error string, `include_schedules Err: ... is not defined`, in their body text. It comes from an outside system, not this repo.
- **Memory note:** `.doc` files cannot be extracted; they must be re-saved as `.docx`.
- **Group cover review job** (memory index line only, client redacted): a group cover review for `[CLIENT]` business, under an SGSP/Zurich arrangement at a Category A level of `[AMOUNT REDACTED]` per month. The pack was saved to Downloads. Confirmations from the broker, an outsourced provider and a third insurer are still open. No code, prompt or template for this job exists in the repo. It was done ad hoc in a chat session.
- **10-year premium summary:** NOT FOUND as a generator (see §1).

---

### 14. Dependencies

Key values are never printed here.

- **Runtime:** Node ≥20 (all `package.json` `engines`), PostgreSQL 16 (`docker-compose.yml`, container `fpgod-db`, port 5432, volume `fpgod_pgdata`).
- **Server deps:** `@anthropic-ai/sdk` ^0.69.0, `express` ^4.19.2, `cors`, `morgan`, `dotenv` ^16.4.5, `pg` ^8.12.0, `multer` ^2.1.1, `docx` ^9.5.1, `html-to-docx` ^1.8.0, `marked` ^14.1.4, `mammoth` ^1.8.0, `pdf-parse` ^1.1.1, `xlsx` ^0.18.5.
- **Server dev:** `vitest` ^2.0.5, `supertest` ^7, `eslint` ^9, `nodemon` ^3.1.4.
- **`jszip`:** imported by `generate-client-profile.mjs` and `generate-insurance-report.mjs` but **not listed** in `server/package.json`. It is in `server/node_modules/jszip` only because `html-to-docx` and `docx` both depend on it. Removing either library could break both scripts.
- **Client:** `react` ^18.3.1, `react-dom`, `react-markdown` ^9, `react-router-dom` ^6.26, `vite` ^5.4, `vitest`.
- **Root:** `concurrently`, `cross-env`.
- **Env vars** (names only):
  - `NODE_ENV`, `PORT`, `CORS_ORIGIN`
  - `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSL`, `TEST_DATABASE_URL`
  - `FIRM_NAME`, `FIRM_LEGAL_NAME`, `FIRM_AR`, `FIRM_ABN`, `FIRM_ADDRESS`, `LICENSEE_NAME`, `LICENSEE_AFSL`, `LICENSEE_ABN`
  - `ADVISER_NAME`, `ADVISER_AR`, `ADVISER_EMAIL`, `ADVISER_PHONE`
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5`)
  - `LEGACY_LIBRARY_ROOT`, `LEGACY_LIBRARY_CLIENTS_DIR`, `LEGACY_REPO_ROOT`, `LIBRARY_MAX_FILES`, `LIBRARY_MAX_FILE_MB`, `LIBRARY_MAX_CONTEXT_CHARS`
  - `TASK_STATE_DIR`, `STORAGE_DRIVER`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`
  - two mailbox-scanning app-registration variables, names omitted under the email rule
  - Client: `VITE_API_URL`
- Only `env.example` files were read. `FIRM_*` beyond `FIRM_NAME`, `LICENSEE_*` and `ADVISER_*` are not in `server/.env.example`; they exist only as defaults in `env.js`.
- **External services:** Anthropic Messages API (through `ai.js` only). No other network service in this part.
- **Ports:** API 4000. Vite 5173. In production the API serves the SPA on 4000.

---

### 15. Questions for Tristan

1. Is the general financial plan generator (`/plans/generate`, `planGenerator.js`) still wanted in a risk-only practice? Should the team skill drop it, or rewrite its prompts and guardrails for risk only?
2. Should `CALC_GUARDRAILS` (super, NCC, CGT rules) stay in the chat refinement prompt that edits risk SOAs?
3. Will you supply the Legacy Client Profile and Risk / Insurance Report Word templates? When they arrive, should these generators read from the database, or keep the hand-filled JSON?
4. Who produces the 10-Year Premium Summary that sits in SharePoint client folders today: an insurer quote tool, XPLAN, or by hand? Should the skill generate it? If so, from which premium source and with what indexation and age-step assumptions?
5. Is the group cover review (`[CLIENT]` job) a repeatable document type the skill should cover? If so, what are its sections and sources?
6. Are the Lakeside general-advice guides (super, retirement, estate, insurance) needed at Legacy at all? If yes, should Part D be rebranded under Synchron Advice?
7. Should the Lakeside-era converters (`md-to-docx.mjs`, `export-docx.mjs`, `build-docx.mjs`, the guide scripts) be retired? `export-docx.mjs` also contains a real client name.
8. Should the app's Word export move off `html-to-docx` to the `docx`-based `markdown-to-docx.mjs`? Do you see Word open errors on exported plans today?
9. Is income on file gross or net? (This decides whether the "Surplus" figure in the context is meaningful.)
10. Your AR number: has it arrived? MEMORY.md mentions AR documents in `legacy/advisers/tristan-biro/` from 23 Oct.
11. Should earlier AI-generated plans be excluded from "Source documents" when the next document is generated?
12. Do you want version history kept when a document is regenerated?
13. Is `fpgod_test` created on this machine, and is `TEST_DATABASE_URL` unset? Should the memory file about tests writing to the dev DB be updated or closed?
