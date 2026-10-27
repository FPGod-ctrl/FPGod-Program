# Inconsistency checks

Version 1.0.0. Part of `case-folder-intake`.

Thresholds (default, Q-IN-7): any difference in DOB, smoker status, occupation, sum insured, waiting period or benefit period; any income difference (say gross or net); quotes over 60 days old; premium differences over $1.

Run every check. Write each finding to `review-list.md` as:

```
N. <SEVERITY> <one-line finding>
   A: <file> (<page/cell/field>) says <value>
   B: <file> (<page/cell/field>) says <value>
   Likely right: <A | B | unclear> because <reason>. Adviser to confirm.
```

Severity: **HIGH** (would put a wrong fact in advice or an application), **MEDIUM** (needs checking before the SOA), **LOW** (housekeeping). Most serious first.

Never correct a document. Report only.

## 1. Identity and personal details

| Check | Compare | Rule |
|---|---|---|
| Date of birth | Fact find, initial notes, each insurer quote, application, policy schedule or certificate | Any difference is HIGH. The insurer certificate or schedule usually wins; the fact find has been wrong before. |
| Name spelling | All documents | Any difference is MEDIUM. |
| Smoker status | Fact find, quote, application | Any difference is HIGH. |
| Gender | Quote, application | Any difference is HIGH. |
| Birthday before lodging | DOB vs today and the quote date | If the client's age (or age next birthday) changes before the application will be lodged, MEDIUM: premiums change. |
| Contact details | Fact find, application | Missing phone or email on one side: LOW. Fill gaps only from another client document, never by guessing. |

## 2. Occupation and income

| Check | Compare | Rule |
|---|---|---|
| Income | Fact find, initial notes, quote, application form fields, payslip or tax return | Any difference is HIGH for income protection, MEDIUM otherwise. Say gross or net if shown (default, Q-IN-7). |
| Occupation | Fact find, quote occupation, application | Quote occupation different from the real job is HIGH (wrong occupation class). |
| Hours, self-employed or employee | Fact find, application | Difference is MEDIUM. |

## 3. Cover and premiums

| Check | Compare | Rule |
|---|---|---|
| Schedule vs last signed quote | Existing policy schedule, CvC, insurance summary vs the last quote or variation the client signed | Schedule or CvC carrying a premium from before a signed variation is HIGH. |
| Recommended cover vs quote | SOA Notes, Risk Checklist, CvC, adviser's stated amounts vs the final quote | Any sum insured, waiting period, benefit period, ownership or premium difference is HIGH. |
| Premium totals | Risk Checklist vs quote | Check whether plan fee and stamp duty are in or out. A difference over $1 is MEDIUM (default, Q-IN-7). |
| Quote age | Quote date vs today | Over 60 days is MEDIUM: re-quote before lodging (default, Q-IN-7). |
| Ownership | Quote, application, schedule | Super-owned cover must show the fund trustee as owner, not the member alone. Mismatch is MEDIUM. |

## 4. Research on the wrong product

| Check | Compare | Rule |
|---|---|---|
| Product variant | Risk Researcher run, Compare Ratings, One on One Comparison vs the quote and recommendation | Research run on a different variant is HIGH. Look at: inside vs outside super (or split such as SuperLink), stepped vs level, own vs any occupation TPD, IP waiting and benefit period, agreed vs indemnity, product name and version. |
| Insurer | Research vs recommendation | Researched insurer list should include the recommended one. Missing is MEDIUM. |
| Existing policy in the comparison | Comparison "existing" column vs the actual schedule | Wrong existing product is HIGH (gained/lost table will be wrong). |

## 5. Duplicate and stale documents

| Check | Rule |
|---|---|
| Several "Final" versions of one document | Name the one taken as current (newest date stamp in the file name, then modified time) and list the rest. MEDIUM (default, Q-IN-8). |
| Fact find versions | Use the latest. Flag if the latest is unsigned and an older one is signed. MEDIUM. |
| Superseded PDS | PDS dated earlier than a newer one in another recent client folder or the insurer's site. MEDIUM. |
| Files in a month subfolder (e.g. `Oct 2026\`) | Treat as the newest round. Note it. LOW. |

## 6. Template leftovers and foreign data

| Check | Rule |
|---|---|
| Another client's name, DOB or policy number in a document | HIGH. Stop reading that file and flag it as possibly misfiled or a clone leak. |
| Another adviser named on an SOA, fact find or FSG | MEDIUM. Re-badge happens in `build-soa`, not here. Insurer applications and quotes under Josh Davidson are expected; do not flag those. |
| Another licensee's details anywhere | HIGH. |
| Opex `Err:` blocks, `include_schedules` errors, `<:==ImageStorage[n]:>` placeholders, unreplaced merge fields | MEDIUM. |

## 7. Missing key documents

Flag each missing one (MEDIUM unless noted):

- SOA Notes (the adviser's strategy and reasons)
- Risk Checklist (final products, owners, premiums, commission)
- Latest Fact Find
- Final quote for each recommended policy (HIGH if missing)
- Risk Researcher run or comparison for any replacement
- Existing policy schedule for any replacement or cancellation
- Insurance Cover Summary / CvC workbook
- Signed documents for an implemented case
