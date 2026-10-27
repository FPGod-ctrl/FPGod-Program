---
name: build-pack
description: >
  Stage 5 of the Legacy SOA pipeline. Assemble the send-ready DocuSign SOA pack for a Legacy Risk
  Advice client once the SOA is final. Copies the firm's SOA, FSG, Fact Find and insurer application
  summaries byte-for-byte with hash proof, adds dated "please cancel" letters, Change of Servicing
  Rights, PDS, the FINAL Insurance Summaries (outside the envelope) and the Risk Checklist, numbers and
  restamps the files, and writes the READ ME. Can prepare a DocuSign draft envelope, dry run first.
  Use only on Tristan's command: "build the pack for X", "do the SOA pack for X", "DocuSign pack for
  X", "get X's pack ready to send".
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
  updated: 27 Oct 2026
---

# Build the SOA pack

Version 1.0.0. Every point Tristan had not yet answered is settled on its default and tagged
`(default, Q-PK-n)`. The one question with no safe default is tagged `(open, Q-PK-1)` and the
skill stops and asks there. Answers he gives later become 1.1 updates. The question list is kept
in the repo at `skills-draft/_questions/build-pack.md`.

Firm identity, adviser details, the client data rule, the SharePoint read-only rule, the email
rule, folder layout and general naming are in `../_shared/firm-settings.md` and
`../_shared/firm-rules.md`. Read both first. This skill does not repeat them.

Paths: `../_shared/` is `.claude/skills/_shared/`. Repo paths (`legacy/...`, `server/...`) are
relative to the repo root `c:\FPGod-Program`. Machine paths use the local settings in
firm-settings §10: `<DOWNLOADS>` (default `%USERPROFILE%\Downloads`), `<WORK_ROOT>`,
`<ADVISER_DOCS>` (default `legacy/advisers/tristan-biro/`).

## Purpose

Turn a finished SOA into one folder Tristan can review in Explorer and upload to DocuSign
without renaming or reordering anything. The pack must match what the firm signed off, exactly.

## When to use

- Tristan says to build the pack for a named client, and the final SOA is in the client's folder.
- Tristan asks to rebuild or fix an existing pack.

## When not to use

- The SOA is not final, or Tristan has not asked. Never build a pack on your own initiative.
  Finishing the SOA never starts this skill.
- The job is writing the SOA (use `build-soa`), the CvC alone (use `cvc-summary`) or an
  application details sheet (use `application-details`).
- Never send anything. The pack ends as a folder, plus at most a DocuSign **draft** made on
  Tristan's say-so.

## Inputs

| Input | Where it comes from |
|---|---|
| Final SOA (.docx and/or .pdf) | Client folder, current year (`<year> SOA\` or `2. Compliance docs`) |
| Fact Find | Same |
| Insurer application summaries (pre-fill PDFs), one per application | Client folder, `2. Compliance docs` |
| FSG | The FSG Combined 2026 file (Part 1 v9.1 + Part Two v8.0) from `<ADVISER_DOCS>` (default, Q-PK-2; default, Q-SH-7) |
| Firm cancellation and alteration letters | Client folder. If none exists, ask Tristan for the firm letter. (default, Q-PK-4) |
| Change of Servicing Rights house template | Firm library `Documents & Templates\Change of Servicing Rights.docx` (read only; copy out) |
| Current PDS for each recommended product | Insurer's website or a recent client folder (see Decision rules) (default, Q-PK-11) |
| `<year> Risk Checklist` | Client folder |
| FINAL Insurance Summaries | Built by the `cvc-summary` skill |
| Insurer forms (rollover authority etc.) | Firm `Insurer Forms\<n>. <Insurer>\`, only if required (default, Q-PK-10) |
| Client full names, couple or single | SOA, Fact Find |
| Build date (dd/mm/yyyy) | Today |

## Steps

1. **Copy out first.** Copy the client folder out of SharePoint to `<WORK_ROOT>\<case name>\`
   (as in `build-soa`). Read only from the copy. Never write, rename or delete in SharePoint.
2. **Pick the documents.** For each document type take the newest final version by date in the
   current year's folder. If there are two "Final"s, hash both: identical → use either and note
   it; different → stop and ask Tristan which one. (default, Q-PK-14)
3. **Check the adviser.** The SOA, Fact Find and FSG must carry Tristan Biro. Insurer applications
   stay under Josh Davidson (adviser split, 26 Oct 2026). If the SOA or Fact Find shows the wrong
   adviser, do not fix it. Stop and tell Tristan before building further. (default, Q-PK-19)
4. **Make the pack folder.** `<DOWNLOADS>\<Surname> - SOA Pack\` (single or same-surname
   couple) or `<DOWNLOADS>\<Surname1> & <Surname2> - SOA Pack\` (different surnames).
   (default, Q-PK-12) If it already exists, never delete or wipe it: build into
   `<name> - SOA Pack (rebuilt dd-mm-yyyy)\` and say so. (default, Q-PK-13)
5. **Plain-copy the firm documents** in pack order (see `references/pack-order-and-naming.md`):
   SOA, FSG, Fact Find, each application summary, Risk Checklist. Use a plain file copy
   (`Copy-Item`). Hash source and copy with SHA-256 (`Get-FileHash`). If they differ, stop.
6. **PDF for Word-only firm documents** (exception 1). If a firm document exists only as .docx,
   export a PDF next to the copy with `server/scripts/docx-to-pdf.ps1` (Word, opened read-only,
   closed without saving). Re-hash the .docx. If the hash changed, stop. Never replace the .docx.
   If Word's export hangs or fails, ship the .docx alone, flag it on the review list and tell
   Tristan at handover. (default, Q-PK-16)
7. **Letters** (exception 2). See `references/letters.md`.
   - Firm letter exists: copy it into the pack, then on the pack copy only run
     `python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]`
     with the build date. (default, Q-PK-5) Then export its PDF.
   - No firm letter: ask Tristan for the firm letter. Do not generate one. (default, Q-PK-4)
   - Change of Servicing Rights: fill the house template, one per person per kept policy whose
     servicing adviser changes to Legacy. (default, Q-PK-9)
8. **Signed quote illustration (reduction only).** Plain-copy it directly after its alteration
   letter as `NN - <Insurer> Signed Quote Illustration - <Full Name>.pdf`. (default, Q-PK-7)
9. **PDS.** Add the current PDS for each recommended product. Keep the insurer's file name. Check
   its date against the insurer's site and put the date on the review list. (default, Q-PK-11)
10. **Insurer forms.** Add a rollover authority when cover is funded by rollover and the
    application does not cover it. Leave out the TAL direct debit when the TAL summary holds the
    payment details. Ask Tristan about any other form. (default, Q-PK-10)
11. **FINAL Insurance Summaries.** Copy in the PDFs made by `cvc-summary`, one per life insured.
    If they do not exist yet, say so in the review list. Do not build them inside this skill
    unless Tristan asks.
12. **Write the READ ME** from `references/readme-template.md`: contents, DocuSign routing per
    person, full SHA-256 hashes (default, Q-PK-18), edited items, review list. Then always run
    `python legacy/packs/readme_to_docx.py "<READ ME .md>"` so the pack holds `0 - READ ME.md`
    plus its `.pdf`. (default, Q-PK-15)
13. **Restamp last.** After everything is written, set every file's modified time to now,
    staggered 10 seconds apart, so sorting by Date modified (newest first) gives READ ME, 01,
    02, and so on. This does not change any hash.
14. **Run the checks** below, then hand over.
15. **DocuSign: only if Tristan asks.** Otherwise skip it. (default, Q-PK-6) When asked, follow
    `references/docusign.md`: Claude writes the manifest, runs the dry run, shows Tristan the
    result, and creates the draft envelope only on his say-so. Draft only, never sent. Before
    any real draft, Tristan must say who countersigns. (open, Q-PK-1)

## Hard rules

**CRITICAL: copy, never regenerate.** The SOA, Fact Find, insurer application summaries and FSG
go into the pack as plain file copies. No re-export, no Word, no docx or PDF tooling on the copy,
no edits, no fixed typos, no renamed contents. Prove each with a SHA-256 match and list it in the
READ ME. If one looks stale or wrong, copy it anyway and flag it. Never fix it. The Risk Checklist
is treated the same way: plain copy, hashed, PDF if Word-only, outside the envelope.
(default, Q-PK-20)

Only two exceptions:

1. **Word-only firm document.** Add a PDF exported read-only next to the copied .docx. Confirm the
   .docx hash is unchanged. Never replace or edit the .docx. (Tristan, 22 Oct 2026.)
2. **Firm cancellation letter.** On the pack copy only, fill the `____/____/____` date with the
   build date and replace the "amend your records" line with the cancel line. Mark it in the
   READ ME as edited, not as a byte-for-byte copy. (Tristan, 23 Oct 2026.)

Also:

- Never write into SharePoint. Copy out first.
- No quotes in the pack, ever, except a reduction's signed quote illustration. (default, Q-PK-7)
- No Informed Consent (commission) forms. Commission consent is in the SOA Authority to Proceed.
- No SOA Notes, Record of Advice or other checklists (e.g. SOA Checklist).
- FINAL Insurance Summaries go last before the Risk Checklist and stay out of the DocuSign
  envelope. Tristan sends them to the clients himself.
- Never point a build at another client's pack (packs get renumbered). Use standalone copies.
- Never send a DocuSign envelope. Drafts only, dry run first, real draft only on Tristan's say-so.
- Every letter in the pack is dated with the build date and says "cancel" (or, for a reduction,
  asks for the alteration).
- Never generate a cancellation or alteration letter. Ask Tristan for the firm letter. (default, Q-PK-4)

### Mistakes from the app's pack builder. Do not repeat them.

This skill is the route of record. The Workbench "SOA Pack" screen is optional tooling; if its
output is used, check it against this skill before anything is sent. (default, Q-PK-17) It has
known faults:

- It deletes everything in the pack folder before a rebuild, including letters and CvCs added by
  hand. Never wipe a pack folder.
- For a couple with the same surname it names the partner's application and FINAL summary after
  the first person, then adds " (2)". Name each file from the life insured printed on it.
- It takes the FSG from SharePoint `Compliance\` or the client folder, and can pick another
  adviser's FSG. Take the FSG only from the adviser's folder.
- It copies firm cancellation letters without the date and cancel fix. Always apply the fix.
- It does not make Change of Servicing Rights or the CvC, and does not list letters in the hash
  section. Do both.
- It treats the FINAL summary as a firm document and its slot rule also catches the multi-option
  Insurance Cover Summary sheets. Only the single-block FINAL summary goes in.
- It drops anything named "quote", including the signed quote illustration a reduction needs.
- It cannot handle a locked folder. If the folder is locked, write to a new folder and say so.

## Decision rules

| IF | THEN |
|---|---|
| Existing cover is being **cancelled** | Firm cancellation letter for each policy, dated with the build date, saying "cancel". No "only once new cover is in force" wording added. No firm letter → ask Tristan. (default, Q-PK-4) |
| Existing cover is being **reduced** | No cancellation letter. The firm alteration letter (ask Tristan for it and its wording), then the insurer's signed quote illustration directly after it, both signing items. (default, Q-PK-7) |
| Existing policy is kept but its servicing adviser changes to Legacy | Change of Servicing Rights from the house template (has a logo: fill, don't rebuild), one per person per such policy. (default, Q-PK-9) |
| **Couple** | One application summary, one FINAL summary and one Change of Servicing Rights per person, each named after that person. Both sign in parallel, then the countersigner. |
| **Single** | Same order, one person. Pack folder uses one surname. |
| Firm document exists **only as Word** | Copy the .docx, add a read-only PDF export next to it. |
| Firm document exists as **.docx and .pdf**, PDF older than .docx | Copy both as is. Flag "PDF is older than its .docx; check it matches." |
| Word PDF export hangs or fails | Do not keep retrying (Word COM can hang until reboot). Ship the .docx, flag it, tell Tristan at handover. (default, Q-PK-16) |
| **Two "Final"s** of one document | Same hash → use either and note it. Different → stop and ask Tristan. (default, Q-PK-14) |
| TAL application summary already holds the payment details | Leave out the TAL direct debit form. (default, Q-PK-10) |
| Cover funded by rollover and the application does not cover it | Add the insurer's rollover authority. (default, Q-PK-10) |
| Any other insurer form (beneficiary nomination, other direct debits) | Ask Tristan. (default, Q-PK-10) |
| Which FSG | The FSG Combined 2026 file from `<ADVISER_DOCS>`, copied unchanged as `NN - FSG.pdf`. Review line: Part Two v8.0 shows out-of-date contact details; corrected profile pending from Synchron. Josh Davidson's folder only if Tristan asks. (default, Q-PK-2) |
| PDS | Take it from the insurer's website or a recent client folder (template library and insurer guide folders are often superseded). Check its date against the insurer's site. Keep the insurer's file name. Put the date on the review list. (default, Q-PK-11) |
| No FINAL Insurance Summary built yet | Flag in review list. Run `cvc-summary` only if Tristan asks. |
| Pack folder already exists | Never delete. Build into `<name> - SOA Pack (rebuilt dd-mm-yyyy)` and say so. (default, Q-PK-13) |
| Pack folder is locked | Build into a new folder name and say so. |
| SOA or Fact Find shows the wrong adviser | Never edit. Stop and tell Tristan before building further. (default, Q-PK-19) |
| Risk Checklist | Plain copy, hashed, PDF if Word-only, outside the envelope. (default, Q-PK-20) |
| .docx and .pdf of one document | Share one number. Only the PDF goes in the envelope; the .docx stays in the folder for reference. (default, Q-PK-8) |
| Who signs what | Envelope = every numbered item up to and including the PDS. Clients sign the SOA Authority to Proceed, their own application(s) and their own letters. FSG, Fact Find and PDS go in with no fields. (default, Q-PK-3) |
| Who countersigns | Not settled. Write `[ADVISER TO CONFIRM]` in the READ ME routing, put it on the review list, and ask Tristan before any real DocuSign draft. (open, Q-PK-1) |

## Output

```
<DOWNLOADS>\<Surname(s)> - SOA Pack\
  0 - READ ME.md            (+ .pdf from readme_to_docx.py)
  01 - Statement of Advice - <pack name>.docx / .pdf
  02 - FSG.pdf
  03 - Fact Find - <pack name>.docx / .pdf
  04 - <Insurer> Application Summary - Pre-Fill - <Full Name>.pdf
  ...  letters, signed quote illustration (reduction), Change of Servicing Rights, insurer forms, PDS
  NN - FINAL Insurance Summary - <First Last>.pdf
  NN - Risk Checklist - <pack name>.docx / .pdf
```

Full order, numbering and naming rules: `references/pack-order-and-naming.md`.
Working scripts and the DocuSign manifest go in the case `.build\` folder in the repo, never in
SharePoint or the pack.

## Fixed wording

Cancellation letter, replacing the "amend your records" paragraph (exact, from the fix script):

> Could you please cancel the above policy and refund any premiums if applicable.

Plural form: `Could you please cancel the above policies and refund any premiums if applicable.`

The line it replaces starts: `Could you please amend your records accordingly and refund any
premiums if applicable.`

Date: the paragraph whose text is exactly `____/____/____` becomes the pack build date,
`dd/mm/yyyy`. (default, Q-PK-5)

DocuSign envelope subject: `<Surname(s)> - Statement of Advice for signing`. No message.
(default, Q-PK-6)

READ ME DocuSign lines and review lines: see `references/readme-template.md`.

## Checks before handing over

- [ ] Every firm document's copy hash equals its source hash, and the READ ME lists the full hash.
- [ ] Every .docx that had a PDF exported still has its original hash.
- [ ] No quotes (except a reduction's signed illustration), no commission consent forms, no SOA
      Notes, no ROA, no other checklists.
- [ ] Every letter is dated with the build date and says "cancel" (or asks for the alteration).
      The fix script reported "updated" for each firm letter.
- [ ] Numbers are two digits (01, 02 …) and run in the pack order with no gaps.
- [ ] Each application and FINAL summary is named after the person printed on it.
- [ ] The FSG is the Combined 2026 file from the adviser's folder.
- [ ] PDS dates checked and listed on the review list.
- [ ] FINAL summaries and Risk Checklist are marked "not in envelope" in the READ ME.
- [ ] Countersigner shown as `[ADVISER TO CONFIRM]` until Tristan answers. (open, Q-PK-1)
- [ ] Restamp done last. Explorer sorted by Date modified (newest first) shows READ ME, 01, 02 …
- [ ] Nothing was written in SharePoint. Nothing was sent. No pack folder was deleted.
- [ ] Hand over: the pack path, the review list, and what Tristan still has to do. The READ ME
      ends with the version line from `../_shared/firm-rules.md` 10.2.

## Decisions taken on defaults

Version 1.0.0 applies the stated default for Q-PK-2 to Q-PK-20 and the shared defaults Q-SH-2,
Q-SH-4 and Q-SH-7. Still open: **Q-PK-1** (DocuSign countersigner) — no default; the skill writes
`[ADVISER TO CONFIRM]` and asks before any real draft. Questions file:
`skills-draft/_questions/build-pack.md`.
