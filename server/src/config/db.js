import pg from 'pg';
import { env } from './env.js';

// Postgres returns NUMERIC as strings by default to avoid precision loss.
// Financial amounts in this app fit safely in a JS number, so parse them for
// convenient JSON output. (OID 1700 = numeric.)
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

// A DATE column is a calendar day, not an instant. By default pg turns it into a
// JS Date at LOCAL midnight, which JSON-serialises to the previous day for any
// timezone ahead of UTC (a 1974-03-14 birthday came back as
// "1974-03-13T14:00:00.000Z" in Sydney). Return the raw 'YYYY-MM-DD' string so
// dates survive the round trip unchanged. (OID 1082 = date.)
pg.types.setTypeParser(1082, (val) => val);

const poolConfig = env.db.connectionString
  ? { connectionString: env.db.connectionString, ssl: env.db.ssl }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ssl: env.db.ssl,
    };

export const pool = new pg.Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[db] unexpected idle client error', err);
});

/**
 * Run a parameterised query.
 * @param {string} text
 * @param {any[]} [params]
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Run a set of statements inside a transaction.
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
