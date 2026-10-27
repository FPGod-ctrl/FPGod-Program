// Emit self-contained HTML for each general-advice guide (Word opens HTML cleanly,
// avoiding the html-to-docx schema bug). Word then re-saves as clean DOCX + PDF.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../../generated-plans');

const DOCS = [
  ['Superannuation-Strategies-General-Advice', 'Superannuation Strategy Guide'],
  ['Retirement-Income-Strategies-General-Advice', 'Retirement Income Strategy Guide'],
  ['Estate-Planning-Strategies-General-Advice', 'Estate Planning Strategy Guide'],
  ['Personal-Insurance-Strategies-General-Advice', 'Personal Insurance Strategy Guide'],
  ['Financial-Strategy-Guide-General-Advice', 'Financial Strategy Guide'],
];

for (const [base, title] of DOCS) {
  let content = fs.readFileSync(path.join(dir, base + '.md'), 'utf8');
  content = content.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+# [^\n]*\n### [^\n]*\n+/, '');
  const html = renderPlanHtml({
    plan: { title, content },
    client: null,
    theme: 'modern',
    accent: '#4C9A2A',
    firmName: 'Lakeside Financial',
    tagline: 'Advice for life — General advice strategy guide',
  });
  const out = path.join(dir, base + '.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log('wrote', out, '(' + html.length + ' chars)');
}
