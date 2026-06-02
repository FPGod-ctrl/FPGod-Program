import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/dashboard — headline counts + recent activity for the home screen.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [counts, aum, recentClients, recentPlans, recentEmails] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM clients)             AS clients,
          (SELECT COUNT(*) FROM client_groups)       AS groups,
          (SELECT COUNT(*) FROM financial_plans)     AS plans,
          (SELECT COUNT(*) FROM documents)           AS documents,
          (SELECT COUNT(*) FROM meeting_transcripts) AS transcripts,
          (SELECT COUNT(*) FROM followup_emails)     AS emails,
          (SELECT COUNT(*) FROM training_data)       AS training
      `).then((r) => r.rows[0]),
      query('SELECT COALESCE(SUM(balance),0) AS total FROM current_investments').then((r) => r.rows[0].total),
      query('SELECT id, first_name, last_name, status, created_at FROM clients ORDER BY created_at DESC LIMIT 5').then((r) => r.rows),
      query('SELECT id, title, status, updated_at FROM financial_plans ORDER BY updated_at DESC LIMIT 5').then((r) => r.rows),
      query('SELECT id, subject, status, updated_at FROM followup_emails ORDER BY updated_at DESC LIMIT 5').then((r) => r.rows),
    ]);

    // Normalise count strings -> numbers.
    const stats = Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Number(v)])
    );

    res.json({
      stats: { ...stats, aum: Number(aum) },
      recent: { clients: recentClients, plans: recentPlans, emails: recentEmails },
    });
  })
);

export default router;
