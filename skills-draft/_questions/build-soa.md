# Open questions: build-soa (draft 0.1.0)

For Tristan. Most important first. Each question is tagged in the skill text as `[Q-SOA-n]`.
Until a question is answered, the skill follows the default shown. Write your answer under
**Your answer:** and the skill will be updated for the next version.

---

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
