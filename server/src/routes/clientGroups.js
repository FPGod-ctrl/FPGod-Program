import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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

router.use('/', crud);

export default router;
