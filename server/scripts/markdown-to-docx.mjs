#!/usr/bin/env node
/**
 * Render a Markdown document to .docx.
 *
 * Used for documents we BUILD rather than clone - where there is no blank firm
 * template to fill. The fact find is the current case: the only copy of that form
 * in the repo is a completed one for a real client, so cloning it would carry that
 * client's data (and XPLAN's baked-in template errors) into every document we
 * produce. Building avoids that entirely, at the cost of the firm's letterhead.
 *
 * Where a genuine blank template DOES exist, clone-and-fill is the better path -
 * see generate-client-details-summary.mjs and generate-client-profile.mjs.
 *
 * Built with the `docx` library rather than `html-to-docx`. html-to-docx emits
 * XML that parses but violates the WordprocessingML schema, and Word rejects the
 * file outright with "Word experienced an error trying to open the file" - an
 * unrecoverable error that names no offending part. `docx` builds the OOXML
 * properly. Do not swap this back.
 *
 * Usage (from server/):
 *   node scripts/markdown-to-docx.mjs <input.md> ["<output.docx>"]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { marked } from 'marked';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, WidthType, BorderStyle, ShadingType,
} from 'docx';

const ACCENT = '1F3864';   // dark blue, matching the firm's fact find table format
const RULE = 'BFBFBF';

/**
 * marked's lexer HTML-escapes text tokens (`&` becomes `&amp;`). Word is not
 * HTML, so those entities would otherwise render literally in the document.
 */
const unescape = (s) => String(s ?? '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&'); // last, so "&amp;lt;" does not decode into a tag

/** Flatten marked's inline tokens into styled TextRuns. */
function runs(tokens, inherited = {}) {
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'strong':
        out.push(...runs(t.tokens, { ...inherited, bold: true }));
        break;
      case 'em':
        out.push(...runs(t.tokens, { ...inherited, italics: true }));
        break;
      case 'codespan':
        out.push(new TextRun({ ...inherited, text: unescape(t.text), font: 'Consolas' }));
        break;
      case 'br':
        out.push(new TextRun({ ...inherited, text: '', break: 1 }));
        break;
      case 'link':
      case 'del':
        out.push(...runs(t.tokens, inherited));
        break;
      default:
        if (t.text != null) out.push(new TextRun({ ...inherited, text: unescape(t.text) }));
    }
  }
  return out.length ? out : [new TextRun({ ...inherited, text: '' })];
}

/** Inline markdown inside a table cell - marked does not tokenise these for us. */
function cellRuns(md) {
  const first = marked.lexer(String(md ?? '').trim(), { gfm: true })[0];
  return runs(first?.tokens || [{ type: 'text', text: String(md ?? '') }]);
}

const HEADINGS = {
  1: { heading: HeadingLevel.HEADING_1, size: 32, color: ACCENT, before: 320, after: 140 },
  2: { heading: HeadingLevel.HEADING_2, size: 24, color: ACCENT, before: 280, after: 120 },
  3: { heading: HeadingLevel.HEADING_3, size: 21, color: '333333', before: 220, after: 100 },
};

function buildCell(md, { header = false } = {}) {
  return new TableCell({
    width: { size: 0, type: WidthType.AUTO },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: ACCENT } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: header
          ? [new TextRun({
              text: unescape(String(md ?? '').replace(/\*\*/g, '').trim()),
              bold: true, color: 'FFFFFF', size: 18,
            })]
          : cellRuns(md),
      }),
    ],
  });
}

function buildTable(token) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
  return new Table({
    rows: [
      new TableRow({
        tableHeader: true,
        children: token.header.map((h) => buildCell(h.text, { header: true })),
      }),
      ...token.rows.map((r) => new TableRow({ children: r.map((c) => buildCell(c.text)) })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border, bottom: border, left: border, right: border,
      insideHorizontal: border, insideVertical: border,
    },
  });
}

function blocksFrom(tokens, depth = 0) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        const h = HEADINGS[Math.min(t.depth, 3)];
        out.push(new Paragraph({
          heading: h.heading,
          spacing: { before: h.before, after: h.after },
          border: t.depth <= 2
            ? {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: t.depth === 1 ? 12 : 4,
                  color: t.depth === 1 ? ACCENT : RULE,
                  space: 4,
                },
              }
            : undefined,
          children: runs(t.tokens, { bold: true, size: h.size, color: h.color }),
        }));
        break;
      }
      case 'paragraph':
        out.push(new Paragraph({ spacing: { before: 60, after: 120 }, children: runs(t.tokens) }));
        break;
      case 'table':
        out.push(buildTable(t));
        out.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun('')] }));
        break;
      case 'list':
        for (const item of t.items) {
          const inline = (item.tokens || []).flatMap((x) =>
            x.type === 'text' ? (x.tokens || [{ type: 'text', text: x.text }]) : []);
          const marker = item.raw.match(/^\s*(\d+)\./)?.[1];
          out.push(new Paragraph({
            bullet: t.ordered ? undefined : { level: depth },
            indent: t.ordered ? { left: 360 * (depth + 1) } : undefined,
            spacing: { before: 20, after: 60 },
            children: t.ordered
              ? [new TextRun({ text: `${marker ?? '-'}.  `, bold: true }), ...runs(inline)]
              : runs(inline),
          }));
          for (const n of (item.tokens || []).filter((x) => x.type === 'list')) {
            out.push(...blocksFrom([n], depth + 1));
          }
        }
        break;
      case 'blockquote': {
        // A blockquote can hold several paragraphs. Rendering only tokens[0]
        // dropped every paragraph after the first, silently — the document
        // still generated, just missing content.
        const quoted = (t.tokens || []).filter((x) => x.type === 'paragraph');
        for (const q of (quoted.length ? quoted : [{ tokens: t.tokens || [] }])) {
          out.push(new Paragraph({
            indent: { left: 360 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: RULE, space: 8 } },
            spacing: { before: 60, after: 120 },
            children: runs(q.tokens || [], { italics: true, color: '444444' }),
          }));
        }
        break;
      }
      case 'hr':
        out.push(new Paragraph({
          spacing: { before: 120, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
          children: [new TextRun('')],
        }));
        break;
      case 'space':
        break;
      default:
        if (t.text) out.push(new Paragraph({ children: [new TextRun(unescape(t.text))] }));
    }
  }
  return out;
}

export async function markdownToDocx(mdPath, outPath) {
  const md = readFileSync(mdPath, 'utf8');
  const tokens = marked.lexer(md, { gfm: true });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20, color: '1A1A1A' } } } },
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: blocksFrom(tokens),
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buffer);
  return outPath;
}

if (process.argv[1] && process.argv[1].endsWith('markdown-to-docx.mjs')) {
  const [, , inArg, outArg] = process.argv;
  if (!inArg) {
    console.error('Usage: node scripts/markdown-to-docx.mjs <input.md> ["<output.docx>"]');
    process.exit(1);
  }
  const input = resolve(process.cwd(), inArg);
  const out = outArg ? resolve(process.cwd(), outArg) : input.replace(/\.md$/i, '.docx');
  markdownToDocx(input, out)
    .then((p) => console.log('Generated:', p))
    .catch((e) => { console.error(e); process.exit(1); });
}

export default { markdownToDocx };
