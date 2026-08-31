#!/usr/bin/env node
/**
 * Reset the working database for Legacy Risk Advice.
 *
 * The Lakeside-era app shipped with demo seed data (fictional clients on
 * @example.com and 100 synthetic "training" rows of a few dozen characters
 * each). Neither is useful to the new practice, and the synthetic training
 * rows actively degrade generation because the SOA generator treats
 * training_data as reference material.
 *
 * This script:
 *   1. Snapshots EVERY table to archive/lakeside/db-snapshot/<table>.json
 *      so nothing is lost — the purge is reversible from that snapshot.
 *   2. Deletes the demo clients (cascades to their assets, liabilities,
 *      expenses, income, family, goals, insurance, estate, plans, emails,
 *      transcripts and documents).
 *   3. Deletes the demo client groups.
 *   4. Deletes the synthetic training rows.
 *
 * Real CFS book data (cfs_accounts / cfs_holdings / cfs_allocations) is left
 * untouched — it is genuine client data, archived rather than deleted.
 *
 * Usage:
 *   node scripts/reset-for-legacy.mjs            # dry run — reports only
 *   node scripts/reset-for-legacy.mjs --confirm  # actually purge
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pool } from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = resolve(__dirname, '../../archive/lakeside/db-snapshot');

const CONFIRM = process.argv.includes('--confirm');

// Demo data fingerprints. Deliberately narrow so real data can never match.
const DEMO_CLIENT_PREDICATE = "email LIKE '%@example.com'";
const DEMO_GROUP_NAMES = ['The Harrison Household', 'The Test Household (Demo)'];
// Every seeded training row is a stub; real imported material runs to
// thousands of characters. 1000 chars is far above the largest stub (184).
const SYNTHETIC_TRAINING_PREDICATE = 'length(content) < 1000';

async function tableNames(client) {
  const { rows } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  return rows.map((r) => r.tablename);
}

async function snapshot(client) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const tables = await tableNames(client);
  let total = 0;
  for (const t of tables) {
    const { rows } = await client.query(`SELECT * FROM "${t}"`);
    writeFileSync(resolve(SNAPSHOT_DIR, `${t}.json`), JSON.stringify(rows, null, 2), 'utf8');
    total += rows.length;
    console.log(`  ${t.padEnd(24)} ${String(rows.length).padStart(6)} rows`);
  }
  writeFileSync(
    resolve(SNAPSHOT_DIR, '_manifest.json'),
    JSON.stringify({ takenAt: new Date().toISOString(), tables, totalRows: total }, null, 2),
    'utf8'
  );
  console.log(`\n  Snapshot written to archive/lakeside/db-snapshot/ (${total} rows across ${tables.length} tables)`);
}

async function report(client) {
  const q = async (sql, params) => (await client.query(sql, params)).rows;

  const clients = await q(`SELECT first_name, last_name, email FROM clients WHERE ${DEMO_CLIENT_PREDICATE} ORDER BY created_at`);
  const groups = await q('SELECT name FROM client_groups WHERE name = ANY($1)', [DEMO_GROUP_NAMES]);
  const training = await q(`SELECT count(*)::int n FROM training_data WHERE ${SYNTHETIC_TRAINING_PREDICATE}`);
  const keepTraining = await q(`SELECT count(*)::int n FROM training_data WHERE NOT (${SYNTHETIC_TRAINING_PREDICATE})`);
  const cfs = await q('SELECT count(*)::int n FROM cfs_accounts');

  console.log('\nTO DELETE');
  console.log(`  demo clients            ${clients.length}`);
  clients.forEach((c) => console.log(`      - ${c.first_name} ${c.last_name} <${c.email}>`));
  console.log(`  demo client groups      ${groups.length}`);
  groups.forEach((g) => console.log(`      - ${g.name}`));
  console.log(`  synthetic training rows ${training[0].n}`);
  console.log('\nTO KEEP');
  console.log(`  real training rows      ${keepTraining[0].n}`);
  console.log(`  CFS accounts (archived) ${cfs[0].n}`);

  return { clients: clients.length, groups: groups.length, training: training[0].n };
}

async function purge(client) {
  await client.query('BEGIN');
  try {
    // Clients cascade to every dependent financial table.
    const c = await client.query(`DELETE FROM clients WHERE ${DEMO_CLIENT_PREDICATE}`);
    const g = await client.query('DELETE FROM client_groups WHERE name = ANY($1)', [DEMO_GROUP_NAMES]);
    const t = await client.query(`DELETE FROM training_data WHERE ${SYNTHETIC_TRAINING_PREDICATE}`);
    // Any plan/email/transcript left behind by a null client_id.
    const p = await client.query("DELETE FROM financial_plans WHERE client_id IS NULL AND group_id IS NULL");
    await client.query('COMMIT');
    console.log('\nPURGED');
    console.log(`  clients            ${c.rowCount}`);
    console.log(`  client_groups      ${g.rowCount}`);
    console.log(`  training_data      ${t.rowCount}`);
    console.log(`  orphaned plans     ${p.rowCount}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Snapshotting database to archive...\n');
    await snapshot(client);
    await report(client);

    if (!CONFIRM) {
      console.log('\nDRY RUN — nothing deleted. Re-run with --confirm to purge.');
      return;
    }
    await purge(client);

    const { rows: [after] } = await client.query(
      'SELECT (SELECT count(*)::int FROM clients) clients, (SELECT count(*)::int FROM training_data) training'
    );
    console.log(`\nAfter: ${after.clients} clients, ${after.training} training rows.`);
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[reset-for-legacy] failed:', err.message);
    pool.end();
    process.exit(1);
  });
