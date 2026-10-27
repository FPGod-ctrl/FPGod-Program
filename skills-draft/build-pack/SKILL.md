---
name: build-pack
description: >
  Assemble the send-ready DocuSign SOA pack for a Legacy Risk Advice client once the SOA is final.
  Copies the firm's SOA, FSG, Fact Find and insurer application summaries byte-for-byte with hash
  proof, adds dated "please cancel" letters, Change of Servicing Rights, PDS, the FINAL Insurance
  Summaries (last, outside the envelope) and the Risk Checklist, numbers and restamps the files, and
  writes the READ ME. Can prepare a DocuSign draft envelope. Use only on the adviser's command:
  "build the pack for X", "do the SOA pack", "DocuSign pack for X", "get X's pack ready to send".
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# Build the SOA pack

DRAFT. Items marked [Q-PK-n] are open questions for Tristan. They are listed in
`../_questions/build-pack.md`. Until answered, follow the default stated there.

Firm identity, adviser details, the client data rule, the SharePoint read-only rule, the email
rule, folder layout and general naming are in `../_shared/firm-settings.md` and
`../_shared/firm-rules.md`. Read both first. This skill does not repeat them.

## Purpose

Turn a finished SOA into one folder the adviser can review in Explorer and upload to DocuSign
without renaming or reordering anything. The pack must match what the firm signed off, exactly.

## When to use

- The adviser says to build the pack, and the final SOA is in the client's folder.
- The adviser asks to rebuild or fix an existing pack.

## When not to use

- The SOA is not final, or the adviser has not asked. Never build a pack on your own initiative.
- The job is writing the SOA (use `build-soa`), the CvC alone (use `cvc-summary`) or an
  application details sheet (use `application-details`).
- Never send anything. The pack ends as a folder, plus at most a DocuSign **draft**.

## Inputs

| Input | Where it comes from |
|---|---|
| Final SOA (.docx and/or .pdf) | Client folder, current year (`<year> SOA\` or `2. Compliance docs`) |
| Fact Find | Same |
| Insurer application summaries (pre-fill PDFs), one per application | Client folder, `2. Compliance docs` |
| FSG | The adviser's folder `legacy/advisers/tristan-biro/` [Q-PK-2] |
| Firm cancellation letters, if the firm wrote them | Client folder |
| House templates for letters and Change of Servicing Rights | Firm template library [Q-PK-4] |
| Current PDS for each recommended product | Standalone current copy (see Decision rules) |
| `<year> Risk Checklist` | Client folder |
| FINAL Insurance Summaries | Built by the `cvc-summary` skill |
| Insurer forms (rollover authority etc.) | Firm `Insurer Forms\<n>. <Insurer>\`, only if required |
| Client full names, couple or single | SOA, Fact Find |
| Build date (dd/mm/yyyy) | Today |

## Steps

1. **Copy out first.** Copy the client folder out of SharePoint to a working copy (as in
   `build-soa`). Read only from the copy. Never write, rename or delete in SharePoint.
2. **Pick the documents.** For each document type take the newest final version by date in the
   current year's folder. If there are two "Final"s that differ, stop and ask the adviser
   [Q-PK-14].
3. **Check the adviser.** The SOA, Fact Find and FSG must carry Tristan Biro. Insurer applications
   stay under Josh Davidson (adviser split, 26 Oct 2026). If a firm document shows the wrong
   adviser, do not fix it. Stop and tell the adviser before building further [Q-PK-19].
4. **Make the pack folder.** `C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\`
   [Q-PK-12]. If it already exists, do not wipe it (see Decision rules).
5. **Plain-copy the firm documents** in pack order (see `references/pack-order-and-naming.md`):
   SOA, FSG, Fact Find, each application summary, Risk Checklist. Use a plain file copy
   (`Copy-Item`). Hash source and copy with SHA-256 (`Get-FileHash`). If they differ, stop.
6. **PDF for Word-only firm documents** (exception 1). If a firm document exists only as .docx,
   export a PDF next to the copy with `server/scripts/docx-to-pdf.ps1` (Word, opened read-only,
   closed without saving). Re-hash the .docx. If the hash changed, stop. Never replace the .docx.
7. **Letters** (exception 2 and generated items). See `references/letters.md`.
   - Firm letter exists: copy it into the pack, then on the pack copy only run
     `python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]`.
     Then export its PDF.
   - No firm letter: fill the house template. Never rebuild a template from scratch.
   - Change of Servicing Rights: fill the house template, one per person [Q-PK-9].
8. **PDS.** Add the current PDS for each recommended product.
9. **Insurer forms.** Add one only when it is actually required. If unsure, ask.
10. **FINAL Insurance Summaries.** Copy in the PDFs made by `cvc-summary`, one per life insured.
    If they do not exist yet, say so in the review list. Do not build them inside this skill
    unless the adviser asks.
11. **Write the READ ME** from `references/readme-template.md`: contents, DocuSign routing per
    person, hashes, edited items, review list. Optionally run
    `python legacy/packs/readme_to_docx.py "<READ ME .md>"` for a .docx and .pdf [Q-PK-15].
12. **Restamp last.** After everything is written, set every file's modified time to now,
    staggered 10 seconds apart, so sorting by Date modified (newest first) gives READ ME, 01,
    02, and so on. This does not change any hash.
13. **Run the checks** below, then hand over.
14. **DocuSign (optional, only if asked).** See `references/docusign.md`. Draft only.

## Hard rules

**CRITICAL: copy, never regenerate.** The SOA, Fact Find, insurer application summaries and FSG
go into the pack as plain file copies. No re-export, no Word, no docx or PDF tooling on the copy,
no edits, no fixed typos, no renamed contents. Prove each with a SHA-256 match and list it in the
READ ME. If one looks stale or wrong, copy it anyway and flag it. Never fix it. The Risk Checklist
is treated the same way.

Only two exceptions:

1. **Word-only firm document.** Add a PDF exported read-only next to the copied .docx. Confirm the
   .docx hash is unchanged. Never replace or edit the .docx. (Tristan, 22 Oct 2026.)
2. **Firm cancellation letter.** On the pack copy only, fill the `____/____/____` date with the
   build date and replace the "amend your records" line with the cancel line. Mark it in the
   READ ME as edited, not as a byte-for-byte copy. (Tristan, 23 Oct 2026.)

Also:

- Never write into SharePoint. Copy out first.
- No quotes in the pack, except the reduction case below [Q-PK-7].
- No Informed Consent (commission) forms. Commission consent is in the SOA Authority to Proceed.
- No SOA Notes, Record of Advice or other checklists (e.g. SOA Checklist).
- FINAL Insurance Summaries go last before the Risk Checklist and stay out of the DocuSign
  envelope. The adviser sends them to the clients himself.
- Never point a build at another client's pack (packs get renumbered). Use standalone copies.
- Never send a DocuSign envelope. Drafts only.
- Every letter in the pack, firm or generated, is dated and says "cancel" (or, for a reduction,
  asks for the alteration).

### Mistakes from the app's pack builder. Do not repeat them.

The Workbench "SOA Pack" screen is optional tooling. It has known faults:

- It deletes everything in the pack folder before a rebuild, including letters and CvCs added by
  hand. Never wipe a pack folder.
- For a couple with the same surname it names the partner's application and FINAL summary after
  the first person, then adds " (2)". Name each file from the life insured printed on it.
- It takes the FSG from SharePoint `Compliance\` or the client folder, and can pick another
  adviser's FSG. Take the FSG only from the adviser's folder.
- It copies firm cancellation letters without the date and cancel fix. Always apply the fix.
- It does not make letters, Change of Servicing Rights or the CvC, and does not list letters in
  the hash section. Do both.
- It treats the FINAL summary as a firm document and its slot rule also catches the multi-option
  Insurance Cover Summary sheets. Only the single-block FINAL summary goes in.
- It drops anything named "quote", including the signed quote illustration a reduction needs.
- It cannot handle a locked folder. If the folder is locked, write to a new folder and say so.

If the app's pack is used as a first pass, finish it with this skill [Q-PK-17].

## Decision rules

| IF | THEN |
|---|---|
| Existing cover is being **cancelled** | Cancellation letter for each policy, dated, saying "cancel". |
| Existing cover is being **reduced** | No cancellation letter. The insurer's signed quote illustration goes in as a signing item, with a covering alteration letter. [Q-PK-7] |
| Existing policy is kept but servicing moves to Legacy | Change of Servicing Rights from the house template (has a logo: fill, don't rebuild). [Q-PK-9] |
| **Couple** | One application summary, one FINAL summary and one Change of Servicing Rights per person, each named after that person. Both sign in parallel, then the adviser countersigns. |
| **Single** | Same order, one person. Pack folder uses one surname. |
| Firm document exists **only as Word** | Copy the .docx, add a read-only PDF export next to it. |
| Firm document exists as **.docx and .pdf**, PDF older than .docx | Copy both as is. Flag "PDF is older than its .docx; check it matches." |
| Word PDF export hangs or fails | Do not keep retrying (Word COM can hang until reboot). Ship the .docx, which DocuSign accepts, and flag it. [Q-PK-16] |
| **Two "Final"s** of one document disagree | Stop and ask the adviser which one. |
| TAL application summary already holds the payment details | Leave out the TAL direct debit form. |
| Rollover into a super-held policy is needed | Add the insurer's rollover authority. Ask if unsure it is needed. [Q-PK-10] |
| Which FSG | The current FSG from `legacy/advisers/tristan-biro/` (2026 = Part 1 v9.1), copied unchanged. Josh Davidson's folder only if the adviser asks. Which file of the three [Q-PK-2]. |
| PDS copy may be **stale** | Template library and insurer guide folders are often superseded. Use a recent client folder copy or the insurer's website. Check the PDS date against the insurer site. Flag if unsure. [Q-PK-11] |
| No FINAL Insurance Summary built yet | Flag in review list. Run `cvc-summary` only if the adviser asks. |
| Pack folder already exists | Do not delete. Ask, or build into `<name> - SOA Pack (rebuilt <dd-mm-yyyy>)` [Q-PK-13]. |
| Pack folder is locked | Build into a new folder name and say so. |
| SOA or Fact Find shows the wrong adviser | Never edit. Stop and tell the adviser [Q-PK-19]. |
| Risk Checklist | Plain copy, hashed, PDF if Word-only, outside the envelope [Q-PK-20]. |
| .docx and .pdf of one document | Share one number. Only the PDF goes in the envelope [Q-PK-8]. |

## Output

```
C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\
  0 - READ ME.md            (+ .docx and .pdf if made)
  01 - Statement of Advice - <pack name>.docx / .pdf
  02 - FSG.pdf
  03 - Fact Find - <pack name>.docx / .pdf
  04 - <Insurer> Application Summary - Pre-Fill - <Full Name>.pdf
  ...  letters, Change of Servicing Rights, insurer forms, PDS
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

Date: the paragraph whose text is exactly `____/____/____` becomes the build date `dd/mm/yyyy`
[Q-PK-5].

READ ME DocuSign lines and review lines: see `references/readme-template.md`.

## Checks before handing over

- [ ] Every firm document's copy hash equals its source hash, and the READ ME lists it.
- [ ] Every .docx that had a PDF exported still has its original hash.
- [ ] No quotes (except a reduction's signed illustration), no commission consent forms, no SOA
      Notes, no ROA, no other checklists.
- [ ] Every letter is dated with the build date and says "cancel" (or asks for the alteration).
      The fix script reported "updated" for each firm letter.
- [ ] Numbers are two digits (01, 02 …) and run in the pack order with no gaps.
- [ ] Each application and FINAL summary is named after the person printed on it.
- [ ] The FSG came from the adviser's folder.
- [ ] PDS dates checked. Stale ones flagged.
- [ ] FINAL summaries and Risk Checklist are marked "not in envelope" in the READ ME.
- [ ] Restamp done last. Explorer sorted by Date modified (newest first) shows READ ME, 01, 02 …
- [ ] Nothing was written in SharePoint. Nothing was sent.
- [ ] Hand over: the pack path, the review list, and what the adviser still has to do.

## Open questions

See `../_questions/build-pack.md`. Most important: [Q-PK-1] DocuSign countersigner,
[Q-PK-2] which FSG file, [Q-PK-3] which documents go in the envelope and who signs each.
