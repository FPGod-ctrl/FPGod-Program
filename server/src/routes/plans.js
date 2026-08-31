import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import HTMLtoDOCX from 'html-to-docx';
import { crudRouter } from './crudFactory.js';
import { gatherClientContext, generatePlanSectioned, generateQuestions } from '../services/planGenerator.js';
import { generateRiskSoa } from '../services/riskSoaGenerator.js';
import { renderPlanHtml } from '../services/planRender.js';
import { saveGeneratedDocument } from '../services/generatedDocs.js';

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
    const { clientId, title, instructions, answers, save = true, docType = 'plan' } = req.body || {};
    if (!clientId) throw badRequest('clientId is required');

    const ctx = await gatherClientContext(clientId);
    if (!ctx) throw notFound('Client not found');

    const isSoa = docType === 'soa';
    const { text, ai } = await generatePlanSectioned(ctx, instructions);
    const planTitle =
      title ||
      `${isSoa ? 'Statement of Advice' : 'Financial Plan'} — ${ctx.client.first_name} ${ctx.client.last_name}`;

    if (!save) {
      return res.json({ content: text, ai, saved: false });
    }

    const { rows: [plan] } = await query(
      `INSERT INTO financial_plans
        (client_id, group_id, title, status, content, completeness, generated_by_ai)
       VALUES ($1,$2,$3,'draft',$4,$5,$6) RETURNING *`,
      [clientId, ctx.client.group_id || null, planTitle, text, ai ? 95 : 60, ai]
    );

    // Also file it into the client's Documents (Both: native table + document).
    const document = await saveGeneratedDocument({
      clientId,
      groupId: ctx.client.group_id || null,
      title: planTitle,
      docType: isSoa ? 'soa' : 'plan',
      text,
    });

    res.status(201).json({ ...plan, content: text, ai, saved: true, document });
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

/**
 * POST /api/plans/generate-risk-soa
 * Body: { clientId, title?, instructions?, save? }
 * Insurance & Risk Planning — generates a risk-only Statement of Advice from
 * the client's file, existing cover and the adviser's notes. Uses the firm's
 * own SOA template when one has been imported; otherwise the standard
 * Australian risk-advice section skeleton.
 */
router.post(
  '/generate-risk-soa',
  asyncHandler(async (req, res) => {
    const { clientId, title, instructions = '', save = true, stream = false } = req.body || {};
    if (!clientId) throw badRequest('clientId is required');

    const ctx = await gatherClientContext(clientId);
    if (!ctx) throw notFound('Client not found');

    // A 14-section SOA runs for minutes. When the caller asks to stream, emit
    // newline-delimited JSON as each section lands so the UI can show real
    // progress instead of an indefinite spinner. Once headers are sent the
    // normal error handler can no longer write a status, so failures after
    // that point are reported as a final `error` event.
    let onProgress;
    if (stream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no'); // don't let a proxy buffer the stream
      res.flushHeaders?.();
      onProgress = (p) => res.write(`${JSON.stringify({ type: 'progress', ...p })}\n`);
    }

    let generated;
    try {
      generated = await generateRiskSoa(ctx, instructions, { onProgress });
    } catch (err) {
      if (!stream) throw err;
      res.write(`${JSON.stringify({ type: 'error', message: err.message })}\n`);
      return res.end();
    }
    const { text, ai, sections, usedTemplate } = generated;
    const soaTitle = title
      || `Statement of Advice — ${ctx.client.first_name} ${ctx.client.last_name}`;

    const finish = (payload) => {
      if (!stream) return res.status(payload.saved ? 201 : 200).json(payload);
      res.write(`${JSON.stringify({ type: 'done', ...payload })}\n`);
      return res.end();
    };

    if (!save) {
      return finish({ content: text, ai, sections, usedTemplate, saved: false });
    }

    const { rows: [plan] } = await query(
      `INSERT INTO financial_plans
        (client_id, group_id, title, status, content, completeness, generated_by_ai, metadata)
       VALUES ($1,$2,$3,'draft',$4,$5,$6,$7) RETURNING *`,
      [
        clientId, ctx.client.group_id || null, soaTitle, text,
        ai ? 95 : 60, ai,
        JSON.stringify({ doc_type: 'risk_soa', sections, used_template: usedTemplate || null }),
      ]
    );

    // File it into the client's Documents as well.
    const document = await saveGeneratedDocument({
      clientId,
      groupId: ctx.client.group_id || null,
      title: soaTitle,
      docType: 'soa',
      text,
    });

    return finish({
      ...plan, content: text, ai, sections, usedTemplate, saved: true, document,
    });
  })
);

router.use('/', crud);

export default router;
