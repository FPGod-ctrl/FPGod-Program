"""Date a firm cancellation letter and make it ask to cancel (Tristan, 23 Oct 2026).

    python legacy/packs/fix_cancellation_letter.py <letter.docx> <dd/mm/yyyy> [policy|policies]

Fills the ____/____/____ date and replaces "Could you please amend your records accordingly..."
with a cancel instruction. Run it on the pack copy only, never on the SharePoint file.
"""
import sys
import docx

f, date = sys.argv[1], sys.argv[2]
noun = sys.argv[3] if len(sys.argv) > 3 else 'policy'
d = docx.Document(f)
dated = worded = 0
for p in d.paragraphs:
    if p.runs and p.runs[0].text.strip() == '____/____/____':
        p.runs[0].text = date; dated += 1
    if p.text.startswith('Could you please amend your records'):
        p.runs[0].text = f'Could you please cancel the above {noun} and refund any premiums if applicable. '
        for r in p.runs[1:]: r.text = ''
        worded += 1
if (dated, worded) != (1, 1): sys.exit(f'{f}: expected one date and one amend line, found {dated} and {worded}')
d.save(f)
print('updated', f)
