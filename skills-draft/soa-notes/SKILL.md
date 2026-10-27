---
name: soa-notes
description: Writes Legacy Risk Advice's SOA Notes, the adviser's brief to the paraplanner ("Hey Howard, ...") and the notes the Statement of Advice is later written from. Uses the meeting transcript, the fact find and the Initial Meeting Notes. Use when Tristan asks for "SOA notes", "the brief for Howard", "the paraplanner brief", "write up the SOA notes" or "prep the SOA" (third step, after meeting-notes and fact-find). It does not write the SOA.
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# SOA Notes (paraplanner brief)

## Purpose

Tell the paraplanner exactly what to research and quote, what documents to gather, and what is still to confirm with the client. Record the adviser's strategy and reasons as the meeting established them. The SOA build later reads these notes **first**, as "the adviser's strategy and reasons". The brief and the SOA Notes are **one document**, laid out like the firm's own SOA Notes.

Firm identity, adviser and staff details, the client data rule, SharePoint read-only, the email rule, folder layout and naming: see `../_shared/firm-settings.md` and `../_shared/firm-rules.md`.

## When to use

- After the meeting, once the transcript is available. Best after the fact find exists.
- As the third step of "prep the SOA".

## When not to use

- Never write or start the Statement of Advice. That happens only on Tristan's command ("build the SOA for X").
- Never use it to send anything to the paraplanner. The document is filed; Tristan passes it on [Q-SN-13].

## Inputs

| Input | Required? | What to take from it |
|---|---|---|
| Meeting transcript | **Required** (or the fact find, if there is no transcript) | What cover was discussed, sums insured options, waiting and benefit periods, ownership, funding, health, reasons, and what was decided. |
| Fact find (this case) | Strongly preferred | Circumstances shorthand; every `TBC` for the outstanding list. |
| Initial Meeting Notes (this case) | Optional | Goals, reasons, health and underwriting facts; their `TBC` fields [Q-SN-6]. |
| Adviser notes from Tristan | Optional | They take precedence over the transcript. Usually where decisions live. |
| Client names | **Required** | Title line; single or couple. |

Do not read the client's existing file for this document unless Tristan asks.

## Steps

1. **Collect decisions.** From the transcript and adviser notes, list each cover discussed (life, TPD, trauma, income protection), and for each: what was decided, what options were floated, and what is open.
2. **Write the brief** to the paraplanner (see Output §1). One instruction per cover. Name sums insured options, waiting and benefit periods, and inside or outside super, exactly as discussed [Q-SN-1] [Q-SN-8].
3. **Write Documents to obtain** (Output §2).
4. **Write Still to confirm with the client**: every `TBC` from the fact find (and meeting notes), in plain words, one per line [Q-SN-6].
5. **Write the Financial circumstances shorthand** (Output §4).
6. **Write the six sections** in the fixed order (Output §5). Only what the meeting established. Anything not decided is `[ADVISER TO CONFIRM]`.
7. **Build** the document (see Tooling), or write it in the exact structure below.
8. **Run the checks** below.
9. **Hand over**: the file path(s), the list of `[ADVISER TO CONFIRM]` items for Tristan, and the outstanding client facts. Tristan reviews before the paraplanner sees it [Q-SN-13].

## Hard rules

- **Never invent a decision.** If the adviser did not decide it, write `[ADVISER TO CONFIRM]`. Never propose a sum insured, insurer, product, waiting period or structure that was not discussed.
- **Never invent a fact.** A client fact that should be known but was not said is `TBC`.
- **Two flags, two meanings.** `TBC` = a client fact still to get. `[ADVISER TO CONFIRM]` = an adviser decision still to make. Spell it `ADVISER`, never `ADVISOR` (only `ADVISER` is highlighted by the builder). `../_shared/firm-rules.md` §5.2 uses `[ADVISER TO CONFIRM]` for every gap; this skill keeps the two-flag split (as the builder and the current rules do) until [Q-SH-3] is answered.
- **Goals and Reasons for Seeking Advice state the client's motivations only.** Never name the recommended insurer, product or action there. Those go in Advice and Recommendations [Q-SN-4].
- **No premiums or pricing invented.** Quote figures come from the paraplanner later. A premium Tristan stated in the meeting may be recorded as stated.
- **Write in shorthand and bullets**, as the firm's own SOA Notes do. Not polished SOA prose.
- **Never copy facts from another client's SOA Notes**, including any example.
- Australian spelling. AUD.

## Decision rules

| IF | THEN |
|---|---|
| A cover was discussed with a set amount | Brief: quote that amount. Advice and Recommendations: record it as discussed. |
| A cover was discussed with options (for example two sums insured) | Brief: quote each option. |
| A cover was discussed but no amount was set | Brief: `[ADVISER TO CONFIRM]` for the amount [Q-SN-1]. |
| Income protection is in scope | Brief: name the waiting period(s) and benefit period(s) discussed, or `[ADVISER TO CONFIRM]`. |
| Ownership (inside or outside super) was discussed | Brief: quote as discussed. |
| Ownership was not discussed | Brief: ask for both inside and outside super [Q-SN-8]. |
| Premium structure (stepped or level) was discussed | Brief: quote as discussed. Otherwise `[ADVISER TO CONFIRM]` [Q-SN-15]. |
| The client holds existing cover | Documents to obtain: current policy schedules. If replacement is possible: a comparison of existing against proposed cover in the research [Q-SN-7]. |
| A health condition was disclosed | Documents to obtain: a pre-assessment for each disclosed condition [Q-SN-14]. Health Disclosure: condition, medication and dose, when diagnosed, whether controlled. |
| No condition was disclosed | Health Disclosure: "No health conditions have been disclosed." (absence of disclosure, as in the meeting notes) [Q-SN-14] |
| The client was referred | Reasons for Seeking Advice: record the referrer. Referral fee: `[ADVISER TO CONFIRM]` [Q-SN-11]. |
| Whether a full Insurance Needs Analysis was done | Do not ask at this stage. The SOA build asks Tristan every time [Q-SN-5]. |
| A recommendation was made in the meeting | Advice and Recommendations: record it using the firm's recommendation wording (see Fixed wording) [Q-SN-9]. |
| Cover is to be retained unchanged | Advice and Recommendations: record it as retained. |
| Cover is to be cancelled or reduced | Advice and Recommendations: record it, and add to Documents to obtain the current schedule for that policy. |
| Single client | Title: `Statement of Advice Notes - [CLIENT_1]`. |
| Couple | Title: `Statement of Advice Notes - [CLIENT_1] and [CLIENT_2]` (first names). Each cover instruction names the life insured. |
| Transcript and adviser notes differ | Adviser notes win. Report it. |

## Output

**One Word document** (plain Calibri), plus a PDF where the tooling can make one.

File name: `<yyyy.MM.dd> - <Short> - SOA Notes.docx` (same date stamp and short name as the fact find).

Where it goes: the case folder `2. Compliance docs (SOA, ROA, EO & Fact Find)/`, layout per `../_shared/firm-rules.md`. Never into SharePoint.

### Structure, in this order [Q-SN-12]

1. **Brief** (no heading). Starts `Hey Howard,` [Q-SN-3], blank line, then the instructions: what to quote, cover by cover, with sums insured options, waiting and benefit periods, inside or outside super, and anything to research.
2. **Documents to obtain** (bold heading, ☐ checklist). Standard items: existing policy schedules; super statements; quotes; Risk Researcher run; pre-assessments for any disclosed condition [Q-SN-7].
3. **Still to confirm with the client** (bold heading, ☐ checklist). Every outstanding client fact in plain words: "[CLIENT_1]'s date of birth", "Smoker status for [CLIENT_2]".
4. **Financial circumstances** (heading). Shorthand lines:
   ```
   Incomes -
   - [CLIENT_1]: $X gross p.a. PAYG + super
   Property & debt -
   - Home $X, mortgage $X
   Savings -
   Super -
   Estate -
   ```
   [Q-SN-10]
5. **Title** `Statement of Advice Notes - <first names>`, then six sections, headings exactly:
   1. `Goals`
   2. `Reasons for Seeking Advice`
   3. `Insurance Review and Cover Discussion`
   4. `Cover Funding`
   5. `Health Disclosure`
   6. `Advice and Recommendations`
   [Q-SN-2]

What goes in each section: `references/sections.md`. A fictional worked example: `references/example.md`.

### Tooling (optional)

On the repo machine: `python server/scripts/build_soa_notes.py <notes.json> <out.docx>`. It lays out the document in the order above and highlights `TBC` and `[ADVISER TO CONFIRM...]` yellow. JSON shape: `references/json-schema.md`. The combined runner `prep-soa-case.ps1` needs all three stage files; to build only the SOA Notes, call the builder directly.

## Fixed wording

- `Hey Howard,` (first line) [Q-SN-3]
- `Documents to obtain`
- `Still to confirm with the client`
- `Financial circumstances`
- `Statement of Advice Notes - <first names>`
- The six section headings above, exactly.
- `[ADVISER TO CONFIRM]` and `TBC`.
- Recommendation verb, where a recommendation is recorded: "we recommend implementing a new <insurer product> policy". Never "apply for", "you should apply", "should", or "separate application" [Q-SN-9].

## Checks before handing over

- [ ] Starts with `Hey Howard,`. Every cover discussed has a quote instruction.
- [ ] Each instruction names the life insured, sum insured or options, waiting and benefit periods (IP), and ownership, or flags `[ADVISER TO CONFIRM]`.
- [ ] No sum insured, insurer, product or structure that was not discussed.
- [ ] Goals and Reasons name no recommended insurer, product or action.
- [ ] Every `TBC` in the fact find appears in Still to confirm with the client, and nothing there is already known.
- [ ] Documents to obtain covers schedules, super statements, quotes, research, and a pre-assessment per disclosed condition.
- [ ] Six sections, in order, with the exact headings.
- [ ] Every flag is spelled `[ADVISER TO CONFIRM]` or `TBC`, and is highlighted.
- [ ] Circumstances shorthand matches the fact find figures.
- [ ] No other client's facts anywhere.

## Open questions

In this file: [Q-SN-1] to [Q-SN-15]. See `../_questions/soa-notes.md`.
