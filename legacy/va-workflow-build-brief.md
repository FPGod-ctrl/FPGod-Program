# Build brief — client file handling and VA workflow

Handoff for a fresh session. SOA *generation* is paused; this is a different
workstream. Read this first, then `README.md` for how the app is put together.

## What Legacy actually needs

Overseas VAs write the SOAs and handle ad hoc admin. The app's job is to run the
client file end to end and hand the VA a complete pack — not to write advice.

**Decisions already made (2026-09-01, confirmed by Tristan):**

1. **The handoff is a complete SOA brief pack.** Every input assembled and
   structured in one place — client details, existing cover, meeting notes,
   quotes, comparison, the recommended strategy and the reasoning. The VA writes
   the document from it. The app does not draft prose for this purpose.

2. **The two things costing him most time**, and therefore what to build first:
   - assembling the information for the VA (manual, slow, different every time)
   - tracking VA work and ad hoc admin (what went to whom, what came back,
     what needs checking, what is being chased)

   Note what he did *not* pick: document intake/filing and pipeline visibility
   are real but secondary. Do not lead with them.

3. **XPLAN stays the system of record.** This app assists: intake, the VA
   workflow, and producing the brief. Finished work goes back into XPLAN. Build
   with XPLAN as the destination — `automation/xplan/` and
   `automation/xplan-api/` already exist in this repo and are Legacy-relevant,
   so do NOT archive them with the Lakeside material.

## What already exists and is reusable

- **Clients, households, documents, meeting transcripts, follow-up emails** —
  all modelled, with CRUD routes under `server/src/routes/`.
- **`insurance_policies` now carries full risk detail** — product, owner, life
  insured, inside/outside super, premium structure, waiting and benefit periods,
  definition, features, exclusions, loading, start date and action
  (retain/replace/cancel/new/reduce/increase). This is most of what a brief pack
  needs about cover.
- **`gatherClientContext()`** in `server/src/services/planGenerator.js` already
  assembles the whole client picture — people, financials, family, documents,
  meeting notes and correspondence. **This is the natural backbone of the brief
  pack**; it is already the thing that knows everything about a client.
- **Document upload + AI extraction** (`documentExtractor.js`, `documentScan.js`)
  for PDFs, DOCX, XLSX, CSV, TXT. No `.doc` parser — those must be re-saved.
- **The house SOA structure** (`legacySoaStructure.js`), derived from 32 real
  SOAs. Useful here because it defines exactly what a VA needs to be given.

## What does not exist yet

- Any concept of a **case or file with a status** — there is no workflow model.
  A client is a record, not a file moving through stages.
- Any concept of **assignment** — no VAs, no owners, no "handed to", no
  "came back", no due dates.
- Any **task or admin item** model.
- The **brief pack** itself — no assembler, no output format.

## Suggested first cut, but confirm with him

1. A `cases` model: one client file moving through stages, with the stage list
   taken from how he actually works (ask — do not invent it).
2. An `assignments` / `tasks` model: who has it, what state, what is outstanding.
3. A brief-pack assembler built on `gatherClientContext()`, output as a document
   the VA can work from.

## Answers from Tristan (2026-09-01)

- **Work reaches the VA by email + shared drive.** Instructions by email, files
  on the drive. This split is exactly why assembling a pack is slow, and it
  means the brief pack must be *exportable and sendable*, not just a screen.
- **4+ VAs, each needing their own login.** This is the big one: there is
  currently **no auth in the app at all** — no `jsonwebtoken`/`bcrypt`/
  `passport` dependency, no middleware, every route open. Users, roles and
  authentication have to be built from zero before VAs can touch it. A real
  queue with multiple workers also needs workload visibility.
- **"Ad hoc admin" covers all four categories asked about:** underwriting
  chasing, policy servicing, XPLAN data entry, and client correspondence.
  So the task model is NOT just SOA drafting — it must carry standalone admin
  items with a category, not only work hanging off a case.

### Still open

- **The real stages of a file.** He is walking through them himself, along with
  the different types of input that arrive at each stage. Do not invent a stage
  list — capture his and record it here.

## Working through the process, stage by stage

Rather than design the whole workflow up front, Tristan is walking through each
step and saying what he wants from it. Build them in the order he raises them.

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
against the archived Gary AUG03 transcript. Do not redesign it. What made it
land, and what to preserve in any future document generator:

- **Clone-and-fill his real template**, never rebuild the document.
- **De-garble the transcript the way he does** — the raw text renders ZEISS as
  "ziz", Mount Evelyn Christian School as "Makes maneville and Christian
  school", NEOS as "the neon stuff". Fix the obvious mangling; cross-check
  names against any follow-up email in `archive/lakeside/follow-ups/`.
- **Flag, never invent.** Anything the transcript does not cover is marked
  `[CONFIRM]` and collected into an outstanding list. On these documents the
  gaps are the value — they are the chase list.
- **Reconcile the numbers as a self-check.** The premium components summed to
  the totals Tristan quoted in the meeting, which is what confirmed the
  individual figures had been heard correctly.

### Verifying a generated .docx — do this, not the XML check

Valid XML is **not** sufficient. Word enforces the WordprocessingML schema on
top of it and rejects a schema-invalid file outright with "Word experienced an
error trying to open the file", naming no offending part. A file can pass an
`[xml]` parse, a relationship-integrity check and a `mammoth` extract and still
be unopenable — that happened twice here before it was caught.

Word is installed on this machine, so open the document in it:

```powershell
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
$doc = $word.Documents.Open($path, $false, $true)
$doc.ComputeStatistics(2)  # pages
$doc.Tables.Count
$doc.Close(0); $word.Quit()
```

**`html-to-docx` is the library that produced the broken output. Do not use it.**
`markdown-to-docx.mjs` is built on `docx` instead; the same source produced a
15 KB working file where html-to-docx emitted 303 KB of unopenable padding.

Reuses: `meeting_transcripts` (input already modelled), and the clone-and-fill
`.docx` machinery from `server/scripts/generate-client-profile.mjs`. These are
a **separate type from the follow-up email** in `emailGenerator.js` — same
transcript, different document, different audience. Do not merge them.

**The fact find should also write structured data back to the client file**
(`family_members`, `income_sources`, `expenses`, `assets`, `liabilities`,
`insurance_policies`), not just produce a document. Those are precisely the
tables `gatherClientContext()` reads, so a fact find done at the initial meeting
populates the SOA brief pack for free rather than being re-keyed later.

## Outstanding from the SOA workstream — do not chase in this session

Blank SOA template, his own AR number, and sample quotes / comparisons /
fact finds. All noted; he supplies them when he has access.

## Working notes

- Postgres `fpgod`; tests run against `fpgod_test` — never point them at `fpgod`.
- Client documents under `legacy/drop/` are real PII and gitignored.
- 130 tests, `npm test` from the repo root. Build and lint clean.
- Nothing is pushed; all commits are local on
  `claude/financial-planning-app-8GWYC`.
