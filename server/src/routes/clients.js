import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/httpError.js';
import { upload } from '../middleware/upload.js';
import { extractText } from '../services/documentExtractor.js';
import { scanDocument } from '../services/documentScan.js';
import { crudRouter } from './crudFactory.js';

const COLUMNS = [
  'group_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'date_of_birth',
  'occupation', 'risk_profile', 'annual_income', 'net_worth', 'notes', 'status',
  'partner_first_name', 'partner_last_name', 'partner_email', 'partner_phone',
  'partner_date_of_birth', 'partner_occupation', 'partner_annual_income', 'partner_risk_profile',
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

    const [
      group, partners, current, recommended, plans, transcripts, emails, documents,
      assets, liabilities, income, expenses, insurance, goals, estate,
    ] = await Promise.all([
      client.group_id
        ? query('SELECT * FROM client_groups WHERE id = $1', [client.group_id]).then((r) => r.rows[0])
        : null,
      client.group_id
        ? query('SELECT id, first_name, last_name, occupation, email FROM clients WHERE group_id = $1 AND id <> $2 ORDER BY created_at ASC', [client.group_id, id]).then((r) => r.rows)
        : [],
      query('SELECT * FROM current_investments WHERE client_id = $1 ORDER BY balance DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM recommended_investments WHERE client_id = $1', [id]).then((r) => r.rows),
      query('SELECT id,title,status,completeness,updated_at FROM financial_plans WHERE client_id = $1 ORDER BY updated_at DESC', [id]).then((r) => r.rows),
      query('SELECT id,title,meeting_date FROM meeting_transcripts WHERE client_id = $1 ORDER BY meeting_date DESC NULLS LAST', [id]).then((r) => r.rows),
      query('SELECT id,subject,status,updated_at FROM followup_emails WHERE client_id = $1 ORDER BY updated_at DESC', [id]).then((r) => r.rows),
      query('SELECT id,original_name,doc_type,scan_status,created_at FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM assets WHERE client_id = $1 ORDER BY value DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM liabilities WHERE client_id = $1 ORDER BY balance DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM income_sources WHERE client_id = $1 ORDER BY amount DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM expenses WHERE client_id = $1 ORDER BY amount DESC', [id]).then((r) => r.rows),
      query('SELECT * FROM insurance_policies WHERE client_id = $1 ORDER BY cover_amount DESC NULLS LAST', [id]).then((r) => r.rows),
      query('SELECT * FROM financial_goals WHERE client_id = $1 ORDER BY target_date ASC NULLS LAST', [id]).then((r) => r.rows),
      query('SELECT * FROM estate_plans WHERE client_id = $1', [id]).then((r) => r.rows[0] || null),
    ]);

    res.json({
      client, group, partners, current, recommended, plans, transcripts, emails, documents,
      assets, liabilities, income, expenses, insurance, goals, estate,
    });
  })
);

/**
 * POST /api/clients/import
 * multipart/form-data: file=<binary>
 * Extracts client fields + holdings from an uploaded profile document (PDF /
 * Word / TXT) using AI, WITHOUT saving. The frontend shows the parsed values in
 * a pre-filled, editable form for the advisor to review and confirm.
 */
router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded (field name must be "file")');
    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!text || !text.trim()) throw badRequest('No readable text found in that document');

    const { result, ai } = await scanDocument(text);
    const list = (k) => (Array.isArray(result?.[k]) ? result[k] : []);
    res.json({
      ai,
      source: req.file.originalname,
      parsed: {
        client: result?.client || {},
        investments: list('investments'),
        assets: list('assets'),
        liabilities: list('liabilities'),
        income: list('income'),
        expenses: list('expenses'),
        insurance: list('insurance'),
        goals: list('goals'),
        estate: result?.estate || {},
        notes: result?.notes || null,
      },
    });
  })
);

/**
 * POST /api/clients/:id/scan-documents
 * Scans EVERY document already attached to this client (using each document's
 * stored extracted text), merges the structured fields the AI finds, and returns
 * them WITHOUT saving. The frontend shows the merged values in a pre-filled,
 * editable form for the advisor to review and confirm.
 *
 * Merge rules: client_profile documents are scanned first and the first non-empty
 * value for each field wins; investments are concatenated and de-duplicated by
 * fund name.
 */
const CLIENT_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
  'occupation', 'annual_income', 'net_worth', 'risk_profile',
];

router.post(
  '/:id/scan-documents',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows: [client] } = await query('SELECT id FROM clients WHERE id = $1', [id]);
    if (!client) throw notFound('Client not found');

    const { rows: docs } = await query(
      `SELECT id, original_name, doc_type, extracted_text
         FROM documents
        WHERE client_id = $1 AND extracted_text IS NOT NULL AND extracted_text <> ''
        ORDER BY (doc_type = 'client_profile') DESC, created_at DESC`,
      [id]
    );
    if (!docs.length) {
      throw badRequest('No readable documents are attached to this client yet. Upload documents first.');
    }

    // Each financial array de-dupes on a key built from these fields.
    const LIST_SPECS = {
      investments: ['fund_name'],
      assets: ['name', 'category'],
      liabilities: ['name'],
      income: ['name'],
      expenses: ['name'],
      insurance: ['policy_type', 'provider'],
      goals: ['name'],
    };
    const ESTATE_TEXT = ['will_date', 'will_location', 'executor', 'poa_type', 'poa_attorney', 'trust_details', 'beneficiaries'];
    const ESTATE_BOOL = ['has_will', 'has_poa', 'has_testamentary_trust'];

    const mergedClient = {};
    const lists = { investments: [], assets: [], liabilities: [], income: [], expenses: [], insurance: [], goals: [] };
    const seen = Object.fromEntries(Object.keys(lists).map((k) => [k, new Set()]));
    const estate = {};
    const sources = [];
    let aiUsed = false;

    const keyOf = (item, cols) =>
      cols.map((c) => String(item?.[c] ?? '').trim().toLowerCase()).join('|');

    for (const doc of docs) {
      const { result, ai } = await scanDocument(doc.extracted_text);
      if (ai) aiUsed = true;

      const c = result?.client || {};
      for (const k of CLIENT_FIELDS) {
        const v = c[k];
        if ((mergedClient[k] == null || mergedClient[k] === '') && v != null && v !== '') {
          mergedClient[k] = v;
        }
      }

      for (const [listKey, cols] of Object.entries(LIST_SPECS)) {
        const arr = result?.[listKey];
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const k = keyOf(item, cols);
          if (!k.replace(/\|/g, '')) continue; // skip items with no identifying value
          if (seen[listKey].has(k)) continue;
          seen[listKey].add(k);
          lists[listKey].push(item);
        }
      }

      const e = result?.estate || {};
      for (const b of ESTATE_BOOL) { if (e[b] === true) estate[b] = true; }
      for (const t of ESTATE_TEXT) {
        if ((estate[t] == null || estate[t] === '') && e[t] != null && e[t] !== '') estate[t] = e[t];
      }

      sources.push({ id: doc.id, name: doc.original_name, doc_type: doc.doc_type });
    }

    res.json({
      ai: aiUsed,
      scanned: docs.length,
      sources,
      parsed: { client: mergedClient, ...lists, estate },
    });
  })
);

// =====================================================================
// Estate planning — one row per client, fetched and upserted directly.
// =====================================================================
const ESTATE_COLUMNS = [
  'has_will', 'will_date', 'will_location', 'executor',
  'has_poa', 'poa_type', 'poa_attorney',
  'has_testamentary_trust', 'trust_details', 'beneficiaries', 'notes',
];

router.get(
  '/:id/estate',
  asyncHandler(async (req, res) => {
    const { rows: [row] } = await query('SELECT * FROM estate_plans WHERE client_id = $1', [req.params.id]);
    res.json(row || null);
  })
);

router.put(
  '/:id/estate',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows: [client] } = await query('SELECT id FROM clients WHERE id = $1', [id]);
    if (!client) throw notFound('Client not found');

    const body = req.body || {};
    const data = {};
    for (const col of ESTATE_COLUMNS) {
      if (body[col] !== undefined) data[col] = body[col] === '' ? null : body[col];
    }
    const cols = Object.keys(data);
    const insertCols = ['client_id', ...cols];
    const values = [id, ...cols.map((c) => data[c])];
    const placeholders = insertCols.map((_, i) => `$${i + 1}`);
    const updates = cols.length
      ? cols.map((c) => `${c} = EXCLUDED.${c}`).concat('updated_at = now()').join(', ')
      : 'updated_at = now()';

    const { rows: [saved] } = await query(
      `INSERT INTO estate_plans (${insertCols.join(',')})
       VALUES (${placeholders.join(',')})
       ON CONFLICT (client_id) DO UPDATE SET ${updates}
       RETURNING *`,
      values
    );
    res.json(saved);
  })
);

router.use('/', crud);

export default router;
