// Generic: render a general-advice guide (markdown) to a branded Word doc.
// Usage: node scripts/export-guide-docx.mjs <md-basename> "<Title>" "<Tagline>"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const [, , base, title, tagline] = process.argv;
if (!base || !title) {
  console.error('Usage: node scripts/export-guide-docx.mjs <md-basename> "<Title>" "<Tagline>"');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inPath = path.resolve(__dirname, `../../generated-plans/${base}.md`);
const outPath = path.resolve(__dirname, `../../generated-plans/${base}.docx`);

let content = fs.readFileSync(inPath, 'utf8');
// The branded banner carries firm name + tagline + title; strip the duplicated
// letterhead + title + subtitle at the very top of the file.
content = content.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+# [^\n]*\n### [^\n]*\n+/, '');

const html = renderPlanHtml({
  plan: { title, content },
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',
  firmName: 'Lakeside Financial',
  tagline: tagline || 'Advice for life',
});

const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log('wrote', outPath, '(' + buffer.length + ' bytes)');
