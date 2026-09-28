import { Router } from 'express';
import path from 'node:path';
import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, badRequest, notFound } from '../utils/httpError.js';
import {
  STAGES, STAGE_KEYS, OPEN_STAGE_KEYS, LOGGABLE_KINDS, CONTACT_KINDS, DIRECTIONS,
  CALL_OUTCOMES, STALE_DAYS, CONTACT_STATUSES, stageLabel,
} from '../services/crm/stages.js';
import {
  displayName, whoMatchesClient, groupWhos, suggestContact, looksLikeHousehold, folderMatches,
} from '../services/crm/names.js';
import {
  readAllTasks, readState, writeState, addTask, isOpen, localToday, sortTasks, DUE_RE, PRIORITIES,
} from '../services/taskStore.js';
import { listDir, rootAvailable, absolutePathOf, statFile } from '../services/library/fsGuard.js';
import {
  practice, TIER_KEYS, THREADS, RENEWAL_WINDOW_DAYS, advisers, referralPartnerFor, tierForPremium,
} from '../services/crm/practice.js';

/**
 * The CRM: contacts, what has been said to them, what is owed to them, and where
 * their file is up to.
 *
 * Contacts are client rows. Communication is logged by hand into crm_activities —
 * nothing is read from a mailbox. Tasks stay in the Task Tracker's list and are
 * linked to a contact by `clientId`, so one task shows on both screens.
 */
const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86400000;

const assertUuid = (id, what = 'id') => {
  if (!UUID_RE.test(String(id))) throw notFound(`No ${what} ${id}`);
};

const conflict = (message, details) => new HttpError(409, message, details);

/** Trimmed, capped string; '' and null clear the field. */
const text = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);

// ---------------------------------------------------------------------------
// Tasks, indexed by contact
// ---------------------------------------------------------------------------

/** Every task grouped by the contact it is linked to, with the unlinked ones kept aside. */
function taskIndex() {
  const { all } = readAllTasks();
  const byClient = new Map();
  const unlinked = [];
  for (const t of all) {
    if (t.clientId) {
      if (!byClient.has(t.clientId)) byClient.set(t.clientId, []);
      byClient.get(t.clientId).push(t);
    } else {
      unlinked.push(t);
    }
  }
  return { byClient, unlinked, all };
}

/** Open/overdue counts and the next thing due, for one contact's tasks. */
function taskSummary(tasks = [], today = localToday()) {
  const open = tasks.filter(isOpen);
  const dated = open.filter((t) => t.due).sort((a, b) => (a.due < b.due ? -1 : 1));
  const next = dated[0] || open[0] || null;
  return {
    open_tasks: open.length,
    overdue_tasks: open.filter((t) => t.due && t.due < today).length,
    next_task: next ? { id: next.id, task: next.task, due: next.due || null, priority: next.priority } : null,
  };
}

/** Whole days from today to a 'YYYY-MM-DD' calendar day (negative once it has passed). */
function daysUntil(ymd, today = localToday()) {
  const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(String(ymd)) - utc(today)) / DAY_MS);
}

/**
 * Why a contact wants attention today, if it does. An overdue task; a file in
 * the pipeline that has gone quiet — measured from the last real contact, or
 * from when it entered its stage, so a lead added this morning is not flagged;
 * or a policy anniversary inside Legacy's two-week renewal window.
 */
function attentionFor(c, summary, now = Date.now()) {
  const reasons = [];
  if (c.next_review_date && c.status !== 'archived') {
    const days = daysUntil(c.next_review_date);
    if (days < 0) reasons.push(`Anniversary passed ${-days} ${-days === 1 ? 'day' : 'days'} ago`);
    else if (days <= RENEWAL_WINDOW_DAYS) {
      reasons.push(days === 0 ? 'Anniversary today' : `Anniversary in ${days} ${days === 1 ? 'day' : 'days'}`);
    }
  }
  if (summary.overdue_tasks) {
    reasons.push(`${summary.overdue_tasks} overdue ${summary.overdue_tasks === 1 ? 'task' : 'tasks'}`);
  }
  if (OPEN_STAGE_KEYS.includes(c.crm_stage)) {
    const since = c.last_contact_at || c.crm_stage_changed_at || c.created_at;
    const days = Math.floor((now - new Date(since).getTime()) / DAY_MS);
    if (days >= STALE_DAYS) {
      reasons.push(c.last_contact_at ? `No contact in ${days} days` : `No contact logged in ${days} days`);
    }
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// SharePoint client folders (read-only listing, cached)
// ---------------------------------------------------------------------------

let folderCache = { at: 0, names: null };
const FOLDER_TTL_MS = 10 * 60 * 1000;

/**
 * Names of the client folders in the SharePoint library. Listing is metadata
 * only — OneDrive placeholders are not downloaded — and goes through fsGuard,
 * which exposes no write. Cached because the folder holds ~1,300 clients.
 */
async function clientFolders() {
  if (folderCache.names && Date.now() - folderCache.at < FOLDER_TTL_MS) return folderCache.names;
  if (!(await rootAvailable('sharepoint'))) return null;
  const entries = await listDir('sharepoint', env.library.clientsDir);
  const names = entries.filter((e) => e.isDir).map((e) => e.name).sort((a, b) => a.localeCompare(b));
  folderCache = { at: Date.now(), names };
  return names;
}

/** A folder name must be one path segment: no separators, no "..". */
function validFolderName(name) {
  return name && !/[\\/]/.test(name) && name !== '.' && name !== '..';
}

async function sharepointInfo(folder) {
  if (!folder) return null;
  const rel = path.join(env.library.clientsDir, folder);
  let exists = false;
  try {
    exists = (await statFile('sharepoint', rel)).isDir;
  } catch {
    exists = false;
  }
  return { folder, path: absolutePathOf('sharepoint', rel), exists };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT DISTINCT adviser FROM clients WHERE adviser IS NOT NULL AND adviser <> '' ORDER BY adviser`
    );
    // The firm's advisers first, then any other name already typed against a contact.
    const names = [...new Set([...advisers(), ...rows.map((r) => r.adviser)])];
    res.json({
      practice: {
        team: practice.team,
        tiers: practice.tiers,
        renewalWindowDays: practice.renewalWindowDays,
        referralPartners: practice.referralPartners,
        otherReferralSources: practice.otherReferralSources,
        insurers: practice.insurers,
        threads: practice.threads,
      },
      defaultAdviser: advisers().includes(env.adviser.name) ? env.adviser.name : '',
      stages: STAGES,
      kinds: LOGGABLE_KINDS,
      contactKinds: CONTACT_KINDS,
      directions: DIRECTIONS,
      callOutcomes: CALL_OUTCOMES,
      staleDays: STALE_DAYS,
      statuses: CONTACT_STATUSES,
      advisers: names,
    });
  })
);

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const CONTACT_LIST_SQL = `
  SELECT c.id, c.first_name, c.last_name, c.preferred_name,
         c.partner_first_name, c.partner_last_name, c.email, c.phone,
         c.status, c.crm_stage, c.crm_stage_changed_at, c.adviser, c.referral_source,
         c.sharepoint_folder, c.client_tier, c.crm_thread, c.next_review_date,
         c.created_at, c.updated_at,
         la.occurred_at AS last_contact_at, la.kind AS last_contact_kind,
         la.subject AS last_contact_subject,
         up.occurred_at AS upcoming_at, up.kind AS upcoming_kind, up.subject AS upcoming_subject,
         COALESCE(ac.n, 0)::int AS activity_count
    FROM clients c
    LEFT JOIN LATERAL (
      SELECT occurred_at, kind, subject FROM crm_activities a
       WHERE a.client_id = c.id AND a.kind = ANY($1) AND a.occurred_at <= now()
       ORDER BY a.occurred_at DESC LIMIT 1
    ) la ON true
    LEFT JOIN LATERAL (
      SELECT occurred_at, kind, subject FROM crm_activities a
       WHERE a.client_id = c.id AND a.kind <> 'stage' AND a.occurred_at > now()
       ORDER BY a.occurred_at ASC LIMIT 1
    ) up ON true
    LEFT JOIN (
      SELECT client_id, count(*) AS n FROM crm_activities WHERE kind <> 'stage' GROUP BY client_id
    ) ac ON ac.client_id = c.id
   ORDER BY c.last_name ASC, c.first_name ASC`;

/**
 * GET /api/crm/contacts — every contact with its last contact, next task and
 * stage, plus the tallies for the page header.
 */
router.get(
  '/contacts',
  asyncHandler(async (req, res) => {
    const { rows } = await query(CONTACT_LIST_SQL, [CONTACT_KINDS]);
    const { byClient } = taskIndex();
    const today = localToday();
    const now = Date.now();

    const contacts = rows.map((c) => {
      const summary = taskSummary(byClient.get(c.id), today);
      return { ...c, display_name: displayName(c), ...summary, attention: attentionFor(c, summary, now) };
    });

    const live = contacts.filter((c) => c.status !== 'archived');
    const weekAgo = new Date(now - 7 * DAY_MS);
    const { rows: [logged] } = await query(
      `SELECT count(*)::int AS n FROM crm_activities WHERE kind <> 'stage' AND occurred_at >= $1 AND occurred_at <= now()`,
      [weekAgo]
    );
    const byStage = Object.fromEntries(STAGE_KEYS.map((k) => [k, 0]));
    for (const c of live) if (c.crm_stage in byStage) byStage[c.crm_stage] += 1;

    res.json({
      summary: {
        contacts: live.length,
        pipeline: live.filter((c) => OPEN_STAGE_KEYS.includes(c.crm_stage)).length,
        attention: live.filter((c) => c.attention.length).length,
        openTasks: live.reduce((n, c) => n + c.open_tasks, 0),
        overdueTasks: live.reduce((n, c) => n + c.overdue_tasks, 0),
        loggedThisWeek: logged.n,
        // Anniversaries in the next 30 days — the coming renewal month.
        renewalsDue: live.filter((c) => {
          if (!c.next_review_date) return false;
          const d = daysUntil(c.next_review_date, today);
          return d >= 0 && d <= 30;
        }).length,
        byStage,
      },
      contacts,
    });
  })
);

// Fields the CRM may write on a contact. Everything else on the client row is
// edited on the Clients page, which owns the full profile.
const CONTACT_FIELDS = {
  first_name: 80, last_name: 80, preferred_name: 80,
  partner_first_name: 80, partner_last_name: 80,
  email: 200, phone: 60, partner_email: 200, partner_phone: 60,
  address: 300, occupation: 120,
  adviser: 120, referral_source: 200, notes: 4000,
};

/** Validate and shape a contact body. Returns only the fields present. */
async function contactFields(body, { creating }) {
  const out = {};
  for (const [k, max] of Object.entries(CONTACT_FIELDS)) {
    if (body[k] !== undefined) out[k] = text(body[k], max);
  }
  if (creating || body.first_name !== undefined) {
    if (!out.first_name) throw badRequest('first_name is required');
  }
  // last_name is NOT NULL on the table; a single-name contact ("Belinda") gets ''.
  if (creating || body.last_name !== undefined) out.last_name = out.last_name || '';

  if (body.status !== undefined) {
    if (!CONTACT_STATUSES.includes(body.status)) {
      throw badRequest(`status must be one of: ${CONTACT_STATUSES.join(', ')}`);
    }
    out.status = body.status;
  }
  if (body.crm_stage !== undefined) {
    if (body.crm_stage !== null && body.crm_stage !== '' && !STAGE_KEYS.includes(body.crm_stage)) {
      throw badRequest(`crm_stage must be one of: ${STAGE_KEYS.join(', ')}`);
    }
    out.crm_stage = body.crm_stage || null;
  }
  if (body.client_tier !== undefined) {
    if (body.client_tier !== null && body.client_tier !== '' && !TIER_KEYS.includes(body.client_tier)) {
      throw badRequest(`client_tier must be one of: ${TIER_KEYS.join(', ')}`);
    }
    out.client_tier = body.client_tier || null;
  }
  if (body.crm_thread !== undefined) {
    if (body.crm_thread !== null && body.crm_thread !== '' && !THREADS.includes(body.crm_thread)) {
      throw badRequest(`crm_thread must be one of: ${THREADS.join(', ')}`);
    }
    out.crm_thread = body.crm_thread || null;
  }
  if (body.next_review_date !== undefined) {
    if (body.next_review_date && !DUE_RE.test(String(body.next_review_date))) {
      throw badRequest('next_review_date must be YYYY-MM-DD');
    }
    out.next_review_date = body.next_review_date || null;
  }
  if (body.sharepoint_folder !== undefined) {
    const folder = text(body.sharepoint_folder, 260);
    if (folder) {
      if (!validFolderName(folder)) throw badRequest('sharepoint_folder must be a single folder name');
      const folders = await clientFolders();
      if (folders && !folders.includes(folder)) {
        throw badRequest(`No SharePoint client folder called "${folder}"`);
      }
    }
    out.sharepoint_folder = folder;
  }
  return out;
}

const insertStageActivity = (db, clientId, from, to) =>
  db.query(
    `INSERT INTO crm_activities (client_id, kind, subject, body) VALUES ($1, 'stage', $2, $3)`,
    [clientId, to ? `Moved to ${stageLabel(to)}` : 'Taken off the pipeline', from ? `From ${stageLabel(from)}` : null]
  );

/**
 * POST /api/crm/contacts — add a contact.
 * A name that matches an existing contact returns 409 with the match, unless
 * `force: true` says this really is a different person.
 */
router.post(
  '/contacts',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const fields = await contactFields(body, { creating: true });
    if (fields.crm_stage === undefined) fields.crm_stage = 'lead';
    if (!fields.status) fields.status = fields.crm_stage === 'in_force' ? 'active' : 'prospect';

    if (!body.force && fields.last_name) {
      const { rows } = await query(
        `SELECT id, first_name, last_name, preferred_name, partner_first_name, partner_last_name
           FROM clients WHERE status <> 'archived'`
      );
      const dupes = rows.filter((c) => whoMatchesClient(`${fields.first_name} ${fields.last_name}`, c));
      if (dupes.length) {
        throw conflict('A contact with this name already exists', {
          existing: dupes.map((c) => ({ id: c.id, display_name: displayName(c) })),
        });
      }
    }

    const created = await withTransaction(async (db) => {
      const keys = Object.keys(fields);
      const { rows: [row] } = await db.query(
        `INSERT INTO clients (${keys.join(', ')}, crm_stage_changed_at)
         VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}, ${fields.crm_stage ? 'now()' : 'NULL'})
         RETURNING *`,
        keys.map((k) => fields[k])
      );
      if (row.crm_stage) await insertStageActivity(db, row.id, null, row.crm_stage);
      return row;
    });
    res.status(201).json({ ...created, display_name: displayName(created) });
  })
);

/**
 * GET /api/crm/contacts/:id — the record page: the contact, its timeline, its
 * tasks, and tasks elsewhere in the tracker that look like theirs.
 */
router.get(
  '/contacts/:id',
  asyncHandler(async (req, res) => {
    assertUuid(req.params.id, 'contact');
    const { rows: [client] } = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!client) throw notFound('Contact not found');

    const [activities, transcripts, documents, sharepoint, premium] = await Promise.all([
      query(
        'SELECT * FROM crm_activities WHERE client_id = $1 ORDER BY occurred_at DESC, created_at DESC',
        [client.id]
      ).then((r) => r.rows),
      query(
        'SELECT id, title, meeting_date, created_at FROM meeting_transcripts WHERE client_id = $1',
        [client.id]
      ).then((r) => r.rows),
      query(
        'SELECT id, original_name, doc_type, created_at FROM documents WHERE client_id = $1',
        [client.id]
      ).then((r) => r.rows),
      sharepointInfo(client.sharepoint_folder),
      // Annual premium of the cover on file, leaving out policies being replaced
      // or cancelled, to suggest the Legacy tier. A hint only; the tier is set by hand.
      query(
        `SELECT SUM(premium * CASE frequency WHEN 'weekly' THEN 52 WHEN 'fortnightly' THEN 26
                  WHEN 'monthly' THEN 12 WHEN 'quarterly' THEN 4 ELSE 1 END) AS annual
           FROM insurance_policies
          WHERE client_id = $1 AND premium IS NOT NULL
            AND (action IS NULL OR action NOT IN ('replace', 'cancel'))`,
        [client.id]
      ).then((r) => r.rows[0]?.annual ?? null),
    ]);

    const { byClient, unlinked } = taskIndex();
    const tasks = sortTasks(byClient.get(client.id) || []);
    const suggested = unlinked
      .filter((t) => t.type !== 'Internal' && t.who && whoMatchesClient(t.who, client))
      .map((t) => ({ id: t.id, task: t.task, who: t.who, status: t.status, due: t.due, archived: !!t.archived }));

    const lastContact = activities.find(
      (a) => CONTACT_KINDS.includes(a.kind) && new Date(a.occurred_at) <= new Date()
    );

    res.json({
      contact: { ...client, display_name: displayName(client) },
      activities,
      transcripts,
      documents,
      tasks,
      suggestedTasks: suggested,
      sharepoint,
      legacy: {
        referralPartner: referralPartnerFor(client.referral_source),
        annualPremium: premium,
        suggestedTier: tierForPremium(premium),
        daysToAnniversary: client.next_review_date ? daysUntil(client.next_review_date) : null,
      },
      stats: {
        ...taskSummary(tasks),
        last_contact_at: lastContact?.occurred_at || null,
        last_contact_kind: lastContact?.kind || null,
        activity_count: activities.filter((a) => a.kind !== 'stage').length,
      },
    });
  })
);

/**
 * PATCH /api/crm/contacts/:id — edit contact details, stage, adviser, referrer,
 * SharePoint folder. A stage change is written to the timeline, and a prospect
 * whose cover goes in force becomes an active client.
 */
router.patch(
  '/contacts/:id',
  asyncHandler(async (req, res) => {
    assertUuid(req.params.id, 'contact');
    const body = req.body || {};
    const fields = await contactFields(body, { creating: false });
    if (!Object.keys(fields).length) throw badRequest('No valid fields provided');

    const updated = await withTransaction(async (db) => {
      const { rows: [current] } = await db.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (!current) throw notFound('Contact not found');

      const sets = [];
      const params = [];
      for (const [k, v] of Object.entries(fields)) {
        params.push(v);
        sets.push(`${k} = $${params.length}`);
      }
      const stageChanged = fields.crm_stage !== undefined && fields.crm_stage !== current.crm_stage;
      if (stageChanged) {
        sets.push('crm_stage_changed_at = now()');
        if (fields.crm_stage === 'in_force' && current.status === 'prospect' && fields.status === undefined) {
          sets.push(`status = 'active'`);
        }
      }
      params.push(current.id);
      const { rows: [row] } = await db.query(
        `UPDATE clients SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (stageChanged) await insertStageActivity(db, current.id, current.crm_stage, fields.crm_stage);
      return row;
    });
    res.json({ ...updated, display_name: displayName(updated) });
  })
);

// ---------------------------------------------------------------------------
// Activities (the communication log)
// ---------------------------------------------------------------------------

/** Validate an activity body. `partial` for edits, where every field is optional. */
function activityFields(body, { partial }) {
  const out = {};
  if (!partial || body.kind !== undefined) {
    if (!LOGGABLE_KINDS.includes(body.kind)) {
      throw badRequest(`kind must be one of: ${LOGGABLE_KINDS.join(', ')}`);
    }
    out.kind = body.kind;
  }
  if (body.direction !== undefined) {
    if (body.direction !== null && body.direction !== '' && !DIRECTIONS.includes(body.direction)) {
      throw badRequest(`direction must be one of: ${DIRECTIONS.join(', ')}`);
    }
    out.direction = body.direction || null;
  }
  for (const [k, max] of [['subject', 300], ['body', 20000], ['outcome', 80], ['with_whom', 200]]) {
    if (body[k] !== undefined) out[k] = text(body[k], max);
  }
  if (body.duration_min !== undefined) {
    if (body.duration_min === null || body.duration_min === '') out.duration_min = null;
    else {
      const n = Number(body.duration_min);
      if (!Number.isInteger(n) || n < 0 || n > 24 * 60) throw badRequest('duration_min must be whole minutes');
      out.duration_min = n;
    }
  }
  if (body.occurred_at !== undefined && body.occurred_at !== null && body.occurred_at !== '') {
    const d = new Date(body.occurred_at);
    if (Number.isNaN(d.getTime())) throw badRequest('occurred_at must be a date and time');
    out.occurred_at = d.toISOString();
  }
  // Notes and meetings are not "to" or "from" anyone.
  if (out.kind === 'note' || out.kind === 'meeting') out.direction = null;
  return out;
}

/** A follow-up task to create alongside a logged activity, validated up front. */
function followUpFields(f) {
  if (!f || !String(f.task || '').trim()) return null;
  if (f.due && !DUE_RE.test(String(f.due))) throw badRequest('followUp.due must be YYYY-MM-DD');
  if (f.priority && !PRIORITIES.includes(f.priority)) {
    throw badRequest(`followUp.priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  return { task: String(f.task).trim(), due: f.due || '', priority: f.priority || undefined };
}

/**
 * POST /api/crm/contacts/:id/activities — log a call, email, meeting, text,
 * letter or note. `followUp: { task, due, priority }` also adds a Task Tracker
 * task for this contact, so "call back Thursday" is not left in the note.
 */
router.post(
  '/contacts/:id/activities',
  asyncHandler(async (req, res) => {
    assertUuid(req.params.id, 'contact');
    const body = req.body || {};
    const fields = activityFields(body, { partial: false });
    if (!fields.subject && !fields.body && !fields.outcome) {
      throw badRequest('Give the activity a subject, some notes or an outcome');
    }
    const followUp = followUpFields(body.followUp);

    const { rows: [client] } = await query(
      'SELECT id, first_name, last_name, partner_first_name, partner_last_name FROM clients WHERE id = $1',
      [req.params.id]
    );
    if (!client) throw notFound('Contact not found');

    const keys = Object.keys(fields);
    const { rows: [activity] } = await query(
      `INSERT INTO crm_activities (client_id, ${keys.join(', ')})
       VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
      [client.id, ...keys.map((k) => fields[k])]
    );

    // All database work is done; the task file is read and written with no await between.
    let task = null;
    if (followUp) {
      const state = readState();
      task = addTask(state, {
        ...followUp,
        who: displayName(client),
        type: 'Client',
        clientId: client.id,
      });
      writeState(state);
    }
    res.status(201).json({ activity, task });
  })
);

router.patch(
  '/activities/:id',
  asyncHandler(async (req, res) => {
    assertUuid(req.params.id, 'activity');
    const fields = activityFields(req.body || {}, { partial: true });
    if (!Object.keys(fields).length) throw badRequest('No valid fields provided');
    const { rows: [current] } = await query('SELECT kind FROM crm_activities WHERE id = $1', [req.params.id]);
    if (!current) throw notFound('Activity not found');
    if (current.kind === 'stage') throw badRequest('Stage changes are recorded automatically and cannot be edited');
    if (fields.kind === undefined && (current.kind === 'note' || current.kind === 'meeting')) {
      delete fields.direction;
    }

    const keys = Object.keys(fields);
    if (!keys.length) throw badRequest('No valid fields provided');
    const { rows: [row] } = await query(
      `UPDATE crm_activities SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}
        WHERE id = $${keys.length + 1} RETURNING *`,
      [...keys.map((k) => fields[k]), req.params.id]
    );
    res.json(row);
  })
);

router.delete(
  '/activities/:id',
  asyncHandler(async (req, res) => {
    assertUuid(req.params.id, 'activity');
    const { rowCount } = await query('DELETE FROM crm_activities WHERE id = $1', [req.params.id]);
    if (!rowCount) throw notFound('Activity not found');
    res.status(204).end();
  })
);

/**
 * GET /api/crm/activities — the practice-wide feed, newest first.
 * `?kind=call` filters; `?before=<iso>` pages back; `?limit` caps (max 200).
 */
router.get(
  '/activities',
  asyncHandler(async (req, res) => {
    const where = [];
    const params = [];
    if (req.query.kind) {
      if (![...LOGGABLE_KINDS, 'stage'].includes(req.query.kind)) throw badRequest('Unknown kind');
      params.push(req.query.kind);
      where.push(`a.kind = $${params.length}`);
    }
    if (req.query.before) {
      const d = new Date(req.query.before);
      if (Number.isNaN(d.getTime())) throw badRequest('before must be a date');
      params.push(d.toISOString());
      where.push(`a.occurred_at < $${params.length}`);
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const { rows } = await query(
      `SELECT a.*, c.first_name, c.last_name, c.partner_first_name, c.partner_last_name
         FROM crm_activities a JOIN clients c ON c.id = a.client_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY a.occurred_at DESC, a.created_at DESC
        LIMIT ${limit}`,
      params
    );
    res.json(
      rows.map(({ first_name, last_name, partner_first_name, partner_last_name, ...a }) => ({
        ...a,
        display_name: displayName({ first_name, last_name, partner_first_name, partner_last_name }),
      }))
    );
  })
);

// ---------------------------------------------------------------------------
// Import from the Task Tracker
// ---------------------------------------------------------------------------

/**
 * GET /api/crm/import/tasks — the households the Task Tracker already knows
 * about, as contacts ready to create. Name variants of one household ("Kirsty
 * Oakey", "Kirsty & Dean Oakey") are merged, and one that already matches a
 * contact is offered as a link instead.
 */
router.get(
  '/import/tasks',
  asyncHandler(async (req, res) => {
    const { rows: clients } = await query(
      `SELECT id, first_name, last_name, preferred_name, partner_first_name, partner_last_name
         FROM clients WHERE status <> 'archived'`
    );
    const { unlinked } = taskIndex();
    const byWho = new Map();
    for (const t of unlinked) {
      if (t.type === 'Internal' || !t.who || !t.who.trim()) continue;
      if (!byWho.has(t.who)) byWho.set(t.who, []);
      byWho.get(t.who).push(t);
    }
    const entries = [...byWho].map(([who, tasks]) => ({ who, tasks }));

    const candidates = groupWhos(entries).map((idxs) => {
      const whos = idxs.map((i) => entries[i].who).sort();
      const tasks = idxs.flatMap((i) => entries[i].tasks);
      const matches = clients.filter((c) => whos.some((w) => whoMatchesClient(w, c)));
      const open = tasks.filter(isOpen);
      return {
        key: whos.join('|'),
        whos,
        suggestion: suggestContact(whos),
        taskCount: tasks.length,
        openCount: open.length,
        tasks: [...open, ...tasks.filter((t) => !isOpen(t))]
          .slice(0, 4)
          .map((t) => ({ id: t.id, task: t.task, status: t.status })),
        match: matches.length === 1 ? { id: matches[0].id, display_name: displayName(matches[0]) } : null,
        likely: whos.some(looksLikeHousehold),
      };
    });
    candidates.sort((a, b) => b.openCount - a.openCount || b.taskCount - a.taskCount);
    res.json({ candidates });
  })
);

/**
 * POST /api/crm/import/tasks — create (or link to) a contact per row and link
 * every task filed under that row's names.
 * rows: [{ whos, first_name, last_name, partner_first_name, partner_last_name,
 *          referral_source, notes, crm_stage, status, matchId }]
 */
router.post(
  '/import/tasks',
  asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || !rows.length) throw badRequest('rows is required');
    if (rows.length > 500) throw badRequest('Import at most 500 contacts at a time');

    const plan = [];
    for (const [i, r] of rows.entries()) {
      const whos = Array.isArray(r.whos) ? r.whos.map(String).filter(Boolean) : [];
      if (!whos.length) throw badRequest(`Row ${i + 1}: whos is required`);
      if (r.matchId) {
        assertUuid(r.matchId, 'contact');
        plan.push({ whos, matchId: r.matchId });
      } else {
        const fields = await contactFields(
          { ...r, crm_stage: r.crm_stage ?? null, sharepoint_folder: undefined },
          { creating: true }
        );
        if (!fields.status) fields.status = fields.crm_stage === 'in_force' ? 'active' : 'prospect';
        plan.push({ whos, fields });
      }
    }

    const whoToClient = new Map();
    const result = await withTransaction(async (db) => {
      let created = 0;
      let linked = 0;
      for (const p of plan) {
        let id = p.matchId;
        if (id) {
          const { rows: [hit] } = await db.query('SELECT id FROM clients WHERE id = $1', [id]);
          if (!hit) throw badRequest(`No contact ${id} to link to`);
          linked += 1;
        } else {
          const keys = Object.keys(p.fields);
          const { rows: [row] } = await db.query(
            `INSERT INTO clients (${keys.join(', ')}, crm_stage_changed_at)
             VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}, ${p.fields.crm_stage ? 'now()' : 'NULL'})
             RETURNING id, crm_stage`,
            keys.map((k) => p.fields[k])
          );
          if (row.crm_stage) await insertStageActivity(db, row.id, null, row.crm_stage);
          id = row.id;
          created += 1;
        }
        for (const w of p.whos) whoToClient.set(w, id);
      }
      return { created, linked };
    });

    // Contacts are committed; now link their tasks in one synchronous pass.
    // Tasks that exist only in the append-only archive are history and stay as filed.
    const state = readState();
    let tasksLinked = 0;
    for (const t of state.tasks) {
      if (!t.clientId && whoToClient.has(t.who)) {
        t.clientId = whoToClient.get(t.who);
        tasksLinked += 1;
      }
    }
    if (tasksLinked) writeState(state);
    res.status(201).json({ ...result, tasksLinked });
  })
);

// ---------------------------------------------------------------------------
// SharePoint folder search
// ---------------------------------------------------------------------------

/**
 * GET /api/crm/sharepoint/folders?q=borsky — client folders whose name matches,
 * for linking a contact to its file. Read-only; nothing is opened or downloaded.
 */
router.get(
  '/sharepoint/folders',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const folders = await clientFolders();
    if (!folders) return res.json({ available: false, folders: [] });
    if (!q) return res.json({ available: true, total: folders.length, folders: [] });
    const hits = folders.filter((f) => folderMatches(q, f)).slice(0, 20);
    res.json({ available: true, total: folders.length, folders: hits });
  })
);

export default router;
