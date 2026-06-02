import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  console.log('[migrate] applying schema.sql ...');
  await pool.query(sql);
  console.log('[migrate] done.');
}

migrate()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[migrate] failed:', err.message);
    pool.end();
    process.exit(1);
  });
