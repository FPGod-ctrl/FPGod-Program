# Decision rules

Version 1.0.0. IF → THEN. Points Tristan had not answered are settled on their default and
tagged `(default, Q-SOA-n)`. Where the firm's app route and Tristan's corrections differ,
Tristan's corrections win.

## 0. Source precedence

When sources disagree, use this order and put every difference on the review list. (default, Q-SOA-15)

1. The adviser's instructions in this session.
2. SOA Notes (strategy and reasons).
3. Risk Checklist (final products, owners, premiums, commission).
4. The latest signed insurer quote or variation (premiums, cover terms). Schedules and the CvC
   can carry an old premium after a variation; the signed quote wins.
5. Insurance schedules and renewal letters (existing cover).
6. The latest fact find in the folder over the Stage 1 draft; insurer certificates over the
   fact find for dates of birth.
7. Meeting notes.

Never fill a gap from the clone base or from another client's file.

## 1. Cover type

| IF | THEN |
|---|---|
| Life | Life features (sum insured, structure, options). Suicide exclusion wording (13 months, every insurer) only on replacement of Life by Life. (default, Q-SOA-4) Inside super: the super bullet in §2; beneficiary only if on file, else `[ADVISER TO CONFIRM]`. (default, Q-SOA-11) |
| TPD | State the definition (own or any occupation). Inside super: any occupation only; own-occupation TPD cannot be held in super for policies from 1 July 2014, so own-occ sits outside super (often SuperLinked). Risk bullet: must satisfy the definition. |
| Trauma | Always outside super. State the level and options. Risk bullet: diagnosis must meet the policy definition. |
| Income protection | State monthly benefit, waiting period, benefit period, benefit type. Inside super: restricted benefits and definitions, fewer options. Outside super: premiums generally tax-deductible, benefits taxable. Explain any super-continuance or linked split as on the quote. |
| Business expenses | Write the section from the quote and mark it `[ADVISER TO CONFIRM]`; review list. (default, Q-SOA-23) |
| Several covers on one policy (linked) | One recommendation section per policy, with each cover listed in its features. Heading names the covers, e.g. "Life insurance with SuperLinked TPD and income protection insurance". |

## 2. Ownership: inside or outside super

| IF | THEN |
|---|---|
| Owned by a super fund | Owner in every table = trustee / member, e.g. "[TRUSTEE NAME] / [CLIENT_1]". Take the trustee from the schedule or quote. Never the member's name alone. |
| OneCare Super (OnePath) | Owner = "Brighter Super Trustee" / member (formerly shown as OnePath Custodians Pty Ltd). It is funded by rollover from the client's main fund, so the owner is never the main fund. |
| Personally owned, or SuperLink outside portion | Owner = the client's name. |
| Premium paid from super | Say the premium is paid from the super balance (rollover). Add the super bullet below. (default, Q-SOA-11) |
| Life inside super | Name the likely beneficiary and whether they are a tax dependant only if the file says so; otherwise `[ADVISER TO CONFIRM]`. (default, Q-SOA-11) |
| Commission | Super-owned and personally owned policies on separate commission lines. |
| Any policy inside super | One risk bullet: premiums paid from super reduce the super balance, and benefits are paid via the trustee subject to super and tax law. (default, Q-SOA-11) |
| Personally owned Life / TPD / Trauma | Bullet: premiums not tax deductible; claim proceeds paid tax-free. (default, Q-SOA-11) |
| IP outside super | Premiums generally tax-deductible; benefits taxable. (default, Q-SOA-11) |

## 3. Action per policy

| IF | THEN |
|---|---|
| No existing cover of that type | **New.** Section A. Portfolio action "New". No replacement wording. (default, Q-SOA-4) |
| New cover takes the place of existing cover | **Replace.** Section A for the new + Section D cancel step + Replacement advice block. Portfolio: old line "Replace" (or "Cancel"), new line "New". Replacement wording applies. |
| Existing cover kept unchanged | **Retain.** Section C. Portfolio action "Retain". |
| Existing cover ended with no replacement | **Cancel.** Section D, health-check wording; review list. (default, Q-SOA-18) |
| Existing cover amount lowered | **Reduce.** Section E. Health check; yearly saving; review list. (default, Q-SOA-18) |
| Existing cover amount raised on the same policy | **Increase.** Section F; review list. (default, Q-SOA-18) |
| New separate policy tops up an existing retained policy | New (A) for the top-up + Retain (C) for the existing. The INA directed list shows both and the total. |
| Adviser chose a new policy over an alteration quote | Follow his choice. Mention the alteration in Alternatives if it was researched. |

## 4. Needs analysis

| IF | THEN |
|---|---|
| Always, every SOA | Ask Tristan: "Was a full INA done?" Never assume. (default, Q-SOA-1) |
| Answer is no (client-directed; the usual case) | Section 6 = INA lines 1–3 + "You have directed the following:" list + Incomplete INA warning. Drop the zero-filled needs table. (default, Q-SOA-1) |
| Answer is yes | Reason each sum insured in prose (no table) against debts, income, dependants, existing cover and goals. No "declined" wording. Mark the section `[ADVISER TO CONFIRM]` and put it on the review list. (default, Q-SOA-1) |
| Folder has a "Client Directed Amounts" subfolder, or higher options were presented and the client chose lower | Client-directed wording as above, nothing more. No separate underinsurance warning: the Incomplete INA warning covers it. (default, Q-SOA-19) |
| Each sum insured | Justify it in the better-off box by reasoning, not arithmetic. Any figure stated must be correct. |

## 5. Single vs couple

| IF | THEN |
|---|---|
| Single | "you", first name. One personal-details column. One signature block. Fact find partner column dropped. |
| Couple | Lead bullets name both. Personal details per person. Recommendations per life insured; each policy's owner and life insured stated. INA note names both. Both sign the Authority to Proceed. Always one joint SOA. (default, Q-SOA-31) |
| Couple with different insurers or ownership | One section per policy; group replacement bullets by existing insurer. |

## 6. Referral source

| IF | THEN |
|---|---|
| Client referred by one of the three partners with approved wording | A referral paragraph in Fees and disclosures with the dollar amount; the wording itself is `[ADVISER TO CONFIRM]` (not on file). Always on the review list. (default, Q-SOA-9) |
| Referred by anyone else | No approved wording. Write `[ADVISER TO CONFIRM]` in Fees and disclosures and raise it on the review list. (default, Q-SOA-9; default, Q-SH-5) |
| Source unknown | Ask Tristan at Step 5. |
| Related party | No related-party or conflict disclosure. (default, Q-SOA-25) |

Referral partner names and fee rates live in `../../_shared/firm-settings.md`.

## 7. Commission

| IF | THEN |
|---|---|
| Risk Checklist shows commission | Use its percentages and dollars, per policy. |
| Default rates | 66% initial / 22% ongoing of the **total** annual premium including policy fee and stamp duty, as on the Risk Checklist, even when the insurer quote shows lower. Keep the `fees.4` wording verbatim and put the mismatch (base vs total premium) on the review list. (default, Q-SOA-2) |
| Different rate for an insurer | Use the Risk Checklist figure; if it shows a rate other than 66% / 22%, use it and note it on the review list. (default, Q-SOA-2) |
| No Risk Checklist | Commission `[ADVISER TO CONFIRM]`; review list. |
| Clawback | Lead-in + rate table + hardship waiver in Fees and disclosures. Table: 100% of commission in year 1, 60% in year 2, for all insurers. (default, Q-SOA-3) |
| Adviser service fee | None unless the file shows one. |

## 8. Pricing and comparisons

| IF | THEN |
|---|---|
| Replacement | Like-for-like priced at the recommended cover levels; strip out cover the existing policy or fund cannot offer. |
| Premium stated anywhere | Same figure, frequency and total in the recommendation, portfolio, fees table and CvC. |
| Stepped premium | Say it is stepped and rises with age; use the firm stepped-premium line. (default, Q-SOA-12) |
| Level premium | Say it is level. No crossover year or long-run cost figure. (default, Q-SOA-12) |
| Affordability is a stated concern | Address it in the better-off box (cost, structure, funding). |
| Alternatives | Name only insurers in the research on file, with the reason each was discounted. (default, Q-SOA-14) |

## 9. Underwriting and health

| IF | THEN |
|---|---|
| Pre-assessment shows a likely exclusion or loading | Acknowledgement paragraph after the features; bold acknowledgement under the objectives table; framed as the client's acceptance. |
| No pre-assessment | Say cover is subject to underwriting. Never state an outcome. |
| Application answers differ from the fact find | Review list. Do not choose silently. |

## 10. Adviser and clone base

| IF | THEN |
|---|---|
| Any SOA | Adviser = Tristan Biro, details from `../../_shared/firm-settings.md` §3: Sub-AR 1313019 (confirmed 27 Oct 2026, Q-SH-1), printed with the label firm-settings uses on the cover page, adviser details and Authority to Proceed. (default, Q-SOA-10; default, Q-SH-2) |
| Clone base names another adviser | Replace every adviser detail: name, AR number, phone, email, signature, FSG version. |
| Quotes or applications name another adviser | Leave them; they are insurer documents. Note on the review list. The SOA itself says nothing about it. All rules here apply whoever the adviser is. (default, Q-SOA-30) |
| Choosing the clone base | Tristan's own most recent completed SOA of the same shape; otherwise the closest firm SOA, fully re-badged. (default, Q-SOA-16) |
| Firm XPLAN merge in the client folder | May be used as clone base (current template). Remove `<:==ImageStorage[n]:>` placeholders (insert the logos), the Opex `Err:` block and any `include_schedules Err` text. |

## 11. Thin or missing inputs

| IF | THEN |
|---|---|
| No SOA Notes | Reasoning from fact find "Your story" and "Why are you seeking advice", then the meeting notes, then ask Tristan in chat before writing. Still missing → `[ADVISER TO CONFIRM]`. (default, Q-SOA-27) |
| No fact find | Meeting notes; `[ADVISER TO CONFIRM]` cells. (default, Q-SH-3) |
| Only meeting notes, quotes, research and a schedule | Normal. Build the SOA with placeholders. Do not stop. |
| Firm's own finished SOA already in the folder | Set it aside unread; compare after building; report differences. |

## 12. After the adviser edits

| IF | THEN |
|---|---|
| He has edited the SOA in Word and asks for changes | Apply them to his edited copy. Never regenerate. |
