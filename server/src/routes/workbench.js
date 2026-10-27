import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import HTMLtoDOCX from 'html-to-docx';
import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { absolutePathOf } from '../services/library/fsGuard.js';
import { displayName } from '../services/crm/names.js';
import { gatherClientContext } from '../services/planGenerator.js';
import { generateRiskSoa } from '../services/riskSoaGenerator.js';
import { renderPlanHtml } from '../services/planRender.js';
import {
  caseNameOf, shortNameOf, notesNameOf, slugOf, stampOf, ensureCaseDirs, assertWritable, DOWNLOADS,
} from '../services/workbench/paths.js';
import { sharepointFiles, caseFiles, belongsToCase, sharepointText } from '../services/workbench/sources.js';
import { writeMeetingNotes, writeFactFind, writeSoaNotes, soaInstructions } from '../services/workbench/writers.js';
import { writeDataFile, buildMeetingNotes, buildFactFind, buildSoaNotes, exportPdfs, reveal } from '../services/workbench/run.js';
import { packCandidates, buildPack, isAdviserFile, isDownloadsPdsName, SLOTS } from '../services/workbench/pack.js';
import { lookupClient, clientStatusLine } from '../services/workbench/lookup.js';

// Reading client information out of SharePoint into the meeting notes and fact
// find. Off for now (Tristan, 26 Oct 2026): the program only checks whether a
// client file EXISTS. Set WORKBENCH_READ_SHAREPOINT=true to switch it on.
const READ_SHAREPOINT = process.env.WORKBENCH_READ_SHAREPOINT === 'true';

/**
 * Workbench: the client list and the SOA pipeline per client.
 *
 *   1. Initial Meeting Notes   transcript -> Claude -> generate-client-details-summary.mjs
 *   2. Fact Find               transcript -> Claude -> generate_fact_find.py
 *   3. SOA Notes               the paraplanner brief -> build_soa_notes.py
 *   4. Draft SOA               SOA Notes + filed documents -> riskSoaGenerator
 *   5. SOA Pack                plain copies, hash-checked, into Downloads
 *
 * SharePoint is read only. Everything written goes to legacy/soa/<case>/ or
 * Downloads, and every write path passes assertWritable().
 */

const router = Router();

export const WB_STAGES = [
  { key: 'meeting', label: 'Initial meeting' },
  { key: 'fact_find', label: 'Fact find' },
  { key: 'soa_notes', label: 'SOA Notes' },
  { key: 'paraplanner', label: 'With paraplanner' },
  { key: 'soa', label: 'SOA drafting' },
  { key: 'pack', label: 'SOA pack' },
  { key: 'sent', label: 'Sent to client' },
  { key: 'done', label: 'Complete' },
];
const STAGE_KEYS = WB_STAGES.map((s) => s.key);
const stageIndex = (k) => STAGE_KEYS.indexOf(k);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);

const CASE_SQL = `
  SELECT w.*, c.first_name, c.last_name, c.partner_first_name, c.partner_last_name,
         c.email, c.phone, c.adviser, c.sharepoint_folder, c.referral_source, c.notes AS client_notes
    FROM workbench_cases w JOIN clients c ON c.id = w.client_id`;

async function loadCase(id) {
  if (!UUID_RE.test(String(id))) throw badRequest('Invalid case id');
  const { rows: [wb] } = await query(`${CASE_SQL} WHERE w.id = $1`, [id]);
  if (!wb) throw notFound('Case not found');
  return wb;
}

const ymd = (d) => (d instanceof Date
  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  : d || null);

const shape = (wb) => ({
  ...wb,
  meeting_date: ymd(wb.meeting_date),
  display_name: displayName(wb),
  has: {
    transcript: Boolean(wb.transcript && wb.transcript.trim()),
    meeting_notes: Boolean(wb.cds_json),
    fact_find: Boolean(wb.ff_json),
    soa_notes: Boolean(wb.soa_notes_json),
    soa: Boolean(wb.soa_markdown),
    pack: Boolean(wb.pack_dir),
  },
});

/** Move a case forward to `stage`, never backwards. */
async function advance(wb, stage) {
  if (stageIndex(stage) > stageIndex(wb.stage)) {
    await query('UPDATE workbench_cases SET stage = $2 WHERE id = $1', [wb.id, stage]);
  }
}

/** NDJSON streaming, as /plans/generate-risk-soa does: generators run for minutes. */
function streamer(res) {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const send = (evt) => res.write(`${JSON.stringify(evt)}\n`);
  return {
    step: (label, extra = {}) => send({ type: 'progress', label, ...extra }),
    done: (payload) => { send({ type: 'done', ...payload }); res.end(); },
    fail: (err) => { send({ type: 'error', message: err.message || String(err) }); res.end(); },
  };
}

const streamed = (fn) => async (req, res) => {
  const s = streamer(res);
  try {
    await fn(req, s);
  } catch (err) {
    console.error('[workbench]', err);
    s.fail(err);
  }
};

const relRepo = (abs) => path.relative(env.library.repoRoot, abs);

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

router.get('/meta', (req, res) => res.json({
  stages: WB_STAGES,
  defaultAdviser: env.adviser.name,
  downloads: DOWNLOADS,
  firm: env.firm.name,
  readSharePoint: READ_SHAREPOINT,
}));

/**
 * GET /api/workbench/lookup?first_name=&last_name=&partner_first_name=&partner_last_name=
 * Is this an existing client (in the program and/or with a SharePoint folder)?
 * Folder names only; nothing in SharePoint is opened.
 */
router.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const { first_name: f, last_name: l, partner_first_name: pf, partner_last_name: pl } = req.query;
    res.json(await lookupClient({ first_name: f, last_name: l, partner_first_name: pf, partner_last_name: pl }));
  })
);

router.get(
  '/cases',
  asyncHandler(async (req, res) => {
    const archived = req.query.archived === 'true';
    const { rows } = await query(`${CASE_SQL} WHERE w.archived = $1 ORDER BY w.updated_at DESC`, [archived]);
    res.json(rows.map((r) => {
      const s = shape(r);
      delete s.transcript; delete s.cds_json; delete s.ff_json; delete s.soa_notes_json; delete s.soa_markdown;
      return s;
    }));
  })
);

const PERSON_FIELDS = ['first_name', 'last_name', 'partner_first_name', 'partner_last_name', 'email', 'phone',
  'adviser', 'referral_source', 'sharepoint_folder'];

function personFields(body) {
  const out = {};
  for (const k of PERSON_FIELDS) if (body[k] !== undefined) out[k] = text(body[k], k === 'sharepoint_folder' ? 260 : 200);
  if (out.sharepoint_folder && /[\\/]|^\.\.?$/.test(out.sharepoint_folder)) {
    throw badRequest('sharepoint_folder must be a single folder name');
  }
  return out;
}

/** POST /api/workbench/cases — a new client and their case. */
router.post(
  '/cases',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const person = personFields(body);
    if (!person.first_name || !person.last_name) throw badRequest('First and last name are required');
    if (body.meeting_date && !DATE_RE.test(body.meeting_date)) throw badRequest('meeting_date must be YYYY-MM-DD');
    if (!person.adviser) person.adviser = env.adviser.name;

    const created = await withTransaction(async (db) => {
      const keys = Object.keys(person);
      const { rows: [client] } = await db.query(
        `INSERT INTO clients (${keys.join(', ')}, status, crm_stage, crm_stage_changed_at)
         VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}, 'prospect', 'initial_meeting', now()) RETURNING *`,
        keys.map((k) => person[k])
      );
      const { rows: [wb] } = await db.query(
        `INSERT INTO workbench_cases (client_id, case_name, short_name, meeting_date, transcript, adviser_notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [client.id, caseNameOf(client), shortNameOf(client), body.meeting_date || null,
          text(body.transcript, 400000), text(body.adviser_notes, 20000)]
      );
      return wb.id;
    });
    const wbNew = await loadCase(created);
    const look = await lookupClient(wbNew, { excludeClientId: wbNew.client_id }).catch(() => null);
    const kind = wbNew.sharepoint_folder || look?.existing ? 'existing' : 'new';
    await query('UPDATE workbench_cases SET client_kind = $2 WHERE id = $1', [created, kind]);
    res.status(201).json(shape(await loadCase(created)));
  })
);

router.get(
  '/cases/:id',
  asyncHandler(async (req, res) => res.json(shape(await loadCase(req.params.id))))
);

router.patch(
  '/cases/:id',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const body = req.body || {};
    const person = personFields(body);
    const sets = {};
    if (body.stage !== undefined) {
      if (!STAGE_KEYS.includes(body.stage)) throw badRequest(`stage must be one of ${STAGE_KEYS.join(', ')}`);
      sets.stage = body.stage;
    }
    if (body.meeting_date !== undefined) {
      if (body.meeting_date && !DATE_RE.test(body.meeting_date)) throw badRequest('meeting_date must be YYYY-MM-DD');
      sets.meeting_date = body.meeting_date || null;
    }
    if (body.transcript !== undefined) sets.transcript = text(body.transcript, 400000);
    if (body.adviser_notes !== undefined) sets.adviser_notes = text(body.adviser_notes, 20000);
    if (body.archived !== undefined) sets.archived = Boolean(body.archived);

    await withTransaction(async (db) => {
      if (Object.keys(person).length) {
        const keys = Object.keys(person);
        const { rows: [c] } = await db.query(
          `UPDATE clients SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
          [wb.client_id, ...keys.map((k) => person[k])]
        );
        // Names drive the folder and file names, so keep them in step, unless
        // documents already exist under the old name.
        if (!wb.cds_json && !wb.ff_json && !wb.soa_notes_json) {
          sets.case_name = caseNameOf(c);
          sets.short_name = shortNameOf(c);
        }
      }
      const keys = Object.keys(sets);
      if (keys.length) {
        await db.query(
          `UPDATE workbench_cases SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`,
          [wb.id, ...keys.map((k) => sets[k])]
        );
      } else {
        await db.query('UPDATE workbench_cases SET updated_at = now() WHERE id = $1', [wb.id]);
      }
    });
    res.json(shape(await loadCase(wb.id)));
  })
);

/** GET /cases/:id/lookup — existing-client check for this case, recorded on it. */
router.get(
  '/cases/:id/lookup',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const look = await lookupClient(wb, { excludeClientId: wb.client_id });
    const kind = wb.sharepoint_folder || look.existing ? 'existing' : 'new';
    if (kind !== wb.client_kind) await query('UPDATE workbench_cases SET client_kind = $2 WHERE id = $1', [wb.id, kind]);
    res.json({ ...look, linkedFolder: wb.sharepoint_folder || null, clientKind: kind });
  })
);

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

router.get(
  '/cases/:id/files',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const [sp, repo] = await Promise.all([sharepointFiles(wb.sharepoint_folder), caseFiles(wb)]);
    res.json({
      sharepoint: { ...sp, folder: wb.sharepoint_folder, path: wb.sharepoint_folder ? absolutePathOf('sharepoint', path.join(env.library.clientsDir, wb.sharepoint_folder)) : null },
      case: { path: path.join(env.library.repoRoot, 'soa', wb.case_name), files: repo },
    });
  })
);

function caseFileAbs(wb, source, relPath) {
  if (!['sharepoint', 'repo'].includes(source)) throw badRequest('source must be sharepoint or repo');
  if (!belongsToCase(wb, source, relPath)) throw badRequest("That file is not in this client's folders");
  return absolutePathOf(source, relPath);
}

/** GET /cases/:id/file?source=&path= — open a file in the browser (read only). */
router.get(
  '/cases/:id/file',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const abs = caseFileAbs(wb, req.query.source, req.query.path);
    const inline = /\.(pdf|txt|png|jpe?g)$/i.test(abs);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`);
    res.sendFile(abs);
  })
);

/** Show a file or folder in Explorer. */
router.post(
  '/cases/:id/reveal',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const { source, path: rel, target } = req.body || {};
    if (target === 'sharepoint-folder') {
      if (!wb.sharepoint_folder) throw badRequest('No SharePoint folder linked');
      reveal(absolutePathOf('sharepoint', path.join(env.library.clientsDir, wb.sharepoint_folder)), { isDir: true });
    } else if (target === 'case-folder') {
      const d = await ensureCaseDirs(wb);
      reveal(d.caseRoot, { isDir: true });
    } else if (target === 'pack-folder') {
      if (!wb.pack_dir) throw badRequest('No pack built yet');
      reveal(wb.pack_dir, { isDir: true });
    } else {
      reveal(caseFileAbs(wb, source, rel));
    }
    res.json({ ok: true });
  })
);

/** Copy one of the case's own documents to Downloads. */
router.post(
  '/cases/:id/copy-to-downloads',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    const src = caseFileAbs(wb, 'repo', req.body?.path);
    const dst = assertWritable(path.join(DOWNLOADS, path.basename(src)));
    await fs.copyFile(src, dst);
    res.json({ ok: true, path: dst });
  })
);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Build a .docx from saved JSON, export its PDF, and report both. */
async function buildDoc(kind, wb, client, data, s) {
  const d = await ensureCaseDirs(wb);
  const slug = slugOf(client, wb.meeting_date);
  const stamp = stampOf(wb.meeting_date);
  const json = await writeDataFile(slug, kind, data);
  let out;
  s.step('Building the Word document');
  if (kind === 'cds') {
    out = path.join(d.compliance, `${notesNameOf(client, wb.meeting_date)} - Initial Meeting Notes.docx`);
    await buildMeetingNotes(json, out);
  } else if (kind === 'ff') {
    out = path.join(d.compliance, `${stamp} - ${wb.short_name} - Fact Find.docx`);
    await buildFactFind(json, out);
  } else {
    out = path.join(d.compliance, `${stamp} - ${wb.short_name} - SOA Notes.docx`);
    await buildSoaNotes(json, out);
  }
  s.step('Exporting the PDF with Word');
  const { pdfs, warnings } = await exportPdfs([out]);
  const files = [out, ...pdfs];
  // Tristan wants the initial meeting notes in Downloads as well.
  if (kind === 'cds') {
    for (const f of files) await fs.copyFile(f, assertWritable(path.join(DOWNLOADS, path.basename(f))));
  }
  return { files: files.map(relRepo), warnings, copiedToDownloads: kind === 'cds' };
}

const COLUMN = { cds: 'cds_json', ff: 'ff_json', 'soa-notes': 'soa_notes_json' };
const NEXT_STAGE = { cds: 'fact_find', ff: 'soa_notes', 'soa-notes': 'paraplanner' };

async function clientOf(wb) {
  const { rows: [c] } = await query('SELECT * FROM clients WHERE id = $1', [wb.client_id]);
  return c;
}

async function knownFacts(wb, s) {
  if (!wb.sharepoint_folder) return '';
  if (!READ_SHAREPOINT) {
    s.step('Existing SharePoint file noted; not reading it (switched off for now)');
    return '';
  }
  s.step('Reading the SharePoint folder for known facts');
  const { text: t } = await sharepointText(wb.sharepoint_folder, {
    categories: ['fact-find', 'schedule', 'cover-summary', 'meeting-notes'],
    maxFiles: 5, maxChars: 60000,
    onFile: (f) => s.step(`Reading ${f.name}`),
  });
  return t;
}

/** POST /cases/:id/generate/:kind — kind = cds | ff | soa-notes. Streams NDJSON. */
router.post(
  '/cases/:id/generate/:kind',
  streamed(async (req, s) => {
    const kind = req.params.kind;
    if (!COLUMN[kind]) throw new Error('Unknown document');
    let wb = await loadCase(req.params.id);
    if (req.body?.transcript !== undefined || req.body?.meeting_date !== undefined) {
      await query(
        'UPDATE workbench_cases SET transcript = COALESCE($2, transcript), meeting_date = COALESCE($3, meeting_date) WHERE id = $1',
        [wb.id, text(req.body.transcript, 400000), req.body.meeting_date || null]
      );
      wb = await loadCase(wb.id);
    }
    if (kind !== 'soa-notes' && !wb.transcript) throw new Error('Paste the meeting transcript first');
    const client = await clientOf(wb);
    s.step('Checking whether this is an existing client');
    const look = await lookupClient(wb, { excludeClientId: wb.client_id }).catch(() => null);
    wb.statusLine = clientStatusLine(wb, look);

    let data;
    if (kind === 'cds') {
      const known = await knownFacts(wb, s);
      s.step('Claude is writing the Initial Meeting Notes');
      data = await writeMeetingNotes({ wb, client, notesName: notesNameOf(client, wb.meeting_date), known });
    } else if (kind === 'ff') {
      const known = await knownFacts(wb, s);
      s.step('Claude is filling the Fact Find');
      data = await writeFactFind({ wb, client, known });
    } else {
      if (!wb.transcript && !wb.ff_json) throw new Error('Add the transcript or build the fact find first');
      s.step('Claude is writing the SOA Notes brief for Howard');
      data = await writeSoaNotes({ wb, client });
    }
    await query(`UPDATE workbench_cases SET ${COLUMN[kind]} = $2 WHERE id = $1`, [wb.id, JSON.stringify(data)]);
    const built = await buildDoc(kind, wb, client, data, s);
    await advance(wb, NEXT_STAGE[kind]);
    s.done({ data, ...built });
  })
);

/** POST /cases/:id/data/:kind — save hand-edited JSON and rebuild the document. */
router.post(
  '/cases/:id/data/:kind',
  streamed(async (req, s) => {
    const kind = req.params.kind;
    if (!COLUMN[kind]) throw new Error('Unknown document');
    const wb = await loadCase(req.params.id);
    const data = req.body?.data;
    if (!data || typeof data !== 'object') throw new Error('data must be a JSON object');
    await query(`UPDATE workbench_cases SET ${COLUMN[kind]} = $2 WHERE id = $1`, [wb.id, JSON.stringify(data)]);
    const built = await buildDoc(kind, wb, await clientOf(wb), data, s);
    s.done({ data, ...built });
  })
);

/** POST /cases/:id/soa — draft the SOA from the SOA Notes and the filed documents. */
router.post(
  '/cases/:id/soa',
  streamed(async (req, s) => {
    const wb = await loadCase(req.params.id);
    if (!wb.soa_notes_json && !wb.ff_json) throw new Error('Build the fact find and SOA Notes first');
    let filed = '';
    let used = [];
    if (wb.sharepoint_folder) {
      s.step('Reading what the paraplanner filed in SharePoint');
      ({ text: filed, used } = await sharepointText(wb.sharepoint_folder, {
        categories: ['soa-notes', 'risk-checklist', 'research', 'premium', 'cover-summary', 'schedule', 'application'],
        maxFiles: 14, maxChars: 180000,
        onFile: (f) => s.step(`Reading ${f.name}`),
      }));
    }
    const ctx = await gatherClientContext(wb.client_id);
    s.step('Claude is writing the SOA, section by section', { done: 0, total: 0 });
    const extra = text(req.body?.instructions, 20000);
    const gen = await generateRiskSoa(ctx, [soaInstructions(wb, filed), extra].filter(Boolean).join('\n\n'), {
      onProgress: (p) => s.step(`Written: ${p.title}`, { done: p.done, total: p.total }),
    });
    await query('UPDATE workbench_cases SET soa_markdown = $2 WHERE id = $1', [wb.id, gen.text]);

    s.step('Building the Word document');
    const client = await clientOf(wb);
    const d = await ensureCaseDirs(wb);
    const out = assertWritable(path.join(d.compliance, `${stampOf()} - ${wb.short_name} - Statement of Advice (DRAFT).docx`));
    // One title block: renderPlanHtml prints the title and the en-AU date, so it
    // gets the body without the generator's own "# Statement of Advice" header.
    const html = renderPlanHtml({
      plan: { title: `Statement of Advice — ${displayName(client)}`, content: gen.body ?? gen.text },
      client, accent: '#1f6f9f', firmName: env.firm.name, tagline: 'Insurance & Risk Advice', date: gen.date,
    });
    const docx = await HTMLtoDOCX(html, null, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 720 } });
    await fs.writeFile(out, Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer()));
    s.step('Exporting the PDF with Word');
    const { pdfs, warnings: pdfWarnings } = await exportPdfs([out]);
    const failedSections = gen.failedSections || [];
    const warnings = [
      ...(failedSections.length
        ? [`${failedSections.length} SOA section(s) could not be generated and hold an [ADVISER TO CONFIRM] stub: ${failedSections.join(', ')}. Redraft or write them by hand.`]
        : []),
      ...(gen.ai ? [] : ['Offline stub mode: no Anthropic key is configured, so the SOA holds placeholders only.']),
      ...(pdfWarnings || []),
    ];
    await advance(wb, 'soa');
    s.done({
      markdown: gen.text, ai: gen.ai, failedSections, sourcesRead: used,
      files: [out, ...pdfs].map(relRepo), warnings,
    });
  })
);

router.get(
  '/cases/:id/pack',
  asyncHandler(async (req, res) => {
    const wb = await loadCase(req.params.id);
    res.json(await packCandidates(wb, await clientOf(wb)));
  })
);

router.post(
  '/cases/:id/pack',
  streamed(async (req, s) => {
    const wb = await loadCase(req.params.id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    // Re-check every source against the case: the list came over HTTP.
    for (const it of items) {
      if (it.source === 'sharepoint' && !belongsToCase(wb, 'sharepoint', it.relPath)
        // The firm's Compliance folder (fallback FSGs), normalised so "Compliance\..\" cannot reach another client.
        && !/^compliance[\\/]/i.test(path.normalize(String(it.relPath)))) {
        throw new Error(`${it.name} is not in this client's SharePoint folder`);
      }
      // Repo: this case's folder, or the pack adviser's own folder (their FSG). Never another adviser's.
      if (it.source === 'repo' && !belongsToCase(wb, 'repo', it.relPath) && !isAdviserFile(it.relPath)) {
        throw new Error(`${it.name} is not in this case or the adviser's folder`);
      }
      // Downloads: only the PDS PDFs the candidate list offers, straight in Downloads.
      if (it.source === 'downloads'
        && (path.basename(String(it.relPath)) !== String(it.relPath) || !isDownloadsPdsName(String(it.relPath)))) {
        throw new Error(`${it.name} is not a PDS in Downloads`);
      }
      if (!['sharepoint', 'repo', 'downloads'].includes(it.source)) throw new Error('Unknown source');
      if (it.slot != null && !SLOTS.some((x) => x.key === it.slot)) throw new Error(`Unknown slot for ${it.name}`);
    }
    const result = await buildPack(wb, await clientOf(wb), {
      items, makePdfs: req.body?.makePdfs !== false, onStep: (l) => s.step(l),
    });
    await query('UPDATE workbench_cases SET pack_dir = $2 WHERE id = $1', [wb.id, result.outDir]);
    await advance(wb, 'pack');
    s.done(result);
  })
);

export default router;
