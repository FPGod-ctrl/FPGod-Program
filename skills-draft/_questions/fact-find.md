# Questions for Tristan: fact-find skill (v0.1.0-draft)

Answer on the "Your answer" line. A one-word or A/B answer is enough. Until answered, the skill uses the default shown.

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
