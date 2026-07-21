// One-off: render the Romito Statement of Advice (markdown) to a branded Word doc
// using the same pipeline the app's /export/docx endpoint uses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inPath = path.resolve(__dirname, '../../generated-plans/Romito-Statement-of-Advice.md');
const outPath = path.resolve(__dirname, '../../generated-plans/Romito-Statement-of-Advice.docx');

let content = fs.readFileSync(inPath, 'utf8');
// The branded header banner already carries the firm name + tagline + title,
// so strip the duplicated markdown letterhead + title at the very top of the file.
content = content.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+# Statement of Advice\s*\n### Prepared for[^\n]*\n+/, '');

const plan = { title: 'Statement of Advice', content };

const html = renderPlanHtml({
  plan,
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',          // Lakeside green
  firmName: 'Lakeside Financial',
  tagline: 'Advice for life — Prepared for John & Meni Romito',
});

const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log('wrote', outPath, '(' + buffer.length + ' bytes)');
