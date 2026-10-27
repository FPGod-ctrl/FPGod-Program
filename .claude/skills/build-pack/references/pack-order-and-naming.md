# Pack order, numbering and naming

Version 1.0.0. Confirmed format: Tristan, 22 Oct 2026 ("the process moving forward").
Why it matters: the adviser browses the pack in Explorer sorted by Date modified and uploads it
into DocuSign. Names, numbers and dates must all give the same order.

## Order

| # | Item | When | In DocuSign envelope | How it gets in |
|---|---|---|---|---|
| 0 | `0 - READ ME` (.md; + .docx/.pdf optional) | Always | No | Written |
| 01 | Statement of Advice (.docx, .pdf, or both) | Always | Yes (Authority to Proceed signed) | Plain copy (+ PDF if Word-only) |
| 02 | FSG (Combined 2026 file) | Always | Yes, no fields (default, Q-PK-3) | Plain copy from the adviser's folder (default, Q-PK-2) |
| 03 | Fact Find | Always | Yes, no fields (default, Q-PK-3) | Plain copy (+ PDF if Word-only) |
| 04… | `<Insurer> Application Summary - Pre-Fill - <Full Name>.pdf`, one per application | When applications exist | Yes, signed by the life insured named on it | Plain copy |
| next | Cancellation letters, alteration letter, Change of Servicing Rights (.docx + .pdf) | When existing cover is cancelled, reduced or its servicing moves | Yes, signed by the client it is about (default, Q-PK-3) | Firm letter edited on the pack copy; Change of Servicing Rights from the house template (default, Q-PK-4) |
| next | `<Insurer> Signed Quote Illustration - <Full Name>.pdf`, directly after its alteration letter (reduction only) | Advice is a reduction | Yes, signing item (default, Q-PK-7) | Plain copy |
| next | Insurer form (e.g. rollover authority) | Only when required | Yes | Copy of the insurer's form, filled if needed (default, Q-PK-10) |
| next | PDS for each recommended product | Always for recommended products | Yes, no fields (default, Q-PK-3) | Copy of the current PDS (default, Q-PK-11) |
| next | `FINAL Insurance Summary - <First Last>.pdf`, one per life insured | When made | **No**. Adviser sends to clients directly. | From `cvc-summary` |
| last | `Risk Checklist - <pack name>` (+ PDF if Word-only) | Always | **No** | Plain copy, hashed (default, Q-PK-20) |

## Never included

- Quotes, ever (except the reduction illustration above). (default, Q-PK-7)
- Informed Consent (commission) forms. Superseded 22 Oct 2026: consent is in the SOA.
- TAL direct debit form when the TAL application summary already holds the payment details. (default, Q-PK-10)
- SOA Notes, Record of Advice, SOA Checklist or any checklist other than the Risk Checklist.
- The multi-option Insurance Cover Summary sheets. Only the single-block FINAL summary.

## Numbering

- Two digits, zero-padded: `01 - `, `02 - ` … `15 - `. So `10 -` never sorts before `2 -`.
- One number per document, in the order above, no gaps.
- A .docx and its PDF of the same document: share one number, differ only by extension
  Only the PDF goes into the envelope; the .docx stays in the folder for reference. (default, Q-PK-8)
- The READ ME is `0 - READ ME` so it sorts first.

## File names

| Item | Name (without number) |
|---|---|
| SOA | `Statement of Advice - <pack name>.<ext>` |
| FSG | `FSG.pdf` |
| Fact Find | `Fact Find - <pack name>.<ext>` |
| Application | `<Insurer> Application Summary - Pre-Fill - <Full Name>.pdf` |
| Cancellation letter | `<Insurer/fund> Cancellation Letter - <Full Name>.<ext>` |
| Alteration letter | `<Insurer> Alteration Letter - <Full Name>.<ext>` |
| Signed quote illustration | `<Insurer> Signed Quote Illustration - <Full Name>.pdf` (default, Q-PK-7) |
| Change of Servicing Rights | `<Insurer> Change of Servicing Rights - <Full Name>.<ext>` |
| PDS | Keep the insurer's file name (default, Q-PK-11) |
| FINAL summary | `FINAL Insurance Summary - <First Last>.pdf` |
| Risk Checklist | `Risk Checklist - <pack name>.<ext>` |

Example: `04 - [INSURER_A] Application Summary - Pre-Fill - [CLIENT_1 FULL NAME].pdf`.

Rules:

- `<Full Name>` is the life insured printed on that document. For a couple with the same surname,
  match on the first name, never the surname.
- Insurer name as the insurer is known (TAL, MetLife, Zurich, AIA, NEOS, OnePath, MLC, ClearView,
  Encompass, Resolution Life, BT, Integrity). If unknown, ask; do not write "Insurer".
- Strip `< > : " / \ | ? *` from names.
- Renaming the **file** is fine. Changing the **contents** of a firm document is not.

## Pack folder name

`<DOWNLOADS>\<Surname(s)> - SOA Pack\` (default, Q-PK-12). `<DOWNLOADS>` is the local setting in
`../../_shared/firm-settings.md` §10 (default `%USERPROFILE%\Downloads`).

- Single: `<Surname> - SOA Pack`.
- Couple, same surname: `<Surname> - SOA Pack`.
- Couple, different surnames: `<Surname1> & <Surname2> - SOA Pack`.

`<pack name>` inside file names follows the pack name rule in `../../_shared/firm-settings.md` §9.

If the folder already exists, never delete it: build into `<name> - SOA Pack (rebuilt dd-mm-yyyy)\`
and say so. (default, Q-PK-13)

## Restamp

Last step, after the READ ME. Sort the file names numerically (`0 - READ ME` first). Set modified
and access time to `now − i × 10 seconds` for the i-th file. Result: READ ME newest, then 01, 02 …
when sorted by Date modified, newest first. Hashes do not change.

PowerShell sketch:

```powershell
$now = Get-Date
$i = 0
Get-ChildItem $pack | Sort-Object { [regex]::Replace($_.Name, '\d+', { $args[0].Value.PadLeft(4,'0') }) } |
  ForEach-Object { $t = $now.AddSeconds(-10 * $i); $_.LastWriteTime = $t; $_.LastAccessTime = $t; $i++ }
```
