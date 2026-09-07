#!/usr/bin/env node
/**
 * Generate a Client Details Summary (.docx) — the firm's "initial meeting notes".
 *
 * Strategy (same as generate-client-profile.mjs): we DO NOT rebuild the document.
 * We open the firm's approved Word template, clone it, and insert the content
 * beneath each label in place — preserving fonts, spacing and layout exactly.
 *
 * The template is a flat list of labelled paragraphs rather than a table, so
 * filling means "insert paragraphs after the label", not "rewrite a cell".
 * Labels repeat (About the client / Reasons for seeking advice / Estate Planning
 * / Super all appear twice), so sections are matched IN DOCUMENT ORDER against
 * the order they appear in the data file — the Nth occurrence of a label takes
 * the Nth entry for it. Do not reorder the sections array.
 *
 * Usage (from server/):
 *   node scripts/generate-client-details-summary.mjs <filled.json> ["<out.docx>"]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(
  __dirname,
  '../../legacy/drop/initial-meeting-build/client-details-summary/templates/Initial meeting notes.docx'
);
const OUT_DIR = resolve(__dirname, '../../legacy/file-notes');

const xmlEscape = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const paraText = (p) => (p.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
  .map((m) => m.replace(/<[^>]+>/g, '')).join('').trim();

/** Build content paragraphs that inherit the label paragraph's run styling. */
function contentParas(labelXml, value) {
  // Reuse pPr but NOT rPr — labels are bold in this template and the answer
  // beneath them should not be. Runs get default styling.
  const pPr = (labelXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  return String(value ?? '')
    .split('\n')
    .map((line) => `<w:p>${pPr}<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`)
    .join('');
}

export async function generateClientDetailsSummary(data, outPath) {
  if (!existsSync(TEMPLATE)) {
    throw new Error(`Client Details Summary template not found at ${TEMPLATE}`);
  }
  const zip = await JSZip.loadAsync(readFileSync(TEMPLATE));
  let doc = await zip.file('word/document.xml').async('string');

  const paras = doc.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const queue = [...(data.sections || [])];
  let filled = 0;
  const missed = [];

  for (const p of paras) {
    if (!queue.length) break;
    const text = paraText(p);
    if (!text) continue;
    const next = queue[0];
    // Match on the label's leading words, ignoring trailing punctuation and the
    // parenthetical hints the template carries after some labels.
    const label = next.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const got = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (got.startsWith(label) && label.length > 2) {
      queue.shift();
      doc = doc.replace(p, p + contentParas(p, next.value));
      filled += 1;
    }
  }
  while (queue.length) missed.push(queue.shift().label);

  zip.file('word/document.xml', doc);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out);
  return { outPath, filled, missed };
}

if (process.argv[1] && process.argv[1].endsWith('generate-client-details-summary.mjs')) {
  const [, , dataPath, outArg] = process.argv;
  if (!dataPath) {
    console.error('Usage: node scripts/generate-client-details-summary.mjs <filled.json> ["<out.docx>"]');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(resolve(process.cwd(), dataPath), 'utf8'));
  const out = outArg
    ? resolve(process.cwd(), outArg)
    : resolve(OUT_DIR, `${data.clientName || 'Client'} - Client Details Summary.docx`);
  generateClientDetailsSummary(data, out)
    .then(({ outPath, filled, missed }) => {
      console.log(`Generated: ${outPath}`);
      console.log(`Sections filled: ${filled}`);
      if (missed.length) console.warn(`NOT MATCHED (check template labels): ${missed.join(', ')}`);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}

export default { generateClientDetailsSummary };
