---
name: build-soa
description: Write the Legacy Risk Advice Statement of Advice (SOA) for a risk-only client (life, TPD, trauma, income protection) from a completed client case folder - SOA Notes, Risk Checklist, insurer quotes, CvC / Insurance Cover Summary, Risk Researcher runs, pre-assessments, schedules and the latest fact find. Use only when the adviser asks for it, e.g. "build the SOA for X", "write the SOA for X", "draft X's statement of advice", "do the SOA from X's folder", "the folder for X is ready, do the SOA". Not for meeting notes, fact finds, SOA Notes or the DocuSign pack.
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# Build the SOA from a completed case folder

> DRAFT. Points marked `[Q-SOA-n]` are open questions for Tristan, listed in
> `../_questions/build-soa.md`. Until he answers, follow the default given there.

## Purpose

Write a complete, house-style Statement of Advice for one client (or couple) from the
documents the paraplanner has filed. The SOA must read like every other Legacy SOA: the same
section order, the same fixed wording, and the same shape for every recommendation. The
adviser reviews and finishes it in Word. Nothing goes to the client from this skill.

Firm identity, adviser details, the client data rule, the SharePoint read-only rule, the email
rule, the folder layout and file naming are in `../_shared/firm-settings.md` (adviser §3,
referral partners §6, FSG §7, folder layout §8, naming §9, local paths §10) and
`../_shared/firm-rules.md`. Follow them. They are not repeated here.

## When to use

- Only on the adviser's command ("build the SOA for X").
- Only once the paraplanner has filed the quotes, research and checklist listed in the SOA Notes brief.

## When not to use

- The meeting transcript, meeting notes, fact find or SOA Notes are not done yet. Use the meeting-notes skill.
- The adviser wants the send-ready pack. Use the pack skill.
- The adviser has already edited the SOA in Word. Do not rebuild it. Apply his new changes on top of his edited copy (see Step 12).
- The work is investment, retirement or general super advice. This practice advises on risk insurance only.

## Inputs

Read every file in the folder. Start with the SOA Notes and the Risk Checklist.

| Input | Take from it | If it is missing |
|---|---|---|
| **SOA Notes** (paraplanner brief + adviser notes) | The strategy and the reasons: which covers, sums insured, waiting and benefit periods, ownership, what to replace, retain or cancel, and why. | Look for the reasoning in the fact find "Your story" and "Why are you seeking advice". Then ask the adviser. Never invent reasoning; write `[ADVISER TO CONFIRM]`. [Q-SOA-27] |
| **Risk Checklist** | Final products, owners, lives insured, premiums, premium structure, commission. | Take products and premiums from the final quote. Mark commission `[ADVISER TO CONFIRM]`. Add to the review list. |
| **Insurer quotes** (PDF) | Product name, each cover's sum insured, waiting and benefit periods, options, premium structure (stepped or level), frequency, stamp duty, policy fee, total premium. | Write the premium as `[ADVISER TO CONFIRM]`. Add to the review list. |
| **CvC / Insurance Cover Summary** (xlsx, the `CvC ` sheet and option sheets) | Current vs proposed cover and premiums, the option the client chose, yearly premium or yearly saving. A "Client Directed Amounts" subfolder means the client chose lower cover than first presented. [Q-SOA-19] | Build the comparison from schedules and quotes. |
| **Risk Researcher runs, Compare Ratings, One on One Comparison** (PDF) | Alternative insurers and their premiums (Alternatives section). The provision names whose ratings differ between existing and recommended (Differences in Benefits). Render these pages as images: text extraction scrambles the tables and provider names are logos. | Write Alternatives from the quotes on file only. Flag the gap. |
| **Pre-assessments, insurer underwriting correspondence** | Expected exclusions, loadings or terms. These drive the exclusion acknowledgements. | Assume standard terms are not yet known. Say cover is subject to underwriting. |
| **Existing policy schedules, renewal letters** | Existing cover in force: insurer, policy number, owner, life insured, cover, sum insured, premium, structure. Check each against the last signed insurer quote or variation. Schedules can carry an old premium. | Write "Not provided / To be confirmed" in the cells. Flag it. |
| **Latest fact find** in the folder | Personal details, occupation, income, dependants, debts, health, smoker status, estate (e.g. Will in place). Use the latest one, not the Stage 1 draft. | Use the meeting notes. Mark unknown facts "Not provided / To be confirmed". |
| **Insurer applications** (if filed) | Income history, travel and health answers. Read form fields directly where the PDF is a fillable form. | Skip. |
| **Adviser details and FSG** | Name, AR number, contact details, FSG version. Take them from `../_shared/firm-settings.md` (adviser folder `legacy/advisers/<adviser>/`). Never from a cloned SOA. [Q-SOA-10] | Write `[ADVISER TO CONFIRM]`. |
| **The adviser's chat instructions** | Overrides anything in the files (e.g. he names the cover amounts). | — |
| **The INA answer** | Ask the adviser every time: "Was a full Insurance Needs Analysis done for this client?" It decides the needs-analysis wording. | Do not assume. Ask. [Q-SOA-1] |

When figures disagree between sources, follow the precedence in
`references/decision-rules.md` and put the difference on the review list. [Q-SOA-15]

## Steps

1. **Confirm the job.** Confirm the client and that the adviser asked for the SOA.
2. **Copy the folder out.** Copy the current advice year's folder from the SharePoint library
   to `<WORK_ROOT>\<case name>\` (`../_shared/firm-settings.md` §10). Work only on the copy.
   Never create anything inside SharePoint, including extraction folders. If a case-folder
   intake has already been done, start from its copy and inventory.
3. **List what is there.** Sort the files against the Inputs table. Note what is missing.
4. **Read everything.** SOA Notes and Risk Checklist first, then quotes, CvC, research,
   pre-assessments, schedules, the latest fact find and applications.
5. **Ask the build questions in one message.** Always: was a full INA done? Also ask anything
   the file does not settle: cover amounts, which option was chosen, the referral source and
   fee, and anything the Risk Checklist and quotes disagree on. Wait for the answers.
6. **Write the recommendation plan** before any prose. One line per policy action:
   step number, action (New / Replace / Retain / Cancel / Reduce / Increase), insurer and
   product, owner, life insured, each cover and sum insured, waiting and benefit periods,
   structure, inside or outside super, annual premium, commission. Check it against the Risk
   Checklist. This plan drives the strategy overview, the recommendation sections, the
   portfolio table and the fees table, so they all match.
7. **Pick the clone base.** Use the closest completed Legacy SOA by the same adviser, with the
   same case shape (single or couple, replacement or new, super or not, IP-only or full
   cover). If only another adviser's SOA fits, use it and replace every adviser detail.
   [Q-SOA-16]
8. **Write the Executive summary and Scope first.** They state the client's goals and the
   advice areas, never the recommended product (Hard rules). Copy the same words into the
   fact find boxes if the fact find is being produced with the SOA.
9. **Rewrite every section in place, in order**, following `references/soa-structure.md`.
   Use the fixed wording in `references/house-wording.md` exactly. Write each recommendation
   in the shape in `references/recommendation-sections.md`. Apply
   `references/decision-rules.md`.
10. **Strip everything left from the clone base**: the other client's names, figures, policy
    numbers, images (including the image files themselves, not only the paragraphs), adviser
    details, template error text and unused description rows. See
    `references/review-checklist.md`.
11. **Finish in Word.** Update the table of contents, save, export the PDF. Look at the
    rendered pages. Fix layout problems (spill onto divider pages, broken tables, missing
    logos). Then run every check in `references/review-checklist.md`.
12. **Hand over** the .docx, the .pdf and the review list (Output). If the adviser later asks
    for changes after he has edited the SOA himself, apply them to his edited copy. Never
    regenerate over it.

## Hard rules

- No client's real details outside that client's own SOA. Never carry a name, figure, policy
  number, image or personal detail from the clone base or any other file into this SOA.
- Legacy Risk Advice only. Never another firm's name, licensee or AFSL. Firm and licensee
  details come from `../_shared/firm-settings.md` only. The firm is a corporate Authorised
  Representative; the AFSL is the licensee's.
- The adviser on the SOA is the one set in `../_shared/firm-settings.md`. Replace every other
  adviser's name, AR number and contact details.
- Never state a premium, sum insured, occupation rating, loading, exclusion or underwriting
  outcome that is not in the file or the adviser's instructions. Write `[ADVISER TO CONFIRM]`.
  Use this spelling only.
- Never invent reasoning, motivation or a client fact. Where the file is silent, say less.
- Reconcile every premium against the quote. Every premium appears identically in the
  recommendation section, the portfolio table and the fees table.
- Disclose commission per policy. Super-owned and personally owned policies are separate lines.
- Price like-for-like comparisons at the **recommended** cover levels.
- "Why you are seeking advice", "Scope of our advice" and "Your objectives" state the client's
  goals and the advice areas. Never name the recommended insurer, product or action there.
- Recommendation verb: "we recommend implementing a new [INSURER_A] [PRODUCT] policy". Never
  "apply for", "you should apply" or "we recommend you apply".
- Never write "should" in a recommendation or feature lead-in. Never write "separate
  application". Never put "(self owned)" or another ownership tag in a heading.
- Strategy overview = headings only, one row per step.
- Every recommendation section has the five parts in `references/recommendation-sections.md`.
- Super-owned policies show the trustee as owner, with the member underneath. Never the
  member's name alone.
- Trauma is never held inside super. TPD inside super is any-occupation only.
- Use "duty to take reasonable care not to make a misrepresentation". Never "duty of disclosure".
- Never say cover is in force or certain. Cover starts only when the insurer accepts.
- No investment, retirement-projection or general super strategy advice. Super appears only as
  the owner of cover or the way a premium is paid. [Q-SOA-13]
- Never work inside SharePoint. Never open, read or write email (`../_shared/firm-rules.md`).
- Never send anything. This skill writes a draft for the adviser only.

## Decision rules (summary)

Full rules, with defaults, in `references/decision-rules.md`.

| IF | THEN |
|---|---|
| Cover is Life / TPD / Trauma / IP | Use that cover's feature list, risk bullets and ownership limits (decision-rules §1). Business expenses: [Q-SOA-23]. |
| Policy is held inside super | Owner = trustee / member. TPD any-occupation only. No trauma. IP restricted. Add the super wording. [Q-SOA-11] |
| Policy is held outside super (personal or SuperLink) | Owner = client's name. Personal tax wording for that cover. [Q-SOA-11] |
| Action is New | New-cover section. Replacement-only wording does not appear. [Q-SOA-4] |
| Action is Replace | New-cover section for the new policy + Replacement advice table + a Cancel step for the old policy. Replacement warnings apply. |
| Action is Retain | "Retain your existing [INSURER_B] [cover] cover" section in house shape. |
| Action is Cancel (no replacement) | Cancel section with health-check wording. [Q-SOA-18] |
| Action is Reduce or Increase existing cover | Alteration section. Shape not settled. [Q-SOA-18] |
| INA not done (client-directed amounts) | Client-directed INA wording + "You have directed the following:" list + Incomplete INA warning. Drop the XPLAN zero-filled needs table. [Q-SOA-1] |
| INA done | No settled wording. Write the reasons for each sum insured in prose; mark the section `[ADVISER TO CONFIRM]`. [Q-SOA-1] |
| Single client | Address "you" by first name. One personal details column. One signature block. |
| Couple | Name both in lead bullets ("[CLIENT_1] and [CLIENT_2], ..."). Per-person rows for each cover. Both sign. [Q-SOA-31] |
| Referred by a referral partner | Disclose the referral fee in dollars, using the approved wording for that partner. No approved wording → `[ADVISER TO CONFIRM]` and the review list. [Q-SOA-9] |
| Commission | Per policy, initial and ongoing, from the Risk Checklist. [Q-SOA-2] |
| Replacement comparison | Like-for-like priced at recommended cover levels, stripping out cover the existing policy or fund cannot offer. |
| Stepped or level premium | State the structure for each policy. [Q-SOA-12] |

## Output

- One Word document and its PDF:
  `<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` and `.pdf`, where the date is
  the build date and `<Short>` is the client short name (`../_shared/firm-settings.md` §9).
  Put them in `legacy/soa/<case name>/1. Advice/<YYYY> Advice & Service/2. Compliance docs
  (SOA, ROA, EO & Fact Find)/`, the repo mirror of the SharePoint layout (firm-settings §8).
  Never in SharePoint; the adviser or paraplanner moves it across.
- Structure: the section order in `references/soa-structure.md`.
- Keep the build working files with the case, outside SharePoint and outside git.
- A review list in chat (contents below).

## Checks before handing over

Run every item in `references/review-checklist.md`. The minimum:

1. **Premium reconciliation.** Each policy's premium matches the quote (or last signed quote),
   the Risk Checklist, the recommendation section, the portfolio table, the CvC and the fees
   table. Totals add up. Frequency (monthly / annual) is stated and consistent.
2. **Adviser details.** Name, AR number, phone, email and FSG version match
   `../_shared/firm-settings.md` everywhere, including the header, footer, cover page and
   Authority to Proceed. No other adviser's details anywhere.
3. **Clone leftovers.** Search the whole document, including headers, footers, text boxes,
   tables and embedded images, for the clone base client's names, address, figures, policy
   numbers and insurer, and for template error text. Remove orphaned images from the package.
4. **`[ADVISER TO CONFIRM]` count.** Count them and list each one with its section.
5. **House wording.** Fixed blocks are verbatim. Banned words are absent ("should" in
   recommendations, "apply for", "separate application", "(self owned)", "duty of disclosure").

**Review list contents** (give it to the adviser with the files):

- Each `[ADVISER TO CONFIRM]`, with its section.
- File inconsistencies: application answers that differ from the fact find, income
  mismatches, research run on the wrong product variant, schedules that differ from the last
  signed quote, Risk Checklist vs quote differences.
- Referral disclosure: the source, the fee, and whether approved wording exists.
- Missing inputs and what was written instead.
- Compliance steps a Word build does not cover: peer review, the XPLAN replacement step,
  Approved Product List and TMD evidence, the Risk Checklist compliance block. [Q-SOA-28]

## Open questions

All open points are in `../_questions/build-soa.md` (Q-SOA-1 to Q-SOA-31). Until answered,
use the default stated there. The most important: INA wording (Q-SOA-1), commission base and
rates (Q-SOA-2), clawback rates (Q-SOA-3), replacement warnings on new cover (Q-SOA-4),
final box labels (Q-SOA-5).

## References

- `references/soa-structure.md` — section order and what each section must say.
- `references/house-wording.md` — fixed wording, verbatim, with when it applies.
- `references/recommendation-sections.md` — the five-part shape for New, Replace, Retain, Cancel, Reduce and Increase.
- `references/decision-rules.md` — full IF → THEN rules and source precedence.
- `references/review-checklist.md` — every check before handover.
