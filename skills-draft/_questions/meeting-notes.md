# Questions for Tristan: meeting-notes skill (v0.1.0-draft)

Answer on the "Your answer" line. A one-word or A/B answer is enough. Until answered, the skill uses the default shown.

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
