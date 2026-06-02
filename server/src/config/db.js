import pg from 'pg';
import { env } from './env.js';

// Postgres returns NUMERIC as strings by default to avoid precision loss.
// Financial amounts in this app fit safely in a JS number, so parse them for
// convenient JSON output. (OID 1700 = numeric.)
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

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
  // eslint-disable-next-line no-console
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
