# FPGod Skills: Questions for Tristan

Draft skill pack 0.1.0, 27 October 2026. 155 questions across 9 files.

**How to answer:** type under each **Your answer:** line. A letter (A, B, C) is enough where options are given, and "default" means you accept the default shown. Skip any you're not sure about: the skill uses its default and the question stays open. When you're done, save this file and tell Claude it's answered. The skills then get updated to version 1.0.

## Answer these first

These change the most documents:

- **Q-SH-1**: Which AR number and contact details go on your SOAs?
- **Q-SH-2**: Will other advisers use these skills, and how is the adviser chosen?
- **Q-SH-3**: Which one placeholder spelling should every skill use for a missing fact?
- **Q-SOA-1**: When no full needs analysis was done, should the SOA say the client "declined" one, and what should it say when one was done?
- **Q-SOA-2**: What is commission calculated on, and are 66% initial / 22% ongoing the rates for every insurer?
- **Q-SOA-3**: What clawback rate table goes under the clawback lead-in, and is it the same for every insurer?
- **Q-SOA-4**: Which warnings appear only when existing cover is replaced, and what must the old-vs-new comparison include?
- **Q-SOA-5**: What are the final box labels in every recommendation section?
- **Q-FF-1**: Should every fact find name Tristan Biro as the adviser signatory?
- **Q-MN-1**: Empty sections: delete them with their headings, or keep every template heading?
- **Q-SN-1**: If the meeting set no sum insured for a cover, what should the brief ask Howard to quote?
- **Q-PK-1**: In DocuSign, who countersigns the pack: you or Josh Davidson?
- **Q-PK-2**: Which FSG file goes in the pack, and should it go in while your Part Two shows out-of-date contact details?
- **Q-CVC-1**: Is "Yearly Premium" the quote's annual premium, or the gross monthly × 12?
- **Q-CVC-2**: How is "Yearly Saving" worked out when the current policy is billed yearly (or the two are on different frequencies)?
- **Q-IN-1**: May Claude read saved email files (.msg) inside a client's case folder?

---

## Shared settings and rules (every skill)

### Q-SH-1. Which AR number and contact details go on your SOAs?
**Why it matters:** Every SOA, fact find and pack carries them. `env.js` has none set, your FSG Part Two v8.0 shows an old mobile and a personal email, and two office numbers are on file.
**Default if you don't answer:** Sub-AR 1313019 (AR of Legacy Risk Advice); P 0406 824 597; E Tristan@legacyriskadvice.com.au; office 1300 240 481 (the later save, not the 03 9100 3225 variant). FSG Part Two v8.0 still used until Synchron issues a corrected one. Please also say if the corrected profile has arrived.
**Your answer:** AR 1313019 confirmed by Tristan, 27 Oct 2026. Contact details and FSG Part Two status still to confirm.

### Q-SH-2. Will other advisers use these skills, and how is the adviser chosen?
**Why it matters:** The skills currently put you on every SOA. If Josh Davidson, Luke Fisher or Gary Douglas use them, the skill needs their AR numbers, contacts and FSGs, and a rule for picking the adviser.
**Default if you don't answer:** Tristan is adviser on every SOA. Others are reference only. Insurer applications and quotes stay under Josh Davidson. Options: (a) Tristan only; (b) the adviser is named in the request ("build the SOA for X under Josh"); (c) the adviser is taken from the XPLAN client record.
**Your answer:**

### Q-SH-3. Which one placeholder spelling should every skill use for a missing fact?
**Why it matters:** The repo uses four: `[ADVISER TO CONFIRM]`, `[ADVISOR TO CONFIRM]`, `TBC` and "Not provided / To be confirmed". One spelling makes them easy to search for and impossible to miss before a document goes out.
**Default if you don't answer:** `[ADVISER TO CONFIRM]` everywhere, including table cells. Options: (a) that; (b) `TBC`; (c) `[ADVISER TO CONFIRM]` for reasoning and `TBC` for single values.
**Your answer:**

### Q-SH-4. Where should each team member's local paths be recorded?
**Why it matters:** The SharePoint sync path, working folder and Downloads differ per person. A path hard-coded to your machine breaks for everyone else, and a wrong SharePoint path could point a write at the library.
**Default if you don't answer:** Environment variables (`LEGACY_LIBRARY_ROOT`, `WORK_ROOT`, `DOWNLOADS`), falling back to `%USERPROFILE%\Legacy Risk Advice\Legacy - Documents` and so on. Options: (a) environment variables; (b) a personal `local-settings.md` beside `_shared/`, never shared; (c) Claude Code personal settings.
**Your answer:**

### Q-SH-5. Are the referral partner fee rates current, and is there approved wording for any other referrer?
**Why it matters:** The SOA must disclose referral fees with the dollar amount. The rates come from the Referral Partner Disclosure document via `legacy-practice.json`. Only PPA, The HOPE Fund and Tony Chen have approved wording; Allfin and other sources do not.
**Default if you don't answer:** PPA 25% of initial and ongoing incl. GST; The HOPE Fund 10% of initial and ongoing excl. GST; Tony Chen 10% of initial, one-off, incl. GST. Any other referrer with a fee gets `[ADVISER TO CONFIRM]` and a review-list item.
**Your answer:**

### Q-SH-6. Should the leak check run on every cloned document, and with which words?
**Why it matters:** A cloned SOA or fact find carries the base client's names, figures and photos, including in places Word does not show. The leak scan proves they are gone, but only for the words it is given.
**Default if you don't answer:** Yes, every cloned or edited .docx before handover. Words: the clone base client's names, DOBs, policy numbers, phone, email, street and suburb, plus a manual check of every image in the file. Result recorded in the review notes.
**Your answer:**

### Q-SH-7. Which FSG is current, and where is the master copy?
**Why it matters:** The pack must carry the current FSG. Copies sit in `legacy/advisers/tristan-biro/` (local only) and in the SharePoint `Compliance` folder, and a superseded version would be a compliance error.
**Default if you don't answer:** FSG Part 1 v9.1 (Synchron) with Part Two v8.0 dated 1 Oct 2026, as the combined 2026 PDF from `legacy/advisers/tristan-biro/`.
**Your answer:**

### Q-SH-8. Is it acceptable to copy client folders into gitignored folders inside the repo?
**Why it matters:** The rule is "nothing from the library goes into git". Today copies land in `legacy/drop/soa-build/cases/`, which is gitignored but inside the repo and inside the hourly OneDrive backup mirror.
**Default if you don't answer:** Keep using `legacy/drop/soa-build/cases/<case name>/`. Options: (a) that; (b) a folder outside the repo, e.g. `%USERPROFILE%\LegacyWork\`; (c) the session scratchpad only, deleted after.
**Your answer:**

### Q-SH-9. Are the firm and licensee details in `env.js` correct and complete?
**Why it matters:** They print on every document. They are code defaults that have not been checked against a current firm document.
**Default if you don't answer:** Legacy Risk Advice Pty Ltd, AR 1296611, ABN 22 655 978 046, Level 3, 489-505 Toorak Road, Toorak VIC 3142; Synchron Advice Pty Ltd, AFSL 243313, ABN 33 007 207 650.
**Your answer:**

### Q-SH-10. Will Howard run the skills himself?
**Why it matters:** If he does, he needs the library synced, his own local settings, and a clear rule on what he may start (the SOA and pack are "only on the adviser's command").
**Default if you don't answer:** Howard files documents in SharePoint and reviews outputs. Only Tristan starts skills. Option: Howard may run `case-folder-intake` and `cvc-summary`, but not `build-soa` or `build-pack`.
**Your answer:**

### Q-SH-11. Which folder and file names are the house standard where the repo disagrees?
**Why it matters:** Generated folders are moved into SharePoint by hand, so names should match what is there.
**Default if you don't answer:** Subfolders `1. Research, Financials, Medicals, Schedules`, `2. Compliance docs (SOA, ROA, EO & Fact Find)`, `3. Signed documents - Implemented Audit`. Initial Meeting Notes named `<First Last> <MONDD> - Initial Meeting Notes.docx` with no leading date. Pack folder `<Pack name> - SOA Pack`. Real folders also show `2. Compliance docs`, `4. Pages to sign` and `6. Schedules`; one note puts a date in front of the meeting notes name.
**Your answer:**

### Q-SH-12. Is the insurer list complete and current?
**Why it matters:** Skills use it to recognise insurers in quotes and research, pick logos and flag an unknown insurer.
**Default if you don't answer:** Acenda, AIA, Asteron, BT, ClearView, Encompass, Futura, MetLife, NEOS, OnePath, PPS, Resolution Life, TAL, Zurich.
**Your answer:**

### Q-SH-13. How should the skill pack be shared and who approves changes?
**Why it matters:** It must be versioned and the team must all run the same version. SharePoint is read only for Claude, so it cannot publish there.
**Default if you don't answer:** Kept in this git repo under `skills-draft/`, Tristan approves every change, team members copy a released version into `.claude/skills/`.
**Your answer:**

### Q-SH-14. May skills read XPLAN live as a fact source, and for team members too?
**Why it matters:** Claude reads XPLAN through your logged-in browser session, read only. Other team members would need their own login, and a fact taken from XPLAN needs to be cited like a document.
**Default if you don't answer:** Yes, read only, in the logged-in user's own session, cited as "XPLAN, <screen>, <date>". Never ask for exports. No writes to XPLAN.
**Your answer:**

---

## Case folder intake

### Q-IN-1. May Claude read saved email files (.msg) inside a client's case folder?
**Why it matters:** They often hold the reasoning when there are no SOA Notes, and insurer pre-assessments. But your standing rule is no email in any form, and reading them also needs a package that is not installed.
**Default if you don't answer:** Do not open them. List each by file name in the inventory and tell you they exist. Options: (a) never; (b) yes, read-only, files already saved in the case folder only, never the mailbox; (c) only when you say so for that client.
**Your answer:**

### Q-IN-2. Should intake run as its own step every time before build-soa?
**Why it matters:** `build-soa` currently copies the folder out itself. One shared intake step means one copy, one inventory and one review list for every later skill.
**Default if you don't answer:** Yes. `build-soa`, `cvc-summary`, `application-details` and `build-pack` start from the latest intake run, and run intake first if there is none or Howard has filed new documents.
**Your answer:**

### Q-IN-3. Which part of the client folder should be copied?
**Why it matters:** Copying everything is slow (OneDrive downloads each file) and pulls in old material. Copying too little can miss the last signed quote or schedule from an earlier year.
**Default if you don't answer:** The newest `<YYYY> Advice & Service` folder in full. Older years listed by name only, copied only if a check needs a file from them.
**Your answer:**

### Q-IN-4. How should .doc files be handled?
**Why it matters:** They cannot be read as they are. Converting the copy with Word is safe for SharePoint but changes the file type, which some might treat as editing.
**Default if you don't answer:** Convert the copy (never the original) to .docx in the working folder with Word, read that, and note it in the inventory. Options: (a) that; (b) skip and ask Howard to re-save the original as .docx.
**Your answer:**

### Q-IN-5. Is reading page images enough for scanned documents, or is OCR needed?
**Why it matters:** Scanned medicals, signed forms and some certificates have no text layer. Claude can read page images, but OCR would make the text searchable for later skills.
**Default if you don't answer:** Render pages to images and read them. No OCR tool installed.
**Your answer:**

### Q-IN-6. Should the skill ship fixed extraction scripts?
**Why it matters:** Today each case gets ad hoc commands. Fixed scripts with a built-in check that refuses any SharePoint output path would be safer and give the same result on every machine.
**Default if you don't answer:** Commands in `references/extraction-methods.md`, written per run into the case `.build\` folder. Option: add a `scripts/` folder with one tested intake script.
**Your answer:**

### Q-IN-7. What thresholds should trigger an inconsistency flag?
**Why it matters:** Too tight and the review list is noise. Too loose and a wrong income or DOB goes into an application.
**Default if you don't answer:** Any difference in DOB, smoker status, occupation, sum insured, waiting or benefit period. Any income difference (stated as gross or net). Quotes over 60 days old. Premium differences over $1.
**Your answer:**

### Q-IN-8. When several "Final" versions of a document exist, which is current?
**Why it matters:** Duplicate Finals have happened. Picking the wrong one puts stale figures into the SOA or CvC.
**Default if you don't answer:** The newest date stamp in the file name, then the newest modified time. The others are listed in the review list.
**Your answer:**

### Q-IN-9. Should intake read the firm's own finished SOA if one is in the folder?
**Why it matters:** When Claude writes the SOA, the firm's version has been set aside unread and compared afterwards, so Claude's draft is independent. Intake reading it would undo that.
**Default if you don't answer:** List it and mark it "firm SOA, set aside". Do not extract its text until `build-soa` asks for the comparison.
**Your answer:**

### Q-IN-10. Which subfolder names should intake expect?
**Why it matters:** Real folders vary (`2. Compliance docs` with and without the bracket, `4. Pages to sign`, `6. Schedules`, month subfolders such as `Oct 2026`). The skill sorts documents by folder as well as by file name.
**Default if you don't answer:** Match by leading number and keywords, accept any of the variants, and record the actual names in the inventory.
**Your answer:**

### Q-IN-11. May Claude install missing tools on a team member's machine?
**Why it matters:** Tools have been missing before (python-docx; the .msg reader still is). Installing changes the machine and may need IT approval.
**Default if you don't answer:** No. Report what is missing and what it blocks, and ask before installing anything.
**Your answer:**

### Q-IN-12. Who gets the review list, and in what form?
**Why it matters:** The file inconsistencies were the most valuable part of the first SOA run. Howard may need them to fix the file before the SOA is written.
**Default if you don't answer:** `review-list.md` in the working folder, summarised in chat to whoever ran the skill. Option: also a .docx copy in Downloads to pass to Howard.
**Your answer:**

### Q-IN-13. How long should intake copies be kept?
**Why it matters:** Each run leaves a full copy of client documents on the local machine and in the OneDrive backup mirror.
**Default if you don't answer:** Kept until the pack is sent, then deleted by hand. Options: (a) that; (b) keep the latest run only; (c) delete when the session ends.
**Your answer:**

---

## Initial Meeting Notes

### Q-MN-1. Empty sections: delete them with their headings, or keep every template heading?
**Why it matters:** Your SEP14 edits say delete any section with nothing real in it (Goals, UNDERWRITING, Hobbies, the second block). The app prompt says use every label once, and the builder cannot delete headings, so empty headings get left behind. Your SEP14 note also says you tolerate stray empty headings.
**Default if you don't answer:** A. Delete the section and its heading. If the builder leaves a heading behind, delete it by hand before handover.
Options: A) delete section and heading; B) keep every heading, leave it empty; C) keep every heading, write `TBC`.
**Your answer:**

### Q-MN-2. Which document and file name does "initial meeting notes" mean?
**Why it matters:** The 12 Oct memory says the program's generator, named `<First Last> <MONDD> - Initial Meeting Notes.docx`. A 14 Oct note says a clone of your own prose document, named `<date> <First Last> <MONDD> - Initial Meeting Notes.docx`, Word only.
**Default if you don't answer:** A. The firm template via the generator, no date prefix, `.docx` plus PDF.
Options: A) generator, no date prefix; B) clone of your own prose doc, date prefix; C) other.
**Your answer:**

### Q-MN-3. Where do DOB, Address, Email, Smoker, Speciality and Employer/self go on the template?
**Why it matters:** There are no labels for them in the app's list. A memory note says the header lines are Name/DOB/Address, Mobile/Email/Smoker, Sex/Speciality/Employer. The builder inserts values as a new paragraph after the whole line, not beside each label. The template itself has not been checked.
**Default if you don't answer:** Three header lines as in the memory note, values written beside their labels. Check the built header by eye.
**Your answer:**

### Q-MN-4. Does the current template already contain a Spouse Details block?
**Why it matters:** The house README says it is not in the blank template and must be added. The builder's code comment says the spouse header rows are clones of the client's, which means it is there.
**Default if you don't answer:** Assume it is there for a couple. If it is not, add it by hand, formatted the same as the client block.
Options: A) yes, it's in the template; B) no, add it by hand; C) use two templates (single / couple).
**Your answer:**

### Q-MN-5. Read the client's existing file (fact find, schedules, renewal letters) to fill DOB, address and existing cover?
**Why it matters:** The Claude Code skill says "pull known facts first". On 26 Oct you switched the app's SharePoint read off, so app notes come from the transcript only.
**Default if you don't answer:** Read the file only when you name the folder or ask for it, by copying files out (read-only). Otherwise transcript only, with gaps as `TBC`.
Options: A) always read when a folder exists; B) only when asked; C) never, transcript only.
**Your answer:**

### Q-MN-6. Is the older "[CONFIRM] plus outstanding list" rule retired?
**Why it matters:** An internal build brief says gaps are marked `[CONFIRM]` and collected into a list. Your README says `TBC` in the field and no closing list on a normal meeting.
**Default if you don't answer:** Yes, retired. `TBC` in the field. Closing list only for a near-empty first contact.
**Your answer:**

### Q-MN-7. What counts as "advice given", so that Outcome of meeting is kept?
**Why it matters:** The rule is "drop Outcome of meeting whenever no advice was given, even where next steps were agreed". The only guide is one review example.
**Default if you don't answer:** Keep it only when the meeting decided to change, cancel, retain or apply for specific cover. Facts only, no action lists.
**Your answer:**

### Q-MN-8. Copy the .docx and PDF to your Downloads folder every time?
**Why it matters:** Memory says you want both in Downloads. The app does it; the Claude Code runner does not.
**Default if you don't answer:** Yes, copy both to Downloads after building.
**Your answer:**

### Q-MN-9. If the meeting date is not given, stop and ask, or use today's date?
**Why it matters:** The app silently uses today, which then goes into the file name and the advice year folder.
**Default if you don't answer:** Stop and ask for the meeting date.
**Your answer:**

### Q-MN-10. When to write `TBC`, "Not disclosed" or "have been disclosed"?
**Why it matters:** Rule 3 says outstanding items are `TBC`. Rule 14 says absences are written as "have been disclosed". There is no tie-break.
**Default if you don't answer:** `TBC` for a specific fact that should be known (DOB, mobile, smoker). "No ... have been disclosed" for a category the client said is absent or that was not raised. Never "Not disclosed" in this document.
**Your answer:**

### Q-MN-11. Does `EXISTING COVER REMAINS IN FORCE` always appear, and where?
**Why it matters:** Your SEP14 edit changed it to "(IF ANY)" when no cover was confirmed, which implies it is a standing line. Its exact place is not written down.
**Default if you don't answer:** Always written, as the last line of `Current Insurance`.
**Your answer:**

### Q-MN-12. Is the Initial Client Notes table still used? Should it be its own shared skill?
**Why it matters:** "Initial client notes" / "file notes" means a different Word table (label | Client 1 | Client 2). It has no firm template in the repo, only per-client build scripts.
**Default if you don't answer:** Out of scope for this skill. Ask before making one.
Options: A) retired; B) still used, make a separate skill (please supply a blank template); C) fold into this skill.
**Your answer:**

### Q-MN-13. Replace the real-client examples with a fictional one?
**Why it matters:** The app sends two real clients' notes to the model as examples on every run. A shared team skill should not carry client data.
**Default if you don't answer:** The shared skill uses no real example. A fictional example will be written for your approval.
**Your answer:**

### Q-MN-14. Adviser notes versus the older client file: which wins?
**Why it matters:** Adviser notes beat the transcript, and the transcript beats older file documents. Adviser notes versus older documents is not stated.
**Default if you don't answer:** Adviser notes, then the meeting, then older documents. Every conflict is reported in the handover.
**Your answer:**

### Q-MN-15. Should each document record the skill version and date it was made with?
**Why it matters:** Today nothing records which rules produced a document, so a changed rule changes later outputs with no trace.
**Default if you don't answer:** Not in the document. The handover message states the skill version.
Options: A) handover message only; B) a line in the document footer; C) a small log file in the case folder.
**Your answer:**

### Q-MN-16. Keep the transcript with the case?
**Why it matters:** No transcript is saved, so no run can be checked or reproduced later.
**Default if you don't answer:** No. Not saved.
Options: A) no; B) save as a text file in the case's Research folder; C) save in XPLAN only.
**Your answer:**

---

## Fact Find

### Q-FF-1. Should every fact find name Tristan Biro as the adviser signatory?
**Why it matters:** The builder skips the signatory table that names Joshua Davidson, which means the master's adviser signatory is Josh. Memory says all SOAs are under you from 23 Oct, and a recent recreated fact find carried your name. No code changes it, so new fact finds may go out under Josh.
**Default if you don't answer:** Tristan Biro. Correct the adviser signatory by hand after building and say so in the handover.
Options: A) always Tristan; B) whoever ran the meeting; C) leave the master as is.
**Your answer:**

### Q-FF-2. Keep the fixed bullet "Review of your personal risk insurance needs:" in Agreed scope?
**Why it matters:** The builder always adds it before the agreed items. Your 26 Oct rule says Agreed scope = the SOA "Included" bullets word for word, which would not have it.
**Default if you don't answer:** A. Keep it (current builder output).
Options: A) keep it; B) remove it, list only the agreed areas; C) keep it only when there is no SOA yet.
**Your answer:**

### Q-FF-3. At Stage 2 there is no SOA. When should Why / Scope / Agreed scope be rewritten to match the SOA word for word?
**Why it matters:** Your 26 Oct rule is "write the SOA's exec summary and scope first, then copy them into the fact find". The pipeline writes the fact find days before the SOA.
**Default if you don't answer:** Write them from the meeting at Stage 2 (areas, not outcomes). When the SOA is built, update the fact find copy to the SOA wording as part of the SOA build, and tell you.
Options: A) as default; B) leave the Stage 2 wording; C) hold the fact find until the SOA is written.
**Your answer:**

### Q-FF-4. Income and expenses: annual or monthly? And how should totals work?
**Why it matters:** There is no rule. The builder adds whatever is in the column, so monthly and annual amounts get added together. Any text in an amount cell makes the total disappear silently.
**Default if you don't answer:** Annual, gross, in every income and expense table. One total per table for all owners.
Options: A) annual; B) monthly; C) as the client said it, with no total.
**Your answer:**

### Q-FF-5. Health "Good" by default when health was not discussed?
**Why it matters:** The firm's Fact Find Process says default "Good" unless a condition was disclosed. That asserts good health with no disclosure behind it.
**Default if you don't answer:** "Good" (firm process).
Options: A) "Good"; B) "Not disclosed"; C) `TBC`.
**Your answer:**

### Q-FF-6. Default "None" for Incomplete or inaccurate information and "Yes" for Adviser expertise?
**Why it matters:** The builder writes these when nothing is given. They are statements on a compliance document with no input behind them.
**Default if you don't answer:** Keep "None" and "Yes".
**Your answer:**

### Q-FF-7. Review client: build from the transcript, or clone the last signed fact find and fill "Any changes"?
**Why it matters:** The house README says one document for initial and review meetings, built the same way. A recent recreated review fact find was instead cloned from the client's signed fact find, with "Any changes" = no change.
**Default if you don't answer:** Build from the transcript on the current master; use the previous fact find only as known facts; fill "Any changes" per section.
Options: A) as default; B) clone the last signed fact find; C) you decide per client.
**Your answer:**

### Q-FF-8. The age in "5 June 1982 (44)" is the age as at which date?
**Why it matters:** Not stated anywhere. The meeting date and the build date can give different ages.
**Default if you don't answer:** As at the meeting date (Date Completed).
**Your answer:**

### Q-FF-9. File date stamp: meeting date or the day it was built?
**Why it matters:** The app uses the meeting date. The Claude Code runner uses the run date. This also sets the advice year folder.
**Default if you don't answer:** Build date (current Claude Code practice).
Options: A) meeting date; B) build date.
**Your answer:**

### Q-FF-10. Is there an approved set of row labels for the per-client tables?
**Why it matters:** Personal, contact, employment, health, estate and other cashflow have no label list, so the AI chooses labels. The skill's list is a suggestion only.
**Default if you don't answer:** Use the suggested labels in the skill, and only rows that hold something.
**Your answer:**

### Q-FF-11. When to tick "Not applicable" versus "Not disclosed"?
**Why it matters:** The only rule is "a whole section the meeting never touched goes in Not disclosed".
**Default if you don't answer:** "Not applicable" when the client confirmed it does not apply (for example no dependants). "Not disclosed" when it was not discussed.
**Your answer:**

### Q-FF-12. Read the client's existing file to fill DOBs, address, super and existing cover?
**Why it matters:** The Claude Code skill reads it (by copying out). The app has had it switched off since 26 Oct. Same question as Q-MN-5.
**Default if you don't answer:** Only when you name the folder or ask. Copy out, read only.
Options: A) always when a folder exists; B) only when asked; C) never.
**Your answer:**

### Q-FF-13. When the paraplanner corrects the fact find in the client file, which copy is the record?
**Why it matters:** The SOA build uses the corrected client-file copy. The app's copy is not updated, and the SOA Notes are written from the app's copy.
**Default if you don't answer:** The client-file copy is the record. The skill never overwrites it.
**Your answer:**

### Q-FF-14. Leak-check every built fact find for other clients' details before it is filed?
**Why it matters:** The master was blanked from a real client's fact find and scanned once. Built fact finds are never scanned.
**Default if you don't answer:** No automatic scan. The handover check reads the document for any other client's name, address, insurer, policy number or figures.
Options: A) as default; B) run the leak scan on every fact find; C) only when the master changes.
**Your answer:**

### Q-FF-15. Goal row format: what timeframe, priority and amount values?
**Why it matters:** No rule. One house example shows "Short Term" | "$X per month" | "High".
**Default if you don't answer:** Timeframe Short Term / Medium Term / Long Term. Priority High / Medium / Low. Amount per month for income protection, lump sum for other cover, `TBC` if not set.
**Your answer:**

### Q-FF-16. Fact find as a document only, or also write the details into the app's client tables?
**Why it matters:** The README planned writing family, income, expenses, assets, liabilities and insurance into the client record so the SOA brief fills itself. It was never built, and the current skill says nothing goes into the app database.
**Default if you don't answer:** Document only.
**Your answer:**

### Q-FF-17. Is the master's "Advice limitations" wording current?
**Why it matters:** It is kept unchanged on every fact find. It came from the master and has not been reviewed.
**Default if you don't answer:** Keep it unchanged.
**Your answer:**

---

## SOA Notes (brief for Howard)

### Q-SN-1. If the meeting set no sum insured for a cover, what should the brief ask Howard to quote?
**Why it matters:** The rule is "what to quote... as the adviser discussed in the meeting". Many first meetings end without amounts. The AI must not make up figures.
**Default if you don't answer:** Write `[ADVISER TO CONFIRM]` for the amount and flag it to you in the handover.
Options: A) as default; B) ask Howard to quote a standard set (please give it); C) ask Howard to quote from the fact find debts and income.
**Your answer:**

### Q-SN-2. Are the six section headings and their order complete?
**Why it matters:** The order is Goals; Reasons for Seeking Advice; Insurance Review and Cover Discussion; Cover Funding; Health Disclosure; Advice and Recommendations. It comes from two firm SOA Notes and has not been confirmed for every case shape (single, replacement, IP only).
**Default if you don't answer:** These six, in this order, every time.
**Your answer:**

### Q-SN-3. Is the brief always "Hey Howard,", or addressed to whichever paraplanner or VA has the case?
**Why it matters:** The skill will be shared with the team, and the VA workflow may assign cases to different people.
**Default if you don't answer:** "Hey Howard,".
**Your answer:**

### Q-SN-4. Should Goals and Reasons for Seeking Advice follow the SOA rule "client motivations only, never the recommended product or action"?
**Why it matters:** Your 26 Oct rule is for the SOA Executive summary. The SOA is written from these notes, so a product named here tends to flow into the SOA's goals.
**Default if you don't answer:** Yes, apply it. Products and actions go only in Advice and Recommendations.
**Your answer:**

### Q-SN-5. Should the SOA Notes record whether a full Insurance Needs Analysis was done?
**Why it matters:** You asked to be asked about the INA for every SOA. Today that question is asked at the SOA build, not when the notes are written.
**Default if you don't answer:** No. The SOA build asks you.
Options: A) no, ask at SOA build; B) ask now and record the answer in Advice and Recommendations.
**Your answer:**

### Q-SN-6. "Still to confirm with the client": fact find TBCs only, or also the meeting notes' TBCs?
**Why it matters:** The rule says "every TBC in the fact find". The meeting notes can hold different gaps (for example height and weight).
**Default if you don't answer:** Both, de-duplicated.
**Your answer:**

### Q-SN-7. Is the standard "Documents to obtain" list right?
**Why it matters:** Current list: existing policy schedules, super statements, quotes, Risk Researcher run, pre-assessments for any disclosed condition. The SOA build also uses Compare Ratings / One on One Comparison, the Insurance Cover Summary and the Risk Checklist, which are not asked for.
**Default if you don't answer:** The five standard items, plus a comparison of existing against proposed cover when existing cover could be replaced.
**Your answer:**

### Q-SN-8. If inside or outside super was not discussed, should Howard quote both?
**Why it matters:** The brief must say inside or outside super. No rule covers a meeting that did not reach it.
**Default if you don't answer:** Yes, quote both.
**Your answer:**

### Q-SN-9. Use the SOA recommendation wording in Advice and Recommendations?
**Why it matters:** Your 26 Oct SOA rules: "we recommend implementing...", no "should", no "apply for", no "separate application". They were set for the SOA, not the notes.
**Default if you don't answer:** Yes, use them.
**Your answer:**

### Q-SN-10. Financial circumstances shorthand: annual or monthly figures, gross or net?
**Why it matters:** The format is "Incomes - ..." shorthand with no rule on frequency. It should match the fact find.
**Default if you don't answer:** Annual gross, same figures as the fact find.
**Your answer:**

### Q-SN-11. Should the notes record the referrer and any referral fee, so the SOA can disclose it?
**Why it matters:** The SOA must carry a referral disclosure, but nothing in Stages 1 to 3 captures the referral fee.
**Default if you don't answer:** Record the referrer under Reasons for Seeking Advice; referral fee `[ADVISER TO CONFIRM]`.
**Your answer:**

### Q-SN-12. Does the layout match the firm's own SOA Notes?
**Why it matters:** The builder puts the brief first, then the two checklists, then Financial circumstances, then the title and the six sections. Whether your own SOA Notes use the same order has not been checked.
**Default if you don't answer:** Keep the builder's order.
**Your answer:**

### Q-SN-13. Who checks the SOA Notes before Howard works from them?
**Why it matters:** The notes record your strategy and decisions. Nothing says whether you review them first, and the skill must not send anything.
**Default if you don't answer:** You review the draft. The skill files it in the case folder only; you pass it on.
**Your answer:**

### Q-SN-14. Pre-assessment for every disclosed condition, or only material ones? And the wording when nothing is disclosed?
**Why it matters:** The rule asks for "pre-assessments for any disclosed condition". Minor conditions may not need one. Wording for "nothing disclosed" is not fixed.
**Default if you don't answer:** Every disclosed condition. Wording: "No health conditions have been disclosed."
**Your answer:**

### Q-SN-15. Stepped or level: always ask Howard for both, or only as discussed?
**Why it matters:** There is no rule. Premium structure changes the quotes and the SOA's funding section.
**Default if you don't answer:** As discussed; otherwise `[ADVISER TO CONFIRM]`.
Options: A) as default; B) always quote both; C) always stepped unless you say otherwise.
**Your answer:**

---

## Build the SOA

### Q-SOA-1. When no full needs analysis was done, should the SOA say the client "declined" one, and what should it say when one was done?
**Why it matters:** The current practice (from your 26 Oct corrections) prints "you declined to undertake a full Insurance Needs Analysis" plus the Incomplete INA warning in about 99% of SOAs. An earlier rule you gave says every client gets a full needs analysis in the background and the SOA must never say or imply it was declined. The two cannot both hold, and there is no wording at all for the case where an INA was done.
Options:
- A. Keep the "declined" house wording + Incomplete INA warning when the answer is no; for "yes", give reasons for each sum insured in prose (no table).
- B. Never say "declined"; use only the client-directed note ("cover amounts … based on the amounts you have requested") and the directed list.
- C. Other wording (please supply).
**Default if you don't answer:** Ask you every SOA whether an INA was done. "No" → option A. "Yes" → reasons in prose and the section marked [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-2. What is commission calculated on, and are 66% initial / 22% ongoing the rates for every insurer?
**Why it matters:** House practice computes commission at 66% / 22% of the total annual premium including policy fee and stamp duty (as on the Risk Checklist). The fixed fees wording printed in every SOA says commission is calculated on the base premium, excluding stamp duty and policy fee. The table and the words then disagree in the same section.
Options:
- A. Total premium (keep figures as now) and change the fixed wording.
- B. Base premium (change the figures) and keep the fixed wording.
- C. Rates differ by insurer (please list).
**Default if you don't answer:** Use the Risk Checklist figures (66% / 22% of total premium) and keep the fixed wording as is; flag the mismatch on the review list.
**Your answer:**

### Q-SOA-3. What clawback rate table goes under the clawback lead-in, and is it the same for every insurer?
**Why it matters:** The lead-in "as a general rule the rates are as set out below;" is followed by a table that is not in the firm wording file. The app assumed 100% in year one and 60% in year two.
**Default if you don't answer:** 100% of commission in year 1, 60% in year 2, for all insurers, placed in Fees and disclosures with the hardship waiver after it.
**Your answer:**

### Q-SOA-4. Which warnings appear only when existing cover is replaced, and what must the old-vs-new comparison include?
**Why it matters:** The 13-month suicide exclusion, the three-year avoidance period, the health check and the "keep your existing cover until the new policy is established" wording are replacement warnings. The app sent them on brand-new cover too. It is also unclear whether the suicide period is always 13 months, and whether the comparison table must cover definitions, waiting and benefit periods, exclusions, loadings, premium structure and lost loyalty benefits.
Options:
- A. Replacement only; suicide wording only where Life replaces Life; 13 months for all insurers.
- B. Also on new cover.
- C. Other (please say).
**Default if you don't answer:** Option A. Comparison table: insurer, product, owner, covers, sums insured, waiting and benefit periods, definitions, structure, premium, known exclusions or loadings.
**Your answer:**

### Q-SOA-5. What are the final box labels in every recommendation section?
**Why it matters:** Your notes give "Risks and Consequences" in one place and "Risks, Considerations & Consequences" (your own edit) in another. The firm's retain sections use "Why are you likely better off with our recommendations" while new-cover sections use "Why you are likely better off with our advice".
Options:
- A. "Why you are likely better off with our advice" + "Risks, Considerations & Consequences" everywhere, including retain and cancel.
- B. Keep the firm's retain-section labels for retain sections.
**Default if you don't answer:** Option A.
**Your answer:**

### Q-SOA-6. Where do "other things to consider / exclusion acknowledgements" sit in each recommendation, and in what order are the five parts?
**Why it matters:** The skill enforces five parts per recommendation: recommendation; why better off; levels of cover and features; risks, considerations & consequences; other things to consider. Your notes say exclusion acknowledgements are a separate paragraph after the features list, which puts part 5 before parts 2 and 4. It is also unclear whether the firm lines "The product/s we have recommended also need to be tailored…" and "You should ensure you understand the features and limitations…" belong in each section.
Options:
- A. Recommendation → features → acknowledgement paragraph → better-off box → risks box; the two firm lines once, before the first policy.
- B. Recommendation → better-off → features → risks → a separate "Other things to consider" box.
**Default if you don't answer:** Option A, or the clone base's order where it differs.
**Your answer:**

### Q-SOA-7. What is the full section order and exact heading text of a current Legacy SOA?
**Why it matters:** The skill's order is pieced together from corrections. Unconfirmed: where "Insurance needs analysis" sits, whether the portfolio table comes before or after the replacement advice, where the reliance wording goes, and whether quotes are attached as an appendix to the SOA or only to the pack.
**Default if you don't answer:** The order in `references/soa-structure.md`, overridden by the clone base where it differs (with a review-list note).
**Your answer:**

### Q-SOA-8. Is the Executive summary heading "Why you are seeking advice" or "Why are you seeking advice"?
**Why it matters:** Both forms appear. The same words are copied into the fact find, so the two documents should match.
**Default if you don't answer:** "Why you are seeking advice".
**Your answer:**

### Q-SOA-9. What is the exact referral fee disclosure wording, where in the SOA does it go, and what do we write for referrers without approved wording?
**Why it matters:** The disclosure must name the dollar amount. Approved wording exists only for PPA, The HOPE Fund and one individual referrer, but the wording itself is not on file. Other referrers have none. (Fee rates are shared question Q-SH-5.)
**Default if you don't answer:** A referral paragraph in Fees and disclosures with the dollar amount and [ADVISER TO CONFIRM] for the wording; always on the review list.
**Your answer:**

### Q-SOA-10. How should your authorisation be labelled on the SOA ("Authorised Representative No." or "Sub-AR"), and where must it appear?
**Why it matters:** The number itself is shared question Q-SH-1 (answer it there). The SOA prints it on the cover page, footer and Authority to Proceed; firm SOAs and the app use different labels, and one older note still records it as pending.
**Default if you don't answer:** Number and label exactly as in `_shared/firm-settings.md` §3, on the cover page, adviser details and Authority to Proceed; if marked unconfirmed there, [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-11. What ownership and tax wording goes in when cover is inside super, and for personally owned cover?
**Why it matters:** No house wording exists for: premiums eroding the retirement balance, beneficiary nominations, death benefits paid to non-tax-dependants (taxed), premium funding by rollover, or IP inside super being restricted. For personal cover, the only settled bullet is "premiums are not tax deductible; claim proceeds tax-free".
**Default if you don't answer:** Personal Life/TPD/Trauma: the not-deductible/tax-free bullet. IP outside super: premiums generally deductible, benefits taxable. Inside super: one bullet that premiums reduce the super balance and benefits are paid via the trustee subject to super and tax law; beneficiary only if on file, else [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-12. What does the SOA say about stepped vs level premiums? Is a crossover year or level-premium disclaimer required?
**Why it matters:** No crossover calculation or level-premium disclaimer was found anywhere. The only firm line is the stepped-premium description.
**Default if you don't answer:** State stepped or level for every policy; use the firm stepped-premium line where stepped; no crossover year or long-run cost figures.
**Your answer:**

### Q-SOA-13. Should investment-style and typo'd firm wording be kept, fixed or removed?
**Why it matters:** This is risk-only advice, yet firm blocks say "before deciding to invest… receive your money back", "financial planning and investment services", and authorise sending "investment opportunities". Several blocks have typos ("you should you change your mind", "you must adviser the insurer", "Once you understand and comfortable"). The "financial-security" bullet mentions wealth accumulation.
Options:
- A. Keep verbatim (as in all firm SOAs).
- B. Fix typos only.
- C. Fix typos and rewrite or remove the investment wording (please approve the new text).
**Default if you don't answer:** Option A for the blocks the clone base carries; drop the investment-only lines not used in risk SOAs; financial-security bullet uses only what is true for the client.
**Your answer:**

### Q-SOA-14. Where should per-insurer product facts come from?
**Why it matters:** No reference file holds PDS titles and dates, definitions, waiting and benefit period options or feature names per insurer. Without one, the SOA relies on the quote, the research and Claude's general knowledge.
Options:
- A. Quotes, PDS and research on file only; anything else [ADVISER TO CONFIRM].
- B. A maintained firm reference file per insurer (who keeps it?).
**Default if you don't answer:** Option A.
**Your answer:**

### Q-SOA-15. When the Risk Checklist, quote, CvC and schedule disagree on a figure, which wins?
**Why it matters:** Schedules and the CvC have carried a pre-variation premium. The Risk Checklist commission has differed from the quote.
**Default if you don't answer:** Your instructions > SOA Notes > Risk Checklist > latest signed quote > schedule > fact find > meeting notes; every difference on the review list.
**Your answer:**

### Q-SOA-16. Which completed SOA should be cloned for each case shape?
**Why it matters:** The method clones the "closest same-adviser" SOA, but most firm examples are by other advisers and you became adviser on all SOAs from 23 Oct. Choice of base drives layout and carried wording.
**Default if you don't answer:** Your own most recent SOA of the same shape (single/couple, new/replacement, super/personal, IP-only/full); otherwise the closest firm SOA, fully re-badged.
**Your answer:**

### Q-SOA-17. What are the "key elements" of the duty to take reasonable care that follow the fixed lead-in?
**Why it matters:** The lead-in "The key elements are:" is fixed, but the list is not on file and comes from whatever the clone base carries.
**Default if you don't answer:** Keep the clone base's list verbatim.
**Your answer:**

### Q-SOA-18. What shape do cancel-only, reduction and increase sections take?
**Why it matters:** Retain and new-cover shapes are settled. Cancel sections use the standard labels but no settled content. Reduction has only the health-check line. Increase (alteration of an existing policy) was not found at all.
**Default if you don't answer:** As in `references/recommendation-sections.md` sections D–F, marked for your review.
**Your answer:**

### Q-SOA-19. When the client chose lower cover than first presented ("Client Directed Amounts"), is an underinsurance warning added on top of the INA wording?
**Why it matters:** An earlier note said "say higher needs-based options were presented, the client directed lower, plus an underinsurance warning". Your 26 Oct INA rule says it is superseded "unless Tristan says that applies".
**Default if you don't answer:** INA client-directed wording only; the Incomplete INA warning covers underinsurance.
**Your answer:**

### Q-SOA-20. Does every SOA carry an Alternatives section, even when no alternatives were really researched?
**Why it matters:** Alternatives is now its own section with strategy and product boxes. The app included it only "where alternatives were genuinely considered".
**Default if you don't answer:** Always include it: "Retain existing cover" as an alternative strategy where existing cover exists; products from the Risk Researcher run; if none on file, [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-21. Insurer logos in the portfolio table: every row, or proposed rows only?
**Why it matters:** Your 26 Oct edit put logos on every row (current and proposed). The logo folder's README still says proposed rows only. Some insurers and funds have no logo yet (e.g. Brighter Super, CFS, ART, MLC).
**Default if you don't answer:** Every row; where no logo exists, the insurer name only, and note it on the review list.
**Your answer:**

### Q-SOA-22. Are you a qualified tax relevant provider, and should the SOA say anything about tax advice beyond the incidental note?
**Why it matters:** Not found anywhere. It affects whether tax statements (deductibility, super tax) are framed as incidental.
**Default if you don't answer:** Say nothing about QTRP; include the standard tax-incidental note in Scope.
**Your answer:**

### Q-SOA-23. Does the firm advise on business expenses cover, and if so what changes in the SOA?
**Why it matters:** No rule, wording or example was found.
**Default if you don't answer:** Write the section from the quote and mark it [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-24. Is there a limited-scope SOA that differs from the full one?
**Why it matters:** The fixed scope wording says "You have asked us to limit our advice to the areas listed above". No separate limited-scope version was found.
**Default if you don't answer:** One structure for all SOAs; scope limited by the Included / not-advised lists.
**Your answer:**

### Q-SOA-25. Is there a related-party or conflict disclosure the SOA must carry?
**Why it matters:** Not found anywhere.
**Default if you don't answer:** None.
**Your answer:**

### Q-SOA-26. Which Authority to Proceed and general firm lines are current?
**Why it matters:** The clone base carries declaration lines, a 60-day validity paragraph, a tax-incidental note and an FSG line naming stale versions (Part One V9.0, Part Two 8.1). The firm wording file holds several variants.
**Default if you don't answer:** Keep the clone base's set; update the FSG versions from `_shared/firm-settings.md`; include the tax-incidental note and the 60-day validity paragraph.
**Your answer:**

### Q-SOA-27. When there are no SOA Notes, where should the reasons for the advice come from?
**Why it matters:** In past builds without SOA Notes, the reasoning sat in saved correspondence in the Compliance folder. Whether those files may be opened at all is shared question Q-IN-1; until it is answered they are not opened, so the SOA needs another source for its reasoning.
**Default if you don't answer:** Fact find "Your story" and "Why are you seeking advice", the meeting notes, then ask you in chat before writing; anything still missing is [ADVISER TO CONFIRM].
**Your answer:**

### Q-SOA-28. Who does the compliance steps a Word build does not cover, and should the skill produce anything for them?
**Why it matters:** Peer review, the XPLAN replacement step, Approved Product List and TMD evidence, and the Risk Checklist compliance block are required but outside the build.
**Default if you don't answer:** List them on the review list every time; produce nothing.
**Your answer:**

### Q-SOA-29. If the leak check finds the clone base client's details in the SOA, does that block handover?
**Why it matters:** Cloned SOAs have carried another client's name, images and template text. Whether the check runs every time and with which words is shared question Q-SH-6; this asks only what happens on a hit.
**Default if you don't answer:** Yes. Fix every hit, re-run the check, and do not hand over until it is clean; report the result.
**Your answer:**

### Q-SOA-30. Do your 26 Oct wording corrections apply to SOAs by other advisers, and should the SOA say anything when quotes and applications are under another adviser's name?
**Why it matters:** Most rules here come from your own edits. Insurer quotes and applications currently stay under another adviser while the SOA is under you, which a reviewer may query. (Who uses the skills is shared question Q-SH-2.)
**Default if you don't answer:** All rules apply to every adviser; insurer documents are left as they are and noted on the review list; the SOA itself says nothing.
**Your answer:**

### Q-SOA-31. For a couple, is it always one joint SOA?
**Why it matters:** Decides whether personal details, recommendations and signatures are combined or split, and how the INA note names the clients.
**Default if you don't answer:** One joint SOA, per-person rows, both named, both sign.
**Your answer:**

---

## SOA Pack and DocuSign

### Q-PK-1. In DocuSign, who countersigns the pack: you or Josh Davidson?
**Why it matters:** You are the adviser on every SOA from 23 Oct 2026, but the DocuSign config example and the setup notes still name Josh, and insurer applications stay under Josh. The countersigner is set once in the config and used on every envelope.
**Default if you don't answer:** No default — must answer. (A) Tristan countersigns everything. (B) Tristan countersigns the SOA; Josh countersigns application items. (C) Josh, as the README says.
**Your answer:**

### Q-PK-2. Which FSG file goes in the pack, and should it go in while your Part Two shows out-of-date contact details?
**Why it matters:** Your folder holds three files: Part 1 v9.1 alone, your Part Two v8.0 alone, and the "FSG Combined 2026" (Part 1 + Part Two). The Part Two shows an old mobile and personal address, and a corrected profile from Synchron is pending.
**Default if you don't answer:** The Combined 2026 file, copied unchanged as `NN - FSG.pdf`, with a review line about the contact details. (A) Combined. (B) Part 1 only. (C) Part 1 and Part Two as two files.
**Your answer:**

### Q-PK-3. Which documents are inside the DocuSign envelope, and who signs each one?
**Why it matters:** The routing table in the READ ME and the manifest depend on it. It is clear the SOA Authority to Proceed and each application are signed, but not whether the FSG, Fact Find, cancellation letters, Change of Servicing Rights and PDS are signed, acknowledged or just included.
**Default if you don't answer:** Everything numbered up to and including the PDS goes in the envelope. Clients sign the SOA Authority to Proceed, their own application(s) and their own letters; the FSG, Fact Find and PDS are included with no fields.
**Your answer:**

### Q-PK-4. Where are the house templates for the cancellation letter and the alteration letter, and must a replacement-cover cancellation say "only once new cover is in force"?
**Why it matters:** When the firm has not written a letter, the skill must fill a house template, but no template path is known (only the Change of Servicing Rights template is). Cancelling before new cover starts could leave a client uninsured.
**Default if you don't answer:** Ask you for a firm letter each time a letter is needed; do not generate one. No "in force" wording added.
**Your answer:**

### Q-PK-5. Is the date on letters always the pack build date, or the date the client signs?
**Why it matters:** The fix script stamps the build date, but the client may sign days later and the insurer may read the date as the cancellation date.
**Default if you don't answer:** Build date, dd/mm/yyyy.
**Your answer:**

### Q-PK-6. Is DocuSign ready, who writes each manifest, and should signing field positions be standard per document?
**Why it matters:** As of 22 Oct the developer app, config and Go-Live (20 demo calls) were not confirmed. Field positions are found by hand per pack; the SOA Authority to Proceed page and insurer pre-fills may be standard enough to template. The envelope subject and message have no set wording.
**Default if you don't answer:** Skip DocuSign unless you ask. When asked, Claude writes the manifest, runs a dry run, and you approve before any draft is created. Subject: "<Surname(s)> - Statement of Advice for signing"; no message.
**Your answer:**

### Q-PK-7. For a reduction, what is the exact name, position and covering wording for the signed quote illustration and alteration letter? Do quotes ever go in otherwise?
**Why it matters:** "No quotes" is the rule, but a reduction needs the insurer's signed illustration as the signing item. There is no set name, slot or alteration wording.
**Default if you don't answer:** Put it directly after the alteration letter as `NN - <Insurer> Signed Quote Illustration - <Full Name>.pdf`; ask you for the alteration letter wording. No other quotes, ever.
**Your answer:**

### Q-PK-8. When a document is in the pack as both .docx and .pdf, should both go into DocuSign, and do they share one number?
**Why it matters:** Today they share a number (e.g. `01 - ... .docx` and `01 - ... .pdf`). Uploading both into DocuSign would duplicate the SOA.
**Default if you don't answer:** Share a number. Only the PDF goes into the envelope; the .docx stays in the folder for reference.
**Your answer:**

### Q-PK-9. When is a Change of Servicing Rights needed, and is it one per person or one per policy?
**Why it matters:** The confirmed order lists it "where relevant", but the trigger (policy kept but moved to Legacy's servicing) and the count are not written down.
**Default if you don't answer:** One per person per kept policy whose servicing adviser changes to Legacy, filled from the house template.
**Your answer:**

### Q-PK-10. Which insurer forms count as "required" (rollover authority, beneficiary nomination, direct debit for insurers other than TAL)?
**Why it matters:** Earlier packs included beneficiary nominations, rollovers and direct debits; the 22 Oct format says insurer forms only when required, and "ask if unsure".
**Default if you don't answer:** Rollover authority when cover is funded by rollover and the application does not cover it; TAL direct debit left out when the TAL summary holds payment details; ask about everything else.
**Your answer:**

### Q-PK-11. How should the current PDS be confirmed, and what file name should it have in the pack?
**Why it matters:** Library and insurer guide copies are often superseded. The app looks only in Downloads. A stale PDS in a signed pack is a compliance problem.
**Default if you don't answer:** Take it from the insurer's website or a recent client folder, check its date against the insurer's site, keep the insurer's file name, and flag the date in the review list.
**Your answer:**

### Q-PK-12. What is the exact pack folder name for a single client, a same-surname couple and a different-surname couple?
**Why it matters:** The app uses `Surname, F` / `Surname, F & F` / `Surname1 F1 & Surname2 F2`, while hand-built packs use `<Surname(s)> - SOA Pack`. The same name is used inside the SOA, Fact Find and Risk Checklist file names.
**Default if you don't answer:** Folder `<Surname> - SOA Pack` or `<Surname1> & <Surname2> - SOA Pack`; inside file names, the firm naming rule in `_shared/firm-rules.md`.
**Your answer:**

### Q-PK-13. If a pack folder already exists, overwrite it or make a new one?
**Why it matters:** The app deletes everything in it, including letters and CvCs you added by hand. A locked folder once forced a "FINAL" folder.
**Default if you don't answer:** Never delete. Build into `<name> - SOA Pack (rebuilt dd-mm-yyyy)` and say so.
**Your answer:**

### Q-PK-14. When there are two "Final" versions of a document, is there a tie-break rule, or always ask?
**Why it matters:** "Newest by date" can pick a later re-save that is not the signed-off version.
**Default if you don't answer:** Always ask you if they differ; if identical (same hash), use either and note it.
**Your answer:**

### Q-PK-15. Which READ ME format do you actually open: .md, .txt, or .docx + .pdf?
**Why it matters:** The app writes `.txt`, the skill writes `.md`, and a converter makes `.docx` + `.pdf`. Three formats means three things to keep in step.
**Default if you don't answer:** `.md` plus `.pdf` via `readme_to_docx.py`.
**Your answer:**

### Q-PK-16. If Word's PDF export fails, is shipping the .docx alone acceptable?
**Why it matters:** Word's export sometimes hangs until a reboot. DocuSign accepts .docx, but the client then sees a Word document.
**Default if you don't answer:** Yes: ship the .docx, flag it in the review list, and tell you at handover.
**Your answer:**

### Q-PK-17. Is the Workbench "SOA Pack" screen a first pass that this skill finishes, or should it be fixed or retired?
**Why it matters:** It wipes the folder on rebuild, can misname a partner's application, picks the FSG from the wrong place and skips the letter fix. Two routes give two different packs.
**Default if you don't answer:** This skill is the route of record; the screen is optional and its output is checked against this skill before sending.
**Your answer:**

### Q-PK-18. Should the READ ME show the full SHA-256 or the first 16 characters?
**Why it matters:** The hash list is the audit proof that firm documents were not changed.
**Default if you don't answer:** Full hash.
**Your answer:**

### Q-PK-19. If the SOA or Fact Find shows the wrong adviser, flag and continue, or stop the build?
**Why it matters:** Copy-never-fix means the skill cannot correct it, but sending a pack with the wrong adviser is a compliance risk.
**Default if you don't answer:** Stop and tell you before building further.
**Your answer:**

### Q-PK-20. Is the Risk Checklist signed or used by anyone, and does it need hash proof like the firm documents?
**Why it matters:** It sits last and outside the envelope, so its purpose in the pack (file record, your review) decides whether it needs a PDF and hash.
**Default if you don't answer:** Plain copy, hashed, PDF if Word-only, outside the envelope.
**Your answer:**

---

## CvC / FINAL Insurance Summary

### Q-CVC-1. Is "Yearly Premium" the quote's annual premium, or the gross monthly × 12?
**Why it matters:** Insurers often load monthly payments, so monthly × 12 is usually higher than the quoted annual premium. The client sees this figure as the cost of the advice.
**Default if you don't answer:** Gross monthly × 12, whole dollars, so it matches the monthly figures on the same page.
**Your answer:**

### Q-CVC-2. How is "Yearly Saving" worked out when the current policy is billed yearly (or the two are on different frequencies)?
**Why it matters:** The rule is (current monthly − new monthly) × 12. A yearly-billed current policy has no true monthly figure, and dividing by 12 can overstate or understate the saving.
**Default if you don't answer:** No default — must answer. (A) Compare annual to annual. (B) Convert both to monthly first. (C) Ask each time.
**Your answer:**

### Q-CVC-3. How are figures rounded to whole dollars: round, round up, or truncate? Rounded per line or only the totals?
**Why it matters:** Rounding each line then adding can differ from the rounded total by a dollar or two, which clients notice.
**Default if you don't answer:** Round each line to the nearest dollar; totals are the sum of the rounded lines.
**Your answer:**

### Q-CVC-4. Can you supply a blank `CvC ` sheet (or one example with client details removed) so the cell layout can be fixed, and does the layout change by insurer?
**Why it matters:** The exact cells, which rows to delete and the print area are not recorded anywhere, so every CvC is worked out from scratch.
**Default if you don't answer:** Work out the layout from each client's sheet and confirm it with you before exporting.
**Your answer:**

### Q-CVC-5. When cover goes up but the premium goes down (or the reverse), which bottom row applies?
**Why it matters:** The rule says "cover up → Yearly Premium" and "saves money → Yearly Saving". A switch to a cheaper insurer with more cover meets both.
**Default if you don't answer:** Decide by premium: lower premium → Yearly Saving; higher → Yearly Premium.
**Your answer:**

### Q-CVC-6. What is the source of truth for the current premium: the insurer schedule, the last signed quote or variation, or XPLAN?
**Why it matters:** One CvC carried a pre-variation premium after a signed variation. The saving figure depends on it.
**Default if you don't answer:** The last signed insurer quote or variation; flag any difference from the sheet or schedule.
**Your answer:**

### Q-CVC-7. Where does the plan (policy) fee go when there is no Life/TPD row, and is it shown separately or folded into the row premium?
**Why it matters:** The rule "plan fee on the Life/TPD row" fails for income-protection-only or trauma-only advice.
**Default if you don't answer:** Folded into the Life/TPD row premium; if there is no Life/TPD row, ask.
**Your answer:**

### Q-CVC-8. For a joint or linked policy covering both people, how is it split between the two summaries?
**Why it matters:** The firm does one summary per life insured, but one premium and one plan fee may cover both.
**Default if you don't answer:** Each person's own cover lines on their summary; the plan fee on the first-named life insured's; ask before exporting.
**Your answer:**

### Q-CVC-9. For a new client with no current cover, do you keep an empty Current Policy Details block or remove it?
**Why it matters:** The sheet assumes a comparison. An empty block may confuse the client; removing it changes the layout.
**Default if you don't answer:** Keep the block showing "No current cover"; bottom row Yearly Premium.
**Your answer:**

### Q-CVC-10. When the proceeding cover is split across two insurers or products, one block or one per insurer?
**Why it matters:** The heading is `Proceeding Cover - <Insurer product>`, which assumes one product.
**Default if you don't answer:** One block per insurer/product, then one combined gross monthly.
**Your answer:**

### Q-CVC-11. Do you want the cut-down xlsx kept next to the PDF, or the PDF only?
**Why it matters:** Only the PDF goes in the pack. The xlsx is useful for later changes but is another copy of client data in Downloads.
**Default if you don't answer:** Keep both in `Downloads\<Surname(s)> - CvC\`.
**Your answer:**

### Q-CVC-12. Should super-held and non-super cover be shown separately on the CvC?
**Why it matters:** Ownership affects who pays and how; a combined figure may hide that part is paid from super.
**Default if you don't answer:** Follow whatever the firm's sheet already shows for that client; do not add a split.
**Your answer:**

### Q-CVC-13. Should the summary carry a date or quote reference (e.g. "based on quote dated …")?
**Why it matters:** Premiums change. A dated summary shows which quote it reflects if the client queries it later.
**Default if you don't answer:** No date added; leave the sheet as the firm laid it out.
**Your answer:**

### Q-CVC-14. When the SOA and the final insurer quote disagree on cover or premium, which wins for the CvC?
**Why it matters:** The CvC must match what the client signs. A late requote may postdate the SOA.
**Default if you don't answer:** Stop and ask; do not pick one.
**Your answer:**

---

## Application details sheet

### Q-AD-1. Is there a firm template or a confirmed example for the application details sheet, and the exact "check before lodging" wording?
**Why it matters:** The first sheet's builder was not kept and no template exists, so the layout in the skill is a proposal. A fixed layout lets the team check one sheet against another.
**Default if you don't answer:** Use the proposed layout in `references/sheet-layout.md` and the hit texts in the skill.
**Your answer:**

### Q-AD-2. Is a Word file enough, or do you also want a PDF, and should it be saved anywhere besides Downloads?
**Why it matters:** The sheet holds health and income details. Where it lives decides who can see it and whether it ends up on the client file.
**Default if you don't answer:** Word only, in `Downloads\<Surname(s)> - Application Details.docx`. Never in SharePoint.
**Your answer:**

### Q-AD-3. Who uses the sheet and how: you keying into the insurer portal, a VA, or a phone/tele-interview?
**Why it matters:** The row order should follow how it is used. Keying into a portal is fastest when rows follow that insurer's application screens.
**Default if you don't answer:** You key it in yourself; generic row order (personal, contact, occupation, cover, health, existing cover).
**Your answer:**

### Q-AD-4. How much health detail goes on the sheet: quoted file-note wording, a summary, or "see file notes" only?
**Why it matters:** Health facts are sensitive and an inaccurate summary on an application is a disclosure risk.
**Default if you don't answer:** Quote the file-note wording with its date; no summarising; flag anything unclear.
**Your answer:**

### Q-AD-5. For the birthday check, which age does each insurer price on (age next birthday or age last birthday), and how close to a birthday should it warn?
**Why it matters:** The check is meant to catch a premium jump before lodging, but the trigger date differs by insurer pricing basis.
**Default if you don't answer:** Warn if any birthday falls between today and the expected lodging date, whatever the insurer.
**Your answer:**

### Q-AD-6. Is 60 days the quote validity for every insurer, and should the warning start earlier (e.g. at 45 days)?
**Why it matters:** Some insurers may hold quotes for different periods. A quote expiring during underwriting causes a requote.
**Default if you don't answer:** 60 days for all insurers, warn when over 60 days at the expected lodging date.
**Your answer:**

### Q-AD-7. What lodging date should the checks assume when you don't give one?
**Why it matters:** Birthday and quote-age checks need a date.
**Default if you don't answer:** Today + 7 days, stated on the sheet.
**Your answer:**

### Q-AD-8. Which personal rows are needed for every application (residency, smoker status, height/weight, etc.)?
**Why it matters:** Missing rows mean a call back to the client mid-application.
**Default if you don't answer:** The rows listed in `references/sheet-layout.md`.
**Your answer:**

### Q-AD-9. Is Josh Davidson always the adviser named on applications, or does that move to you?
**Why it matters:** The 26 Oct split keeps applications and quotes under Josh, while SOAs are under you. The sheet names the adviser for lodging.
**Default if you don't answer:** Josh Davidson on applications.
**Your answer:**

### Q-AD-10. Should payment details go on the sheet, and if so how much (bank name only, last 4 digits, full)?
**Why it matters:** Full bank or card numbers on a loose Word file are a privacy risk; but the payment step needs them.
**Default if you don't answer:** Payment method and fund name only; account and card numbers never copied, shown as "see Fact Find / client to provide".
**Your answer:**

### Q-AD-11. Should beneficiary nominations go on the sheet?
**Why it matters:** Earlier packs included beneficiary nominations; the current pack does not mention them.
**Default if you don't answer:** Include beneficiaries if the Fact Find or SOA names them; otherwise `NOT FOUND - ask client`.
**Your answer:**

### Q-AD-12. For replaced cover, should the sheet always warn "do not cancel until new cover is accepted"?
**Why it matters:** Cancelling existing cover before acceptance can leave the client uninsured.
**Default if you don't answer:** Yes, a red line for every policy being replaced.
**Your answer:**

### Q-AD-13. Which other checks belong in the red list (smoker status vs quote, income supports the IP benefit, super can fund the premium, SOA signed first)?
**Why it matters:** Only three checks are confirmed (birthday, 60-day quote, occupation). Others catch common declines and requotes.
**Default if you don't answer:** The three confirmed checks plus missing facts, SOA vs quote and the replaced-cover warning.
**Your answer:**

### Q-AD-14. Do you want a "source" column showing where each fact came from?
**Why it matters:** Makes checking quick and shows nothing was guessed, but makes the sheet wider.
**Default if you don't answer:** No source column; sources available on request.
**Your answer:**

### Q-AD-15. Should "prepare X for an application" also check that the SOA has been signed before the sheet is made?
**Why it matters:** Lodging before the Authority to Proceed is signed may breach the firm's process.
**Default if you don't answer:** No; the sheet is made on request. Signing status is your call.
**Your answer:**
