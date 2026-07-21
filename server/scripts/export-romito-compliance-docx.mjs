// One-off: render the Romito SOA compliance companion pack (markdown) to Word.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inPath = path.resolve(__dirname, '../../generated-plans/Romito-SOA-compliance-pack.md');
const outPath = path.resolve(__dirname, '../../generated-plans/Romito-SOA-compliance-pack.docx');

const content = fs.readFileSync(inPath, 'utf8');
const plan = { title: 'SOA — Compliance Companion Pack', content };

const html = renderPlanHtml({
  plan,
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',
  firmName: 'Lakeside Financial',
  tagline: 'Internal compliance drafting aid — John & Meni Romito SOA',
});

const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log('wrote', outPath, '(' + buffer.length + ' bytes)');
