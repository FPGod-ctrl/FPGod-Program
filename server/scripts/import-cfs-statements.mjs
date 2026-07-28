#!/usr/bin/env node
/**
 * Bulk-import a folder of CFS statement PDFs into the CFS book.
 *
 *   node scripts/import-cfs-statements.mjs "../intake/cfs non fee paying client review"
 *   node scripts/import-cfs-statements.mjs <folder> --dry-run
 *
 * Dragging 250 PDFs through the browser is miserable, so this does the same
 * work from the command line: read each statement, match it to a client, and
 * upsert the account, its holdings and its asset allocation.
 *
 * Re-running is safe — accounts are keyed on their CFS account number, so a
 * second run updates balances rather than duplicating the book.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pool, query, withTransaction } from '../src/config/db.js';
import { parseStatementText } from '../src/services/cfsStatementText.js';
import { matchAccounts } from '../src/services/cfsMatch.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dir = args.find((a) => !a.startsWith('--'));

const aud = (n) => `$${Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

if (!dir) {
  console.error('Usage: node scripts/import-cfs-statements.mjs <folder> [--dry-run]');
  process.exit(1);
}

async function main() {
  const abs = path.resolve(dir);
  const entries = await fs.readdir(abs);
  const pdfs = entries.filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
  if (!pdfs.length) {
    console.error(`No PDFs found in ${abs}`);
    process.exit(1);
  }
  console.log(`Reading ${pdfs.length} statements from ${abs}${dryRun ? '  (dry run)' : ''}\n`);

  const collected = [];
  const warnings = [];

  for (const [i, file] of pdfs.entries()) {
    // Every 25 rather than every file: \r doesn't collapse in piped output.
    if (i % 25 === 0 || i === pdfs.length - 1) console.log(`  parsing ${i + 1}/${pdfs.length}…`);
    try {
      const { text } = await pdfParse(await fs.readFile(path.join(abs, file)));
      const { accounts, warnings: w } = parseStatementText(text);
      w.forEach((msg) => warnings.push(`${file}: ${msg}`));
      accounts.forEach((a) => collected.push({ ...a, source_file: file }));
    } catch (err) {
      warnings.push(`${file}: ${err.message}`);
    }
  }
  console.log('');

  const { rows: clients } = await query(
    `SELECT id, first_name, last_name, partner_first_name, partner_last_name FROM clients`
  );
  const accounts = matchAccounts(collected, clients);

  const fum = accounts.reduce((s, a) => s + a.balance, 0);
  const paying = accounts.filter((a) => a.fee_status === 'paying');
  const notPaying = accounts.filter((a) => a.fee_status === 'not_paying');
  const notPayingFum = notPaying.reduce((s, a) => s + a.balance, 0);
  const linked = accounts.filter((a) => a.client_id).length;

  console.log(`accounts read      : ${accounts.length} from ${pdfs.length} files`);
  console.log(`holdings           : ${accounts.reduce((s, a) => s + a.holdings.length, 0)}`);
  console.log(`total FUM          : ${aud(fum)}`);
  console.log(`paying fees        : ${paying.length} accounts, ${aud(paying.reduce((s, a) => s + a.balance, 0))}`);
  console.log(`NOT paying fees    : ${notPaying.length} accounts, ${aud(notPayingFum)}`);
  console.log(`matched to clients : ${linked} of ${accounts.length}`);
  if (warnings.length) {
    console.log(`\nwarnings (${warnings.length}):`);
    warnings.slice(0, 15).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 15) console.log(`  … and ${warnings.length - 15} more`);
  }

  if (dryRun) {
    console.log('\nDry run — nothing written.');
    return;
  }

  const result = await withTransaction(async (db) => {
    const asAt = accounts.find((a) => a.as_at_date)?.as_at_date || null;
    const { rows: [imp] } = await db.query(
      `INSERT INTO cfs_imports (filename, source, as_at_date, account_count, holding_count, total_fum, total_fees)
       VALUES ($1,'pdf',$2,$3,$4,$5,$6) RETURNING id`,
      [path.basename(abs), asAt, accounts.length,
        accounts.reduce((s, a) => s + a.holdings.length, 0), fum,
        accounts.reduce((s, a) => s + (a.adviser_fee_amount || 0), 0)]
    );

    let created = 0;
    let updated = 0;
    for (const a of accounts) {
      const { rows: found } = await db.query(
        'SELECT id FROM cfs_accounts WHERE account_number = $1', [a.account_number]
      );
      const values = [
        a.client_id || null, imp.id, a.account_number, a.account_name || a.account_number,
        a.product || null, a.account_type || 'other', a.balance, a.adviser_fee_pct ?? null,
        a.adviser_fee_amount ?? null, a.as_at_date, a.client_id ? 'matched' : 'unmatched',
        a.match_confidence || null, a.fee_status, a.email, a.date_of_birth,
        a.opening_balance ?? null, a.growth_pct ?? null,
        a.report_period_start, a.report_period_end,
      ];

      let id;
      if (found[0]) {
        id = found[0].id;
        await db.query(
          `UPDATE cfs_accounts SET
             client_id = COALESCE($1, client_id), import_id = $2, account_number = $3,
             account_name = $4, product = $5, account_type = $6, balance = $7,
             adviser_fee_pct = $8, adviser_fee_amount = $9, as_at_date = $10,
             match_status = $11, match_confidence = $12, fee_status = $13,
             email = COALESCE($14, email), date_of_birth = COALESCE($15, date_of_birth),
             opening_balance = $16, growth_pct = $17,
             report_period_start = $18, report_period_end = $19
           WHERE id = $20`,
          [...values, id]
        );
        updated += 1;
      } else {
        const { rows: [row] } = await db.query(
          `INSERT INTO cfs_accounts
             (client_id, import_id, account_number, account_name, product, account_type,
              balance, adviser_fee_pct, adviser_fee_amount, as_at_date, match_status,
              match_confidence, fee_status, email, date_of_birth, opening_balance,
              growth_pct, report_period_start, report_period_end)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           RETURNING id`,
          values
        );
        id = row.id;
        created += 1;
      }

      if (a.holdings.length) {
        await db.query('DELETE FROM cfs_holdings WHERE account_id = $1', [id]);
        for (const h of a.holdings) {
          await db.query(
            `INSERT INTO cfs_holdings
               (account_id, option_name, option_code, units, unit_price, balance, allocation_pct, as_at_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [id, h.option_name, h.option_code, h.units, h.unit_price, h.balance, h.allocation_pct, a.as_at_date]
          );
        }
      }
      if (a.allocations.length) {
        await db.query('DELETE FROM cfs_allocations WHERE account_id = $1', [id]);
        for (const al of a.allocations) {
          await db.query(
            `INSERT INTO cfs_allocations (account_id, asset_class, bucket, value, pct)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, al.asset_class, al.bucket, al.value, al.pct]
          );
        }
      }
    }
    return { created, updated };
  });

  console.log(`\nImported: ${result.created} new, ${result.updated} updated.`);
  console.log('Open the CFS Book page to review and link the unmatched accounts.');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\n[import] failed:', err.message);
    pool.end();
    process.exit(1);
  });
