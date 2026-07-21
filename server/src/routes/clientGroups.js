import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';
import { crudRouter } from './crudFactory.js';

const crud = crudRouter({
  table: 'client_groups',
  columns: ['name', 'group_type', 'notes'],
  required: ['name'],
  orderBy: 'name ASC',
});

const router = Router();

// Enriched list: member count + combined balance (matched before the factory).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`
      SELECT g.*,
             COUNT(DISTINCT c.id) AS member_count,
             COALESCE(SUM(ci.balance), 0) AS total_balance
      FROM client_groups g
      LEFT JOIN clients c ON c.group_id = g.id
      LEFT JOIN current_investments ci ON ci.client_id = c.id
      GROUP BY g.id
      ORDER BY g.name ASC
    `);
    res.json(rows);
  })
);

// Members of a group.
router.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM clients WHERE group_id = $1 ORDER BY last_name, first_name',
      [req.params.id]
    );
    res.json(rows);
  })
);

// Full household dossier — the group plus every member (partner) with their
// complete financial breakdown, so the household page can show each partner
// separately and combine the totals.
router.get(
  '/:id/detail',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows: [group] } = await query('SELECT * FROM client_groups WHERE id = $1', [id]);
    if (!group) throw notFound('Household not found');

    const { rows: members } = await query(
      'SELECT * FROM clients WHERE group_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const detailed = await Promise.all(members.map(async (client) => {
      const cid = client.id;
      const [current, assets, liabilities, income, expenses, insurance, goals, estate] = await Promise.all([
        query('SELECT * FROM current_investments WHERE client_id = $1 ORDER BY balance DESC', [cid]).then((r) => r.rows),
        query('SELECT * FROM assets WHERE client_id = $1 ORDER BY value DESC', [cid]).then((r) => r.rows),
        query('SELECT * FROM liabilities WHERE client_id = $1 ORDER BY balance DESC', [cid]).then((r) => r.rows),
        query('SELECT * FROM income_sources WHERE client_id = $1 ORDER BY amount DESC', [cid]).then((r) => r.rows),
        query('SELECT * FROM expenses WHERE client_id = $1 ORDER BY amount DESC', [cid]).then((r) => r.rows),
        query('SELECT * FROM insurance_policies WHERE client_id = $1 ORDER BY cover_amount DESC NULLS LAST', [cid]).then((r) => r.rows),
        query('SELECT * FROM financial_goals WHERE client_id = $1 ORDER BY target_date ASC NULLS LAST', [cid]).then((r) => r.rows),
        query('SELECT * FROM estate_plans WHERE client_id = $1', [cid]).then((r) => r.rows[0] || null),
      ]);
      return { client, current, assets, liabilities, income, expenses, insurance, goals, estate };
    }));

    // Joint / household-level items belong to the group, not an individual
    // member (client_id IS NULL), so they are counted once, never duplicated.
    const jq = (table, order) =>
      query(`SELECT * FROM ${table} WHERE group_id = $1 AND client_id IS NULL ORDER BY ${order}`, [id]).then((r) => r.rows);
    const [jCurrent, jAssets, jLiab, jIncome, jExpenses, jInsurance, jGoals] = await Promise.all([
      jq('current_investments', 'balance DESC'),
      jq('assets', 'value DESC'),
      jq('liabilities', 'balance DESC'),
      jq('income_sources', 'amount DESC'),
      jq('expenses', 'amount DESC'),
      jq('insurance_policies', 'cover_amount DESC NULLS LAST'),
      jq('financial_goals', 'target_date ASC NULLS LAST'),
    ]);
    const joint = {
      current: jCurrent, assets: jAssets, liabilities: jLiab, income: jIncome,
      expenses: jExpenses, insurance: jInsurance, goals: jGoals, estate: null,
    };

    // All documents across the household (each member's + group-level/joint).
    const memberIds = members.map((m) => m.id);
    const { rows: documents } = await query(
      `SELECT id, client_id, group_id, original_name, doc_type, scan_status, created_at
         FROM documents
        WHERE client_id = ANY($1) OR group_id = $2
        ORDER BY created_at DESC`,
      [memberIds, id]
    );

    res.json({ group, members: detailed, joint, documents });
  })
);

router.use('/', crud);

export default router;
