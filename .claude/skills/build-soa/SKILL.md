---
name: build-soa
description: Stage 4 of the Legacy SOA pipeline. On Tristan's command ("build the SOA for X"), copy the client's SharePoint folder out (read-only) once the paraplanner has filed quotes, research and notes, and write the Statement of Advice by cloning a same-adviser Legacy SOA. Use only when Tristan asks for the SOA to be generated.
---

# Build the SOA from the completed client folder

Only on Tristan's command. The paraplanner (Howard) has gathered the documents listed in the
SOA Notes brief and filed them in the SharePoint client folder.

1. **Copy the client folder out. Never work inside SharePoint.** Source:
   `C:\Users\TristanBiro\Legacy Risk Advice\Legacy - Documents\Clients\<Surname, First>\`.
   Copy the current year's `1. Advice\<Year> Advice & Service\` to
   `legacy/drop/soa-build/cases/<Surname, First>/` (gitignored) and extract there. Never create
   files, `.extracted/` folders or anything else in the SharePoint tree. Paths can pass 260
   characters and OneDrive files may download on demand, so copy with `robocopy` if
   `Copy-Item` fails.

2. **Read everything**, starting with the **SOA Notes** (the adviser's strategy and reasons) and
   the **Risk Checklist** (final products, owners, premiums, commission). Then read the quotes,
   Insurance Cover Summary / CvC, Risk Researcher runs, pre-assessments and existing cover. Use
   the latest Fact Find in the folder, not the stage-1 draft, because the paraplanner may have
   corrected it.

3. **Write the SOA** using the method and house conventions in memory (`legacy-soa-from-case-folder`):
   clone the closest same-adviser example SOA, rewrite in place, finish in Word (TOC, PDF), and
   review the rendered pages. **Adviser: Tristan Biro on every SOA from 23 Oct 2026** (name, AR
   number, contact details and FSG from `legacy/advisers/tristan-biro/`; Josh Davidson's folder is
   reference only). If the cloned SOA was another adviser's, replace every adviser detail. Reconcile every premium against the quote. Commission is disclosed
   per policy. Like-for-like comparisons are priced at the recommended cover levels. Where the
   file is silent, write `[ADVISER TO CONFIRM]`; never invent reasoning.

4. **Output** `legacy/soa/<Surname, First>/1. Advice/<Year> Advice & Service/2. Compliance docs
   (SOA, ROA, EO & Fact Find)/<yyyy.MM.dd> - <Short> - Statement of Advice (DRAFT).docx` + `.pdf`.

5. **Report** a review list: file inconsistencies (application answers, income mismatches,
   research on the wrong product variant), referral disclosure wording, and the compliance steps
   a Word build does not cover (peer review, XPLAN replacement step, APL/TMD evidence, Risk
   Checklist compliance block).
