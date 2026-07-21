// Generate clean, Word-openable .docx from the guide markdown using the
// standards-compliant `docx` library (avoids the html-to-docx schema bug).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../../generated-plans');
const ACCENT = '4C9A2A';
const HEADER_FILL = 'CDE3BF'; // soft tint of ACCENT (~30% green on white) — "transparent" look
const HEADER_TEXT = '2E5A17'; // dark green for readable text on the soft fill

const FILES = process.argv.slice(2);
const DEFAULTS = [
  'Superannuation-Strategies-General-Advice',
  'Retirement-Income-Strategies-General-Advice',
  'Estate-Planning-Strategies-General-Advice',
  'Personal-Insurance-Strategies-General-Advice',
  'Financial-Strategy-Guide-General-Advice',
];
const targets = FILES.length ? FILES : DEFAULTS;

function run(text, o = {}) {
  return new TextRun({
    text,
    bold: o.bold || undefined,
    italics: o.italics || undefined,
    strike: o.strike || undefined,
    color: o.color || undefined,
    font: o.font || undefined,
    size: o.size || undefined,
  });
}

function inlineRuns(tokens, opts = {}) {
  const runs = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'text':
        if (t.tokens && t.tokens.length) runs.push(...inlineRuns(t.tokens, opts));
        else runs.push(run(t.text, opts));
        break;
      case 'strong': runs.push(...inlineRuns(t.tokens, { ...opts, bold: true })); break;
      case 'em': runs.push(...inlineRuns(t.tokens, { ...opts, italics: true })); break;
      case 'del': runs.push(...inlineRuns(t.tokens, { ...opts, strike: true })); break;
      case 'codespan': runs.push(run(t.text, { ...opts, font: 'Consolas' })); break;
      case 'br': runs.push(new TextRun({ break: 1 })); break;
      case 'link': runs.push(...inlineRuns(t.tokens, opts)); break;
      case 'escape': runs.push(run(t.text, opts)); break;
      default: if (t.text != null) runs.push(run(t.text, opts));
    }
  }
  return runs.length ? runs : [new TextRun('')];
}

const HSIZE = { 1: 32, 2: 26, 3: 22, 4: 21 };
function heading(t) {
  const color = t.depth <= 2 ? ACCENT : '333333';
  return new Paragraph({
    spacing: { before: t.depth <= 2 ? 260 : 160, after: 90 },
    keepNext: true,
    border: t.depth === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' } } : undefined,
    children: inlineRuns(t.tokens, { bold: true, color, size: HSIZE[t.depth] || 22 }),
  });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
function table(t) {
  const head = new TableRow({
    tableHeader: true,
    children: t.header.map((c) => new TableCell({
      shading: { fill: HEADER_FILL },
      margins: { top: 40, bottom: 40, left: 90, right: 90 },
      children: [new Paragraph({ children: inlineRuns(c.tokens, { bold: true, color: HEADER_TEXT }) })],
    })),
  });
  const rows = [head, ...t.rows.map((r) => new TableRow({
    children: r.map((c) => new TableCell({
      margins: { top: 40, bottom: 40, left: 90, right: 90 },
      children: [new Paragraph({ children: inlineRuns(c.tokens, {}) })],
    })),
  }))];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
      insideHorizontal: cellBorder, insideVertical: cellBorder,
    },
    rows,
  });
}

function listParas(t) {
  const out = [];
  t.items.forEach((item, i) => {
    const inl = [];
    const nested = [];
    for (const c of item.tokens) {
      if (c.type === 'text') inl.push(...(c.tokens || [{ type: 'text', text: c.text }]));
      else if (c.type === 'list') nested.push(c);
      else if (c.type === 'paragraph') inl.push(...c.tokens);
      else if (c.text != null) inl.push({ type: 'text', text: c.text });
    }
    const children = inlineRuns(inl, {});
    if (t.ordered) {
      const n = (t.start || 1) + i;
      out.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360, hanging: 360 }, children: [run(`${n}. `), ...children] }));
    } else {
      out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children }));
    }
    for (const nl of nested) out.push(...listParas(nl));
  });
  return out;
}

function blockquoteParas(t) {
  const inner = [];
  for (const x of t.tokens) {
    if (x.type === 'paragraph') inner.push(x.tokens);
    else if (x.type === 'text') inner.push(x.tokens || [{ type: 'text', text: x.text }]);
  }
  return inner.map((toks, idx) => new Paragraph({
    shading: { fill: 'F4F7EF' },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT },
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    },
    indent: { left: 180 },
    spacing: { before: idx === 0 ? 120 : 0, after: idx === inner.length - 1 ? 120 : 0 },
    children: inlineRuns(toks, {}),
  }));
}

function hr() {
  return new Paragraph({
    spacing: { before: 40, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' } },
    children: [new TextRun('')],
  });
}

function toChildren(tokens) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': out.push(heading(t)); break;
      case 'paragraph': out.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns(t.tokens, {}) })); break;
      case 'table': out.push(table(t)); out.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] })); break;
      case 'list': out.push(...listParas(t)); break;
      case 'blockquote': out.push(...blockquoteParas(t)); break;
      case 'hr': out.push(hr()); break;
      case 'code': out.push(new Paragraph({ children: [run(t.text, { font: 'Consolas' })] })); break;
      case 'space': break;
      case 'text': out.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns(t.tokens || [{ type: 'text', text: t.text }], {}) })); break;
      default: if (t.text != null) out.push(new Paragraph({ children: [new TextRun(t.text)] }));
    }
  }
  return out;
}

for (const base of targets) {
  const md = fs.readFileSync(path.join(dir, base + '.md'), 'utf8');
  const tokens = marked.lexer(md);
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 }, paragraph: { spacing: { line: 264 } } } } },
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: toChildren(tokens),
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(dir, base + '.docx'), buffer);
  console.log('wrote', base + '.docx', '(' + buffer.length + ' bytes)');
}
