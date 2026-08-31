#!/usr/bin/env node
/**
 * Read the Legacy Risk Advice SOA examples and work out the house standard:
 * the section structure, which sections are universal, and which paragraphs are
 * fixed house wording rather than per-client prose.
 *
 * Method: a paragraph that appears verbatim in most documents is boilerplate the
 * firm reproduces every time; one that appears in a handful is client-specific.
 * That distinction is what decides whether the generator should reproduce a
 * block or write it fresh.
 *
 * Usage:
 *   node scripts/analyse-soa-examples.mjs [--dir <path>] [--out <path>]
 */
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename, extname } from 'node:path';
import mammoth from 'mammoth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const DIR = resolve(__dirname, argOf('--dir', '../../legacy/drop/soa-build/examples'));
const OUT = resolve(__dirname, argOf('--out', '../../legacy/drop/soa-build/.extracted'));

const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** Collapse anything client-specific so boilerplate matches across documents. */
const skeleton = (s) => norm(s)
  .replace(/\d/g, '#')
  .replace(/\$[#,.]+/g, '$#')
  .toLowerCase();

async function main() {
  if (!existsSync(DIR)) {
    console.error(`No such directory: ${DIR}`);
    process.exit(1);
  }
  const files = readdirSync(DIR).filter((f) => extname(f).toLowerCase() === '.docx');
  if (!files.length) {
    console.error(`No .docx files in ${DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  console.log(`Reading ${files.length} documents from ${DIR}\n`);

  const docs = [];
  for (const f of files) {
    try {
      const { value } = await mammoth.extractRawText({ path: join(DIR, f) });
      const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
      docs.push({ file: f, lines });
      writeFileSync(join(OUT, `${basename(f, '.docx')}.txt`), value, 'utf8');
    } catch (err) {
      console.log(`  FAILED  ${f}: ${err.message}`);
    }
  }
  console.log(`Extracted ${docs.length}/${files.length}\n`);

  // --- 1. Contents pages give the intended structure, stated by the firm ----
  // A contents line looks like "Executive summary\t5".
  const tocCounts = new Map();
  const tocPerDoc = [];
  for (const d of docs) {
    const toc = [];
    for (const l of d.lines) {
      const m = l.match(/^(.+?)\t\s*(\d{1,3})$/);
      if (m && m[1].length < 70) toc.push(norm(m[1]));
    }
    tocPerDoc.push({ file: d.file, toc });
    new Set(toc).forEach((t) => tocCounts.set(t, (tocCounts.get(t) || 0) + 1));
  }

  console.log('='.repeat(72));
  console.log('SECTION STRUCTURE (from the contents page of each document)');
  console.log('='.repeat(72));
  const ordered = [...tocCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [title, n] of ordered) {
    const pct = Math.round((n / docs.length) * 100);
    const mark = n === docs.length ? 'ALL ' : `${String(pct).padStart(3)}%`;
    console.log(`  ${mark}  ${title}`);
  }

  // The most common ordering, taken from the document with the fullest contents.
  const richest = tocPerDoc.slice().sort((a, b) => b.toc.length - a.toc.length)[0];
  console.log(`\nFullest contents page (${richest.file}):`);
  richest.toc.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t}`));

  // --- 2. Fixed house wording ---------------------------------------------
  // Long paragraphs repeated across most documents are boilerplate.
  const paraDocs = new Map();   // skeleton -> Set(file)
  const paraSample = new Map(); // skeleton -> original text
  for (const d of docs) {
    const seen = new Set();
    for (const l of d.lines) {
      if (l.length < 90) continue;               // too short to be a real block
      const k = skeleton(l);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!paraDocs.has(k)) { paraDocs.set(k, new Set()); paraSample.set(k, l); }
      paraDocs.get(k).add(d.file);
    }
  }
  const boiler = [...paraDocs.entries()]
    .map(([k, set]) => ({ k, n: set.size, text: paraSample.get(k) }))
    .filter((x) => x.n >= Math.ceil(docs.length * 0.6))
    .sort((a, b) => b.n - a.n);

  console.log(`\n${'='.repeat(72)}`);
  console.log(`FIXED HOUSE WORDING — ${boiler.length} blocks in >=60% of documents`);
  console.log('='.repeat(72));
  boiler.slice(0, 25).forEach((b, i) => {
    console.log(`\n[${i + 1}] in ${b.n}/${docs.length} documents`);
    console.log(`    ${b.text.slice(0, 300)}${b.text.length > 300 ? '…' : ''}`);
  });

  writeFileSync(
    join(OUT, '_boilerplate.json'),
    JSON.stringify(boiler.map((b) => ({ documents: b.n, text: b.text })), null, 2),
    'utf8'
  );
  writeFileSync(
    join(OUT, '_structure.json'),
    JSON.stringify({
      documentCount: docs.length,
      sections: ordered.map(([title, n]) => ({ title, documents: n, universal: n === docs.length })),
      fullestOrder: richest.toc,
      perDocument: tocPerDoc,
    }, null, 2),
    'utf8'
  );

  console.log(`\n${'='.repeat(72)}`);
  console.log(`Wrote extracted text + _structure.json + _boilerplate.json to:\n  ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
