---
name: build-pack
description: Stage 5 of the Legacy SOA pipeline. On Tristan's command ("build the pack for X"), assemble the send-ready DocuSign SOA pack. The SOA, Fact Find, application summaries and FSG are COPIED byte-for-byte, never regenerated. Use when Tristan asks for an SOA pack or DocuSign pack.
---

# Build the SOA pack

## Critical rule: copy, never regenerate

The **SOA, Fact Find, insurer application summaries and FSG** go into the pack as plain file
copies of the firm's files: no re-export to PDF, no Word, no docx/pdf tooling, no edits, no fixed
typos. After copying, prove each one with a hash match against its source
(`Get-FileHash`) and list the hashes in the READ ME. If one looks stale or wrong (for example a
PDF older than its .docx), copy it anyway and flag it in the READ ME review list for Tristan.

One exception (Tristan, 22 Oct 2026): when a firm document exists only as Word (usually the SOA
and Fact Find), also put a PDF of it next to the copied .docx. Export it with Word
(`ExportAsFixedFormat`, opened read-only), then confirm the .docx hash hasn't changed. Never
replace the .docx, and never edit before exporting.

Cancellation letters (Tristan, 23 Oct 2026): when the firm has written its own letter, copy it,
then on the pack copy (never the SharePoint file) fill the `____/____/____` date with the build
date and replace "Could you please amend your records accordingly and refund any premiums if
applicable." with a cancel instruction:
`python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]`.
Export the PDF after that, and list the letter in the READ ME as edited (date + cancel wording),
not as a byte-for-byte copy. Generated letters must also be dated and say "cancel".

Only the items the firm has no file for are generated (cancellation or alteration letter,
Change of Servicing Rights, FINAL Insurance Summary / CvC). Fill the house
templates; don't rebuild them.

## Steps

1. Copy the client folder out of SharePoint read-only (as in the build-soa skill). Never write
   into SharePoint.
2. Pick the newest final version of each document by date in the current year's folder. Watch
   for duplicate "Final"s and ask Tristan if two disagree.
3. Pack order (Tristan, 22 Oct 2026): **SOA, FSG, Fact Find, insurance application summaries,
   cancellation letters / change of servicing rights where relevant, then the PDS for each
   recommended product, then the FINAL Insurance Summaries, then the Risk Checklist** (plain copy
   of the firm's `<year> Risk Checklist`, plus a PDF if Word-only; outside the DocuSign envelope). **No quotes.** Add an insurer form
   (e.g. a rollover authority) only when it's actually required; ask if unsure. **No Informed
   Consent (commission) forms**: commission consent is in the SOA Authority to Proceed. The **FINAL Insurance Summaries go last and stay out of the
   DocuSign envelope**; Tristan sends them to the clients directly. Number the files in that order
   with **zero-padded numbers (01, 02 … 15)**, so "10 -" never sorts ahead of "2 -" in a DocuSign upload.
   File names (Tristan, 22 Oct 2026): the FSG is just `NN - FSG.pdf`. Applications are
   `NN - <Insurer> Application Summary - Pre-Fill - <Client full name>.pdf`, for example
   `04 - TAL Application Summary - Pre-Fill - Jane Citizen.pdf`.
   Leave out TAL direct debit forms when the TAL application summary already holds the payment
   details.
4. Current PDS: take it from a recent client folder or the insurer's site. The template library
   copies are often superseded. Point build scripts at a standalone PDS copy, not at another
   client's pack, because packs get renumbered. The 2026 FSG is v9.1. The FSG goes in from `legacy/advisers/tristan-biro/`
   (Tristan is the adviser on every SOA from 23 Oct 2026), copied unchanged.
5. Output `C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\` with
   `0 - READ ME` (contents, DocuSign signing routing per person, hashes of copied items,
   review list).
6. Last step, after the READ ME is written: set every file's modified time to today, staggered so
   the READ ME is newest, then 01, 02 and so on. Tristan views the folder sorted by Date modified
   (newest first), and copies otherwise keep their old SharePoint dates. Changing the timestamp
   doesn't change the hash.
