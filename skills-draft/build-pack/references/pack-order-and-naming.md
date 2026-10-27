# Pack order, numbering and naming

Version 0.1.0-draft. Confirmed format: Tristan, 22 Oct 2026 ("the process moving forward").
Why it matters: the adviser browses the pack in Explorer sorted by Date modified and uploads it
into DocuSign. Names, numbers and dates must all give the same order.

## Order

| # | Item | When | In DocuSign envelope | How it gets in |
|---|---|---|---|---|
| 0 | `0 - READ ME` (.md; + .docx/.pdf optional) | Always | No | Written |
| 01 | Statement of Advice (.docx, .pdf, or both) | Always | Yes (Authority to Proceed signed) | Plain copy (+ PDF if Word-only) |
| 02 | FSG | Always | Yes [Q-PK-3] | Plain copy from the adviser's folder |
| 03 | Fact Find | Always | Yes [Q-PK-3] | Plain copy (+ PDF if Word-only) |
| 04… | `<Insurer> Application Summary - Pre-Fill - <Full Name>.pdf`, one per application | When applications exist | Yes, signed by the life insured named on it | Plain copy |
| next | Cancellation letters, alteration letter, Change of Servicing Rights (.docx + .pdf) | When existing cover is cancelled, reduced or its servicing moves | Yes [Q-PK-3] | Firm letter edited on the pack copy, or generated from house template |
| next | Signed quote illustration (reduction only) | Advice is a reduction | Yes, signing item [Q-PK-7] | Plain copy |
| next | Insurer form (e.g. rollover authority) | Only when required | Yes | Copy of the insurer's form, filled if needed [Q-PK-10] |
| next | PDS for each recommended product | Always for recommended products | Yes | Copy of the current PDS |
| next | `FINAL Insurance Summary - <First Last>.pdf`, one per life insured | When made | **No**. Adviser sends to clients directly. | From `cvc-summary` |
| last | `Risk Checklist - <pack name>` (+ PDF if Word-only) | Always | **No** | Plain copy |

## Never included

- Quotes (except the reduction illustration above).
- Informed Consent (commission) forms. Superseded 22 Oct 2026: consent is in the SOA.
- TAL direct debit form when the TAL application summary already holds the payment details.
- SOA Notes, Record of Advice, SOA Checklist or any checklist other than the Risk Checklist.
- The multi-option Insurance Cover Summary sheets. Only the single-block FINAL summary.

## Numbering

- Two digits, zero-padded: `01 - `, `02 - ` … `15 - `. So `10 -` never sorts before `2 -`.
- One number per document, in the order above, no gaps.
- A .docx and its PDF of the same document: share one number, differ only by extension
  (current practice) [Q-PK-8].
- The READ ME is `0 - READ ME` so it sorts first.

## File names

| Item | Name (without number) |
|---|---|
| SOA | `Statement of Advice - <pack name>.<ext>` |
| FSG | `FSG.pdf` |
| Fact Find | `Fact Find - <pack name>.<ext>` |
| Application | `<Insurer> Application Summary - Pre-Fill - <Full Name>.pdf` |
| Cancellation letter | `<Insurer/fund> Cancellation Letter - <Full Name>.<ext>` |
| Alteration letter | `<Insurer> Alteration Letter - <Full Name>.<ext>` [Q-PK-7] |
| Change of Servicing Rights | `<Insurer> Change of Servicing Rights - <Full Name>.<ext>` |
| PDS | Keep the insurer's file name [Q-PK-11] |
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

`C:\Users\TristanBiro\Downloads\<Surname(s)> - SOA Pack\` [Q-PK-12]

- Single: `<Surname> - SOA Pack`.
- Couple, same surname: `<Surname> - SOA Pack`.
- Couple, different surnames: `<Surname1> & <Surname2> - SOA Pack`.

`<pack name>` inside file names follows the firm naming rule in `../../_shared/firm-rules.md`.

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
