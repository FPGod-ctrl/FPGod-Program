// One-off: render the general-advice Superannuation Strategy Guide (markdown) to Word.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inPath = path.resolve(__dirname, '../../generated-plans/Superannuation-Strategies-General-Advice.md');
const outPath = path.resolve(__dirname, '../../generated-plans/Superannuation-Strategies-General-Advice.docx');

let content = fs.readFileSync(inPath, 'utf8');
// The branded banner carries firm name + tagline + title; strip the duplicated letterhead.
content = content.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+# Superannuation Strategy Guide\s*\n### [^\n]*\n+/, '');

const plan = { title: 'Superannuation Strategy Guide', content };

const html = renderPlanHtml({
  plan,
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',
  firmName: 'Lakeside Financial',
  tagline: 'Advice for life — General advice strategy guide',
});

const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log('wrote', outPath, '(' + buffer.length + ' bytes)');
