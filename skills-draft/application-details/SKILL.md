---
name: application-details
description: >
  Prepare a Legacy Risk Advice client for an insurance application: a Word application details
  sheet with the client (or couple, side by side) laid out ready to key into the insurer's
  application, plus a red "check before lodging" list. Use when the adviser says "prepare X for an
  application", "application details for X", "get X ready to lodge", "app sheet for X".
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# Application details sheet

DRAFT. Items marked [Q-AD-n] are open questions for Tristan, listed in
`../_questions/application-details.md`. Until answered, follow the default stated there.

Firm identity, client data rule, SharePoint read-only rule, email rule, folders and naming are in
`../_shared/firm-settings.md` and `../_shared/firm-rules.md`. Read both first.

## Purpose

Put everything needed to lodge the insurer application on one sheet, so it can be keyed in
without hunting through the file, and catch the things that make an application wrong or
declined before it is lodged.

## When to use

- The adviser says "prepare X for an application" or similar.
- The recommended cover is settled (SOA written or the cover agreed with the adviser).

## When not to use

- Do not lodge, submit or fill the insurer's online application. This skill only makes the
  sheet [Q-AD-3].
- Do not use it to choose cover. Cover comes from the SOA and quote.

## Inputs

| Input | Source |
|---|---|
| Personal and contact details | Fact Find (copied out of the client folder) |
| Occupation, duties, income, hours | Fact Find; check against the quote |
| Cover to apply for: insurer, product, cover types, amounts, options, ownership | SOA |
| Quote numbers and quote dates | Final insurer quotes in the client folder |
| Health, lifestyle, family history | File notes (and Fact Find) [Q-AD-4] |
| Existing cover: insurer, policy numbers, what happens to it | SOA, current schedules |
| Payment method and funding (super rollover, direct debit) | SOA, Fact Find [Q-AD-10] |
| Adviser on the application | Josh Davidson (applications and quotes stay under Josh, 26 Oct 2026) [Q-AD-9] |

## Steps

1. **Copy out** the documents you need from the client folder. Never write into SharePoint.
2. **Read the SOA** for the exact cover per person: insurer, product, each cover type, amount,
   waiting and benefit periods, premium structure, ownership (super or not), linked options.
3. **Match each cover to its final quote.** Record the quote number and date. If the SOA and quote
   differ, stop and ask.
4. **Fill the sheet** from `references/sheet-layout.md`: one column per person (couple side by
   side), sections in this order: Personal, Contact, Occupation and income, Cover applied for
   (with quote numbers), Health and lifestyle, Existing cover and payment.
5. **Write each fact from a source.** If no source has it, write `NOT FOUND - ask client` in that
   cell. Never guess.
6. **Run the lodging checks** (below) and write the results in the red "Check before lodging"
   list at the top of the sheet.
7. **Save** as `C:\Users\TristanBiro\Downloads\<Surname(s)> - Application Details.docx`
   [Q-AD-2]. Hand over with the check list repeated in the reply.

## Check before lodging (always run, write every hit in red)

| Check | Rule | Hit text |
|---|---|---|
| Birthday | Any life insured has a birthday between today and the expected lodging date (the premium usually changes at the next age) [Q-AD-5]. | `[CLIENT_1] turns <age> on <date>. Lodge before then or requote.` |
| Quote age | Any quote more than 60 days old on the expected lodging date [Q-AD-6]. | `Quote <no.> is <n> days old. Requote before lodging.` |
| Occupation | Occupation or duties on the quote differ from the client's real occupation (Fact Find, file notes). | `Quote occupation "<x>" ≠ actual "<y>". Requote.` |
| Missing facts | Any cell that says `NOT FOUND`. | `<field> missing for [CLIENT_1].` |
| SOA vs quote | Any cover amount, option or premium on the quote differs from the SOA. | `<cover> differs: SOA <a>, quote <b>.` |
| Existing cover | Existing cover being replaced must not be cancelled before new cover is in force [Q-AD-12]. | `Do not cancel <policy> until new cover is accepted.` |

Further checks to consider (not yet confirmed): smoker status matches quote, income supports
the income protection benefit, super balance or contributions cover a rollover-funded premium,
SOA signed before lodging [Q-AD-13].

If there are no hits, the list says `No issues found on <dd/mm/yyyy>.` and still appears.

## Hard rules

- Never write into SharePoint. Work from copies.
- Never change the firm's documents (SOA, Fact Find, quotes, file notes). This sheet is
  generated, so it may be written freely, but it only reports what those documents say.
- Never lodge or submit anything.
- Every fact traces to a document. No guesses, no "probably".
- Couple: never mix up the two people. Put each fact in the column of the person the source
  document is about. Check each column's name against its quote.
- Bank or card numbers: do not copy full numbers onto the sheet [Q-AD-10].
- No real client data in this skill or its examples. Placeholders only.

## Decision rules

| IF | THEN |
|---|---|
| **Couple** | Two columns side by side, one per person, same row order. |
| **Single** | One value column. Same sections. |
| Birthday falls before lodging | Red check line; say lodge before or requote. |
| Quote older than 60 days at lodging | Red check line; requote. |
| Quote occupation ≠ real occupation | Red check line; requote. Do not "correct" the occupation to match the quote. |
| SOA and quote differ | Stop and ask before finishing the sheet. |
| Fact missing from every document | `NOT FOUND - ask client`, and a red check line. |
| Health detail in file notes is unclear | Quote the file note wording and flag; do not summarise it into a medical claim [Q-AD-4]. |
| Cover funded by super rollover | Show fund and rollover need; note the rollover form for the pack. |
| Existing cover being replaced | List policy, insurer, and "cancel after new cover accepted". |
| Lodging date unknown | Use today + 7 days for the birthday and quote-age checks, and say so [Q-AD-7]. |

## Output

`C:\Users\TristanBiro\Downloads\<Surname(s)> - Application Details.docx`

Single file. Layout in `references/sheet-layout.md`. Template NOT FOUND [Q-AD-1].

## Fixed wording

- Heading of the check list (red): `Check before lodging`
- `NOT FOUND - ask client`
- `No issues found on <dd/mm/yyyy>.`
- Exact firm wording of the check list: NOT FOUND [Q-AD-1]. Use the hit texts above until set.

## Checks before handing over

- [ ] Each column's name matches the quote for that column.
- [ ] Every cover line matches the SOA and has a quote number and date.
- [ ] Birthday, quote age and occupation checks were run for every person and quote.
- [ ] Every `NOT FOUND` appears in the red list.
- [ ] No full bank or card numbers on the sheet.
- [ ] Health section only repeats what the file notes say.
- [ ] Saved to Downloads with the right name. Nothing written in SharePoint. Nothing lodged.
- [ ] Hand over: file path and the red list.

## Open questions

See `../_questions/application-details.md`. Most important: [Q-AD-1] the template or confirmed
layout, [Q-AD-3] who uses the sheet and how, [Q-AD-4] how much health detail goes on it.
