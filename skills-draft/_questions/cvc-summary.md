# Questions for Tristan: cvc-summary

Skill: `skills-draft/cvc-summary/` (0.1.0-draft). Most important first. Write your answer under
each one. Where you don't answer, the skill follows the default.

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
