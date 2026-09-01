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

## Ask before building

- The real stages of a file, in his words, from enquiry to policy in force.
- How work reaches a VA today — email? shared drive? a tool?
- How many VAs, and do they need their own logins, or does he hand off?
- What "ad hoc admin" actually covers.

## Outstanding from the SOA workstream — do not chase in this session

Blank SOA template, his own AR number, and sample quotes / comparisons /
fact finds. All noted; he supplies them when he has access.

## Working notes

- Postgres `fpgod`; tests run against `fpgod_test` — never point them at `fpgod`.
- Client documents under `legacy/drop/` are real PII and gitignored.
- 130 tests, `npm test` from the repo root. Build and lint clean.
- Nothing is pushed; all commits are local on
  `claude/financial-planning-app-8GWYC`.
