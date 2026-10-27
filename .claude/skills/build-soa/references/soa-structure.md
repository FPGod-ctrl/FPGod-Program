# SOA structure: section order and content

Version 1.0.0. The order below is the house order, assembled from Tristan's corrections and the
firm SOA structure. Where the clone base differs, keep the clone base's order and list the
difference on the review list. (default, Q-SOA-7) One structure serves every SOA; there is no
separate limited-scope version. (default, Q-SOA-24)

Fixed wording is referenced by key (e.g. `about.2`) and given verbatim in `house-wording.md`.
Placeholders: `[CLIENT_1]`, `[CLIENT_2]`, `[INSURER_A]`, `[PRODUCT]`, `[AMOUNT]`, `[POLICY_NO]`.

| # | Section | Always? |
|---|---|---|
| — | Cover page and contents | Always |
| 1 | About this document | Always |
| 2 | Executive summary | Always |
| 3 | Scope of our advice | Always |
| 4 | Your objectives | Always |
| 5 | Where you are now | Always |
| 6 | Insurance needs analysis | Always (default, Q-SOA-7) |
| 7 | Our recommendations (strategy overview, one section per step, replacement advice, portfolio table) | Always |
| — | Divider "What else you should know": Alternatives / Important information / Fees and disclosures | Always |
| 8 | Alternatives | Always (default, Q-SOA-20) |
| 9 | Important information | Always |
| 10 | Fees and disclosures | Always |
| 11 | Actions required | Always |
| 12 | Authority to proceed (holds the commission consent) | Always |
| — | Appendix: insurance quotes | Only if the clone base carries one (default, Q-SOA-7) |

---

## Cover page and contents

- Client name(s), "Statement of Advice", the date of advice (build date), adviser name, firm.
- Adviser and firm details from `../../_shared/firm-settings.md`.
- Contents page updated in Word after the rewrite.

## 1. About this document

House wording, adapting only names and pronouns:
- `about.2`, `about.4`, `about.3`, `about.1`.
- Reliance wording (`reliance.1`–`reliance.3`) here only if the clone base carries it here; otherwise in section 9. (default, Q-SOA-7)
- Do not put `about.5` (the alternatives lead-in) here. It opens section 8.

## 2. Executive summary

### Why you are seeking advice

Heading text exactly "Why you are seeking advice" (not "Why are you seeking advice"). (default, Q-SOA-8)

- The client's goals and motivations in their own terms: what prompted them now, what they
  no longer value, what worries them, what they want us to explore.
- Two to five short paragraphs, addressed by first name.
- Draw it from the meeting notes, SOA Notes and fact find, not the financial figures.
- If the client is an existing client under review, say what they asked to review and what
  has not changed.
- Exclusion or term acknowledgements are framed as the client's acceptance, not our advice.
- **Never** name the recommended insurer, product or action. Wrong: "You would like to top up
  with [INSURER_A] and cancel your [INSURER_B] policy." Right: "You no longer see value in your
  [INSURER_B] policy given its cost, and you would like us to explore a more cost-effective
  alternative."
- Where the file is thin, say less. Never invent motivation.

### Summary of our advice

- One line: the advice is prepared from our recent discussions and the Fact Find.
- "At this time, you have asked me to provide advice on:" then the advice areas as a short list.
- The recommended actions may be summarised here (this is where the product can first appear).
- Never "separate application".

## 3. Scope of our advice

- `scope.3` or `scope.1` as the lead-in, then the **Included** bullets.
- Included bullets list the advice areas, not the outcome. Right: "Review of your income
  protection insurance." / "Implement a new cost-effective income protection strategy."
  Wrong: "Implementation of new [INSURER_A] cover of [AMOUNT] per month" / "Cancellation of
  your [INSURER_B] policy".
- Typical form: "Analysis of your personal risk insurance needs:" followed by the cover types
  advised on (Life, TPD, Trauma, Income Protection).
- `scope.2`, then the areas **not** advised on (e.g. investments, superannuation strategy,
  estate planning, Centrelink, tax).
- Tax incidental note `general.4`, always. (default, Q-SOA-26) Nothing about QTRP status. (default, Q-SOA-22)
- One scope structure for all SOAs, limited by the Included / not-advised lists. (default, Q-SOA-24)
- These bullets are copied word for word into the fact find "Agreed scope of advice".

## 4. Your objectives

- `objectives.1`.
- Table: Description | Priority and Target Date | Status.
  - One row per goal, in the client's terms, with priority (High / Medium / Low) and horizon
    (Short / Medium / Long Term).
  - Goals, not products. Right: "Replace your [INSURER_B] income protection, which you no
    longer see value in given its cost, with a more cost-effective alternative." Wrong: "Top
    up with [INSURER_A]".
- Under the table, where an exclusion or term will carry over: a **bold** acknowledgement
  that the client understands the new cover "will likely carry the same [CONDITION]
  exclusion".

## 5. Where you are now

- `current-position.1`.
- Tables, not prose:
  - Personal details per person (couple: one joint SOA, per-person columns) (default, Q-SOA-31): age, date of birth, occupation, employment basis, income,
    smoker status, dependants, health, Will in place (facts confirmed in the fact find flow
    here).
  - Income and expenditure, assets and liabilities, to the depth the fact find holds.
  - Existing insurance in force: insurer (logo), policy number, owner, life insured, cover
    type, sum insured, premium, premium structure.
- Super-owned existing policies: owner = trustee / member.
- Unknown cells: `[ADVISER TO CONFIRM]`. (default, Q-SH-3)

## 6. Insurance needs analysis

Ask Tristan every SOA whether a full INA was done. (default, Q-SOA-1)

- **Not done (client-directed):** INA lines 1–3 in `house-wording.md` §INA, then
  "You have directed the following:" with one bullet per action (new, replaced, cancelled,
  retained and reduced cover, with sum insured, waiting and benefit period and the total per
  cover type), then a line saying which covers were not reviewed, then the Incomplete INA
  warning. Adjust names and plurals for a couple, super vs personal ownership, reductions or
  several insurers. No separate underinsurance warning. (default, Q-SOA-19)
- **Done:** give the reasons for each sum insured in prose against the
  client's debts, income, dependants, existing cover and goals. Do not print a component
  table that sums to the figure. Mark the section `[ADVISER TO CONFIRM]` and put it on the
  review list. (default, Q-SOA-1)
- Drop the XPLAN zero-filled needs table in both cases.

## 7. Our recommendations

1. **Opening:** `objectives.3` ("This section details our recommendations…").
2. **Strategy overview:** a numbered Step | Strategy table. One row per step, heading text
   only. Delete the template's description rows. Example:
   - 1 Implement new [INSURER_A] [PRODUCT] cover of [AMOUNT] per month
   - 2 Cancel your existing [INSURER_B] income protection policy
   - 3 Retain your existing [INSURER_C] cover
3. **One section per step**, in strategy order, each in the shape in
   `recommendation-sections.md`.
4. **Replacement advice** for every replaced policy (tables in `recommendation-sections.md`).
   Placement relative to the step sections follows the clone base; if it has none, after the
   step sections and before the portfolio table. (default, Q-SOA-7)
5. **Portfolio table:** Description | Owner | Life Insured | Type | Cover | Inside Super |
   Outside Super | Premium | Features | Action.
   - Every current and proposed line, Action = Retain, Replace, Cancel, New (or Reduce /
     Increase).
   - Insurer logo above the product name in the Description cell, on every row (current and
     proposed). No logo on file → insurer name only, noted on the review list. (default, Q-SOA-21)
   - Owner of super-owned lines = trustee / member.
   - Split merged rows so each logo and value sits on its own row.
   - Premium totals match the fees table.

## Divider: "What else you should know"

Lists: Alternatives / Important information / Fees and disclosures. Keep it on its own page;
trim spacer text so nothing spills onto the divider image.

## 8. Alternatives

Heading 1 "Alternatives", the banner image, then `about.5`, then two side-labelled boxes:

- **Alternative strategies:** "We have considered and dismissed the following strategies:"
  Each strategy has a bold title (e.g. **Retain Existing Cover**), bullets describing it, then
  "it was not recommended because:" with dash sub-points. Where existing cover exists, always
  include **Retain Existing Cover** as an alternative strategy. (default, Q-SOA-20)
- **Alternative insurance products:** "We have considered and dismissed the following
  insurance products:" Name the insurers researched (Risk Researcher run) and why each was
  discounted (premium, contract terms). Use only insurers and figures in the research on file.
  None on file → `[ADVISER TO CONFIRM]`. (default, Q-SOA-14; default, Q-SOA-20)

Never a box inside Replacement advice.

## 9. Important information

Mostly house wording, in this order unless the clone base differs:
- `important-info.1`.
- PDS list: each recommended product's PDS title and date, from the PDS on file only; else
  `[ADVISER TO CONFIRM]`. (default, Q-SOA-14) Then `important-info.2` (verbatim, default,
  Q-SOA-13) and the "Important note" PDS block (`general.6`).
- Duty to take reasonable care: `duty-of-care.1`, `duty-of-care.2` plus the key elements list
  kept verbatim from the clone base (default, Q-SOA-17), `duty-of-care.3`.
- Change in circumstances before issue: `general.5`.
- Underwriting: `underwriting.1`, `underwriting.2`, `underwriting.3` (interim cover),
  "Important note" `underwriting.4`.
- Cooling off: `cooling-off.1`.
- Validity: `general.16` (60 days), always. (default, Q-SOA-26)
- Reliance: `reliance.1`–`reliance.3`.

## 10. Fees and disclosures

- `fees.1`, `fees.2`, `fees.3`.
- Commission table, one line per policy (super-owned and personal on separate lines):
  Insurer / product | Owner | Annual premium | Initial % and $ | Ongoing % and $, from the Risk
  Checklist (66% / 22% of total premium). (default, Q-SOA-2)
- `fees.4` verbatim (mismatch on the review list) (default, Q-SOA-2), `fees.5`.
- Clawback: `replacement.3` lead-in, the rate table (100% year 1, 60% year 2, all insurers)
  (default, Q-SOA-3), then the hardship waiver `general.7`.
- Referral fee disclosure where the client was referred: dollar amount, wording
  `[ADVISER TO CONFIRM]`, on the review list. (default, Q-SOA-9)
- Related-party or conflict disclosure: none. (default, Q-SOA-25)
- No adviser service fee unless the file shows one.

## 11. Actions required

- `actions.3`, then a Steps to be actioned | Actioned by table:
  - Read this SOA and the PDS(s) — Client(s)
  - Consider whether the advice is appropriate — Client(s)
  - Sign the Authority to Proceed, fact find and FSG electronically — Client(s)
  - Complete the application(s) and underwriting requirements — Client(s) / Adviser
  - Submit and follow up underwriting — Adviser
  - Once cover is accepted, cancel the replaced policy (replacement only) — Client(s) / Adviser
- `actions.1`, `actions.2`.
- Never "separate application".

## 12. Authority to proceed

- Client declaration: received and read the SOA and PDS(s), information is correct,
  authorise the adviser to proceed. Keep the clone base's declaration set. (default, Q-SOA-26)
- Commission consent `fees.6` (the commission consent sits here, not in a separate form).
- FSG received line, with the current FSG versions from `../../_shared/firm-settings.md` §7.
  (default, Q-SOA-26)
  Never a stale version from the clone base.
- Variation line `general.27`.
- Signature and date lines for each client (couple: both sign) and the adviser, with the AR
  number and label from firm-settings §3 (Sub-AR 1313019). (default, Q-SOA-10; default, Q-SOA-31)

## Appendix: insurance quotes

Attach quotes to the SOA only if the clone base does; otherwise none. Note the choice on the
review list. Quotes never go in the pack (build-pack). (default, Q-SOA-7)
