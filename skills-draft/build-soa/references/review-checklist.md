# Review checklist (before handing over)

Run every check on the finished .docx and the rendered PDF. Fix what you can. Put the rest on
the review list.

## 1. Premium and figure reconciliation

- [ ] Each policy's premium equals the final quote (or the last signed quote / variation).
- [ ] The same premium, frequency and structure appear in: the recommendation section, the
      INA directed list, the portfolio table, the replacement comparison, the fees table and the
      CvC.
- [ ] Monthly vs annual is stated each time and converted correctly (annual = monthly × 12).
- [ ] Stamp duty and policy fee are treated the same way in every table. [Q-SOA-2]
- [ ] Portfolio totals add up; current vs proposed difference = the saving or increase quoted.
- [ ] Like-for-like is priced at the recommended cover levels, with unavailable cover stripped out.
- [ ] Sums insured, waiting and benefit periods match the quote and SOA Notes.
- [ ] Commission per policy: rate × the agreed base = the dollar figure; super-owned and
      personal lines separate. [Q-SOA-2]
- [ ] Existing cover matches the schedule; schedule checked against the last signed quote.
- [ ] Ages agree with dates of birth at the advice date.

## 2. Adviser, firm and licensee details

- [ ] Adviser name, AR number, phone and email match `../../_shared/firm-settings.md` on the
      cover page, header, footer, letter, fees and Authority to Proceed. [Q-SOA-10]
- [ ] No other adviser's name, AR number, phone, email or signature anywhere.
- [ ] Firm and licensee names, AR and AFSL numbers match firm-settings. The firm is never
      described as holding an AFSL.
- [ ] No other firm, licensee or AFSL from any earlier practice.
- [ ] FSG versions in the Authority to Proceed are the current ones.

## 3. Clone base leftovers

Search the body, headers, footers, text boxes, tables, comments and document properties.

- [ ] Clone base client's names, first names, surname, partner and children's names.
- [ ] Their address, DOB, occupation, employer, income, phone, email.
- [ ] Their policy numbers, insurer, product names, sums insured and premiums.
- [ ] Their referral source and referral fee.
- [ ] Images from the clone base: removed from the package as well as the page (an image left
      behind keeps the other client's data). Logos are this client's insurers only.
- [ ] Template errors: `Err:` blocks, `include_schedules Err`, `<:==ImageStorage[n]:>`.
- [ ] Template description rows under strategy steps are deleted.
- [ ] Warnings carried from the clone base that do not apply (e.g. a suicide warning on an
      SOA with no Life replacement). [Q-SOA-4]
- [ ] XPLAN zero-filled needs table removed.
- [ ] Leak check run with the clone base client's names, address, phone, email, policy numbers
      and figures. [Q-SOA-29]

## 4. Placeholders

- [ ] Count every `[ADVISER TO CONFIRM]` and list each with its section.
- [ ] No `TBC`, `[ADVISOR TO CONFIRM]` or other spelling.
- [ ] "Not provided / To be confirmed" cells listed.

## 5. House wording and banned words

- [ ] Fixed blocks verbatim (`house-wording.md`).
- [ ] No "should" in recommendations or feature lead-ins; no "apply for", "you should apply",
      "we recommend you apply"; no "separate application"; no "(self owned)" in headings; no
      "duty of disclosure"; no "No fees are payable to cancel…".
- [ ] Box labels exactly as set. [Q-SOA-5]
- [ ] Every Risks box for new or altered cover ends with the two closing lines.
- [ ] Replacement-only wording appears only on replacements. [Q-SOA-4]
- [ ] INA wording matches the adviser's answer. [Q-SOA-1]
- [ ] No investment, retirement-projection or general super advice. [Q-SOA-13]

## 6. Content rules

- [ ] "Why you are seeking advice", Scope Included bullets and Objectives rows name no
      recommended insurer, product or action.
- [ ] Strategy overview: headings only, one row per step, same text as the section headings.
- [ ] Every recommendation section has the five parts (`recommendation-sections.md`).
- [ ] Every policy states owner, life insured, inside or outside super, structure.
- [ ] Super-owned owner = trustee / member. Trauma not in super. TPD in super is any occupation.
- [ ] Portfolio table: every current and proposed line, each with an Action and a logo.
      [Q-SOA-21]
- [ ] Replacement advice: IMPROVEMENTS / DECREASES are Risk Researcher provision names only,
      grouped by existing insurer if several; "Other Note" line; Costs of replacement = the
      underwriting line only.
- [ ] Alternatives is its own section with both boxes.
- [ ] Referral disclosure present if referred. [Q-SOA-9]
- [ ] Facts confirmed in the fact find (e.g. Will in place) appear in personal details.
- [ ] If the fact find is produced with the SOA: its scope summary = "Why you are seeking
      advice" and its agreed scope = Scope Included bullets, word for word.

## 7. Document

- [ ] Table of contents updated; page numbers right.
- [ ] PDF exported; every page looked at.
- [ ] No text spills onto divider images; no empty or broken table rows; merged portfolio
      rows split.
- [ ] File opens in Word without a repair prompt.
- [ ] File name and location as in SKILL.md Output. Nothing written to SharePoint.

## 8. Review list for the adviser

Give, in this order:
1. `[ADVISER TO CONFIRM]` items (count and list).
2. File inconsistencies: application answers vs fact find, income mismatches, research on
   the wrong product variant, schedule vs signed quote, Risk Checklist vs quote.
3. Missing inputs and what was written instead.
4. Referral disclosure: source, fee, approved wording or not.
5. Compliance steps outside the Word build: peer review, XPLAN replacement step, Approved
   Product List and TMD evidence, Risk Checklist compliance block. [Q-SOA-28]
6. Anything the clone base did differently from these references.
