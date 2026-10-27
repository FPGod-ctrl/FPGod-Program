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
   e.g. `jane-citizen-oct22`:
   - `<slug>-cds.json`: Initial Meeting Notes. Follow every house rule in
     `legacy/drop/initial-meeting-build/README.md`; the SEP14 rules win. Circumstances only:
     no strategy, sums insured or pricing.
   - `<slug>-ff.json`: Fact Find. The schema is in the docstring of
     `server/scripts/generate_fact_find.py`. Rules, from the firm's Fact Find Process:
     - "Why are you seeking advice", "Your story", goals and scope are written in the
       **second person** ("Jane and John, you wish to review...").
     - Health status defaults to `Good` unless a condition was disclosed.
     - A fact that should be known but wasn't said is `TBC` (it gets highlighted). A whole
       section the meeting never touched gets `not_disclosed`, or `Not disclosed` in cells.
     - Dates of birth are written `5 June 1982 (44)`. Addresses are `STREET` on one line,
       then `SUBURB STATE POSTCODE`, uppercase.
     - Money is `$270,000`. Income, expense, asset and liability totals are added for you.
     - For a single client give one name in `clients`; the partner column is dropped.
   - `<slug>-soa-notes.json`: Draft SOA Notes. The schema is in
     `server/scripts/build_soa_notes.py`. The shape is the firm's own (its existing SOA Notes):
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
  a blanked real 2026 couple fact find (verified clean with `server/scripts/leakscan_docx.py`).
  If it is ever rebuilt from another client's fact find, leak-scan it for that client's names,
  address, phone, email, insurer and figures before use.
- Meeting notes template: `legacy/drop/initial-meeting-build/client-details-summary/templates/`.
