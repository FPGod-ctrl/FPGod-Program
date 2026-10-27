"""Fill the Legacy 2026 fact find (XPLAN/Opex form) from a JSON file.

    python server/scripts/generate_fact_find.py <data.json> <out.docx> [--master <path>]

The master is a blanked copy of a real 2026 couple fact find, kept in
legacy/drop/initial-meeting-build/fact-find/templates/ (gitignored). Tables are
found by the Heading 1 / Heading 2 they sit under, not by index, and every
client table is rebuilt from the data: XPLAN prints only the rows that hold
something, so a row not in the data is not in the document.

JSON shape (every key optional; omitted text boxes are left empty):
  clients         ["Jane", "John"]             column headers (preferred names)
  full_names      ["Jane Citizen", "John Citizen"]
  date_completed  "22 October 2026"
  why, story, planning_preferences, future_changes          text
  goals           [[for, description, timeframe, amount, priority], ...]
  personal, contact, employment, health, other_cashflow, estate
                  [[label, client1, client2], ...]
  dependants      [[name, relationship, age, living at home, dependent], ...]
  income, expenses, assets, liabilities   [[description, owner, amount], ...]
                  amounts like "$95,000"; a Total row is added unless one is given.
                  Income and expenses are annual: write yearly amounts. A row given
                  another way may say so ("$2,500 per month", "$400 pw", or
                  "(monthly)" in the description); the Total is then annualised and
                  marked "(annualised)". Unknown amounts are "TBC"; the Total adds
                  the known rows and says "(excl. TBC items)". Cents are kept.
  super           [[plan, policy #, owner, balance, life, tpd, ip, beneficiaries], ...]
  insurance       [[description, owner, life insured, type, cover, premium], ...]
  scope           text for "Scope of advice" (defaults to `why`)
  scope_items     ["Review of your life and TPD insurance.", ...] advice areas, not
                  outcomes, for "Agreed scope of advice". Written after the firm's
                  lead-in and its fixed bullet "Review of your personal risk
                  insurance needs:"; set scope_fixed_bullet false to leave that
                  bullet out (e.g. when the items are the SOA "Included" bullets).
  adviser         "Tristan Biro" (default) on the cover's Adviser Name and the
                  adviser signatory, over any older adviser name in the master
  incomplete_info "None"   expertise "Yes"
  not_applicable / not_disclosed   ["dependants", "super", ...] ticks the box
  changes / additional   {"dependants": "text", ...} the "Any changes" and
                  "Additional information" boxes, keyed like the tables

Text: "\n" splits paragraphs; a line starting "- " becomes a bullet.
"""
import copy
import json
import re
import sys
from pathlib import Path

import docx
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / 'legacy' / 'drop' / 'initial-meeting-build' / 'fact-find' / 'templates'

# Heading 1 -> data key for the section's main table / checkbox row.
SECTIONS = {
    'Why are you seeking advice': 'why',
    'Your financial goals': 'goals',
    'Your planning preferences': 'planning_preferences',
    'Future changes': 'future_changes',
    'Your story': 'story',
    'Your personal information': 'personal',
    'Your contact details': 'contact',
    'Your dependants': 'dependants',
    'Your employment': 'employment',
    'Your health': 'health',
    'Your cashflow': 'cashflow',
    'Your assets': 'assets',
    'Your liabilities': 'liabilities',
    'Your retirement products': 'super',
    'Your personal insurance': 'insurance',
    'Your estate planning': 'estate',
}
# Sub-sections whose table is its own data key.
SUBSECTIONS = {
    'Your income': 'income',
    'Your expenses': 'expenses',
    'Other cashflow details': 'other_cashflow',
}
# Text boxes under "About our advice" left as the firm's standard wording.
KEEP_TEXT = {'Advice limitations'}
LIST_WITH_TOTAL = {'income', 'expenses', 'assets', 'liabilities'}
ANNUAL_TOTAL = {'income', 'expenses'}  # totalled per year; assets/liabilities are balances
# Adviser names the master (or an older master) may carry on the adviser signatory.
OLD_ADVISERS = ('Joshua Davidson',)
DEFAULT_ADVISER = 'Tristan Biro'
SCOPE_LEAD = 'As a result of the agreed subject matter of advice, we have identified the scope of advice to be:'
SCOPE_FIXED_BULLET = 'Review of your personal risk insurance needs: '  # trailing no-break space, as before
# Label | client 1 | client 2 tables, whose header row carries the names.
RPR_AFTER_HIGHLIGHT = {'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em',
                       'lang', 'eastAsianLayout', 'specVanish', 'oMath'}
PER_CLIENT = {'personal', 'contact', 'employment', 'health', 'other_cashflow', 'estate'}


# Frequency markers -> times per year. Income and expense tables are annual
# (the master's header reads "Amount (p.a.)", and Q-FF-4's default is annual).
FREQUENCIES = [
    (r'p\.?\s?w\.?|per\s+week|a\s+week|/\s?w(?:ee)?k?|weekly|wkly', 52),
    (r'fortnight(?:ly)?|per\s+fortnight|p\.?\s?f\.?|/\s?f(?:n|ortnight)?', 26),
    (r'p\.?\s?c\.?\s?m\.?|p\.?\s?m\.?|per\s+(?:calendar\s+)?month|a\s+month|/\s?m(?:th|o|onth)?|monthly|mthly', 12),
    (r'quarterly|per\s+quarter|p\.?\s?q\.?|/\s?q(?:tr)?', 4),
    (r'p\.?\s?a\.?|per\s+(?:annum|year)|a\s+year|/\s?y(?:r|ear)?|annual(?:ly)?|yearly', 1),
]
FREQ_RES = [(re.compile(r'(?<![a-z])(?:' + pat + r')(?![a-z])', re.I), n) for pat, n in FREQUENCIES]
NUMBER = re.compile(r'(-|−)?\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m(?:il(?:lion)?)?\b)?', re.I)
NIL = re.compile(r'\s*(?:nil|none|\$?\s*-|–|—)\s*', re.I)


def frequency(text):
    """Times per year named in `text`, or None if it names no frequency."""
    for rx, n in FREQ_RES:
        if rx.search(str(text)):
            return n
    return None


def money(v):
    """Parse an amount cell. Returns (value, has_cents) or None if unknown.

    Accepts "$1,234", "1234.50", "-$500", "($500)", "$80k", "$1.2m", "Nil",
    and text around a single figure ("$5,000 p.m.", "approx $300 per week").
    Two figures (a range) or none ("TBC", "Not disclosed") is unknown.
    """
    s = str(v if v is not None else '').strip()
    if NIL.fullmatch(s):
        return 0.0, False
    # A frequency marker "/m" is not a millions suffix, so read the figure with the marker cut out.
    body = s
    for rx, _ in FREQ_RES:
        body = rx.sub(' ', body)
    nums = list(NUMBER.finditer(body))
    if len(nums) != 1:
        return None
    m = nums[0]
    x = float(m.group(2).replace(',', ''))
    suffix = (m.group(3) or '').lower()
    if suffix == 'k':
        x *= 1_000
    elif suffix.startswith('m'):
        x *= 1_000_000
    neg = bool(m.group(1)) or re.fullmatch(r'\(.*\)', s) is not None
    cents = '.' in m.group(2) and not suffix
    return (-x if neg else x), cents


def fmt_money(x, cents=False):
    s = f'{abs(x):,.2f}' if cents else f'{abs(round(x)):,.0f}'
    return f'-${s}' if x < 0 else f'${s}'


def total_cell(rows, annualise):
    """The Total row's amount for [description, ..., amount] rows.

    Income/expenses (annualise=True): each amount is converted to a yearly
    figure from a frequency marker in the amount cell, else in the description;
    no marker means annual. "(annualised)" is added when any row was converted.
    Rows with no readable amount (TBC, Not disclosed) are left out and the
    total says "(excl. TBC items)". No readable amount at all gives "TBC".
    """
    known, cents, converted, missing = [], False, False, False
    for r in rows:
        parsed = money(r[-1])
        if parsed is None:
            missing = True
            continue
        x, c = parsed
        if annualise:
            n = frequency(r[-1]) or frequency(' '.join(str(v) for v in r[:-1])) or 1
            if n != 1:
                converted = True
                x *= n
        known.append(x)
        cents = cents or c
    if not known:
        return 'TBC'
    total = sum(known)
    cents = cents or round(total, 2) != round(total)
    notes = (['annualised'] if converted else []) + (['excl. TBC items'] if missing else [])
    return fmt_money(total, cents) + (f' ({", ".join(notes)})' if notes else '')


def drop_last_cols(t, n):
    """Remove the last n grid columns, giving their width to the column before."""
    tbl = t._tbl
    grid = tbl.find(qn('w:tblGrid'))
    cols = grid.findall(qn('w:gridCol'))
    freed = sum(int(c.get(qn('w:w'), 0)) for c in cols[-n:])
    for c in cols[-n:]:
        grid.remove(c)
    keep = cols[-n - 1]
    keep.set(qn('w:w'), str(int(keep.get(qn('w:w'), 0)) + freed))
    for tr in tbl.findall(qn('w:tr')):
        left = n
        tcs = tr.findall(qn('w:tc'))
        while left and tcs:
            tc = tcs.pop()
            pr = tc.find(qn('w:tcPr'))
            span_el = pr.find(qn('w:gridSpan')) if pr is not None else None
            span = int(span_el.get(qn('w:val'))) if span_el is not None else 1
            if span <= left:
                tr.remove(tc)
                left -= span
            else:
                span_el.set(qn('w:val'), str(span - left))
                left = 0
        if tcs:
            last = tcs[-1]
            pr = last.find(qn('w:tcPr'))
            w = pr.find(qn('w:tcW')) if pr is not None else None
            if w is not None and w.get(qn('w:type')) == 'dxa':
                w.set(qn('w:w'), str(int(w.get(qn('w:w'))) + freed))


class FactFind:
    def __init__(self, master):
        self.doc = docx.Document(master)
        self.bullet_ppr = None
        self.plain_ppr = None
        self.blocks = self._index()

    # Walk the body and tag each table with the headings above it.
    def _index(self):
        h1 = h2 = None
        out = []
        for el in self.doc.element.body.iterchildren():
            tag = el.tag.split('}')[1]
            if tag == 'p':
                p = Paragraph(el, self.doc)
                style = p.style.name if p.style is not None else ''
                if style == 'Heading 1':
                    h1, h2 = p.text.strip(), None
                elif style == 'Heading 2':
                    h2 = p.text.strip()
            elif tag == 'tbl':
                t = Table(el, self.doc)
                out.append({'h1': h1, 'h2': h2, 'table': t, 'kind': self._kind(t)})
        return out

    @staticmethod
    def _kind(t):
        first = t.rows[0].cells[0].text.strip()
        if '✍' in first:  # ✍️
            return 'text'
        if 'Not applicable' in first:
            return 'check'
        return 'table'

    def find(self, h1, h2=None, kind='table'):
        for b in self.blocks:
            if b['h1'] == h1 and b['h2'] == h2 and b['kind'] == kind:
                return b['table']
        return None

    # ---- cell writing -------------------------------------------------
    def set_cell(self, cell, text):
        """Replace a cell's text, keeping the first paragraph's and run's format."""
        lines = str(text if text is not None else '').split('\n')
        paras = cell.paragraphs
        proto_p = paras[0]._p
        proto_r = next(iter(proto_p.iter(qn('w:r'))), None)
        rpr = proto_r.find(qn('w:rPr')) if proto_r is not None else None
        ppr = proto_p.find(qn('w:pPr'))
        for p in paras:
            p._p.getparent().remove(p._p)
        for line in lines:
            bullet = line.startswith('- ')
            if bullet:
                line = line[2:]
            p = cell._tc.add_p()
            if bullet and self.bullet_ppr is not None:
                use = self.bullet_ppr
            elif ppr is not None and ppr.find(qn('w:numPr')) is not None:
                use = self.plain_ppr  # prototype was a bullet; this line is not
            else:
                use = ppr
            if use is not None:
                p.insert(0, copy.deepcopy(use))
            # Outstanding items (TBC) are highlighted yellow, as in the meeting notes.
            for part in filter(None, re.split(r'\b(TBC)\b', line)):
                r = p.add_r()
                run_pr = copy.deepcopy(rpr) if rpr is not None else None
                if part == 'TBC':
                    if run_pr is None:
                        run_pr = r.makeelement(qn('w:rPr'), {})
                    hl = run_pr.makeelement(qn('w:highlight'), {qn('w:val'): 'yellow'})
                    # Schema order: highlight sits before u, shd, lang and the rest.
                    after = next((c for c in run_pr if c.tag.split('}')[1] in RPR_AFTER_HIGHLIGHT), None)
                    if after is not None:
                        after.addprevious(hl)
                    else:
                        run_pr.append(hl)
                if run_pr is not None:
                    r.insert(0, run_pr)
                t = r.add_t(part)
                t.set(qn('xml:space'), 'preserve')

    def set_text_box(self, t, text):
        self.set_cell(t.rows[0].cells[-1], text)

    def set_check(self, t, na=False, nd=False):
        for cell, on in ((t.rows[0].cells[0], na), (t.rows[0].cells[1], nd)):
            box = '☑' if on else '☐'
            for r in cell._tc.iter(qn('w:t')):
                if r.text:
                    r.text = r.text.replace('☐', box).replace('☑', box)

    def set_rows(self, t, rows, total=False):
        """Rebuild a table's body from `rows`, keeping the header row (row 0)."""
        trs = [r._tr for r in t.rows]
        header, body = trs[0], trs[1:]
        if not body:
            return
        last_is_total = t.rows[-1].cells[0].text.strip() == 'Total'
        proto = body[0]
        proto_total = body[-1] if last_is_total else None
        ncols = len({id(c._tc) for c in t.rows[1].cells})
        for tr in body:
            tr.getparent().remove(tr)
        rows = [list(r) for r in rows]
        if not rows:
            # Leave one blank row (and the Total row) to write in, and as the
            # formatting prototype when this file is used as a master.
            rows = [[''] * ncols] + ([['Total'] + [''] * (ncols - 1)] if last_is_total else [])
        if total and rows and not any(str(r[0]).strip() == 'Total' for r in rows):
            width = max(len(r) for r in rows)
            rows.append(['Total'] + [''] * (width - 2) + [total_cell(rows, annualise=total == 'annual')])
        anchor = header
        for row in rows:
            src = proto_total if (str(row[0]).strip() == 'Total' and proto_total is not None) else proto
            tr = copy.deepcopy(src)
            anchor.addnext(tr)
            anchor = tr
        # Fill after insertion so python-docx sees the cells in the table.
        tbl_rows = t.rows[1:]
        for row, trow in zip(rows, tbl_rows):
            cells, seen = [], set()
            for c in trow.cells:
                if id(c._tc) not in seen:
                    seen.add(id(c._tc))
                    cells.append(c)
            for c, v in zip(cells, row):
                self.set_cell(c, v)
            for c in cells[len(row):]:
                self.set_cell(c, '')

    def set_header_cols(self, t, clients):
        cells = t.rows[0].cells
        for i, name in enumerate(clients or ['Client', 'Partner']):
            if i + 1 < len(cells):
                self.set_cell(cells[i + 1], name)

    # ---- the document -------------------------------------------------
    def fill(self, d):
        clients = d.get('clients', [])
        full = d.get('full_names', clients)
        na, nd = set(d.get('not_applicable', [])), set(d.get('not_disclosed', []))
        changes, additional = d.get('changes', {}), d.get('additional', {})
        adviser = str(d.get('adviser') or '').strip() or DEFAULT_ADVISER

        # Bullet and plain paragraph formats, from the standard limitations box.
        std_t = self.find('About our advice', 'Advice limitations', 'text')
        if std_t is not None:
            for p in std_t.rows[0].cells[-1].paragraphs:
                ppr = p._p.find(qn('w:pPr'))
                if ppr is not None and ppr.find(qn('w:numPr')) is not None and self.bullet_ppr is None:
                    self.bullet_ppr = copy.deepcopy(ppr)
                elif (ppr is None or ppr.find(qn('w:numPr')) is None) and self.plain_ppr is None:
                    self.plain_ppr = copy.deepcopy(ppr) if ppr is not None else None

        # Cover table: client names and date.
        cover = self.doc.tables[1]
        for row in cover.rows:
            label = row.cells[0].text.strip()
            if label == 'Client Name(s)':
                self.set_cell(row.cells[1], ' & '.join(full))
            elif label == 'Date Completed':
                self.set_cell(row.cells[1], d.get('date_completed', ''))
            elif label == 'Adviser Name':
                self.set_cell(row.cells[1], adviser)

        for b in self.blocks:
            h1, h2, kind, t = b['h1'], b['h2'], b['kind'], b['table']
            key = SUBSECTIONS.get(h2) or SECTIONS.get(h1)
            if h1 == 'About our advice':
                if kind == 'text' and h2 not in KEEP_TEXT:
                    val = {
                        'Scope of advice': d.get('scope', d.get('why', '')),
                        'Agreed scope of advice': self._agreed_scope(
                            d.get('scope_items'), d.get('scope_fixed_bullet', True) is not False),
                        'Incomplete or inaccurate information': d.get('incomplete_info', 'None'),
                        'Adviser expertise': d.get('expertise', 'Yes'),
                    }.get(h2, '')
                    self.set_text_box(t, val)
                continue
            if key is None:
                continue
            if kind == 'check':
                self.set_check(t, key in na, key in nd)
            elif kind == 'text':
                if h2 == 'Any changes':
                    self.set_text_box(t, changes.get(key, ''))
                elif h2 == 'Additional information':
                    self.set_text_box(t, additional.get(key, ''))
                else:
                    self.set_text_box(t, d.get(key, ''))
            elif kind == 'table':
                if key in PER_CLIENT:
                    self.set_header_cols(t, clients)
                total = ('annual' if key in ANNUAL_TOTAL else True) if key in LIST_WITH_TOTAL else False
                self.set_rows(t, d.get(key, []), total=total)

        for t in self.doc.tables:
            self._fill_signatories(t, full, adviser)
        if len(clients) == 1:
            for b in self.blocks:
                key = SUBSECTIONS.get(b['h2']) or SECTIONS.get(b['h1'])
                if b['kind'] == 'table' and key in PER_CLIENT:
                    drop_last_cols(b['table'], 1)
            for t in self.doc.tables:
                if (t.rows[0].cells[0].text.strip() == 'Signatory' and len(t.columns) == 6):
                    drop_last_cols(t, 3)
        self._scrub_opex_block()

    @staticmethod
    def _agreed_scope(items, fixed_bullet=True):
        """Lead-in, then the fixed bullet (Q-FF-2 default A: keep it), then one bullet per item.

        fixed_bullet=False (JSON "scope_fixed_bullet": false) leaves it out, for
        when scope_items are the SOA "Included" bullets copied word for word.
        The fixed bullet is also dropped if an item already says the same thing.
        """
        if not items:
            return ''
        items = [str(i).strip() for i in items if str(i).strip()]
        norm = lambda s: re.sub(r'[\s:.]+$', '', s).strip().lower()
        lines = [SCOPE_LEAD]
        if fixed_bullet and norm(SCOPE_FIXED_BULLET) not in {norm(i) for i in items}:
            lines.append('- ' + SCOPE_FIXED_BULLET)
        return '\n'.join(lines + ['- ' + i for i in items])

    @staticmethod
    def _replace_name(cell, old, new):
        """Replace `old` with `new` in a cell, keeping each run's format.

        A name split across runs is rewritten into the run where it starts.
        """
        hit = False
        for p in cell.paragraphs:
            ts = list(p._p.iter(qn('w:t')))
            while old in ''.join(t.text or '' for t in ts):
                hit = True
                start = ''.join(t.text or '' for t in ts).index(old)
                end, pos, first = start + len(old), 0, True
                for t in ts:
                    s = pos
                    pos += len(t.text or '')
                    if pos <= start or s >= end:
                        continue
                    a, b = max(start, s) - s, min(end, pos) - s
                    t.text = t.text[:a] + (new if first else '') + t.text[b:]
                    t.set(qn('xml:space'), 'preserve')
                    first = False
        return hit

    @staticmethod
    def _is_adviser_table(t):
        text = ' '.join(c.text for c in t.rows[2].cells)
        return 'Authorised Representative' in text or any(n in text for n in OLD_ADVISERS)

    def _fill_adviser(self, t, adviser):
        """Write `adviser` over the old adviser name on the adviser signatory."""
        olds = [n for n in OLD_ADVISERS + (DEFAULT_ADVISER,) if n != adviser]
        seen = set()
        for row in t.rows:
            for c in row.cells:
                if id(c._tc) not in seen:
                    seen.add(id(c._tc))
                    for old in olds:
                        self._replace_name(c, old, adviser)

    def _fill_signatories(self, t, full, adviser=DEFAULT_ADVISER):
        if t.rows[0].cells[0].text.strip() != 'Signatory' or len(t.rows) < 3:
            return
        cells = t.rows[2].cells
        if self._is_adviser_table(t):
            self._fill_adviser(t, adviser)
            return
        # Couple form: name cells at 1 and 4. Single form: 1.
        uniq, seen = [], set()
        for c in cells:
            if id(c._tc) not in seen:
                seen.add(id(c._tc))
                uniq.append(c)
        name_cells = [uniq[i] for i in (1, 4) if i < len(uniq)]
        for c, name in zip(name_cells, full + [''] * 2):
            self.set_cell(c, name)

    def _scrub_opex_block(self):
        # XPLAN's debug table carries the sample client's name and XPLAN ID.
        for t in self.doc.element.body.iter(qn('w:t')):
            if t.text and 'Sample client:' in t.text:
                t.text = 'Sample client:'

    def save(self, out):
        self.doc.save(out)


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    data = json.loads(Path(argv[1]).read_text(encoding='utf-8'))
    master = None
    if '--master' in argv:
        master = argv[argv.index('--master') + 1]
    if master is None:
        # One master for everyone; a single client loses the partner column.
        master = MASTERS / 'Fact Find - master.docx'
    ff = FactFind(master)
    ff.fill(data)
    ff.save(argv[2])
    print(f'wrote {argv[2]} from {Path(master).name}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
