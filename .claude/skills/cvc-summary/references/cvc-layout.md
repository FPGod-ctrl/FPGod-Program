# CvC sheet layout

Version 1.0.0. The firm's sheet lives in each client's Insurance Cover Summary workbook. No
blank template is kept in the repo, and the earlier builder script was not kept. So work out the
cell map from each client's own sheet, and confirm the plan with Tristan before exporting.
(default, Q-CVC-4) What is known:

## Sheet

- Workbook: `Insurance Cover Summary ... .xlsx` in the client folder.
- Sheet name: `CvC ` (trailing space). Address it exactly, e.g. `$wb.Worksheets.Item('CvC ')`.
- Title: `Insurance Review Summary`.

## Blocks, top to bottom

1. Client details (name, phone and similar). Fill blanks from the Fact Find, then the application.
2. **Current Policy Details**: insurer, cover types, amounts, monthly premium. New client with no
   current cover: keep the block and show `No current cover`. (default, Q-CVC-9)
3. **New Cover** blocks, one per option the firm modelled. For the FINAL summary keep only one,
   headed `Proceeding Cover - <Insurer product>`, insurer named. Proceeding cover split across two
   insurers or products: one block each. (default, Q-CVC-10)
4. Gross monthly (one combined figure when there are two proceeding blocks).
5. Bottom row: `Yearly Premium` or `Yearly Saving`.

## Rows inside a cover block (expected)

| Row | Content |
|---|---|
| Life / TPD | Sum insured, premium **with the plan fee folded in** (default, Q-CVC-7) |
| Trauma | Sum insured, premium |
| Income protection | Monthly benefit, waiting/benefit period, premium |
| Gross monthly | Total |

Whether each insurer's quote maps to these rows the same way (e.g. TPD linked vs stand-alone,
super vs non-super split, policy fee vs plan fee naming) is checked on each client's sheet and
shown to Tristan in the layout plan. (default, Q-CVC-4) Super vs non-super: follow what the
firm's sheet already shows; add no split. (default, Q-CVC-12)

## Figures

| Figure | Rule |
|---|---|
| Premiums | From the final insurer SOA quote. Each line rounded to the nearest dollar; totals are the sum of the rounded lines. (default, Q-CVC-3) |
| Plan fee | Folded into the Life/TPD row premium. No Life/TPD row → ask Tristan. (default, Q-CVC-7) |
| Current premium | The last signed quote or variation; flag any difference from the sheet or schedule. (default, Q-CVC-6) |
| Yearly Premium | Proceeding gross monthly × 12, whole dollars. (default, Q-CVC-1) |
| Yearly Saving | (current monthly − new monthly) × 12 when both are billed monthly. Frequencies differ → ask Tristan; unanswered → `[ADVISER TO CONFIRM]`. (open, Q-CVC-2) |

## Excel COM notes

- Open the working copy, not the SharePoint file.
- PowerShell: `$cell.Formula = [string]$value`. Assigning a double to `.Value2` throws.
- After deleting option blocks, reset the print area to the kept range.
- Export: `$ws.ExportAsFixedFormat(0, "<path>.pdf")` (0 = PDF). Close without saving the
  original; save the copy first.
- Quit Excel in a `finally` block.

## Layout plan (shown to Tristan before export)

For each client sheet, list: the cell address of each label and value used, which rows are
deleted for each unused option, the print area, and every figure written. Export only after he
OKs it. (default, Q-CVC-4) If he later supplies a blank `CvC ` sheet, its cell map goes here in
a 1.1 update.
