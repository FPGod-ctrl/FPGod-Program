---
name: fact-find
description: Fills Legacy Risk Advice's 2026 Fact Find (the XPLAN/Opex form) from a meeting transcript, plus the Initial Meeting Notes if they exist. Records the client's full circumstances on the house form, in the client's voice, without pre-empting the advice. Use when Tristan asks to "do the fact find", "fill the fact find", "fact find from this transcript" or "update the fact find". It is the second step when he asks to "prep the SOA" from a transcript.
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# 2026 Fact Find

## Purpose

Capture the client's circumstances on the firm's 2026 Fact Find form: why they want advice, their story, goals, personal and contact details, dependants, employment, health, cashflow, assets, liabilities, super, existing insurance, estate planning, and the agreed scope of advice. The fact find is **the client's record of what they asked for**. The SOA must answer it, so it must never pre-empt the recommendation.

Firm identity, adviser details, the client data rule, SharePoint read-only, the email rule, folder layout and naming: see `../_shared/firm-settings.md` and `../_shared/firm-rules.md`.

## When to use

- After an initial or review meeting, once the transcript is available.
- As step two of "prep the SOA" (after `meeting-notes`, before `soa-notes`).
- Initial and review meetings use the same form. For a review client, see the decision rules [Q-FF-7].

## When not to use

- Do not use it to write the SOA, and never start the SOA without Tristan's command.
- Do not edit a fact find the paraplanner has already corrected in the client file. That copy is the record [Q-FF-13].

## Inputs

| Input | Required? | What to take from it |
|---|---|---|
| Meeting transcript | **Required** | Every fact on the form. |
| Client names and preferred names | **Required** | Column headers (preferred first names), full names (cover table, signatories). Single or couple. |
| Meeting date | **Required** | `Date Completed`, the age in each DOB [Q-FF-8], and the file date stamp [Q-FF-9]. Ask if missing. |
| Initial Meeting Notes (this case) | Optional | Use to stay consistent. If they differ from the transcript, the transcript wins and you report the difference. |
| Adviser notes from Tristan | Optional | They take precedence over the transcript. |
| Existing client file (previous signed fact find, insurer schedules, renewal letters) | Optional [Q-FF-12] | DOBs, address, existing cover, super. Copy out first; read only. Check DOBs against an insurer certificate where there is one. The fact find can be wrong. |
| The SOA's Executive summary and Scope (only if the SOA already exists) | Optional | Copy word for word into Scope of advice and Agreed scope [Q-FF-3]. |
| Firm master `Fact Find - master.docx` | Optional (needed for tooling) | The form. Clone and fill; never rebuild. |

## Steps

1. **Confirm** single or couple, the preferred names, the full names and the meeting date.
2. **Gather known facts** from the client file if available and allowed [Q-FF-12]. Copy files out. Read only.
3. **Read the whole transcript** and list every stated fact under the form's sections (see `references/form-sections.md`).
4. **Write the "about the advice" boxes first**: Why are you seeking advice, Your story, goals, Scope of advice, Agreed scope. Second person. No product (see Hard rules).
5. **Fill the data sections** in form order. Write `TBC` for each fact that should be known but was not said.
6. **Tick the Not applicable / Not disclosed box** for each section the meeting never touched [Q-FF-11].
7. **Fill About our advice**: Scope of advice, Agreed scope of advice, Incomplete or inaccurate information, Adviser expertise. Leave Advice limitations as the master's wording [Q-FF-17].
8. **Fill the cover table and the client signatory names.** Check the adviser signatory [Q-FF-1].
9. **Single client:** remove the partner column from every per-client table and the partner signatory columns.
10. **Build** on the master (see Tooling). Without the master, write the content in the form's section order and tell Tristan it is not on the form.
11. **Run the checks** below.
12. **Hand over**: the file path(s), the list of every `TBC` in plain words, and every contradiction between the transcript, the meeting notes and the client file. Name any fact the SOA must also carry (for example "Will in place: Yes").

## Hard rules

- **Never invent a fact.** If it should be known but was not said, write `TBC`. Note: `../_shared/firm-rules.md` §5.2 says `[ADVISER TO CONFIRM]` for a missing fact. The firm's Fact Find Process and the builder use `TBC` (highlighted), so this skill keeps `TBC` for client facts until [Q-SH-3] is answered.
- **Second person** for "Why are you seeking advice", "Your story", goals and scope: "[CLIENT_1] and [CLIENT_2], you wish to review...".
- **Why are you seeking advice = the client's motivation only.** No product, no insurer as the answer, no "top up", no "cancel".
- **Goals: one broad goal per client.** No insurer names, no product, no exclusion acknowledgements. Example of the form: "Review Income protection coverage and implement a cost effective strategy moving forward in line with 70% of your income." | Short Term | [AMOUNT] per month | High [Q-FF-15].
- **Scope: list the advice areas, never the outcome.** Right: "Review of your income protection insurance." / "Implement a new cost-effective income protection strategy." Wrong: "Implementation of new [INSURER_A] [PRODUCT] cover of [AMOUNT] per month" / "Cancellation of your [INSURER_B] policy".
- **Dates of birth:** `5 June 1982 (44)`. The bracket is the age [Q-FF-8].
- **Addresses:** `STREET` on one line, then `SUBURB STATE POSTCODE`, in capitals.
- **Money:** `$270,000`. Whole dollars, comma thousands, `$` sign, nothing after the number in an amount cell [Q-FF-4].
- **Never write a Total row** when the builder is used. It adds totals itself. Without the builder, add the Total row yourself and check it.
- **Health status is `Good`** unless a condition was disclosed [Q-FF-5].
- **Never copy facts from another client's fact find**, including the master's origin client and any previous case.
- **Never write into the client file in SharePoint.**
- Australian spelling. AUD.

## Decision rules

| IF | THEN |
|---|---|
| A fact should be known but was not said | `TBC` in the cell (highlighted yellow). |
| A whole section was never discussed | Tick **Not disclosed** for that section; leave its table empty [Q-FF-11]. |
| The section cannot apply to this client (for example no dependants, confirmed) | Tick **Not applicable** [Q-FF-11]. |
| Single client | One name in `clients`. Partner column dropped from every per-client table. Partner signatory columns dropped. |
| Couple | Per-client tables are `label | client 1 | client 2`. Column headers are the preferred first names. |
| A condition was disclosed | Health status states it (condition, medication, when diagnosed, whether controlled). Not `Good`. |
| Nothing was said about health | `Good` [Q-FF-5]. |
| Nothing was said about incomplete information | `None` [Q-FF-6]. |
| Nothing was said about adviser expertise | `Yes` [Q-FF-6]. |
| An amount is given monthly and others annually | Write every amount in the same frequency within a table [Q-FF-4]. Put the frequency in the description, never in the amount cell. |
| An amount is unknown | `TBC`. Note: one non-number in an amount column means the builder writes no Total. Tell Tristan which totals are missing. |
| The SOA already exists (written with or before this fact find) | Scope of advice summary = the SOA Executive summary "Why you are seeking advice" paragraphs, **word for word**. Agreed scope = the SOA "Scope of our advice → Included" bullets, **word for word** [Q-FF-3]. |
| No SOA yet (normal Stage 2) | Scope of advice = the "Why are you seeking advice" text. Agreed scope = the advice areas agreed in the meeting, as areas, not outcomes. |
| Agreed scope is filled | Start with the fixed lead-in (see Fixed wording) [Q-FF-2]. |
| Review client with a previous signed fact find | [Q-FF-7]. Until answered: build from the transcript on the current master, using the previous fact find only as known facts. Fill "Any changes" boxes with what changed, or "No change" where the client confirmed nothing changed. |
| The master's adviser signatory names another adviser | [Q-FF-1]. Until answered: the adviser is Tristan Biro (see `../_shared/firm-settings.md`); correct the adviser signatory after building and say so in the handover. |
| The paraplanner has already corrected the fact find in the client file | Do not overwrite it. Their copy is the record [Q-FF-13]. |
| Transcript and Initial Meeting Notes differ | The transcript wins. Report it. |
| Transcript and older client file differ | The meeting wins. Report it. |

## Output

**One Word document** on the 2026 master, plus a PDF where the tooling can make one. A failed PDF is a warning; the `.docx` is the deliverable.

File name: `<yyyy.MM.dd> - <Short> - Fact Find.docx`, where `<Short>` is the firm's short client name (for example `[SURNAME] [F]&[S]`). The date stamp is [Q-FF-9].

Where it goes: the case folder `2. Compliance docs (SOA, ROA, EO & Fact Find)/`, in the layout set by `../_shared/firm-rules.md`. Never into SharePoint; Tristan or the paraplanner moves the folder across.

Structure: the master's sections in the master's order. Section list, data keys, suggested row labels and what goes in each: `references/form-sections.md`.

### Tooling (optional)

On the repo machine: `python server/scripts/generate_fact_find.py <data.json> <out.docx>`. It opens the master, finds each table by the Heading 1 / Heading 2 above it, rebuilds rows from the JSON, adds totals, highlights `TBC`, ticks boxes, fills the cover table and client signatories, and drops the partner column for a single client. JSON shape and known limits: `references/json-schema.md`. The combined runner `prep-soa-case.ps1` needs all three stage files; to build only the fact find, call the builder directly.

## Fixed wording

Exact text. Triggers in `references/house-wording.md`.

- Agreed scope lead-in: `As a result of the agreed subject matter of advice, we have identified the scope of advice to be:` then the bullet `Review of your personal risk insurance needs: ` then one bullet per agreed area [Q-FF-2].
- `TBC` (highlighted yellow).
- `Not disclosed` (in a cell, when a single item was not disclosed).
- `Good` (health default), `None` (incomplete information default), `Yes` (adviser expertise default).
- `Total` (row label, added by the builder).
- Advice limitations: the master's own wording, unchanged [Q-FF-17].

## Checks before handing over

- [ ] Why, story, goals and scope are in the second person.
- [ ] No insurer, product, "top up", "cancel" or sum insured in Why, goals or scope. Scope lists areas, not outcomes.
- [ ] One broad goal per client; timeframe, amount and priority filled.
- [ ] DOBs read `5 June 1982 (44)` with the right age. Addresses are two lines in capitals.
- [ ] Every amount is `$n,nnn` with nothing after it. Frequencies are not mixed in one table. Totals present for income, expenses, assets and liabilities, or the missing ones are named in the handover.
- [ ] Every `TBC` is a fact that should be known. Every untouched section has its box ticked.
- [ ] Single client: no partner column anywhere, no partner signatory.
- [ ] Cover table: full names joined with `&`, Date Completed filled.
- [ ] Adviser signatory checked [Q-FF-1].
- [ ] No other client's name, address, insurer, policy number or figures anywhere in the document (including the XPLAN "Sample client:" debug text) [Q-FF-14].
- [ ] Pages render cleanly (check the PDF).

## Open questions

In this file: [Q-FF-1], [Q-FF-2], [Q-FF-3], [Q-FF-4], [Q-FF-5], [Q-FF-6], [Q-FF-7], [Q-FF-8], [Q-FF-9], [Q-FF-11], [Q-FF-12], [Q-FF-13], [Q-FF-14], [Q-FF-15], [Q-FF-17]. In `references/form-sections.md`: [Q-FF-10]. Not tied to one line: [Q-FF-16] (write-back to the client tables). See `../_questions/fact-find.md`.
