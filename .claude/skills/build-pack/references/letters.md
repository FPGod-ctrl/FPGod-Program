# Letters: cancellation, alteration, Change of Servicing Rights

Version 1.0.0. Rule source: Tristan, 23 Oct 2026, after a pack went out with undated
letters that never said "cancel". "Do this moving forward."

## Which letter

| Advice for an existing policy | Letter |
|---|---|
| Cancel it (replaced by new cover) | Firm cancellation letter, one per policy |
| Reduce it | Firm alteration letter, then the insurer's signed quote illustration directly after it. Not a cancellation letter. (default, Q-PK-7) |
| Keep it, servicing adviser changes to Legacy | Change of Servicing Rights, one per person per such policy (default, Q-PK-9) |
| Keep it unchanged, already serviced by Legacy | No letter |

Do not add "only once new cover is in force" wording to a cancellation letter. The SOA and the
application details sheet carry the do-not-cancel-early warning. (default, Q-PK-4)

## Firm letter exists (exception 2 to the copy rule)

1. Copy the firm's letter into the pack with its pack number and name.
2. On the **pack copy only**:
   ```
   python legacy/packs/fix_cancellation_letter.py "<pack letter.docx>" <dd/mm/yyyy> [policy|policies]
   ```
   - `<dd/mm/yyyy>` = the pack build date. (default, Q-PK-5) The script does not check the format. Type it right.
   - Third argument `policies` when the letter lists more than one policy. Default `policy`.
   - It needs exactly one `____/____/____` paragraph and one "Could you please amend your
     records" paragraph. If not, it stops without saving. Then open the letter, find why, and ask
     Tristan. Never hand-edit the SharePoint file.
   - Needs python-docx (`pip install --user python-docx` if missing).
3. Export the PDF with `server/scripts/docx-to-pdf.ps1`.
4. In the READ ME list the letter under **Edited items** (date + cancel wording), not under
   byte-for-byte copies. Record the hash of the firm's original as well as the edited copy.

## No firm letter

- Cancellation or alteration letter: ask Tristan for the firm letter each time. Do not generate
  one, rebuild a template or invent a layout. (default, Q-PK-4)

## Change of Servicing Rights (generated from the house template)

- Change of Servicing Rights: `Documents & Templates\Change of Servicing Rights.docx` in the firm
  library. It has a logo. Copy the template out, fill it, do not rebuild it.
- Fill method that works: rewrite whole paragraphs in `word/document.xml` (placeholders are split
  across runs, so per-run replace fails; `<w:br/>` round-trips as a line break). Then export PDF.
- Must be dated with the build date. (default, Q-PK-5)
- Fill from: the SOA (which policies are kept), the current policy schedule (insurer,
  policy number, owner, life insured), the Fact Find (address, date of birth).
- Placeholders in examples: `[CLIENT_1]`, `[POLICY_NO]`, `[INSURER_A]`. No real data in this skill.
- Who signs each letter: the client the letter is about, in the DocuSign envelope. (default, Q-PK-3)

## Fixed wording (exact)

Cancel line (singular, from `fix_cancellation_letter.py`):

> Could you please cancel the above policy and refund any premiums if applicable.

Plural:

> Could you please cancel the above policies and refund any premiums if applicable.

Replaces the firm template line:

> Could you please amend your records accordingly and refund any premiums if applicable.

Alteration letter wording: not on file. Ask Tristan for it each time; never write it.
(default, Q-PK-7)
