---
name: application-details
description: >
  Prepare a Legacy Risk Advice client for an insurance application: a Word application details
  sheet with the client (or couple, side by side) laid out ready to key into the insurer's
  application, plus a red "check before lodging" list (birthday, quote age, occupation, missing
  facts, SOA vs quote, replaced cover). Use when Tristan says "prepare X for an application",
  "application details for X", "get X ready to lodge", "app sheet for X".
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
  updated: 27 Oct 2026
---

# Application details sheet

Version 1.0.0. Every point Tristan had not yet answered is settled on its default and tagged
`(default, Q-AD-n)`. Answers he gives later become 1.1 updates. The question list is kept in the
repo at `skills-draft/_questions/application-details.md`.

Firm identity, client data rule, SharePoint read-only rule, email rule, folders and naming are in
`../_shared/firm-settings.md` and `../_shared/firm-rules.md`. Read both first.

Paths: `../_shared/` is `.claude/skills/_shared/`. Machine paths use the local settings in
firm-settings §10: `<DOWNLOADS>` (default `%USERPROFILE%\Downloads`), `<WORK_ROOT>`.

## Purpose

Put everything needed to lodge the insurer application on one sheet, so Tristan can key it in
without hunting through the file, and catch the things that make an application wrong or
declined before it is lodged.

## When to use

- Tristan says "prepare X for an application" or similar.
- The recommended cover is settled (SOA written or the cover agreed with Tristan).
- The sheet is made on request. Whether the SOA has been signed is Tristan's call; this skill
  does not check it. (default, Q-AD-15)

## When not to use

- Do not lodge, submit or fill the insurer's online application. This skill only makes the
  sheet. Tristan keys it in himself. (default, Q-AD-3)
- Do not use it to choose cover. Cover comes from the SOA and quote.

## Inputs

| Input | Source |
|---|---|
| Personal and contact details | Fact Find (copied out of the client folder) |
| Occupation, duties, income, hours | Fact Find; check against the quote |
| Cover to apply for: insurer, product, cover types, amounts, options, ownership | SOA |
| Quote numbers and quote dates | Final insurer quotes in the client folder |
| Health, lifestyle, family history | File notes (and Fact Find), quoted word for word with the note's date (default, Q-AD-4) |
| Existing cover: insurer, policy numbers, what happens to it | SOA, current schedules |
| Payment method and funding (super rollover, direct debit) | SOA, Fact Find. Method and fund name only. (default, Q-AD-10) |
| Beneficiaries | Fact Find or SOA, if they name them (default, Q-AD-11) |
| Adviser on the application | Josh Davidson (applications and quotes stay under Josh, 26 Oct 2026) (default, Q-AD-9) |
| Expected lodging date | Tristan; if not given, today + 7 days (default, Q-AD-7) |

## Steps

1. **Copy out** the documents you need from the client folder to `<WORK_ROOT>\<case name>\`.
   Never write into SharePoint.
2. **Read the SOA** for the exact cover per person: insurer, product, each cover type, amount,
   waiting and benefit periods, premium structure, ownership (super or not), linked options.
3. **Match each cover to its final quote.** Record the quote number and date. If the SOA and quote
   differ, stop and ask.
4. **Fill the sheet** from `references/sheet-layout.md` (default, Q-AD-1; default, Q-AD-8): one
   column per person (couple side by side), sections in this order: Personal, Contact,
   Occupation and income, Cover applied for (with quote numbers), Health and lifestyle, Existing
   cover and payment. (default, Q-AD-3) No source column. (default, Q-AD-14)
5. **Write each fact from a source.** If no source has it, write `NOT FOUND - ask client` in that
   cell. Never guess.
6. **Run the lodging checks** (below) and write the results in the red "Check before lodging"
   list at the top of the sheet. State the lodging date the checks assumed.
7. **Save** as `<DOWNLOADS>\<Surname(s)> - Application Details.docx`. Word only, no PDF, no other
   copy. Never in SharePoint. (default, Q-AD-2) Hand over with the check list repeated in the
   reply. Tell Tristan the sources of any fact if he asks. (default, Q-AD-14)

## Check before lodging (always run, write every hit in red)

These six checks, no others. (default, Q-AD-13; default, Q-AD-1)

| Check | Rule | Hit text |
|---|---|---|
| Birthday | Any life insured has a birthday between today and the expected lodging date, whatever the insurer's pricing basis. (default, Q-AD-5) | `[CLIENT_1] turns <age> on <date>. Lodge before then or requote.` |
| Quote age | Any quote more than 60 days old on the expected lodging date. 60 days for every insurer. (default, Q-AD-6) | `Quote <no.> is <n> days old. Requote before lodging.` |
| Occupation | Occupation or duties on the quote differ from the client's real occupation (Fact Find, file notes). | `Quote occupation "<x>" ≠ actual "<y>". Requote.` |
| Missing facts | Any cell that says `NOT FOUND`. | `<field> missing for [CLIENT_1].` |
| SOA vs quote | Any cover amount, option or premium on the quote differs from the SOA. | `<cover> differs: SOA <a>, quote <b>.` |
| Existing cover | A red line for every policy being replaced. (default, Q-AD-12) | `Do not cancel <policy> until new cover is accepted.` |

If there are no hits, the list says `No issues found on <dd/mm/yyyy>.` and still appears.

## Hard rules

- Never write into SharePoint. Work from copies.
- Never change the firm's documents (SOA, Fact Find, quotes, file notes). This sheet is
  generated, so it may be written freely, but it only reports what those documents say.
- Never lodge or submit anything.
- Every fact traces to a document. No guesses, no "probably".
- Couple: never mix up the two people. Put each fact in the column of the person the source
  document is about. Check each column's name against its quote.
- Bank or card numbers: never copied onto the sheet. Write `see Fact Find / client to provide`.
  (default, Q-AD-10)
- Health: quote the file-note wording with its date. Never summarise it. (default, Q-AD-4)
- No real client data in this skill or its examples. Placeholders only.

## Decision rules

| IF | THEN |
|---|---|
| **Couple** | Two columns side by side, one per person, same row order. |
| **Single** | One value column. Same sections. |
| Birthday falls before lodging | Red check line; say lodge before or requote. (default, Q-AD-5) |
| Quote older than 60 days at lodging | Red check line; requote. (default, Q-AD-6) |
| Quote occupation ≠ real occupation | Red check line; requote. Do not "correct" the occupation to match the quote. |
| SOA and quote differ | Stop and ask before finishing the sheet. |
| Fact missing from every document | `NOT FOUND - ask client`, and a red check line. |
| Health detail in file notes is unclear | Quote the file note wording with its date and flag it; do not summarise it into a medical claim. (default, Q-AD-4) |
| Cover funded by super rollover | Show the fund name and the rollover need; note the rollover form for the pack. (default, Q-AD-10) |
| Existing cover being replaced | List policy, insurer, and "cancel after new cover accepted"; red check line. (default, Q-AD-12) |
| Beneficiaries named in the Fact Find or SOA | Include them. Otherwise `NOT FOUND - ask client`. (default, Q-AD-11) |
| Lodging date unknown | Use today + 7 days for the birthday and quote-age checks, and state it on the sheet. (default, Q-AD-7) |

## Output

`<DOWNLOADS>\<Surname(s)> - Application Details.docx` (default, Q-AD-2)

Single Word file. Layout in `references/sheet-layout.md`. (default, Q-AD-1)

## Fixed wording

- Heading of the check list (red): `Check before lodging`
- `NOT FOUND - ask client`
- `see Fact Find / client to provide` (bank and card numbers) (default, Q-AD-10)
- `No issues found on <dd/mm/yyyy>.`
- Check-list lines: the hit texts in the table above. (default, Q-AD-1)

## Checks before handing over

- [ ] Each column's name matches the quote for that column.
- [ ] Every cover line matches the SOA and has a quote number and date.
- [ ] Birthday, quote age and occupation checks were run for every person and quote, against the
      stated lodging date.
- [ ] Every `NOT FOUND` appears in the red list.
- [ ] Every replaced policy has its red "do not cancel" line.
- [ ] No bank or card numbers on the sheet.
- [ ] Health section only quotes what the file notes say, with dates.
- [ ] Saved to Downloads with the right name, Word only. Nothing written in SharePoint. Nothing
      lodged.
- [ ] Hand over: file path, the red list, and the version line from `../_shared/firm-rules.md` 10.2.

## Decisions taken on defaults

Version 1.0.0 applies the stated default for every application-details question: Q-AD-1 to
Q-AD-15. None left open. Questions file: `skills-draft/_questions/application-details.md`.
