# Letters: cancellation, alteration, Change of Servicing Rights

Version 0.1.0-draft. Rule source: Tristan, 23 Oct 2026, after a pack went out with undated
letters that never said "cancel". "Do this moving forward."

## Which letter

| Advice for an existing policy | Letter |
|---|---|
| Cancel it (replaced by new cover) | Cancellation letter, one per policy [Q-PK-9] |
| Reduce it | Alteration letter covering the insurer's signed quote illustration. Not a cancellation letter. |
| Keep it, servicing moves to Legacy | Change of Servicing Rights, per person |
| Keep it unchanged, already serviced by Legacy | No letter |

When the replacement depends on new cover being accepted, the cancellation should not take effect
before the new cover is in force. Whether the letter must say so is open [Q-PK-4].

## Firm letter exists (exception 2 to the copy rule)

1. Copy the firm's letter into the pack with its pack number and name.
2. On the **pack copy only**:
   ```
   python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]
   ```
   - `<dd/mm/yyyy>` = build date [Q-PK-5]. The script does not check the format. Type it right.
   - Third argument `policies` when the letter lists more than one policy. Default `policy`.
   - It needs exactly one `____/____/____` paragraph and one "Could you please amend your
     records" paragraph. If not, it stops without saving. Then open the letter, find why, and ask
     the adviser. Never hand-edit the SharePoint file.
   - Needs python-docx (`pip install --user python-docx` if missing).
3. Export the PDF with `server/scripts/docx-to-pdf.ps1`.
4. In the READ ME list the letter under **Edited items** (date + cancel wording), not under
   byte-for-byte copies. Record the hash of the firm's original as well as the edited copy.

## No firm letter: generate one

- Fill the house template. Never rebuild a template or invent a layout. Template location for
  cancellation and alteration letters is NOT FOUND [Q-PK-4].
- Change of Servicing Rights: `Documents & Templates\Change of Servicing Rights.docx` in the firm
  library. It has a logo. Copy the template out, fill it, do not rebuild it.
- Fill method that works: rewrite whole paragraphs in `word/document.xml` (placeholders are split
  across runs, so per-run replace fails; `<w:br/>` round-trips as a line break). Then export PDF.
- Must be dated with the build date and must say "cancel" (cancellation) using the fixed line
  below.
- Fill from: the SOA (what is cancelled, reduced or kept), the current policy schedule (insurer,
  policy number, owner, life insured), the Fact Find (address, date of birth).
- Placeholders in drafts: `[CLIENT_1]`, `[POLICY_NO]`, `[INSURER_A]`. No real data in this skill.
- Who signs each letter: open [Q-PK-3].

## Fixed wording (exact)

Cancel line (singular, from `fix_cancellation_letter.py`):

> Could you please cancel the above policy and refund any premiums if applicable.

Plural:

> Could you please cancel the above policies and refund any premiums if applicable.

Replaces the firm template line:

> Could you please amend your records accordingly and refund any premiums if applicable.

Alteration letter wording: NOT FOUND. No default text. Ask [Q-PK-7].
