# Questions for Tristan: shared files

About `_shared/firm-settings.md` and `_shared/firm-rules.md`. Most important first. Type under **Your answer:**. "Default is fine" is a valid answer.

---

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
