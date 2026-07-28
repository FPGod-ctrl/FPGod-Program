import { Router } from 'express';
import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { upload } from '../middleware/upload.js';
import { extractText } from '../services/documentExtractor.js';
import { parseWorkbook, buildAccounts, summarise } from '../services/cfsImport.js';
import { parseStatement } from '../services/cfsStatement.js';
import { matchAccounts } from '../services/cfsMatch.js';
import { groupByPerson, selectTargets, segmentByAge, readDrafts } from '../services/cfsCampaign.js';

const router = Router();

const isPdf = (file) =>
  file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');

const clientList = async () => {
  const { rows } = await query(
    `SELECT id, first_name, last_name, partner_first_name, partner_last_name
     FROM clients ORDER BY last_name, first_name`
  );
  return rows;
};

/**
 * POST /api/cfs/import/preview   multipart: one or more files
 *
 * Parses without writing anything. A single spreadsheet returns the detected
 * column mapping and raw rows so the UI can remap columns; any number of PDF
 * statements are read structurally and merged into one reviewable list.
 */
router.post(
  '/import/preview',
  // .any() so a drop of 200 statements and a single spreadsheet share a route
  // regardless of the field name the browser used.
  upload.any(),
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw badRequest('No file uploaded');
    const clients = await clientList();

    const pdfs = files.filter(isPdf);
    if (pdfs.length) {
      if (pdfs.length !== files.length) {
        throw badRequest('Drop statements and spreadsheets separately — this batch mixed both.');
      }
      const collected = [];
      const warnings = [];
      let usedAi = false;

      for (const file of pdfs) {
        try {
          const body = await extractText(file.buffer, file.mimetype, file.originalname);
          if (!body) { warnings.push(`${file.originalname}: no readable text (likely a scanned image).`); continue; }
          const { accounts: found, ai, warnings: w } = await parseStatement(body);
          if (ai) usedAi = true;
          w.forEach((msg) => warnings.push(`${file.originalname}: ${msg}`));
          found.forEach((a) => collected.push({ ...a, source_file: file.originalname }));
        } catch (err) {
          warnings.push(`${file.originalname}: ${err.message}`);
        }
      }

      if (!collected.length) {
        throw badRequest(warnings.length
          ? `Nothing could be read. ${warnings.slice(0, 3).join(' ')}`
          : 'No accounts could be read from those statements.');
      }

      const accounts = matchAccounts(collected, clients);
      return res.json({
        source: 'pdf',
        filename: pdfs.length === 1 ? pdfs[0].originalname : `${pdfs.length} statements`,
        fileCount: pdfs.length,
        ai: usedAi,
        sheets: [],
        selectedSheet: null,
        headers: [],
        columnMap: {},
        headerRow: -1,
        rows: [],
        accounts,
        warnings,
        summary: summarise(accounts),
      });
    }

    if (files.length > 1) throw badRequest('Drop one spreadsheet at a time.');
    const [file] = files;
    const { sheets } = parseWorkbook(file.buffer, file.originalname);
    const best = sheets[0];
    const accounts = matchAccounts(best.accounts, clients);

    res.json({
      source: 'spreadsheet',
      filename: file.originalname,
      fileCount: 1,
      ai: false,
      // Every sheet, so the UI can offer a switch; rows only for the chosen one
      // to keep the payload sane on multi-sheet workbooks.
      sheets: sheets.map((s) => ({
        name: s.name,
        headerRow: s.headerRow,
        headers: s.headers,
        columnMap: s.columnMap,
        accountCount: s.accounts.length,
        rows: s.name === best.name ? s.rows : undefined,
      })),
      selectedSheet: best.name,
      headers: best.headers,
      columnMap: best.columnMap,
      headerRow: best.headerRow,
      rows: best.rows,
      accounts,
      warnings: best.warnings,
      summary: summarise(accounts),
    });
  })
);

/**
 * POST /api/cfs/import/remap   { rows, columnMap, headerRow }
 * Re-derives accounts from an edited column mapping — no re-upload needed.
 */
router.post(
  '/import/remap',
  asyncHandler(async (req, res) => {
    const { rows, columnMap, headerRow = 0 } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) throw badRequest('rows is required');
    if (!columnMap || typeof columnMap !== 'object') throw badRequest('columnMap is required');

    const { accounts: built, warnings } = buildAccounts(rows, columnMap, Number(headerRow) || 0);
    const accounts = matchAccounts(built, await clientList());
    res.json({ accounts, warnings, summary: summarise(accounts) });
  })
);

/**
 * POST /api/cfs/import/commit
 * { filename, source, as_at_date?, column_map?, accounts: [...] }
 *
 * Upserts each account by account number (falling back to name+product) and
 * replaces its holdings, so re-importing next month's export updates the book
 * in place rather than duplicating it.
 */
router.post(
  '/import/commit',
  asyncHandler(async (req, res) => {
    const { filename = 'CFS import', source = 'spreadsheet', column_map = {}, accounts } = req.body || {};
    if (!Array.isArray(accounts) || !accounts.length) throw badRequest('accounts is required');

    const totals = summarise(accounts);
    const asAt = accounts.find((a) => a.as_at_date)?.as_at_date || req.body?.as_at_date || null;

    const result = await withTransaction(async (db) => {
      const { rows: [imp] } = await db.query(
        `INSERT INTO cfs_imports
           (filename, source, as_at_date, account_count, holding_count,
            total_fum, total_fees, column_map)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [filename, source === 'pdf' ? 'pdf' : 'spreadsheet', asAt,
          totals.accountCount, totals.holdingCount, totals.totalFum, totals.totalFees, column_map]
      );

      let created = 0;
      let updated = 0;
      let holdingRows = 0;

      for (const a of accounts) {
        const accountNumber = a.account_number || null;
        const accountName = a.account_name || accountNumber;
        if (!accountName) continue;

        const existing = accountNumber
          ? await db.query('SELECT id FROM cfs_accounts WHERE account_number = $1', [accountNumber])
          : await db.query(
            `SELECT id FROM cfs_accounts
             WHERE account_number IS NULL
               AND lower(account_name) = lower($1)
               AND lower(coalesce(product, '')) = lower(coalesce($2, ''))`,
            [accountName, a.product || null]
          );

        const feeStatus = ['paying', 'not_paying', 'unknown'].includes(a.fee_status)
          ? a.fee_status
          : 'unknown';

        const values = [
          a.client_id || null,
          imp.id,
          accountNumber,
          accountName,
          a.product || null,
          a.account_type || 'other',
          Number(a.balance || 0),
          a.adviser_fee_pct ?? null,
          a.adviser_fee_amount ?? null,
          a.fee_basis || null,
          a.as_at_date || asAt,
          a.client_id ? 'matched' : (a.match_status === 'ignored' ? 'ignored' : 'unmatched'),
          a.match_confidence || null,
          a.notes || null,
          feeStatus,
          a.email || null,
          a.date_of_birth || null,
          a.opening_balance ?? null,
          a.growth_pct ?? null,
          a.report_period_start || null,
          a.report_period_end || null,
        ];

        let accountId;
        if (existing.rows[0]) {
          accountId = existing.rows[0].id;
          await db.query(
            `UPDATE cfs_accounts SET
               client_id = COALESCE($1, client_id), import_id = $2, account_number = $3,
               account_name = $4, product = $5, account_type = $6, balance = $7,
               adviser_fee_pct = $8, adviser_fee_amount = $9, fee_basis = $10,
               as_at_date = $11, match_status = $12, match_confidence = $13, notes = $14,
               fee_status = $15,
               -- A spreadsheet import carries no personal details; don't blank
               -- out what a statement already established.
               email = COALESCE($16, email), date_of_birth = COALESCE($17, date_of_birth),
               opening_balance = COALESCE($18, opening_balance),
               growth_pct = COALESCE($19, growth_pct),
               report_period_start = COALESCE($20, report_period_start),
               report_period_end = COALESCE($21, report_period_end)
             WHERE id = $22`,
            [...values, accountId]
          );
          updated += 1;
        } else {
          const { rows: [row] } = await db.query(
            `INSERT INTO cfs_accounts
               (client_id, import_id, account_number, account_name, product, account_type,
                balance, adviser_fee_pct, adviser_fee_amount, fee_basis, as_at_date,
                match_status, match_confidence, notes, fee_status, email, date_of_birth,
                opening_balance, growth_pct, report_period_start, report_period_end)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
             RETURNING id`,
            values
          );
          accountId = row.id;
          created += 1;
        }

        // Asset allocation is a point-in-time snapshot, same as holdings.
        const allocations = Array.isArray(a.allocations) ? a.allocations.filter((x) => x?.asset_class) : [];
        if (allocations.length) {
          await db.query('DELETE FROM cfs_allocations WHERE account_id = $1', [accountId]);
          for (const al of allocations) {
            await db.query(
              `INSERT INTO cfs_allocations (account_id, asset_class, bucket, value, pct)
               VALUES ($1,$2,$3,$4,$5)`,
              [accountId, al.asset_class, al.bucket === 'defensive' ? 'defensive' : 'growth',
                Number(al.value || 0), al.pct ?? null]
            );
          }
        }

        // Holdings are a point-in-time snapshot: replace rather than merge, but
        // only when this file actually carried them (a FUM-only export must not
        // wipe the breakdown a PDF statement already supplied).
        const holdings = Array.isArray(a.holdings) ? a.holdings.filter((h) => h?.option_name) : [];
        if (holdings.length) {
          await db.query('DELETE FROM cfs_holdings WHERE account_id = $1', [accountId]);
          for (const h of holdings) {
            await db.query(
              `INSERT INTO cfs_holdings
                 (account_id, option_name, option_code, asset_class, units, unit_price,
                  balance, allocation_pct, mgmt_fee_pct, as_at_date)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [accountId, h.option_name, h.option_code || null, h.asset_class || null,
                h.units ?? null, h.unit_price ?? null, Number(h.balance || 0),
                h.allocation_pct ?? null, h.mgmt_fee_pct ?? null, h.as_at_date || a.as_at_date || asAt]
            );
            holdingRows += 1;
          }
        }
      }

      return { import: imp, created, updated, holdings: holdingRows };
    });

    res.status(201).json(result);
  })
);

/**
 * GET /api/cfs/book — the whole book: accounts, linked client, roll-ups.
 * Optional ?match_status= / ?account_type= / ?client_id= filters.
 */
router.get(
  '/book',
  asyncHandler(async (req, res) => {
    const where = [];
    const params = [];
    for (const f of ['match_status', 'account_type', 'client_id', 'fee_status']) {
      if (req.query[f]) {
        params.push(req.query[f]);
        where.push(`a.${f} = $${params.length}`);
      }
    }
    const { rows: accounts } = await query(
      `SELECT a.*,
              c.first_name, c.last_name,
              COALESCE(h.holding_count, 0) AS holding_count
       FROM cfs_accounts a
       LEFT JOIN clients c ON c.id = a.client_id
       LEFT JOIN (
         SELECT account_id, COUNT(*)::int AS holding_count
         FROM cfs_holdings GROUP BY account_id
       ) h ON h.account_id = a.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.balance DESC`,
      params
    );

    // The investment mix comes from cfs_allocations (CFS's own growth/defensive
    // breakdown) and falls back to holdings' asset classes for spreadsheet-only
    // imports, which have no allocation rows.
    const { rows: allocClass } = await query(
      `SELECT asset_class AS label, bucket, SUM(value)::numeric AS value
       FROM cfs_allocations GROUP BY 1, 2 ORDER BY 3 DESC`
    );
    const { rows: holdingClass } = await query(
      `SELECT COALESCE(NULLIF(h.asset_class, ''), 'Unclassified') AS label,
              NULL::text AS bucket,
              SUM(h.balance)::numeric AS value
       FROM cfs_holdings h
       JOIN cfs_accounts a ON a.id = h.account_id
       WHERE NOT EXISTS (SELECT 1 FROM cfs_allocations al WHERE al.account_id = a.id)
       GROUP BY 1 ORDER BY 3 DESC`
    );
    const byClass = [...allocClass, ...holdingClass];
    const { rows: byType } = await query(
      `SELECT account_type AS label, SUM(balance)::numeric AS value, COUNT(*)::int AS count
       FROM cfs_accounts GROUP BY 1 ORDER BY 2 DESC`
    );
    const { rows: [t] } = await query(
      `SELECT COUNT(*)::int                                   AS account_count,
              COUNT(DISTINCT client_id)::int                  AS client_count,
              COUNT(*) FILTER (WHERE client_id IS NULL)::int  AS unmatched_count,
              COALESCE(SUM(balance), 0)::numeric              AS total_fum,
              COALESCE(SUM(COALESCE(adviser_fee_amount,
                     balance * COALESCE(adviser_fee_pct, 0) / 100)), 0)::numeric AS total_fees,
              COUNT(*) FILTER (WHERE fee_status = 'paying')::int     AS paying_count,
              COUNT(*) FILTER (WHERE fee_status = 'not_paying')::int AS not_paying_count,
              COUNT(*) FILTER (WHERE fee_status = 'unknown')::int    AS unknown_count,
              COALESCE(SUM(balance) FILTER (WHERE fee_status = 'paying'), 0)::numeric     AS paying_fum,
              COALESCE(SUM(balance) FILTER (WHERE fee_status = 'not_paying'), 0)::numeric AS not_paying_fum,
              COALESCE(SUM(balance) FILTER (WHERE fee_status = 'unknown'), 0)::numeric    AS unknown_fum,
              COUNT(DISTINCT client_id) FILTER (WHERE fee_status = 'not_paying')::int     AS not_paying_clients
       FROM cfs_accounts`
    );

    const totalFum = Number(t.total_fum || 0);
    const totalFees = Number(t.total_fees || 0);
    const payingFum = Number(t.paying_fum || 0);
    const notPayingFum = Number(t.not_paying_fum || 0);
    const pctOf = (v) => (totalFum > 0 ? Number(((Number(v) / totalFum) * 100).toFixed(2)) : 0);

    // What the un-charged FUM would be worth. Prefer the rate actually being
    // charged elsewhere in the book, but only when that rate is plausible — a
    // book whose sole payer is a $0.01 token fee would otherwise imply a
    // benchmark of ~0% and report an opportunity of a few dollars.
    const DEFAULT_RATE = 0.55;
    const MIN_PLAUSIBLE_RATE = 0.10;
    const requested = Number(req.query.rate);
    const derived = payingFum > 0 ? (totalFees / payingFum) * 100 : 0;
    const chargedRate = Number.isFinite(requested) && requested > 0
      ? requested
      : (derived >= MIN_PLAUSIBLE_RATE ? derived : DEFAULT_RATE);
    const rateSource = Number.isFinite(requested) && requested > 0
      ? 'chosen'
      : (derived >= MIN_PLAUSIBLE_RATE ? 'book' : 'default');

    res.json({
      accounts,
      totals: {
        accountCount: t.account_count,
        clientCount: t.client_count,
        unmatchedCount: t.unmatched_count,
        totalFum,
        totalFees,
        avgFeePct: totalFum > 0 ? Number(((totalFees / totalFum) * 100).toFixed(4)) : 0,
      },
      fees: {
        payingCount: t.paying_count,
        notPayingCount: t.not_paying_count,
        unknownCount: t.unknown_count,
        payingFum,
        notPayingFum,
        unknownFum: Number(t.unknown_fum || 0),
        notPayingClients: t.not_paying_clients,
        notPayingPct: pctOf(notPayingFum),
        benchmarkRate: Number(chargedRate.toFixed(4)),
        rateSource,
        opportunity: Number(((notPayingFum * chargedRate) / 100).toFixed(2)),
      },
      byAssetClass: byClass.map((r) => ({
        label: r.label, bucket: r.bucket || null, value: Number(r.value), pct: pctOf(r.value),
      })),
      byAccountType: byType.map((r) => ({ label: r.label, value: Number(r.value), count: r.count, pct: pctOf(r.value) })),
    });
  })
);

/**
 * GET /api/cfs/campaign — the re-engagement call list.
 *
 * Groups the book by person (a member with super + two pensions is one call),
 * bands them by age, and flags who already has a drafted email so a second
 * campaign run doesn't cover the same people twice.
 *
 * Query: fee_status (default not_paying), min_age, max_age, min_balance,
 *        include_drafted, include_entities
 */
router.get(
  '/campaign',
  asyncHandler(async (req, res) => {
    const feeStatus = req.query.fee_status || 'not_paying';
    const params = [];
    let where = '';
    if (feeStatus !== 'all') {
      params.push(feeStatus);
      where = 'WHERE a.fee_status = $1';
    }

    const { rows } = await query(
      `SELECT a.id, a.account_name, a.account_number, a.product, a.balance,
              a.adviser_fee_amount, a.fee_status, a.email, a.date_of_birth,
              a.growth_pct, a.as_at_date, a.client_id,
              c.first_name, c.last_name
       FROM cfs_accounts a
       LEFT JOIN clients c ON c.id = a.client_id
       ${where}
       ORDER BY a.balance DESC`,
      params
    );

    const num = (v) => (v === undefined || v === '' ? null : Number(v));
    const bool = (v, dflt) => (v === undefined ? dflt : v !== 'false' && v !== '0');

    const drafts = await readDrafts();
    const people = groupByPerson(rows, { drafts });
    const { targets, excluded } = selectTargets(people, {
      minAge: num(req.query.min_age),
      maxAge: num(req.query.max_age),
      minBalance: num(req.query.min_balance),
      includeDrafted: bool(req.query.include_drafted, true),
      includeEntities: bool(req.query.include_entities, true),
    });

    const sum = (list) => Number(list.reduce((s, p) => s + p.balance, 0).toFixed(2));
    const rate = Number(req.query.rate) > 0 ? Number(req.query.rate) : 0.55;

    res.json({
      // Segments describe the whole cohort, not just what survived the filters,
      // so the bands don't move as you narrow the selection.
      segments: segmentByAge(people),
      totals: {
        people: people.length,
        accounts: rows.length,
        balance: sum(people),
        drafted: people.filter((p) => p.drafted).length,
        withoutEmail: people.filter((p) => !p.email).length,
      },
      selection: {
        people: targets.length,
        balance: sum(targets),
        drafted: targets.filter((p) => p.drafted).length,
        opportunity: Number(((sum(targets) * rate) / 100).toFixed(2)),
        rate,
        excluded,
      },
      targets: targets.slice(0, 500),
    });
  })
);

// GET /api/cfs/accounts/:id — account with its holdings.
router.get(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const { rows: [account] } = await query(
      `SELECT a.*, c.first_name, c.last_name
       FROM cfs_accounts a LEFT JOIN clients c ON c.id = a.client_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!account) throw notFound('CFS account not found');
    const [{ rows: holdings }, { rows: allocations }] = await Promise.all([
      query('SELECT * FROM cfs_holdings WHERE account_id = $1 ORDER BY balance DESC', [req.params.id]),
      query('SELECT * FROM cfs_allocations WHERE account_id = $1 ORDER BY value DESC', [req.params.id]),
    ]);
    res.json({ ...account, holdings, allocations });
  })
);

// PUT /api/cfs/accounts/:id — link a client, correct a fee, add a note.
router.put(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const allowed = ['client_id', 'account_name', 'product', 'account_type', 'balance',
      'adviser_fee_pct', 'adviser_fee_amount', 'fee_basis', 'match_status', 'notes',
      'fee_status', 'email', 'date_of_birth'];
    const data = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) data[k] = req.body[k] === '' ? null : req.body[k];
    }
    // Linking or clearing a client keeps match_status honest without the
    // caller having to remember to send both.
    if (data.client_id !== undefined && req.body.match_status === undefined) {
      data.match_status = data.client_id ? 'matched' : 'unmatched';
    }
    const keys = Object.keys(data);
    if (!keys.length) throw badRequest('No valid fields provided');

    const { rows } = await query(
      `UPDATE cfs_accounts SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...keys.map((k) => data[k]), req.params.id]
    );
    if (!rows[0]) throw notFound('CFS account not found');
    res.json(rows[0]);
  })
);

// DELETE /api/cfs/accounts/:id — holdings cascade.
router.delete(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM cfs_accounts WHERE id = $1', [req.params.id]);
    if (!rowCount) throw notFound('CFS account not found');
    res.status(204).end();
  })
);

// GET /api/cfs/imports — import history.
router.get(
  '/imports',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM cfs_imports ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  })
);

export default router;
