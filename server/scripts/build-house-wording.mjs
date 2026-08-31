#!/usr/bin/env node
/**
 * Turn the boilerplate found by analyse-soa-examples.mjs into the firm's house
 * wording file, which the SOA generator reproduces verbatim.
 *
 * Only firm boilerplate is kept — blocks that appear near-identically across
 * most documents and contain no client specifics. Filtered out:
 *   - template errors leaking from whatever tool produced the source documents
 *     ("include_schedules Err", "Err: Handling", "Docnote:", "Version:")
 *   - lines naming a specific adviser, so the wording is adviser-agnostic
 *   - anything still carrying a dollar figure or a personal name
 *
 * Usage: node scripts/build-house-wording.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = resolve(__dirname, '../../legacy/drop/soa-build/.extracted/_boilerplate.json');
const OUT_DIR = resolve(__dirname, '../src/data');
const OUT = resolve(OUT_DIR, 'legacy-house-wording.json');

const REJECT = [
  /Err:\s*Handling/i,
  /include_schedules/i,
  /^Docnote:/i,
  /^Version:\s/i,
  /templateVariable/i,
  /businessRisk\s+(True|False)/i,
  /Joshua Davidson|Luke Fisher/i,   // adviser-specific — supplied from config instead
  /\$[\d,]/,                         // any dollar figure is client data, not boilerplate
];

/**
 * Which section each block belongs to. Order matters — first match wins.
 * Derived from where the block sits in the source documents.
 */
const SECTION_RULES = [
  ['scope', /limit our advice|subject matter of advice|areas of advice|not provided advice on/i],
  ['needs-analysis-position', /Insurance Needs Analysis|insurance needs analysis/i],
  ['objectives', /needs and objectives|goals and objectives|wealth protection/i],
  ['current-position', /relevant aspects of your current situation/i],
  ['recommendations', /recommendations for your insurance portfolio|features and limitations|tailored to suit your specific needs/i],
  ['replacement', /maintain your existing cover|replace, cancel or reduce|health check prior to proceeding|void the contract|suicide/i],
  ['underwriting', /underwriting|blood test|interim cover|does not commence until the insurer|approved your application/i],
  ['duty-of-care', /duty to take reasonable care|misrepresent any information/i],
  ['cooling-off', /cooling-off/i],
  ['fees', /commission|remuneration|Synchron Advice Pty Ltd and its representatives/i],
  ['important-info', /Product Disclosure Statement|PDS|cooling|review your insurance arrangements/i],
  ['reliance', /relied on information supplied|prepared solely for your use|information current as at/i],
  ['actions', /undertake the following steps|electronic signature|Once the case is accepted/i],
  ['about', /Statement of Advice \(SOA\)|Thank you for the opportunity|take full ownership/i],
];

const sectionOf = (text) => {
  for (const [name, re] of SECTION_RULES) if (re.test(text)) return name;
  return 'general';
};

function main() {
  if (!existsSync(IN)) {
    console.error(`Run analyse-soa-examples.mjs first — no ${IN}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(IN, 'utf8'));

  const kept = [];
  let rejected = 0;
  for (const b of raw) {
    const text = b.text.replace(/\s+/g, ' ').trim();
    if (REJECT.some((re) => re.test(text))) { rejected += 1; continue; }
    if (text.length < 60) { rejected += 1; continue; }
    kept.push({ section: sectionOf(text), documents: b.documents, text });
  }

  const bySection = {};
  for (const k of kept) (bySection[k.section] ||= []).push({ documents: k.documents, text: k.text });
  for (const s of Object.keys(bySection)) bySection[s].sort((a, b) => b.documents - a.documents);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    note: 'Legacy Risk Advice house wording, derived from 32 completed SOAs. '
      + 'Blocks appearing near-verbatim in most documents. Reproduced by the SOA '
      + 'generator rather than rewritten. Contains no client-specific detail.',
    sourceDocuments: 32,
    sections: bySection,
  }, null, 2), 'utf8');

  console.log(`Kept ${kept.length} blocks, rejected ${rejected}.`);
  for (const [s, arr] of Object.entries(bySection).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${s.padEnd(24)} ${arr.length}`);
  }
  console.log(`\nWrote ${OUT}`);
}

main();
