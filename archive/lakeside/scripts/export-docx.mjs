// Generic: render one of our markdown plans/SOAs to a branded Word doc using the
// app's renderPlanHtml + html-to-docx pipeline.
//   node scripts/export-docx.mjs <input.md> [title]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inArg = process.argv[2];
if (!inArg) { console.error('usage: node scripts/export-docx.mjs <input.md> [title]'); process.exit(1); }
const inPath = path.isAbsolute(inArg) ? inArg : path.resolve(process.cwd(), inArg);
const title = process.argv[3] || 'Statement of Advice';
const outPath = inPath.replace(/\.md$/i, '.docx');

let content = fs.readFileSync(inPath, 'utf8');
// Strip the duplicated markdown letterhead — the branded banner carries it.
content = content.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+/, '');

const html = renderPlanHtml({
  plan: { title, content },
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',
  firmName: 'Lakeside Financial',
  tagline: 'Advice for life — Prepared for Michael & Joanne Williams',
});

const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
fs.writeFileSync(outPath, buffer);
console.log('wrote', outPath, '(' + buffer.length + ' bytes)');
