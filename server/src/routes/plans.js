import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { crudRouter } from './crudFactory.js';
import { gatherClientContext, generatePlan } from '../services/planGenerator.js';

const crud = crudRouter({
  table: 'financial_plans',
  columns: [
    'client_id', 'group_id', 'title', 'status', 'content', 'summary',
    'metadata', 'completeness', 'generated_by_ai',
  ],
  required: [],
  orderBy: 'updated_at DESC',
  filters: ['client_id', 'group_id', 'status'],
});

const router = Router();

/**
 * POST /api/plans/generate
 * Body: { clientId, title?, instructions?, save? }
 * Builds context from the client + training data, generates a plan, and
 * (by default) persists it.
 */
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { clientId, title, instructions, save = true } = req.body || {};
    if (!clientId) throw badRequest('clientId is required');

    const ctx = await gatherClientContext(clientId);
    if (!ctx) throw notFound('Client not found');

    const { text, ai } = await generatePlan(ctx, instructions);
    const planTitle = title || `Financial Plan — ${ctx.client.first_name} ${ctx.client.last_name}`;

    if (!save) {
      return res.json({ content: text, ai, saved: false });
    }

    const { rows: [plan] } = await query(
      `INSERT INTO financial_plans
        (client_id, group_id, title, status, content, completeness, generated_by_ai)
       VALUES ($1,$2,$3,'draft',$4,$5,$6) RETURNING *`,
      [clientId, ctx.client.group_id || null, planTitle, text, ai ? 95 : 60, ai]
    );
    res.status(201).json({ ...plan, ai, saved: true });
  })
);

/**
 * POST /api/plans/:id/regenerate
 * Regenerate the content of an existing plan in place.
 */
router.post(
  '/:id/regenerate',
  asyncHandler(async (req, res) => {
    const { instructions } = req.body || {};
    const { rows: [plan] } = await query('SELECT * FROM financial_plans WHERE id = $1', [req.params.id]);
    if (!plan) throw notFound('Plan not found');
    if (!plan.client_id) throw badRequest('Plan has no associated client to regenerate from');

    const ctx = await gatherClientContext(plan.client_id);
    const { text, ai } = await generatePlan(ctx, instructions);
    const { rows: [updated] } = await query(
      `UPDATE financial_plans
       SET content = $1, generated_by_ai = $2, completeness = $3 WHERE id = $4 RETURNING *`,
      [text, ai, ai ? 95 : 60, req.params.id]
    );
    res.json({ ...updated, ai });
  })
);

router.use('/', crud);

export default router;
