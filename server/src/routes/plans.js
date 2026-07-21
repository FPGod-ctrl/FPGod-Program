import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import HTMLtoDOCX from 'html-to-docx';
import { crudRouter } from './crudFactory.js';
import { gatherClientContext, generatePlanSectioned, generateQuestions } from '../services/planGenerator.js';
import { renderPlanHtml } from '../services/planRender.js';

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
 * POST /api/plans/interview
 * Body: { clientId, instructions? }
 * Reviews the client/household file and returns clarifying questions for the
 * adviser to answer before the plan is generated. Saves nothing.
 */
router.post(
  '/interview',
  asyncHandler(async (req, res) => {
    const { clientId, instructions } = req.body || {};
    if (!clientId) throw badRequest('clientId is required');

    const ctx = await gatherClientContext(clientId);
    if (!ctx) throw notFound('Client not found');

    const { questions, ai } = await generateQuestions(ctx, instructions);
    res.json({ questions, ai });
  })
);

/**
 * POST /api/plans/generate
 * Body: { clientId, title?, instructions?, answers?, save? }
 * Builds context from the client + training data, generates a plan
 * (incorporating the adviser's answers), and (by default) persists it.
 */
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { clientId, title, instructions, answers, save = true } = req.body || {};
    if (!clientId) throw badRequest('clientId is required');

    const ctx = await gatherClientContext(clientId);
    if (!ctx) throw notFound('Client not found');

    const { text, ai } = await generatePlanSectioned(ctx, instructions);
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
    const { text, ai } = await generatePlanSectioned(ctx, instructions);
    const { rows: [updated] } = await query(
      `UPDATE financial_plans
       SET content = $1, generated_by_ai = $2, completeness = $3 WHERE id = $4 RETURNING *`,
      [text, ai, ai ? 95 : 60, req.params.id]
    );
    res.json({ ...updated, ai });
  })
);

/**
 * POST /api/plans/:id/export/docx
 * Body: { theme?, accent?, firmName?, tagline? }
 * Returns a branded Word document of the plan.
 */
router.post(
  '/:id/export/docx',
  asyncHandler(async (req, res) => {
    const { rows: [plan] } = await query('SELECT * FROM financial_plans WHERE id = $1', [req.params.id]);
    if (!plan) throw notFound('Plan not found');

    let client = null;
    if (plan.client_id) {
      const { rows } = await query('SELECT * FROM clients WHERE id = $1', [plan.client_id]);
      client = rows[0] || null;
    }

    const { theme, accent, firmName, tagline } = req.body || {};
    const html = renderPlanHtml({ plan, client, theme, accent, firmName, tagline });
    const docx = await HTMLtoDOCX(html, null, {
      orientation: 'portrait',
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
    });
    const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());

    const fname = (plan.title || 'financial-plan').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fname || 'financial-plan'}.docx"`);
    res.send(buffer);
  })
);

router.use('/', crud);

export default router;
