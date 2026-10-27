---
name: cvc-summary
description: >
  Make the CvC / FINAL Insurance Summary for a Legacy Risk Advice client: the `CvC ` sheet of the
  client's Insurance Cover Summary workbook, cut down to the cover the client is proceeding with,
  filled from the final insurer quote, one xlsx and PDF per life insured. Use when Tristan says
  "CvC", "do the CvC for X", "CvC for the pack", "FINAL Insurance Summary for X", "the cover we're
  proceeding with", "insurance summary for the pack".
metadata:
  version: 1.0.0
  owner: Legacy Risk Advice
  updated: 27 Oct 2026
---

# CvC / FINAL Insurance Summary

Version 1.0.0. Every point Tristan had not yet answered is settled on its default and tagged
`(default, Q-CVC-n)`. The one question with no safe default is tagged `(open, Q-CVC-2)` and the
skill stops and asks there. Answers he gives later become 1.1 updates. The question list is kept
in the repo at `skills-draft/_questions/cvc-summary.md`.

Firm identity, client data rule, SharePoint read-only rule, email rule, folders and naming are in
`../_shared/firm-settings.md` and `../_shared/firm-rules.md`. Read both first.

Paths: `../_shared/` is `.claude/skills/_shared/`. Machine paths use the local settings in
firm-settings §10: `<DOWNLOADS>` (default `%USERPROFILE%\Downloads`), `<WORK_ROOT>`.

## Purpose

Give each client a one-page summary comparing their current cover with the cover they are
proceeding with, and the yearly cost or saving. It goes at the end of the SOA pack, outside the
DocuSign envelope. Tristan sends it to the client himself.

"CvC" means the **`CvC ` sheet** (note the trailing space in the sheet name) of the client's
`Insurance Cover Summary ... .xlsx`. Its title is "Insurance Review Summary".

## When to use

- Tristan asks for the CvC or FINAL Insurance Summary.
- `build-pack` needs FINAL summaries and Tristan asks for them to be made.

## When not to use

- The client has not chosen a cover option yet. The multi-option sheet is the firm's working
  file. Do not cut it down until the proceeding cover is known.
- Never edit the firm's workbook in SharePoint. Always work on a copy.

## Inputs

| Input | Source |
|---|---|
| Insurance Cover Summary xlsx (`CvC ` sheet) | Client folder (copied out) |
| Final insurer SOA quote for the proceeding cover | Client folder |
| SOA (which option, which insurer, which product) | Client folder |
| Current policy details and premium | The last signed insurer quote or variation; the schedule and sheet are checked against it (default, Q-CVC-6) |
| Missing client details (phone, date of birth, etc.) | Fact Find, then the application |

## Steps

1. **Copy out.** Copy the Insurance Cover Summary xlsx out of the client folder to
   `<WORK_ROOT>\<case name>\`. Never open the SharePoint file for writing.
2. **Confirm the proceeding cover** from the SOA and the final insurer quote: insurer, product,
   each cover type and amount, premium. If the SOA and the quote disagree, stop and ask Tristan;
   do not pick one. (default, Q-CVC-14) Add no date or quote reference; leave the sheet as the
   firm laid it out. (default, Q-CVC-13)
3. **Check the current premium.** Compare the Current Policy Details block with the last signed
   insurer quote or variation. A schedule or CvC can still carry a pre-variation premium. If they
   differ, use the signed figure and flag it. (default, Q-CVC-6)
4. **Work out the layout.** Map the client's `CvC ` sheet (labels, value cells, option blocks,
   print area) as in `references/cvc-layout.md`. Show Tristan the plan (what is kept, what is
   deleted, the figures) and get his OK before exporting. (default, Q-CVC-4)
5. **One copy per life insured.** For each life insured, make a separate copy of the workbook.
6. **Cut to the proceeding cover.** On the `CvC ` sheet keep the Current Policy Details block on
   top and the proceeding cover below it. Delete the other option blocks. If the proceeding cover
   is split across two insurers or products, keep one block per insurer/product, then one
   combined gross monthly. (default, Q-CVC-10)
7. **Fill the proceeding block(s)** from the final insurer quote:
   - Heading: `Proceeding Cover - <Insurer product>`.
   - Insurer: name the insurer (e.g. `[INSURER_A]`). Never "Market Option".
   - Each cover type, amount and premium from the quote.
   - Plan fee folded into the Life/TPD row premium. No Life/TPD row → ask Tristan. (default, Q-CVC-7)
   - Whole dollars: round each line to the nearest dollar; totals are the sum of the rounded
     lines. (default, Q-CVC-3)
   - Gross monthly total.
   - Super-held and non-super cover: follow whatever the firm's sheet already shows for that
     client; add no split. (default, Q-CVC-12)
8. **Fill blank client details** (name, phone, date of birth, etc.) from the Fact Find, then the
   application. Never leave a field blank if a firm document has it. If no document has it, flag
   it.
9. **Set the bottom row** (see Decision rules): "Yearly Premium" or "Yearly Saving". Never
   "Yearly Increase".
10. **Save the xlsx and export the PDF** with Excel (COM). In PowerShell set cells with
    `.Formula = [string]$value`; assigning a double to `.Value2` throws "cannot cast Double to
    String". Check the print area covers exactly the kept blocks.
11. **Name and place the output** (see Output). Run the checks. Hand over.

## Hard rules

- Work on a copy. Never write into SharePoint.
- The CvC is a generated document, so it may be filled and edited. But the firm documents it
  draws on (SOA, quote, Fact Find, application) are read only. Never change them to make the CvC
  agree.
- Every figure must trace to the final insurer quote or the current policy's signed figure.
  Do not estimate.
- Insurer named, not "Market Option". Heading `Proceeding Cover - <Insurer product>`.
- Current block above the proceeding block.
- Bottom row is "Yearly Premium" or "Yearly Saving". Never "Yearly Increase".
- One per life insured.
- No export before Tristan has OK'd the layout plan. (default, Q-CVC-4)
- No real client data in this skill or its examples. Placeholders only.

## Decision rules

| IF | THEN |
|---|---|
| The change **increases** cost (more cover, or new cover with no current cover) | Bottom row `Yearly Premium` = the proceeding cover's gross monthly × 12, whole dollars, so it matches the monthly figures on the page. (default, Q-CVC-1) |
| The change **saves** money and both policies are billed monthly | Bottom row `Yearly Saving` = (current monthly − new monthly) × 12. |
| Current billed yearly and proceeding billed monthly, or any other frequency mismatch | Do not convert. Stop and ask Tristan how to work out the figure. If he has not answered by export, write `[ADVISER TO CONFIRM]` in the bottom row and put it on the review list. (open, Q-CVC-2) |
| Cover goes up but premium goes down, or the reverse | Decide by premium: lower premium → `Yearly Saving`; higher → `Yearly Premium`. (default, Q-CVC-5) |
| **Couple** | Two outputs, one per life insured, each with that person's current and proceeding cover. |
| **Single** | One output. |
| One policy covers both people (joint/linked) | Each person's own cover lines on their summary; the plan fee on the first-named life insured's. Confirm the split with Tristan before exporting. (default, Q-CVC-8) |
| No current cover (new client) | Keep the Current Policy Details block showing "No current cover"; bottom row `Yearly Premium`. (default, Q-CVC-9) |
| Proceeding cover spread over two insurers or products | One block per insurer/product, then one combined gross monthly. (default, Q-CVC-10) |
| Current premium on the sheet ≠ last signed insurer quote / variation | Use the signed figure and flag it. (default, Q-CVC-6) |
| SOA and final quote disagree | Stop and ask. (default, Q-CVC-14) |
| Client detail blank on the sheet | Fill from Fact Find, then application. Flag if still missing. |
| No Life/TPD row (e.g. income protection only) | Ask Tristan where the plan fee goes. (default, Q-CVC-7) |

## Output

```
<DOWNLOADS>\<Surname(s)> - CvC\
  FINAL Insurance Summary - <First Last>.xlsx
  FINAL Insurance Summary - <First Last>.pdf
```

Both the cut-down xlsx and the PDF are kept, one pair per life insured. (default, Q-CVC-11)
`build-pack` copies the PDFs into the pack as `NN - FINAL Insurance Summary - <First Last>.pdf`,
after the PDS and before the Risk Checklist, outside the DocuSign envelope.

## Fixed wording

- `Proceeding Cover - <Insurer product>`
- `Yearly Premium`
- `Yearly Saving`
- `No current cover` (Current block for a new client) (default, Q-CVC-9)
- Never: `Yearly Increase`, `Market Option`.
- File name: `FINAL Insurance Summary - <First Last>.pdf`
- Sheet title stays as the firm has it: `Insurance Review Summary`.

## Checks before handing over

- [ ] One xlsx and PDF per life insured, named `FINAL Insurance Summary - <First Last>`.
- [ ] Only the Current block and the proceeding block(s) remain. Print area shows nothing else.
- [ ] Insurer named; heading reads `Proceeding Cover - <Insurer product>`.
- [ ] Every cover amount and premium matches the final insurer quote.
- [ ] Plan fee is folded into the Life/TPD row (or placed where Tristan said).
- [ ] Whole dollars, each line rounded to the nearest dollar; totals = sum of rounded lines.
- [ ] Current premium matches the last signed quote or variation.
- [ ] Gross monthly totals add up.
- [ ] Bottom row label and figure follow the decision rules. No "Yearly Increase". Any frequency
      mismatch was asked about, or the figure is `[ADVISER TO CONFIRM]`. (open, Q-CVC-2)
- [ ] No blank client details that a firm document could fill.
- [ ] Tristan OK'd the layout plan before export.
- [ ] Nothing written in SharePoint.
- [ ] Hand over: folder path, the bottom-row figure per person, anything flagged, and the version
      line from `../_shared/firm-rules.md` 10.2.

## Decisions taken on defaults

Version 1.0.0 applies the stated default for Q-CVC-1 and Q-CVC-3 to Q-CVC-14. Still open:
**Q-CVC-2** (Yearly Saving when billing frequencies differ) — no default; the skill asks each
time and otherwise writes `[ADVISER TO CONFIRM]`. Questions file:
`skills-draft/_questions/cvc-summary.md`.
