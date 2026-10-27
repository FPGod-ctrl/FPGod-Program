# CvC sheet layout

Version 0.1.0-draft. The firm's sheet lives in each client's Insurance Cover Summary workbook. No
blank template is kept in the repo, and the earlier builder script was not kept. So the exact
cell map is NOT FOUND [Q-CVC-4]. What is known:

## Sheet

- Workbook: `Insurance Cover Summary ... .xlsx` in the client folder.
- Sheet name: `CvC ` (trailing space). Address it exactly, e.g. `$wb.Worksheets.Item('CvC ')`.
- Title: `Insurance Review Summary`.

## Blocks, top to bottom

1. Client details (name, phone and similar). Fill blanks from the Fact Find, then the application.
2. **Current Policy Details**: insurer, cover types, amounts, monthly premium.
3. **New Cover** blocks, one per option the firm modelled. For the FINAL summary keep only one,
   headed `Proceeding Cover - <Insurer product>`, insurer named.
4. Gross monthly.
5. Bottom row: `Yearly Premium` or `Yearly Saving`.

## Rows inside a cover block (expected)

| Row | Content |
|---|---|
| Life / TPD | Sum insured, premium, **plus the plan fee** |
| Trauma | Sum insured, premium |
| Income protection | Monthly benefit, waiting/benefit period, premium |
| Gross monthly | Total |

Whether each insurer's quote maps to these rows the same way (e.g. TPD linked vs stand-alone,
super vs non-super split, policy fee vs plan fee naming) is open [Q-CVC-4], [Q-CVC-12].

## Figures

| Figure | Rule |
|---|---|
| Premiums | From the final insurer SOA quote. Whole dollars [Q-CVC-3]. |
| Plan fee | On the Life/TPD row [Q-CVC-7]. |
| Current premium | Current policy; checked against last signed quote or variation [Q-CVC-6]. |
| Yearly Premium | New cover's annual cost [Q-CVC-1]. |
| Yearly Saving | (current monthly − new monthly) × 12 [Q-CVC-2]. |

## Excel COM notes

- Open the working copy, not the SharePoint file.
- PowerShell: `$cell.Formula = [string]$value`. Assigning a double to `.Value2` throws.
- After deleting option blocks, reset the print area to the kept range.
- Export: `$ws.ExportAsFixedFormat(0, "<path>.pdf")` (0 = PDF). Close without saving the
  original; save the copy first.
- Quit Excel in a `finally` block.

## To finish this file

When Tristan supplies a blank `CvC ` sheet or one confirmed example with client data removed,
record here: the cell address of each label and value, which rows to delete for each unused
option, and the print area.
