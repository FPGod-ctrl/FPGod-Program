---
name: meeting-notes
description: Turns an initial or review meeting transcript into Legacy Risk Advice's Initial Meeting Notes (the "Client Details Summary") Word document. It records the client's circumstances only, with no strategy, sums insured or pricing. Use when Tristan pastes a meeting transcript and asks for "initial meeting notes", "meeting notes", "the client details summary", "do the notes from this call" or "fo up initial meeting notes". It is also the first step when he asks to "prep the SOA" from a transcript. Do NOT use for "initial client notes" or "file notes" (that is a different table document).
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# Initial Meeting Notes (Client Details Summary)

## Purpose

Write the firm's record of what the meeting established about the client. The document is the client's **circumstances**: who they are, what they have, what they owe, what cover they hold, their health, and what the money must do. It is read by Tristan, the paraplanner and the underwriter. It is not advice.

Firm identity, the client data rule, SharePoint read-only, the email rule, folder layout and naming: see `../_shared/firm-settings.md` and `../_shared/firm-rules.md`. They apply here and are not repeated.

## When to use

- Tristan pastes a transcript and asks for initial meeting notes or the client details summary.
- Tristan asks to "prep the SOA" from a transcript. Run this skill first, then `fact-find`, then `soa-notes`.
- Initial meetings **and** review meetings. They use the same document. Do not make a review variant and do not add a meeting-type field.

## When not to use

- "Initial client notes" or "file notes": that is the Initial Client Notes table (label | Client 1 | Client 2). Not covered by this skill [Q-MN-12].
- A client-facing follow-up message. That is a different document with a different voice. Never merge the two.
- The Statement of Advice itself. Never start an SOA without Tristan's command.

## Inputs

| Input | Required? | What to take from it |
|---|---|---|
| Meeting transcript | **Required** | Every fact in the document. De-garble obvious mis-hearings of names, employers, schools and insurers. If a correction is not obvious, mark the field `TBC`. |
| Meeting date | **Required** | The `MONDD` in the file name and the advice year folder. If missing, ask Tristan [Q-MN-9]. |
| Client names (and partner's) | **Required** | Single vs couple. The name in the file name. A partner with no surname given takes client 1's surname. |
| Adviser notes from Tristan | Optional | Facts and corrections. They take precedence over the transcript. |
| Existing client file (latest fact find, insurer schedules, renewal letters) | Optional [Q-MN-5] | DOB, address, existing cover. Copy files out first; never open them in place for writing. Check DOBs against an insurer certificate where there is one. The meeting wins where it differs from older documents. |
| Firm template `Initial meeting notes.docx` | Optional (needed for tooling) | Layout, fonts, labels. Clone it; never rebuild it. |

Precedence when sources disagree: adviser notes, then the meeting, then older file documents [Q-MN-14]. Report every contradiction to Tristan in the handover. Do not resolve it silently.

## Steps

1. **Check the request.** Confirm it is the Client Details Summary, not the Initial Client Notes table. Confirm single or couple. Confirm the meeting date.
2. **Gather known facts** if an existing client file is available and allowed [Q-MN-5]. Copy files out to a scratch folder. Read only.
3. **Read the whole transcript once** before writing. List every fact the client actually stated.
4. **Fill the header block** (see Output). Use the formats in `references/house-rules.md` §A.
5. **Write each section** in template order, applying the house rules. Circumstances only.
6. **Decide which sections exist.** A section exists only if it holds real facts from the sources. Apply the decision rules below.
7. **Mark the gaps.** Each fact that should be known but was not said is `TBC`, in the field it belongs to.
8. **Check the figures.** Add up assets and liabilities yourself. Write the net position.
9. **Build the document** on the firm template (see Tooling). If the template is not available, write the content in the exact structure below and tell Tristan it is not on the template.
10. **Run the checks** below. Fix anything that fails.
11. **Hand over**: the file path(s), the list of `TBC` fields, and any contradictions between the transcript and the client file.

## Hard rules

- **Never invent a fact.** If it should be known but was not said, write `TBC`. Note: `../_shared/firm-rules.md` §5.2 says `[ADVISER TO CONFIRM]` for a missing fact. This document's house rules (Tristan's edits) and its builder use `TBC`, so this skill keeps `TBC` until [Q-SH-3] is answered.
- **Never write about the transcript.** No "came through unclearly", "figure unclear on the call", "[CONFIRM spelling]", "stated as X and recorded as Y", "to be confirmed" in prose, or "NOT CAPTURED" added to the end of a sentence. State the fact, or write `TBC`.
- **Never editorialise.** State the fact and stop. Tristan draws the conclusion.
- **Never assert a negative as fact.** Write "No investment properties, shares, managed funds, cash or savings **have been disclosed**", never "are held". Every absence is an absence *of disclosure*.
- **Strategy, structure and pricing stay out.** No indicative sums insured, no premiums, no super-versus-cash-flow funding split, no stepped-versus-level, no rollover rebate, no deductibility argument, no 70%-of-income basis, no argument for a course of action, no intestacy explanation, no "outside the practice's authorisation" disclaimer.
- **No education content.** What Tristan explained in the meeting (trauma versus TPD, stepped versus level, how a rollover premium is paid) is not file-note content. Delete it.
- **No service, remuneration or action lists.** Adviser and client to-do lists are not file-note content.
- **Do not pad a section to justify its heading.** A heading is not a reason to write content.
- **"No binding death benefit nominations discussed." never goes in `Super`.** It is a note about what the meeting did not cover.
- **Never write a closing outstanding list on a normal meeting.** Gaps sit as `TBC` in their fields. The only exception is in the decision rules.
- **Never copy facts from another client's document**, including any example. Copy form only.
- Australian spelling. AUD.

## Decision rules

| IF | THEN |
|---|---|
| The client is one of a couple | Add a `Spouse Details` header block directly under the client's, with the same fields and formats [Q-MN-4]. Delete the `Family / partner/ dependants:` heading and its content. Children go in `About the client`. |
| The spouse's position on a point mirrors the client's | Write `Same as <spouse first name>.` instead of repeating the detail. |
| The client gave a range but effectively meant one figure | Write one figure. Keep a range only where it is genuinely uncertain. |
| A section has nothing real in it (this includes `Goals`, `UNDERWRITING`, `Hobbies / pets`, `Height / weight`) | Delete the section and its heading [Q-MN-1]. Test: would this section exist if the draft could only use facts? |
| Any template section after the last real section | Delete it. The repeated second block (`About the client`, `Reasons for seeking advice`, `Existing cover`, `Estate Planning`, `Super`) is **always** deleted. |
| No advice was given in the meeting (even if next steps were agreed) | Delete `Outcome of meeting`. |
| The meeting decided something advice-bearing (for example a review that agreed to change or cancel cover) | Keep `Outcome of meeting`, facts only [Q-MN-7]. |
| Underwriting facts were disclosed (condition, medication and dose, when diagnosed, whether controlled, occupation rating still to be set) | Write them under `UNDERWRITING`. Write nothing about sums insured there. Never write content under `Insurance needs`; it is repurposed as `UNDERWRITING`. |
| Nothing has been confirmed to exist about current cover | Write `EXISTING COVER (IF ANY) REMAINS IN FORCE`. If cover is confirmed, write `EXISTING COVER REMAINS IN FORCE` [Q-MN-11]. |
| A policy is listed but one of its details is unknown | Write `NOT KNOWN` inside that structured cover listing. This is data about a policy, not a note to self. |
| A field is `TBC` but something partial is known | Keep `TBC` and add one qualifying line. Example: "Both to be explored further however, client has disclosed a healthy BMI for each." |
| The `Employer/self` value is long | Put it on its own line. Leave `Sex` and `Speciality` on the line above. Short values keep all three on one line. |
| School fees are in play | Name the school type: "one child still at **private** school". |
| Cover scope is described | Add "as a minimum": "life plus TPD and income protection as a minimum". It leaves the door open on scope. |
| First-contact enquiry where almost nothing is known, so the gaps are too many or too large to sit in fields | Add a closing list headed `OUTSTANDING - TO BE OBTAINED`. Only in this case. |
| The client is an existing client and the transcript supports it | Write `Reasons for seeking advice` as a review of existing cover. Do not assume existing-client status from a name match alone. |
| The README rules (SEP10 set) and the SEP14 rules disagree | The SEP14 rules win. They are already applied in this file. |
| A gap could be marked `TBC`, "Not disclosed" or "have been disclosed" | `TBC` for a specific fact that should be known (DOB, mobile, smoker status). "have been disclosed" wording when the client said a category is absent [Q-MN-10]. |

## Output

**One Word document** (`.docx`), plus a PDF copy where the tooling can make one. A failed PDF is a warning; the `.docx` is the deliverable.

File name: `<First Last> <MONDD> - Initial Meeting Notes.docx`. Example: `[CLIENT_1_FIRST] [CLIENT_1_LAST] OCT22 - Initial Meeting Notes.docx`. `MONDD` is the meeting date, month in capitals [Q-MN-2].

Where it goes: the case folder `2. Compliance docs (SOA, ROA, EO & Fact Find)/` in the layout set by `../_shared/firm-rules.md`. Also copy the `.docx` and `.pdf` to Tristan's Downloads folder [Q-MN-8]. Never write into SharePoint.

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

Where the header values sit on the template is not confirmed [Q-MN-3]. Section content rules are in `references/house-rules.md` §B.

### Tooling (optional)

On the repo machine, the builder is `server/scripts/generate-client-details-summary.mjs`. It clones the template and inserts content paragraphs after each label, in document order, and highlights `TBC` yellow. Its JSON shape and known limits are in `references/json-schema.md`. Whatever the tooling, the finished document must match the structure and rules in this file. Finish by hand anything the builder cannot do (spouse block, deleting unused headings, italics) before handing over.

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
- [ ] No absence is stated as fact; each uses "have been disclosed".
- [ ] Every `TBC` is in the field it belongs to and is highlighted. No closing list (unless first-contact exception).
- [ ] Header formats: DOB `dd/mm/yyyy`; suburb in capitals, no commas; Smoker `N` or `Y`; Speciality uses an en dash; Employer/self has basis and income.
- [ ] Couple: Spouse Details block present; Family heading gone; children in `About the client`.
- [ ] `Financial circumstances` does not repeat incomes or children. Asset total, liability total and net position re-added and correct.
- [ ] No empty section headings left in the document [Q-MN-1]. The repeated second block is gone.
- [ ] `Outcome of meeting` present only if advice was given.
- [ ] `Super` does not mention binding nominations not being discussed.
- [ ] No fact from any other client. Names are spelled the same everywhere.
- [ ] File name and folder follow the Output section.

## Open questions

In this file: [Q-MN-1], [Q-MN-2], [Q-MN-3], [Q-MN-4], [Q-MN-5], [Q-MN-7], [Q-MN-8], [Q-MN-9], [Q-MN-10], [Q-MN-11], [Q-MN-12], [Q-MN-14]. In `references/house-rules.md`: [Q-MN-6]. Not tied to one line: [Q-MN-13] (examples), [Q-MN-15] (version stamp), [Q-MN-16] (keep the transcript). See `../_questions/meeting-notes.md`.
