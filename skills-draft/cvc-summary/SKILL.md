---
name: cvc-summary
description: >
  Make the CvC / FINAL Insurance Summary for a Legacy Risk Advice client: the `CvC ` sheet of the
  client's Insurance Cover Summary workbook, cut down to the cover the client is proceeding with,
  filled from the final insurer quote, one xlsx and PDF per life insured. Use when the adviser says
  "CvC", "do the CvC for X", "FINAL Insurance Summary", "the cover we're proceeding with",
  "insurance summary for the pack".
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
---

# CvC / FINAL Insurance Summary

DRAFT. Items marked [Q-CVC-n] are open questions for Tristan, listed in
`../_questions/cvc-summary.md`. Until answered, follow the default stated there.

Firm identity, client data rule, SharePoint read-only rule, email rule, folders and naming are in
`../_shared/firm-settings.md` and `../_shared/firm-rules.md`. Read both first.

## Purpose

Give each client a one-page summary comparing their current cover with the cover they are
proceeding with, and the yearly cost or saving. It goes at the end of the SOA pack, outside the
DocuSign envelope. The adviser sends it to the client himself.

"CvC" means the **`CvC ` sheet** (note the trailing space in the sheet name) of the client's
`Insurance Cover Summary ... .xlsx`. Its title is "Insurance Review Summary".

## When to use

- The adviser asks for the CvC or FINAL Insurance Summary.
- `build-pack` needs FINAL summaries and the adviser asks for them to be made.

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
| Current policy details and premium | Current schedule; check against the last signed insurer quote or variation |
| Missing client details (phone, date of birth, etc.) | Fact Find, then the application |

## Steps

1. **Copy out.** Copy the Insurance Cover Summary xlsx out of the client folder to a working
   folder. Never open the SharePoint file for writing.
2. **Confirm the proceeding cover** from the SOA and the final insurer quote: insurer, product,
   each cover type and amount, premium. If the SOA and the quote disagree, stop and ask
   [Q-CVC-14]. Add no date or quote reference unless asked [Q-CVC-13].
3. **Check the current premium.** Compare the Current Policy Details block with the last signed
   insurer quote or variation. A schedule or CvC can still carry a pre-variation premium. If they
   differ, use the signed figure and flag it [Q-CVC-6].
4. **One copy per life insured.** For each life insured, make a separate copy of the workbook.
5. **Cut to one New Cover block.** On the `CvC ` sheet keep the Current Policy Details block on
   top and one New Cover block below it. Delete the other option blocks.
6. **Fill the proceeding block** from the final insurer quote:
   - Heading: `Proceeding Cover - <Insurer product>`.
   - Insurer: name the insurer (e.g. `[INSURER_A]`). Never "Market Option".
   - Each cover type, amount and premium from the quote.
   - Plan fee on the Life/TPD row [Q-CVC-7].
   - Whole dollars [Q-CVC-3].
   - Gross monthly total.
7. **Fill blank client details** (name, phone, date of birth, etc.) from the Fact Find, then the
   application. Never leave a field blank if a firm document has it. If no document has it, flag
   it.
8. **Set the bottom row** (see Decision rules): "Yearly Premium" or "Yearly Saving". Never
   "Yearly Increase".
9. **Save the xlsx and export the PDF** with Excel (COM). In PowerShell set cells with
   `.Formula = [string]$value`; assigning a double to `.Value2` throws "cannot cast Double to
   String". Check the print area covers exactly the kept blocks.
10. **Name and place the output** (see Output). Run the checks. Hand over.

Cell layout of the sheet: see `references/cvc-layout.md` (partly NOT FOUND) [Q-CVC-4].

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
- No real client data in this skill or its examples. Placeholders only.

## Decision rules

| IF | THEN |
|---|---|
| The change **increases** cost (more cover, or new cover with no current cover) | Bottom row label `Yearly Premium` = the proceeding cover's annual cost [Q-CVC-1]. |
| The change **saves** money (switch or reduction) | Bottom row label `Yearly Saving` = (current monthly − new monthly) × 12 [Q-CVC-2]. |
| Cover goes up but premium goes down, or the reverse | Decide by premium direction: lower premium → `Yearly Saving`; higher → `Yearly Premium` [Q-CVC-5]. |
| **Couple** | Two outputs, one per life insured, each with that person's current and proceeding cover. |
| **Single** | One output. |
| One policy covers both people (joint/linked) | Ask how to split it [Q-CVC-8]. |
| No current cover (new client) | Ask whether to keep an empty Current block or remove it [Q-CVC-9]. |
| Proceeding cover spread over two insurers or products | Ask whether one block or one per insurer [Q-CVC-10]. |
| Current premium on the sheet ≠ last signed insurer quote / variation | Use the signed figure and flag it. |
| Client detail blank on the sheet | Fill from Fact Find, then application. Flag if still missing. |
| No Life/TPD row (e.g. income protection only) | Ask where the plan fee goes [Q-CVC-7]. |
| Current billed yearly but proceeding billed monthly | Do not mix; ask [Q-CVC-2]. |

## Output

```
C:\Users\TristanBiro\Downloads\<Surname(s)> - CvC\
  FINAL Insurance Summary - <First Last>.xlsx   [Q-CVC-11]
  FINAL Insurance Summary - <First Last>.pdf
```

One pair per life insured. `build-pack` copies the PDFs into the pack as
`NN - FINAL Insurance Summary - <First Last>.pdf`, after the PDS and before the Risk Checklist,
outside the DocuSign envelope.

## Fixed wording

- `Proceeding Cover - <Insurer product>`
- `Yearly Premium`
- `Yearly Saving`
- Never: `Yearly Increase`, `Market Option`.
- File name: `FINAL Insurance Summary - <First Last>.pdf`
- Sheet title stays as the firm has it: `Insurance Review Summary`.

## Checks before handing over

- [ ] One xlsx and PDF per life insured, named `FINAL Insurance Summary - <First Last>`.
- [ ] Only the Current block and one Proceeding block remain. Print area shows nothing else.
- [ ] Insurer named; heading reads `Proceeding Cover - <Insurer product>`.
- [ ] Every cover amount and premium matches the final insurer quote.
- [ ] Plan fee is on the Life/TPD row.
- [ ] Whole dollars throughout.
- [ ] Current premium matches the last signed quote or variation.
- [ ] Gross monthly totals add up.
- [ ] Bottom row label and figure follow the decision rules. No "Yearly Increase".
- [ ] No blank client details that a firm document could fill.
- [ ] Nothing written in SharePoint.
- [ ] Hand over: folder path, the bottom-row figure per person, anything flagged.

## Open questions

See `../_questions/cvc-summary.md`. Most important: [Q-CVC-1] how Yearly Premium is worked out,
[Q-CVC-2] Yearly Saving with annual billing, [Q-CVC-4] the sheet's cell layout per insurer.
