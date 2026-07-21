/**
 * Bridge: map a Risk Researcher comparison/quote result into the data shape the
 * insurance-report generator expects, then (optionally) generate the .docx.
 *
 *   node src/to-report.mjs <quote-result.json> ["Client Name"]
 *
 * The mapping is intentionally defensive — the exact Risk Researcher result
 * shape is confirmed once we see live data, so adjust `mapQuote()` then. Until
 * then this documents the target contract and works on hand-shaped input.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATOR = resolve(__dirname, '../../../server/scripts/generate-insurance-report.mjs');

/** Convert a Risk Researcher result into report `current`/`indicative` rows. */
export function mapQuote(result, { adviser = 'Tristan Biro', date } = {}) {
  // result.benefits[]: { type, startDate, product, lifeInsured, sumInsured, owner, premium, premiumType, scope }
  const rows = (result.benefits || []).map((b) => ({
    type: b.type,
    startDate: b.startDate || '',
    product: b.product || '',
    lifeInsured: b.lifeInsured || result.lifeInsured || '',
    sumInsured: b.sumInsured || '',
    owner: b.owner || '',
    premium: b.premium || '',
    premiumType: b.premiumType || '',
    replace: b.replace || '',
  }));
  return {
    adviser,
    date: date || result.date || '',
    current: result.kind === 'indicative' ? [] : rows,
    indicative: result.kind === 'indicative' ? rows : [],
    totalPremium: result.totalPremium || '',
  };
}

if (process.argv[1] && process.argv[1].endsWith('to-report.mjs')) {
  const [, , inPath, name] = process.argv;
  if (!inPath) { console.error('Usage: node src/to-report.mjs <quote-result.json> ["Client Name"]'); process.exit(1); }
  const result = JSON.parse(readFileSync(resolve(process.cwd(), inPath), 'utf8'));
  const data = mapQuote(result);
  const dataPath = resolve(process.cwd(), `${name || result.lifeInsured || 'quote'}.report-data.json`);
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const out = resolve(process.cwd(), `${name || result.lifeInsured || 'Quote'} - Insurance Report.docx`);
  execFileSync('node', [GENERATOR, dataPath, out], { stdio: 'inherit' });
  console.log('Report:', out);
}
