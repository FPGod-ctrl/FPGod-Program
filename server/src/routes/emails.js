import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { crudRouter } from './crudFactory.js';
import { generateEmail } from '../services/emailGenerator.js';
import { saveGeneratedDocument } from '../services/generatedDocs.js';

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

/**
 * POST /api/emails/draft
 * Body: { clientId?, text, type?, instructions?, save? }
 * Drafts a follow-up email straight from pasted notes / transcript — no saved
 * transcript needed. When save is true and a clientId is given, the draft is
 * persisted to followup_emails and filed into the client's Documents.
 * type: 'meeting' (detailed follow-on) | 'phone' (short & warm phone-call).
 */
router.post(
  '/draft',
  asyncHandler(async (req, res) => {
    const { clientId = null, text, type = 'meeting', instructions = '', save = false } = req.body || {};
    if (!text || !String(text).trim()) throw badRequest('text (meeting notes / transcript) is required');

    let client = null;
    if (clientId) {
      const { rows } = await query('SELECT * FROM clients WHERE id = $1', [clientId]);
      client = rows[0] || null;
    }

    const transcript = {
      content: String(text),
      title: type === 'phone' ? 'our phone call' : 'our meeting',
    };
    const styleNote =
      type === 'phone'
        ? 'Write a SHORT, warm phone-call follow-up that thanks them for the call and drives to a booked meeting: thank-you -> meeting details -> bold critical action items -> sign-off.'
        : 'Write a DETAILED follow-on-from-meeting email: a personalised thank-you, then in-depth themed sections (situation, insurance, super, planning, estate) with figures and the "why", then clear Action Items.';
    const merged = `${styleNote}${instructions ? ' ' + instructions : ''}`;

    const { subject, body, ai } = await generateEmail({ transcript, client }, merged);

    // Persist + file into the client's record when requested and a client is set.
    let saved = false;
    let document = null;
    let email = null;
    if (save && client) {
      const { rows: [row] } = await query(
        `INSERT INTO followup_emails
          (client_id, group_id, subject, body, status, generated_by_ai)
         VALUES ($1,$2,$3,$4,'draft',$5) RETURNING *`,
        [client.id, client.group_id || null, subject, body, ai]
      );
      email = row;
      document = await saveGeneratedDocument({
        clientId: client.id,
        groupId: client.group_id || null,
        title: subject || `Follow-up email — ${client.first_name} ${client.last_name}`,
        docType: 'email',
        text: `Subject: ${subject}\n\n${body}`,
      });
      saved = true;
    }

    res.json({ subject, body, ai, saved, email, document });
  })
);

router.use('/', crud);

export default router;
