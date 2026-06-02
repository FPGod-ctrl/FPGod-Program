import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { crudRouter } from './crudFactory.js';
import { generateEmail } from '../services/emailGenerator.js';

const crud = crudRouter({
  table: 'followup_emails',
  columns: [
    'client_id', 'group_id', 'transcript_id', 'subject', 'body', 'status', 'generated_by_ai',
  ],
  required: [],
  orderBy: 'updated_at DESC',
  filters: ['client_id', 'group_id', 'transcript_id', 'status'],
});

const router = Router();

/**
 * POST /api/emails/generate
 * Body: { transcriptId, instructions?, save? }
 * Generates a follow-up email from a meeting transcript + historical examples.
 */
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { transcriptId, instructions, save = true } = req.body || {};
    if (!transcriptId) throw badRequest('transcriptId is required');

    const { rows: [transcript] } = await query(
      'SELECT * FROM meeting_transcripts WHERE id = $1',
      [transcriptId]
    );
    if (!transcript) throw notFound('Transcript not found');

    let client = null;
    if (transcript.client_id) {
      const { rows } = await query('SELECT * FROM clients WHERE id = $1', [transcript.client_id]);
      client = rows[0] || null;
    }

    const { subject, body, ai } = await generateEmail({ transcript, client }, instructions);

    if (!save) {
      return res.json({ subject, body, ai, saved: false });
    }

    const { rows: [email] } = await query(
      `INSERT INTO followup_emails
        (client_id, group_id, transcript_id, subject, body, status, generated_by_ai)
       VALUES ($1,$2,$3,$4,$5,'draft',$6) RETURNING *`,
      [transcript.client_id, transcript.group_id, transcriptId, subject, body, ai]
    );
    res.status(201).json({ ...email, ai, saved: true });
  })
);

router.use('/', crud);

export default router;
