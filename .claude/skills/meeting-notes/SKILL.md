---
name: meeting-notes
description: Stages 1-3 of the Legacy SOA pipeline. Turns an initial or review meeting transcript into Legacy Risk Advice's Initial Meeting Notes (the "Client Details Summary"), then runs fact-find and soa-notes so one transcript gives the meeting notes, the 2026 Fact Find and the SOA Notes, filed in a case folder under legacy/soa/. Use when Tristan pastes a meeting transcript, or asks for "initial meeting notes", "meeting notes", "the client details summary", "do the notes from this call", "fo up initial meeting notes" or "prep the SOA". Do NOT use for "initial client notes" or "file notes" (a different table document), and never to write the SOA itself.
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
---

# Initial Meeting Notes (Client Details Summary), and the Stage 1-3 run

## Purpose

Write the firm's record of what the meeting established about the client. The document is the client's **circumstances**: who they are, what they have, what they owe, what cover they hold, their health, and what the money must do. It is read by Tristan, the paraplanner and the underwriter. It is not advice.

This skill is also the entry point for Stages 1-3 of the SOA pipeline (see "The Stage 1-3 run" below).

Firm identity, the client data rule, SharePoint read-only, the email rule, folder layout and naming: see `../_shared/firm-settings.md` and `../_shared/firm-rules.md`. They apply here and are not repeated.

## When to use

- Tristan pastes a transcript. Run the full Stage 1-3 sequence: this skill, then `fact-find`, then `soa-notes`.
- Tristan asks for initial meeting notes, the client details summary, or to "prep the SOA" from a transcript. Same sequence.
- Tristan asks for one document only ("just the meeting notes", "only the fact find"). Build only that one and say the other two were not built.
- Initial meetings **and** review meetings. They use the same document. Do not make a review variant and do not add a meeting-type field.

## When not to use

- "Initial client notes" or "file notes": that is the Initial Client Notes table (label | Client 1 | Client 2). It is out of scope for this skill. Ask Tristan before making one (default, Q-MN-12).
- A client-facing follow-up message. That is a different document with a different voice. Never merge the two.
- The Statement of Advice itself (Stage 4) or the pack (Stage 5). Never start either without Tristan's command.

## The Stage 1-3 run

One transcript in, one case folder out:

```
legacy/soa/<case name>/1. Advice/<YYYY> Advice & Service/
  1. Research, Financials, Medicals, Schedules/      (empty: for the paraplanner)
  2. Compliance docs (SOA, ROA, EO & Fact Find)/
     <First Last> <MONDD> - Initial Meeting Notes.docx + .pdf      (Stage 1, this skill)
     <yyyy.MM.dd> - <Short> - Fact Find.docx + .pdf                (Stage 2, ../fact-find/)
     <yyyy.MM.dd> - <Short> - SOA Notes.docx + .pdf                (Stage 3, ../soa-notes/)
  3. Signed documents - Implemented Audit/           (empty)
```

`<case name>`, `<Short>` and `<First Last> <MONDD>` follow `../_shared/firm-settings.md` §9. `legacy/soa/` is gitignored. Nothing is written to SharePoint; Tristan or Howard moves the folder across by hand. Nothing goes into the app database.

Sequence:

1. **Stage 1, this skill.** Write the meeting notes content (steps below).
2. **Stage 2, `../fact-find/SKILL.md`.** Write the fact find content, consistent with the meeting notes.
3. **Stage 3, `../soa-notes/SKILL.md`.** Write the SOA Notes from the transcript, the fact find and the meeting notes.
4. **Build all three.** On the repo machine, write the three JSON files to `legacy/file-notes/` with one slug (`<first-last>-<monDD>`, lower case), then run the combined runner from the repo root:
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File server/scripts/prep-soa-case.ps1 `
     -Slug <slug> -Client "<case name>" -Short "<Short>" -NotesName "<First Last MONDD>"
   ```
   It reads `<slug>-cds.json`, `<slug>-ff.json` and `<slug>-soa-notes.json`, builds the three `.docx` files into the layout above, exports PDFs (a PDF failure is a warning; the `.docx` is the deliverable) and prints the folder. It dates the fact find and SOA Notes with the run date, which is the house stamp (default, Q-FF-9). The runner is optional: each builder can be run on its own (see each skill's Tooling).
5. **Finish by hand** what the builders cannot do (see `references/json-schema.md` Known limits), then run each skill's checks.
6. **Copy** the meeting notes `.docx` and `.pdf` to Tristan's Downloads folder (`DOWNLOADS`, firm-settings §10) (default, Q-MN-8).
7. **Hand over once** for all three: the folder path, the meeting notes `TBC` list, the fact find `TBC` list and missing totals, the SOA Notes `[ADVISER TO CONFIRM]` items, every contradiction found, and the version line (firm-rules §10.2) naming all three skills.
8. **Stop.** Do not start `build-soa` or `build-pack`. They run only on Tristan's command.

## Inputs

| Input | Required? | What to take from it |
|---|---|---|
| Meeting transcript | **Required** | Every fact in the document. De-garble obvious mis-hearings of names, employers, schools and insurers. If a correction is not obvious, mark the field `TBC`. |
| Meeting date | **Required** | The `MONDD` in the file name. If the date is not given, stop and ask Tristan for it. Never use today's date in its place (default, Q-MN-9). |
| Client names (and partner's) | **Required** | Single vs couple. The name in the file name. A partner with no surname given takes client 1's surname. |
| Adviser notes from Tristan | Optional | Facts and corrections. They take precedence over everything else. |
| Existing client file (latest fact find, insurer schedules, renewal letters) | Only when Tristan names the folder or asks for it | DOB, address, existing cover. Copy files out first (read only; `../case-folder-intake/SKILL.md` has the safe method); never open them in place. Check DOBs against an insurer certificate where there is one. Otherwise work from the transcript only, with gaps as `TBC` (default, Q-MN-5). |
| Firm template `Initial meeting notes.docx` | Optional (needed for tooling) | Layout, fonts, labels. Clone it; never rebuild it. |

Precedence when sources disagree: adviser notes, then the meeting, then older file documents. Report every conflict to Tristan in the handover. Do not resolve it silently (default, Q-MN-14).

## Steps

1. **Check the request.** Confirm it is the Client Details Summary, not the Initial Client Notes table. Confirm single or couple. Confirm the meeting date; if it is missing, stop and ask (default, Q-MN-9).
2. **Gather known facts** only if Tristan named the client folder or asked for it. Copy files out to a working folder. Read only (default, Q-MN-5).
3. **Read the whole transcript once** before writing. List every fact the client actually stated.
4. **Fill the header block** (see Output). Use the formats in `references/house-rules.md` §A.
5. **Write each section** in template order, applying the house rules. Circumstances only.
6. **Decide which sections exist.** A section exists only if it holds real facts from the sources. Apply the decision rules below.
7. **Mark the gaps.** Each fact that should be known but was not said is `TBC`, in the field it belongs to.
8. **Check the figures.** Add up assets and liabilities yourself. Write the net position.
9. **Build the document** on the firm template (see Tooling), or with the other two through the Stage 1-3 runner. If the template is not available, write the content in the exact structure below and tell Tristan it is not on the template.
10. **Run the checks** below. Fix anything that fails.
11. **Copy** the `.docx` and `.pdf` to Downloads (default, Q-MN-8).
12. **Hand over**: the file path(s), the list of `TBC` fields, any contradictions between the sources, and the version line with this skill's version (default, Q-MN-15). In a Stage 1-3 run, continue to `fact-find` and hand over once at the end.

## Hard rules

- **Never invent a fact.** If it should be known but was not said, write `TBC`. `TBC` is this document's house practice for a missing client fact (Tristan's edits, the firm's README and the builder's highlighting), so it is kept here in place of the firm-wide `[ADVISER TO CONFIRM]` (house practice, Q-SH-3). This document records no adviser decisions, so it never needs `[ADVISER TO CONFIRM]`.
- **Never write about the transcript.** No "came through unclearly", "figure unclear on the call", "[CONFIRM spelling]", "stated as X and recorded as Y", "to be confirmed" in prose, or "NOT CAPTURED" added to the end of a sentence. State the fact, or write `TBC`.
- **Never editorialise.** State the fact and stop. Tristan draws the conclusion.
- **Never assert a negative as fact.** Write "No investment properties, shares, managed funds, cash or savings **have been disclosed**", never "are held". Every absence is an absence *of disclosure*.
- **Strategy, structure and pricing stay out.** No indicative sums insured, no premiums, no super-versus-cash-flow funding split, no stepped-versus-level, no rollover rebate, no deductibility argument, no 70%-of-income basis, no argument for a course of action, no intestacy explanation, no "outside the practice's authorisation" disclaimer.
- **No education content.** What Tristan explained in the meeting (trauma versus TPD, stepped versus level, how a rollover premium is paid) is not file-note content. Delete it.
- **No service, remuneration or action lists.** Adviser and client to-do lists are not file-note content.
- **Do not pad a section to justify its heading.** A heading is not a reason to write content.
- **"No binding death benefit nominations discussed." never goes in `Super`.** It is a note about what the meeting did not cover.
- **Never write a closing outstanding list on a normal meeting.** Gaps sit as `TBC` in their fields. The older "`[CONFIRM]` plus outstanding list" rule is retired (default, Q-MN-6). The only exception is in the decision rules.
- **Never copy facts from another client's document**, including any example. Copy form only. This skill carries no real client example. A fictional example will be offered for Tristan's approval; until then work from the rules only (default, Q-MN-13).
- **Do not save the transcript** with the case, in the repo or anywhere else (default, Q-MN-16).
- **Do not put the skill version in the document.** It goes in the handover message only (default, Q-MN-15).
- Australian spelling. AUD.

## Decision rules

| IF | THEN |
|---|---|
| The client is one of a couple | Fill the `Spouse Details` header block directly under the client's, with the same fields and formats. Assume the block is in the template; if it is not, add it by hand, formatted the same as the client block (default, Q-MN-4). Delete the `Family / partner/ dependants:` heading and its content. Children go in `About the client`. |
| The spouse's position on a point mirrors the client's | Write `Same as <spouse first name>.` instead of repeating the detail. |
| The client gave a range but effectively meant one figure | Write one figure. Keep a range only where it is genuinely uncertain. |
| A section has nothing real in it (this includes `Referred from`, `Goals`, `UNDERWRITING`, `Hobbies / pets`, `Height / weight`) | Delete the section and its heading. If the builder leaves the heading behind, delete it by hand before handover (default, Q-MN-1). Test: would this section exist if the document could only use facts? |
| Any template section after the last real section | Delete it. The repeated second block (`About the client`, `Reasons for seeking advice`, `Existing cover`, `Estate Planning`, `Super`) is **always** deleted. |
| The meeting decided to change, cancel, retain or apply for specific cover | Keep `Outcome of meeting`. Facts only, no action lists (default, Q-MN-7). |
| Anything else, including a meeting that only agreed next steps | Delete `Outcome of meeting` (default, Q-MN-7). |
| Underwriting facts were disclosed (condition, medication and dose, when diagnosed, whether controlled, occupation rating still to be set) | Write them under `UNDERWRITING`. Write nothing about sums insured there. Never write content under `Insurance needs`; it is repurposed as `UNDERWRITING`. |
| Current cover is confirmed to exist | Last line of `Current Insurance`: `EXISTING COVER REMAINS IN FORCE` (default, Q-MN-11). |
| Nothing has been confirmed to exist about current cover | Last line of `Current Insurance`: `EXISTING COVER (IF ANY) REMAINS IN FORCE`. The line is always written (default, Q-MN-11). |
| A policy is listed but one of its details is unknown | Write `NOT KNOWN` inside that structured cover listing. This is data about a policy, not a note to self. |
| A field is `TBC` but something partial is known | Keep `TBC` and add one qualifying line. Example: "Both to be explored further however, client has disclosed a healthy BMI for each." |
| The `Employer/self` value is long | Put it on its own line. Leave `Sex` and `Speciality` on the line above. Short values keep all three on one line. |
| School fees are in play | Name the school type: "one child still at **private** school". |
| Cover scope is described | Add "as a minimum": "life plus TPD and income protection as a minimum". It leaves the door open on scope. |
| First-contact enquiry where almost nothing is known, so the gaps are too many or too large to sit in fields | Add a closing list headed `OUTSTANDING - TO BE OBTAINED`. Only in this case (default, Q-MN-6). |
| The client is an existing client and the transcript supports it | Write `Reasons for seeking advice` as a review of existing cover. Do not assume existing-client status from a name match alone. |
| The README rules (SEP10 set) and the SEP14 rules disagree | The SEP14 rules win. They are already applied in this file. |
| A specific fact that should be known was not said (DOB, mobile, smoker status) | `TBC` in its field (default, Q-MN-10). |
| The client said a category is absent, or the category was not raised | "No ... have been disclosed" (default, Q-MN-10). |
| Tempted to write "Not disclosed" | Never in this document. Use one of the two rows above (default, Q-MN-10). |

## Output

**One Word document** (`.docx`) built by the firm's generator on the firm template, plus a PDF copy. A failed PDF is a warning; the `.docx` is the deliverable (default, Q-MN-2).

File name: `<First Last> <MONDD> - Initial Meeting Notes.docx`, with no date prefix. Example: `Jane Citizen OCT22 - Initial Meeting Notes.docx`. `MONDD` is the meeting date, month in capitals (default, Q-MN-2).

Where it goes: the case folder `2. Compliance docs (SOA, ROA, EO & Fact Find)/` in the layout above (firm-settings §8). Then copy the `.docx` and `.pdf` to Tristan's Downloads folder (default, Q-MN-8). Never write into SharePoint.

### Structure, in template order

Write only the parts that exist under the decision rules. Labels are the template's. Bold labels; plain values.

```
CLIENT DETAILS SUMMARY
Name: ...            DOB: dd/mm/yyyy        Address: STREET SUBURB STATE POSTCODE
Mobile: ...          Email: ...             Smoker: N
Sex: ...             Speciality: Industry – Job title     Employer/self: PAYG $000,000 + Super
[Spouse Details – same three lines, couple only]
Referred from
About the client
What is important to you
Reasons for seeking advice
Current Insurance
Financial circumstances
Family / partner/ dependants:      (single client only; deleted for a couple)
Super
Estate Planning
Health
Height / weight
Hobbies / pets
UNDERWRITING
Goals
Outcome of meeting                  (only when advice was given)
```

The header is three lines: Name / DOB / Address; Mobile / Email / Smoker; Sex / Speciality / Employer/self. Each value sits beside its own label. Check the built header by eye before handover (default, Q-MN-3). Section content rules are in `references/house-rules.md` §B.

### Tooling (optional)

On the repo machine, the builder is `server/scripts/generate-client-details-summary.mjs`. It clones the template and inserts content paragraphs after each label, in document order, and highlights `TBC` yellow. Its JSON shape and known limits are in `references/json-schema.md`. In a Stage 1-3 run, build through `server/scripts/prep-soa-case.ps1` (above). Whatever the tooling, the finished document must match the structure and rules in this file. Finish by hand anything the builder cannot do (spouse block, deleting unused headings, header placement, italics) before handing over.

## Fixed wording

Use these exactly. Full list with triggers in `references/house-wording.md`.

- `TBC` (highlighted yellow)
- `EXISTING COVER REMAINS IN FORCE` / `EXISTING COVER (IF ANY) REMAINS IN FORCE`
- `Estimated net position approx. $X.`
- `Same as <spouse>.`
- `... have been disclosed`
- `... as a minimum`
- `NOT KNOWN` (inside a cover listing only)
- `OUTSTANDING - TO BE OBTAINED` (first-contact exception only)

## Checks before handing over

- [ ] No strategy, sums insured, premiums, funding split or education content anywhere.
- [ ] No sentence talks about the transcript or the call quality.
- [ ] No absence is stated as fact; each uses "have been disclosed". "Not disclosed" appears nowhere.
- [ ] Every `TBC` is in the field it belongs to and is highlighted. No closing list (unless first-contact exception).
- [ ] Header: three lines, each value beside its label. DOB `dd/mm/yyyy`; suburb in capitals, no commas; Smoker `N` or `Y`; Speciality uses an en dash; Employer/self has basis and income.
- [ ] Couple: Spouse Details block present; Family heading gone; children in `About the client`.
- [ ] `Financial circumstances` does not repeat incomes or children. Asset total, liability total and net position re-added and correct.
- [ ] No empty section headings left in the document. The repeated second block is gone.
- [ ] `Current Insurance` ends with the `EXISTING COVER ... REMAINS IN FORCE` line.
- [ ] `Outcome of meeting` present only if the meeting decided to change, cancel, retain or apply for specific cover.
- [ ] `Super` does not mention binding nominations not being discussed.
- [ ] No fact from any other client. Names are spelled the same everywhere.
- [ ] File name (no date prefix) and folder follow the Output section. `.docx` and `.pdf` copied to Downloads.
- [ ] Handover states the skill version. The transcript was not saved.

## Decisions taken on defaults

Version 1.0.0 applies the default answer to every open question. Tristan's later answers become 1.1 updates. Search this skill for the tag to find each one.

- In this file: Q-MN-1, Q-MN-2, Q-MN-3, Q-MN-4, Q-MN-5, Q-MN-6, Q-MN-7, Q-MN-8, Q-MN-9, Q-MN-10, Q-MN-11, Q-MN-12, Q-MN-13, Q-MN-14, Q-MN-15, Q-MN-16; Q-FF-9 (run date stamp, shared with fact-find).
- In `references/house-rules.md`: Q-MN-1, Q-MN-3, Q-MN-4, Q-MN-5, Q-MN-6, Q-MN-7, Q-MN-10, Q-MN-11, Q-SH-3.
- In `references/house-wording.md`: Q-MN-10, Q-MN-11.
- In `references/json-schema.md`: Q-MN-1, Q-MN-3, Q-MN-4.
- Placeholder spelling: `TBC` kept as house practice (Q-SH-3).
- The questions and their defaults are in the repo at `skills-draft/_questions/meeting-notes.md`.
