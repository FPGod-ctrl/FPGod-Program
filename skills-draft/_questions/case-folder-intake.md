# Questions for Tristan: case-folder-intake

About `case-folder-intake/SKILL.md` and its references. Most important first. Type under **Your answer:**. "Default is fine" is a valid answer.

---

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
