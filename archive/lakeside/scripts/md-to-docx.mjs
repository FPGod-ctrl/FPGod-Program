// Reliable markdown -> .docx using the `docx` library (native OOXML; opens cleanly in Word).
//   node scripts/md-to-docx.mjs <input.md> <output.docx> [title]
import fs from 'node:fs';
import path from 'node:path';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx';

const GREEN = '4C9A2A';
const GREY = '666666';
const DARK = '1A1A1A';

const inArg = process.argv[2];
const outArg = process.argv[3];
const title = process.argv[4] || 'Statement of Advice';
const tagline = process.argv[5] || 'Advice for life';
if (!inArg || !outArg) { console.error('usage: node scripts/md-to-docx.mjs <in.md> <out.docx> [title] [tagline]'); process.exit(1); }

let md = fs.readFileSync(path.resolve(inArg), 'utf8');
// Strip the duplicated markdown letterhead; we render a branded banner instead.
md = md.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+/, '');

// ---- inline parsing: **bold**, *italic*, `code`, [text](url) ----
function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[1] != null) runs.push(new TextRun({ text: m[1], bold: true, ...base }));
    else if (m[2] != null) runs.push(new TextRun({ text: m[2], italics: true, ...base }));
    else if (m[3] != null) runs.push(new TextRun({ text: m[3], font: 'Consolas', ...base }));
    else if (m[4] != null) runs.push(new TextRun({ text: m[4], color: '1155CC', ...base }));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  if (!runs.length) runs.push(new TextRun({ text: '', ...base }));
  return runs;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function makeCell(text, { header = false } = {}) {
  return new TableCell({
    borders: cellBorders,
    shading: header ? { type: ShadingType.CLEAR, fill: 'EAF3E0' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: inlineRuns(text, header ? { bold: true, size: 18 } : { size: 18 }) })],
  });
}

function makeTable(rows) {
  const [head, ...body] = rows;
  const trs = [];
  trs.push(new TableRow({ tableHeader: true, children: head.map((c) => makeCell(c, { header: true })) }));
  for (const r of body) trs.push(new TableRow({ children: r.map((c) => makeCell(c)) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: trs });
}

const heading = (level, text) => new Paragraph({
  spacing: { before: level <= 2 ? 240 : 160, after: 80 },
  border: level === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN } } : undefined,
  children: inlineRuns(text, {
    bold: true,
    color: level <= 2 ? GREEN : DARK,
    size: level === 1 ? 30 : level === 2 ? 26 : level === 3 ? 22 : 20,
  }),
});

// ---- line-based block parser (our markdown is regular, so this is predictable) ----
const lines = md.split(/\r?\n/);
const children = [];

// Branded banner.
children.push(new Paragraph({ children: [new TextRun({ text: 'LAKESIDE FINANCIAL', bold: true, color: GREEN, size: 28 })] }));
children.push(new Paragraph({ children: [new TextRun({ text: tagline, italics: true, color: GREY, size: 18 })] }));
children.push(new Paragraph({ spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN } }, children: [new TextRun({ text: title, bold: true, size: 36 })] }));

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const t = line.trim();

  if (t === '') { i++; continue; }

  // Table block.
  if (t.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1].trim())) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      rows.push(cells);
      i++;
    }
    rows.splice(1, 1); // drop the |---| separator row
    children.push(makeTable(rows));
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    continue;
  }

  // Headings.
  const h = t.match(/^(#{1,6})\s+(.*)$/);
  if (h) { children.push(heading(h[1].length, h[2])); i++; continue; }

  // Horizontal rule.
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
    children.push(new Paragraph({ spacing: { before: 80, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB' } }, children: [] }));
    i++; continue;
  }

  // Blockquote (may span multiple > lines).
  if (t.startsWith('>')) {
    const buf = [];
    while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
    children.push(new Paragraph({
      indent: { left: 360 },
      spacing: { before: 60, after: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: GREEN } },
      children: inlineRuns(buf.join(' '), { italics: true, color: '333333', size: 18 }),
    }));
    continue;
  }

  // Bullet list.
  if (/^[-*]\s+/.test(t)) {
    children.push(new Paragraph({
      indent: { left: 360, hanging: 200 },
      spacing: { after: 40 },
      children: [new TextRun({ text: '•  ' }), ...inlineRuns(t.replace(/^[-*]\s+/, ''))],
    }));
    i++; continue;
  }

  // Numbered list.
  const num = t.match(/^(\d+)\.\s+(.*)$/);
  if (num) {
    children.push(new Paragraph({
      indent: { left: 360, hanging: 200 },
      spacing: { after: 40 },
      children: [new TextRun({ text: `${num[1]}.  ` }), ...inlineRuns(num[2])],
    }));
    i++; continue;
  }

  // Normal paragraph.
  children.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns(t, { size: 20 }) }));
  i++;
}

const doc = new Document({
  creator: 'Lakeside Financial',
  title,
  styles: { default: { document: { run: { font: 'Calibri', size: 20, color: DARK } } } },
  sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(path.resolve(outArg), buffer);
console.log('wrote', path.resolve(outArg), '(' + buffer.length + ' bytes)');
