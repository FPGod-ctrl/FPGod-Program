#!/usr/bin/env node
/**
 * Import archived Lakeside material into training_data as reference for the
 * Legacy Risk Advice generators.
 *
 * What goes where, and why:
 *
 *   archive/lakeside/follow-ups/**.md            -> kind='email'
 *   archive/lakeside/generated-plans/client-emails/**.md -> kind='email'
 *       The adviser's real writing voice. emailGenerator.js selects
 *       kind='email' rows as few-shot style examples, so these directly
 *       improve follow-up email generation from day one.
 *
 *   archive/lakeside/insurance-reviews/**.md     -> kind='plan', doc_type='risk_reference'
 *       Genuine risk work (TAL TSO filenote and one-pager) — the only
 *       archived material that is actually risk advice.
 *
 *   archive/lakeside/reference-plans/*.{docx,pdf} -> kind='plan', archived=true
 *       Comprehensive financial plans from the previous practice. Imported for
 *       search and reference ONLY. They are tagged archived=true and are NEVER
 *       picked up by riskSoaGenerator.js, which loads a template only where
 *       metadata.doc_type='risk_soa' AND metadata.is_template='true'. This
 *       matters: a risk-only SOA must not inherit investment-plan structure.
 *
 * The 199 legacy binary .doc files are SKIPPED. The extractor has no .doc
 * parser and falls back to a raw byte decode, which yields control-character
 * soup rather than text — importing that would poison the reference set.
 * Convert them to .docx if they are ever needed.
 *
 * Usage:
 *   node scripts/import-reference-material.mjs           # dry run
 *   node scripts/import-reference-material.mjs --confirm # write to the database
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, basename, relative } from 'node:path';
import { pool } from '../src/config/db.js';
import { extractText } from '../src/services/documentExtractor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARCHIVE = resolve(__dirname, '../../archive/lakeside');
const CONFIRM = process.argv.includes('--confirm');
// Re-import just the email examples without duplicating the plan corpus.
const EMAILS_ONLY = process.argv.includes('--emails-only');

// Below this, the extraction produced nothing worth keeping.
const MIN_CHARS = 400;

// Supporting files that sit alongside the real material but are not examples.
// A README or a blank _template imported as an "email example" becomes a style
// exemplar the generator will imitate, so they are excluded by name.
const NOT_AN_EXAMPLE = /^(readme|_template|_sample|index|notes)\b/i;

// ORDER MATTERS. emailGenerator.js selects style examples with
// `ORDER BY created_at DESC LIMIT n`, so the LAST thing imported is what the
// model actually sees. The 41 meeting and phone follow-ups are the adviser's
// core voice and are the most transferable to a risk practice, so they are
// imported last and win the selection over the bulk CFS outreach emails.
const SOURCES = [
  {
    dir: 'generated-plans/client-emails',
    kind: 'email',
    exts: ['.md'],
    meta: { source: 'lakeside', category: 'client_outreach_email' },
    label: 'client outreach emails (CFS campaign)',
  },
  {
    dir: 'insurance-reviews',
    kind: 'plan',
    exts: ['.md'],
    meta: { source: 'lakeside', doc_type: 'risk_reference' },
    label: 'insurance review notes (risk)',
  },
  {
    dir: 'reference-plans',
    kind: 'plan',
    exts: ['.docx', '.pdf'],
    meta: { source: 'lakeside', doc_type: 'financial_plan', archived: true },
    label: 'historical financial plans (reference only, never used for risk SOAs)',
  },
  {
    // Imported LAST on purpose — see the note above SOURCES.
    dir: 'follow-ups',
    kind: 'email',
    exts: ['.md'],
    meta: { source: 'lakeside', category: 'follow_up_email' },
    label: 'follow-up emails (meeting + phone) — imported last so they lead',
  },
];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function textOf(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.md' || ext === '.txt') return readFileSync(file, 'utf8');
  const buf = readFileSync(file);
  return extractText(buf, '', basename(file));
}

async function main() {
  const client = await pool.connect();
  const summary = [];
  let imported = 0;
  let skipped = 0;

  try {
    const sources = EMAILS_ONLY ? SOURCES.filter((s) => s.kind === 'email') : SOURCES;
    for (const src of sources) {
      const root = resolve(ARCHIVE, src.dir);
      const files = walk(root)
        .filter((f) => src.exts.includes(extname(f).toLowerCase()))
        .filter((f) => !NOT_AN_EXAMPLE.test(basename(f, extname(f))));
      let ok = 0;
      let thin = 0;
      let failed = 0;

      for (const f of files) {
        let text = '';
        try {
          text = (await textOf(f)) || '';
        } catch {
          failed += 1;
          continue;
        }
        // PDF extraction can emit NUL bytes, which Postgres rejects in a text
        // column. split/join rather than a regex: a literal NUL inside a regex
        // trips the no-control-regex lint rule.
        text = text.split('\0').join('').trim();
        if (text.length < MIN_CHARS) { thin += 1; continue; }

        const title = basename(f, extname(f));
        if (CONFIRM) {
          await client.query(
            `INSERT INTO training_data (kind, title, content, tags, metadata)
             VALUES ($1,$2,$3,$4,$5)`,
            [
              src.kind,
              title,
              text,
              [src.meta.category || src.meta.doc_type || 'reference'],
              JSON.stringify({ ...src.meta, file: relative(ARCHIVE, f).replace(/\\/g, '/') }),
            ]
          );
        }
        ok += 1;
      }

      imported += ok;
      skipped += thin + failed;
      summary.push({ label: src.label, kind: src.kind, found: files.length, ok, thin, failed });
    }

    console.log(CONFIRM ? 'IMPORTED\n' : 'DRY RUN — nothing written\n');
    for (const s of summary) {
      console.log(`  ${s.label}`);
      console.log(`    kind=${s.kind}  found=${s.found}  imported=${s.ok}  too-short=${s.thin}  failed=${s.failed}`);
    }

    const doc = walk(resolve(ARCHIVE, 'reference-plans')).filter((f) => extname(f).toLowerCase() === '.doc').length;
    console.log(`\n  SKIPPED: ${doc} legacy binary .doc files (no .doc parser — convert to .docx if needed)`);
    console.log(`\n  Total: ${imported} imported, ${skipped} skipped.`);

    if (CONFIRM) {
      const { rows } = await client.query(
        "SELECT kind, count(*)::int n, round(avg(length(content)))::int avg_chars FROM training_data GROUP BY kind ORDER BY kind"
      );
      console.log('\n  training_data now:');
      rows.forEach((r) => console.log(`    ${r.kind.padEnd(8)} ${String(r.n).padStart(4)} rows, avg ${r.avg_chars} chars`));
    } else {
      console.log('\n  Re-run with --confirm to write.');
    }
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[import-reference-material] failed:', err.message);
    pool.end();
    process.exit(1);
  });
