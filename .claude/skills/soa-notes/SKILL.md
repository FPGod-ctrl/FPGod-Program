---
name: soa-notes
description: Stage 3 of the Legacy SOA pipeline. Writes Legacy Risk Advice's SOA Notes, the adviser's brief to the paraplanner ("Hey Howard, ...") and the notes the Statement of Advice is later written from, using the meeting transcript, the fact find and the Initial Meeting Notes. Use when Tristan asks for "SOA notes", "the brief for Howard", "the paraplanner brief", "write up the SOA notes" or "prep the SOA". It runs as the third step, after meeting-notes and fact-find, when Tristan pastes a transcript. It does not write the SOA.
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
---

# SOA Notes (paraplanner brief)

## Purpose

Tell the paraplanner exactly what to research and quote, what documents to gather, and what is still to confirm with the client. Record the adviser's strategy and reasons as the meeting established them. The SOA build later reads these notes **first**, as "the adviser's strategy and reasons". The brief and the SOA Notes are **one document**, laid out like the firm's own SOA Notes.

Firm identity, adviser and staff details, the client data rule, SharePoint read-only, the email rule, folder layout and naming: see `../_shared/firm-settings.md` and `../_shared/firm-rules.md`.

## When to use

- After the meeting, once the transcript is available. Best after the fact find exists.
- As Stage 3 of the Stage 1-3 run (after `meeting-notes` and `fact-find`). The run, the case folder layout and the combined runner are described in `../meeting-notes/SKILL.md`.

## When not to use

- Never write or start the Statement of Advice. That happens only on Tristan's command ("build the SOA for X").
- Never use it to send anything to the paraplanner. Tristan reviews the document; the skill files it in the case folder only and Tristan passes it on (default, Q-SN-13).

## Inputs

| Input | Required? | What to take from it |
|---|---|---|
| Meeting transcript | **Required** (or the fact find, if there is no transcript) | What cover was discussed, sums insured options, waiting and benefit periods, ownership, funding, health, reasons, and what was decided. |
| Fact find (this case) | Strongly preferred | Circumstances shorthand; every `TBC` for the outstanding list. |
| Initial Meeting Notes (this case) | Optional | Goals, reasons, health and underwriting facts; their `TBC` fields, which also go on the outstanding list (default, Q-SN-6). |
| Adviser notes from Tristan | Optional | They take precedence over the transcript. Usually where decisions live. |
| Client names | **Required** | Title line; single or couple. |

Do not read the client's existing file for this document unless Tristan asks.

## Steps

1. **Collect decisions.** From the transcript and adviser notes, list each cover discussed (life, TPD, trauma, income protection), and for each: what was decided, what options were floated, and what is open.
2. **Write the brief** to the paraplanner (see Output §1). One instruction per cover. Name sums insured options, waiting and benefit periods, inside or outside super, and stepped or level, exactly as discussed. What was not discussed follows the decision rules (default, Q-SN-1, Q-SN-8, Q-SN-15).
3. **Write Documents to obtain** (Output §2) (default, Q-SN-7).
4. **Write Still to confirm with the client**: every `TBC` from the fact find and the meeting notes, de-duplicated, in plain words, one per line (default, Q-SN-6).
5. **Write the Financial circumstances shorthand** (Output §4): annual gross figures, the same as the fact find (default, Q-SN-10).
6. **Write the six sections** in the fixed order (Output §5). Only what the meeting established. Anything not decided is `[ADVISER TO CONFIRM]`.
7. **Build** the document (see Tooling), or write it in the exact structure below. In a Stage 1-3 run, build it with the other two through the combined runner.
8. **Run the checks** below.
9. **Hand over**: the file path(s), the list of every `[ADVISER TO CONFIRM]` for Tristan, the outstanding client facts, and the version line (firm-rules §10.2). Say that Tristan reviews it before the paraplanner sees it (default, Q-SN-13). Then stop: finishing this stage never starts `build-soa`.

## Hard rules

- **Never invent a decision.** If the adviser did not decide it, write `[ADVISER TO CONFIRM]`. Never propose a sum insured, insurer, product, waiting period or structure that was not discussed.
- **Never invent a fact.** A client fact that should be known but was not said goes on the "Still to confirm with the client" list in plain words. Where it must also appear in the body (for example the circumstances shorthand), write `[ADVISER TO CONFIRM]` (default, Q-SH-3).
- **One placeholder spelling.** This document uses `[ADVISER TO CONFIRM]` for every gap, the firm-wide spelling (default, Q-SH-3). Spell it `ADVISER`, never `ADVISOR` (only `ADVISER` is highlighted by the builder). `TBC` belongs to the meeting notes and the fact find; do not copy it into this document's body.
- **Goals and Reasons for Seeking Advice state the client's motivations only.** Never name the recommended insurer, product or action there. Those go only in Advice and Recommendations (default, Q-SN-4).
- **Recommendation wording.** In Advice and Recommendations use the firm's SOA recommendation wording: "we recommend implementing...". Never "should", "apply for", "you should apply" or "separate application" (default, Q-SN-9).
- **No premiums or pricing invented.** Quote figures come from the paraplanner later. A premium Tristan stated in the meeting may be recorded as stated.
- **Write in shorthand and bullets**, as the firm's own SOA Notes do. Not polished SOA prose.
- **Never copy facts from another client's SOA Notes**, including any example.
- Australian spelling. AUD.

## Decision rules

| IF | THEN |
|---|---|
| A cover was discussed with a set amount | Brief: quote that amount. Advice and Recommendations: record it as discussed. |
| A cover was discussed with options (for example two sums insured) | Brief: quote each option. |
| A cover was discussed but no amount was set | Brief: `[ADVISER TO CONFIRM]` for the amount, and flag it to Tristan in the handover (default, Q-SN-1). |
| Income protection is in scope | Brief: name the waiting period(s) and benefit period(s) discussed, or `[ADVISER TO CONFIRM]`. |
| Ownership (inside or outside super) was discussed | Brief: quote as discussed. |
| Ownership was not discussed | Brief: ask Howard to quote both inside and outside super (default, Q-SN-8). |
| Premium structure (stepped or level) was discussed | Brief: quote as discussed. |
| Premium structure was not discussed | Brief: `[ADVISER TO CONFIRM]` (default, Q-SN-15). |
| Always | Documents to obtain: existing policy schedules; super statements; quotes; Risk Researcher run; a pre-assessment for each disclosed condition (default, Q-SN-7). |
| The client holds existing cover that could be replaced | Documents to obtain: add a comparison of existing against proposed cover (default, Q-SN-7). |
| A health condition was disclosed | Documents to obtain: a pre-assessment for every disclosed condition, minor ones included (default, Q-SN-14). Health Disclosure: condition, medication and dose, when diagnosed, whether controlled. |
| No condition was disclosed | Health Disclosure: "No health conditions have been disclosed." (default, Q-SN-14) |
| The client was referred | Reasons for Seeking Advice: record the referrer. Referral fee: `[ADVISER TO CONFIRM]` (default, Q-SN-11). |
| Whether a full Insurance Needs Analysis was done | Do not ask or record it at this stage. The SOA build asks Tristan every time (default, Q-SN-5). |
| A recommendation was made in the meeting | Advice and Recommendations: record it using the firm's recommendation wording (default, Q-SN-9). |
| Cover is to be retained unchanged | Advice and Recommendations: record it as retained. |
| Cover is to be cancelled or reduced | Advice and Recommendations: record it, and add to Documents to obtain the current schedule for that policy. |
| Single client | Title: `Statement of Advice Notes - [CLIENT_1]`. |
| Couple | Title: `Statement of Advice Notes - [CLIENT_1] and [CLIENT_2]` (first names). Each cover instruction names the life insured. |
| Transcript and adviser notes differ | Adviser notes win. Report it. |

## Output

**One Word document** (plain Calibri), plus a PDF where the tooling can make one.

File name: `<yyyy.MM.dd> - <Short> - SOA Notes.docx` (same build-date stamp and short name as the fact find).

Where it goes: the case folder `2. Compliance docs (SOA, ROA, EO & Fact Find)/`, in the layout set out in `../meeting-notes/SKILL.md` and firm-settings §8. Never into SharePoint. The skill never sends it; Tristan reviews it and passes it on (default, Q-SN-13).

### Structure, in this order (default, Q-SN-12)

1. **Brief** (no heading). Starts `Hey Howard,` (default, Q-SN-3), blank line, then the instructions: what to quote, cover by cover, with sums insured options, waiting and benefit periods, inside or outside super, stepped or level, and anything to research.
2. **Documents to obtain** (bold heading, ☐ checklist). The five standard items, plus the comparison when existing cover could be replaced (default, Q-SN-7).
3. **Still to confirm with the client** (bold heading, ☐ checklist). Every outstanding client fact from the fact find and the meeting notes, de-duplicated, in plain words: "[CLIENT_1]'s date of birth", "Smoker status for [CLIENT_2]" (default, Q-SN-6).
4. **Financial circumstances** (heading). Shorthand lines, annual gross, same figures as the fact find (default, Q-SN-10):
   ```
   Incomes -
   - [CLIENT_1]: $X gross p.a. PAYG + super
   Property & debt -
   - Home $X, mortgage $X
   Savings -
   Super -
   Estate -
   ```
5. **Title** `Statement of Advice Notes - <first names>`, then these six sections, every time, in this order, headings exactly (default, Q-SN-2):
   1. `Goals`
   2. `Reasons for Seeking Advice`
   3. `Insurance Review and Cover Discussion`
   4. `Cover Funding`
   5. `Health Disclosure`
   6. `Advice and Recommendations`

What goes in each section: `references/sections.md`. A fictional worked example: `references/example.md`.

### Tooling (optional)

On the repo machine: `python server/scripts/build_soa_notes.py <notes.json> <out.docx>`. It lays out the document in the order above and highlights `TBC` and `[ADVISER TO CONFIRM...]` yellow. JSON shape: `references/json-schema.md`. In a Stage 1-3 run, build through `server/scripts/prep-soa-case.ps1` (see `../meeting-notes/SKILL.md`); to build only the SOA Notes, call the builder directly.

## Fixed wording

- `Hey Howard,` (first line) (default, Q-SN-3)
- `Documents to obtain`
- `Still to confirm with the client`
- `Financial circumstances`
- `Statement of Advice Notes - <first names>`
- The six section headings above, exactly (default, Q-SN-2).
- `[ADVISER TO CONFIRM]` (default, Q-SH-3).
- `No health conditions have been disclosed.` (default, Q-SN-14)
- Recommendation verb, where a recommendation is recorded: "we recommend implementing a new <insurer product> policy". Never "apply for", "you should apply", "should", or "separate application" (default, Q-SN-9).

## Checks before handing over

- [ ] Starts with `Hey Howard,`. Every cover discussed has a quote instruction.
- [ ] Each instruction names the life insured, sum insured or options, waiting and benefit periods (IP), ownership (or both, if not discussed), and stepped or level, or flags `[ADVISER TO CONFIRM]`.
- [ ] No sum insured, insurer, product or structure that was not discussed.
- [ ] Goals and Reasons name no recommended insurer, product or action.
- [ ] Every `TBC` in the fact find and the meeting notes appears once in Still to confirm with the client, and nothing there is already known.
- [ ] Documents to obtain has the five standard items, a pre-assessment per disclosed condition, and the comparison where replacement is possible.
- [ ] Six sections, in order, with the exact headings.
- [ ] Every gap in the body is spelled `[ADVISER TO CONFIRM]` and is highlighted. No `TBC` or `ADVISOR` in the body.
- [ ] Circumstances shorthand is annual gross and matches the fact find figures.
- [ ] Recommendation wording uses "we recommend implementing"; no "should" or "separate application".
- [ ] No other client's facts anywhere.
- [ ] Nothing was sent to anyone.

## Decisions taken on defaults

Version 1.0.0 applies the default answer to every open question. Tristan's later answers become 1.1 updates. Search this skill for the tag to find each one.

- In this file: Q-SN-1, Q-SN-2, Q-SN-3, Q-SN-4, Q-SN-5, Q-SN-6, Q-SN-7, Q-SN-8, Q-SN-9, Q-SN-10, Q-SN-11, Q-SN-12, Q-SN-13, Q-SN-14, Q-SN-15.
- In `references/sections.md` and `references/json-schema.md`: the same tags where the rule is repeated. `references/example.md` follows the same defaults (stepped or level flagged, referral fee flagged, no `TBC` in the body).
- Placeholder spelling: `[ADVISER TO CONFIRM]` for every gap in this document (Q-SH-3).
- The questions and their defaults are in the repo at `skills-draft/_questions/soa-notes.md`.
