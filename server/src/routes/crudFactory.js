import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/httpError.js';

/**
 * Build a standard REST router for a table.
 *
 * @param {object} cfg
 * @param {string} cfg.table        SQL table name (trusted, not user input)
 * @param {string[]} cfg.columns    columns clients may write
 * @param {string[]} [cfg.required] columns required on create
 * @param {string}  [cfg.orderBy]   default ORDER BY clause
 * @param {string[]} [cfg.filters]  query-string columns allowed for filtering list
 * @returns {import('express').Router}
 */
export function crudRouter(cfg) {
  const {
    table,
    columns,
    required = [],
    orderBy = 'created_at DESC',
    filters = [],
  } = cfg;
  const router = Router();

  const pick = (body) => {
    const data = {};
    for (const col of columns) {
      if (body[col] !== undefined) data[col] = body[col] === '' ? null : body[col];
    }
    return data;
  };

  // LIST (with optional ?col=value filters and ?limit)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const where = [];
      const params = [];
      for (const f of filters) {
        if (req.query[f] !== undefined) {
          params.push(req.query[f]);
          where.push(`${f} = $${params.length}`);
        }
      }
      const limit = Math.min(Number(req.query.limit) || 200, 1000);
      const sql =
        `SELECT * FROM ${table}` +
        (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
        ` ORDER BY ${orderBy} LIMIT ${limit}`;
      const { rows } = await query(sql, params);
      res.json(rows);
    })
  );

  // GET ONE
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows[0]) throw notFound(`${table} row not found`);
      res.json(rows[0]);
    })
  );

  // CREATE
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const data = pick(req.body || {});
      for (const r of required) {
        if (data[r] == null) throw badRequest(`Missing required field: ${r}`);
      }
      const keys = Object.keys(data);
      if (!keys.length) throw badRequest('No valid fields provided');
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const { rows } = await query(
        `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        keys.map((k) => data[k])
      );
      res.status(201).json(rows[0]);
    })
  );

  // UPDATE (partial)
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = pick(req.body || {});
      const keys = Object.keys(data);
      if (!keys.length) throw badRequest('No valid fields provided');
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const { rows } = await query(
        `UPDATE ${table} SET ${sets.join(',')} WHERE id = $${keys.length + 1} RETURNING *`,
        [...keys.map((k) => data[k]), req.params.id]
      );
      if (!rows[0]) throw notFound(`${table} row not found`);
      res.json(rows[0]);
    })
  );

  // DELETE
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rowCount) throw notFound(`${table} row not found`);
      res.status(204).end();
    })
  );

  return router;
}

export default crudRouter;
