import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';
import { crudRouter } from './crudFactory.js';

const COLUMNS = [
  'group_id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
  'occupation', 'risk_profile', 'annual_income', 'net_worth', 'notes', 'status',
];

const crud = crudRouter({
  table: 'clients',
  columns: COLUMNS,
  required: ['first_name', 'last_name'],
  orderBy: 'last_name ASC, first_name ASC',
  filters: ['group_id', 'status'],
});

// Custom routes are registered on a wrapper and matched BEFORE the generic
// CRUD router, so these enriched handlers win over the factory defaults.
const router = Router();

// Enriched list: group name + holdings summary (handy for the table UI).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`
      SELECT c.*,
             g.name AS group_name,
             COALESCE(ci.total_balance, 0) AS total_balance,
             COALESCE(ci.holdings, 0)      AS holdings_count
      FROM clients c
      LEFT JOIN client_groups g ON g.id = c.group_id
      LEFT JOIN (
        SELECT client_id, SUM(balance) AS total_balance, COUNT(*) AS holdings
        FROM current_investments GROUP BY client_id
      ) ci ON ci.client_id = c.id
      ORDER BY c.last_name ASC, c.first_name ASC
    `);
    res.json(rows);
  })
);

// Full client dossier — profile + group + investments + plans + transcripts + emails.
router.get(
  '/:id/detail',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows: [client] } = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!client) throw notFound('Client not found');

    const [group, current, recommended, plans, transcripts, emails, documents] = await Promise.all([
      client.group_id
        ? query('SELECT * FROM client_groups WHERE id = $1', [client.group_id]).then((r) => r.rows[0])
        : null,
      query('SELECT * FROM current_investments WHERE client_id = $1 ORDER BY balance DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM recommended_investments WHERE client_id = $1', [id]).then((r) => r.rows),
      query('SELECT id,title,status,completeness,updated_at FROM financial_plans WHERE client_id = $1 ORDER BY updated_at DESC', [id]).then((r) => r.rows),
      query('SELECT id,title,meeting_date FROM meeting_transcripts WHERE client_id = $1 ORDER BY meeting_date DESC NULLS LAST', [id]).then((r) => r.rows),
      query('SELECT id,subject,status,updated_at FROM followup_emails WHERE client_id = $1 ORDER BY updated_at DESC', [id]).then((r) => r.rows),
      query('SELECT id,original_name,doc_type,scan_status,created_at FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [id]).then((r) => r.rows),
    ]);

    res.json({ client, group, current, recommended, plans, transcripts, emails, documents });
  })
);

router.use('/', crud);

export default router;
