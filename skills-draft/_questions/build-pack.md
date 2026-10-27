# Questions for Tristan: build-pack

Skill: `skills-draft/build-pack/` (0.1.0-draft). Most important first. Write your answer under
each one. Where you don't answer, the skill follows the default.

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
