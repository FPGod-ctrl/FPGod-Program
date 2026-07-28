import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { createApp } from '../app.js';
import { pool } from '../config/db.js';

/**
 * End-to-end through the real database: build a CFS-shaped workbook in memory,
 * upload it, review the preview, commit it, and read the book back.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = createApp();

// Namespaced so a failed run never collides with the adviser's real book.
const TAG = 'ZZTEST';
const acctNo = (n) => `${TAG}${n}`;

const SHEET = [
  ['Colonial First State — Funds Under Management'],
  ['As at 30 June 2026'],
  [],
  ['Account Number', 'Account Name', 'Product', 'Account Balance', 'Adviser Fee %'],
  [acctNo('001'), 'Testcase, Alice', 'FirstChoice Wholesale Personal Super', 250000, 0.66],
  [acctNo('002'), 'Testcase, Bob', 'FirstChoice Wholesale Pension', '$400,000.00', '0.55%'],
  ['', 'Total', '', 650000, ''],
];

function workbookBuffer(rows) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'FUM');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const cleanup = async () => {
  await pool.query(`DELETE FROM cfs_accounts WHERE account_number LIKE '${TAG}%'`);
  await pool.query(`DELETE FROM cfs_imports WHERE filename LIKE '${TAG}%'`);
};

beforeAll(async () => {
  const sql = await fs.readFile(path.resolve(__dirname, '../db/schema.sql'), 'utf8');
  await pool.query(sql);
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('CFS import round trip', () => {
  let preview;

  it('previews an uploaded export without writing anything', async () => {
    const before = await pool.query('SELECT COUNT(*)::int AS n FROM cfs_accounts');

    const res = await request(app)
      .post('/api/cfs/import/preview')
      .attach('file', workbookBuffer(SHEET), `${TAG}-fum.xlsx`);

    expect(res.status).toBe(200);
    preview = res.body;
    expect(preview.source).toBe('spreadsheet');
    expect(preview.accounts).toHaveLength(2);
    expect(preview.columnMap).toHaveProperty('adviser_fee_pct');
    expect(preview.summary.totalFum).toBe(650000);

    const after = await pool.query('SELECT COUNT(*)::int AS n FROM cfs_accounts');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('re-derives accounts when a column is remapped', async () => {
    const res = await request(app).post('/api/cfs/import/remap').send({
      rows: preview.rows,
      headerRow: preview.headerRow,
      // Drop the balance column: every account should fall back to zero.
      columnMap: { ...preview.columnMap, account_balance: undefined },
    });
    expect(res.status).toBe(200);
    expect(res.body.summary.totalFum).toBe(0);
    expect(res.body.warnings.join(' ')).toMatch(/\$0 balance/);
  });

  it('commits the book and totals FUM and fees', async () => {
    const res = await request(app).post('/api/cfs/import/commit').send({
      filename: `${TAG}-fum.xlsx`,
      source: 'spreadsheet',
      accounts: preview.accounts,
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);

    const book = await request(app).get('/api/cfs/book');
    expect(book.status).toBe(200);
    const mine = book.body.accounts.filter((a) => a.account_number?.startsWith(TAG));
    expect(mine).toHaveLength(2);

    const alice = mine.find((a) => a.account_number === acctNo('001'));
    expect(Number(alice.balance)).toBe(250000);
    expect(Number(alice.adviser_fee_amount)).toBeCloseTo(1650, 2);   // 250000 * 0.66%
    expect(alice.account_type).toBe('super');
    expect(mine.find((a) => a.account_number === acctNo('002')).account_type).toBe('pension');
  });

  it('updates in place when the same export is re-imported', async () => {
    const grown = SHEET.map((r) => (r[0] === acctNo('001') ? [...r.slice(0, 3), 275000, 0.66] : r));

    const preview2 = await request(app)
      .post('/api/cfs/import/preview')
      .attach('file', workbookBuffer(grown), `${TAG}-fum-july.xlsx`);

    const res = await request(app).post('/api/cfs/import/commit').send({
      filename: `${TAG}-fum-july.xlsx`,
      source: 'spreadsheet',
      accounts: preview2.body.accounts,
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(0);
    expect(res.body.updated).toBe(2);

    const { rows } = await pool.query(
      'SELECT balance FROM cfs_accounts WHERE account_number = $1', [acctNo('001')]
    );
    expect(rows).toHaveLength(1);              // updated, not duplicated
    expect(Number(rows[0].balance)).toBe(275000);
  });

  it('links and unlinks a client, keeping match_status honest', async () => {
    const { rows: [client] } = await pool.query(
      `INSERT INTO clients (first_name, last_name) VALUES ('Alice', 'Testcase') RETURNING id`
    );
    const { rows: [acc] } = await pool.query(
      'SELECT id FROM cfs_accounts WHERE account_number = $1', [acctNo('001')]
    );
    try {
      const linked = await request(app).put(`/api/cfs/accounts/${acc.id}`).send({ client_id: client.id });
      expect(linked.status).toBe(200);
      expect(linked.body.match_status).toBe('matched');

      const unlinked = await request(app).put(`/api/cfs/accounts/${acc.id}`).send({ client_id: '' });
      expect(unlinked.body.client_id).toBeNull();
      expect(unlinked.body.match_status).toBe('unmatched');
    } finally {
      await pool.query('DELETE FROM clients WHERE id = $1', [client.id]);
    }
  });

  it('rejects an upload with no file', async () => {
    const res = await request(app).post('/api/cfs/import/preview');
    expect(res.status).toBe(400);
  });
});
