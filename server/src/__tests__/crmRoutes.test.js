import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = createApp();

// Unique surnames, so repeated runs against the same test database never trip
// the duplicate-name check on a contact left by an earlier run.
// Letters only: the import (rightly) treats a name containing digits as a case
// reference rather than a household.
const tag = Date.now().toString(36).replace(/\d/g, (d) => 'abcdefghij'[d]);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SURNAME = `Crmtest${cap(tag)}`;
const OTHER = `Importee${cap(tag)}`;

const readTasks = () =>
  JSON.parse(fs.readFileSync(path.join(env.tasks.stateDir, 'tasks.json'), 'utf8')).tasks;

beforeAll(async () => {
  // The suite must never touch the adviser's real task list.
  expect(path.resolve(env.tasks.stateDir)).not.toBe(
    path.resolve(__dirname, '../../data/task-state')
  );
  fs.rmSync(env.tasks.stateDir, { recursive: true, force: true });
  const sql = await fsp.readFile(path.resolve(__dirname, '../db/schema.sql'), 'utf8');
  await pool.query(sql);
});

afterAll(async () => {
  await pool.query(`DELETE FROM clients WHERE last_name IN ($1, $2)`, [SURNAME, OTHER]);
  await pool.end();
});

describe('CRM contacts', () => {
  let id;

  it('exposes the stage list and loggable kinds', async () => {
    const res = await request(app).get('/api/crm/meta');
    expect(res.status).toBe(200);
    expect(res.body.stages.map((s) => s.key)).toContain('underwriting');
    expect(res.body.kinds).toContain('call');
    expect(res.body.kinds).not.toContain('stage');
  });

  it('requires a first name', async () => {
    const res = await request(app).post('/api/crm/contacts').send({ last_name: SURNAME });
    expect(res.status).toBe(400);
  });

  it('creates a contact as a new lead and records the stage', async () => {
    const res = await request(app).post('/api/crm/contacts').send({
      first_name: 'Dana', last_name: SURNAME, partner_first_name: 'Sam', partner_last_name: SURNAME,
      phone: '0400 000 000', adviser: 'Tristan Biro',
    });
    expect(res.status).toBe(201);
    expect(res.body.crm_stage).toBe('lead');
    expect(res.body.status).toBe('prospect');
    expect(res.body.display_name).toBe(`Dana & Sam ${SURNAME}`);
    id = res.body.id;
  });

  it('refuses a duplicate name unless forced', async () => {
    const dupe = await request(app).post('/api/crm/contacts').send({ first_name: 'Sam', last_name: SURNAME });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.details.existing[0].id).toBe(id);
  });

  it('rejects an unknown stage', async () => {
    const res = await request(app).patch(`/api/crm/contacts/${id}`).send({ crm_stage: 'closed_won' });
    expect(res.status).toBe(400);
  });

  it('rejects a SharePoint folder that is a path rather than a name', async () => {
    const res = await request(app).patch(`/api/crm/contacts/${id}`).send({ sharepoint_folder: '..\\Compliance' });
    expect(res.status).toBe(400);
  });

  it('moves stage, logs it, and makes the client active once cover is in force', async () => {
    let res = await request(app).patch(`/api/crm/contacts/${id}`).send({ crm_stage: 'fact_find' });
    expect(res.status).toBe(200);
    expect(res.body.crm_stage).toBe('fact_find');

    res = await request(app).patch(`/api/crm/contacts/${id}`).send({ crm_stage: 'in_force' });
    expect(res.body.status).toBe('active');

    const detail = await request(app).get(`/api/crm/contacts/${id}`);
    const stages = detail.body.activities.filter((a) => a.kind === 'stage').map((a) => a.subject);
    expect(stages).toEqual(['Moved to Cover in force', 'Moved to Fact find', 'Moved to New lead']);
  });

  it('returns 404 for an unknown or malformed id', async () => {
    expect((await request(app).get('/api/crm/contacts/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    expect((await request(app).get('/api/crm/contacts/not-an-id')).status).toBe(404);
  });
});

describe('CRM activity log', () => {
  let id;
  let activityId;

  beforeAll(async () => {
    const res = await request(app).post('/api/crm/contacts').send({ first_name: 'Lee', last_name: SURNAME });
    id = res.body.id;
  });

  it('refuses an empty activity and an unknown kind', async () => {
    expect((await request(app).post(`/api/crm/contacts/${id}/activities`).send({ kind: 'call' })).status).toBe(400);
    expect((await request(app).post(`/api/crm/contacts/${id}/activities`).send({ kind: 'stage', subject: 'x' })).status).toBe(400);
    expect((await request(app).post(`/api/crm/contacts/${id}/activities`).send({ kind: 'fax', subject: 'x' })).status).toBe(400);
  });

  it('logs a call and creates a linked follow-up task in the Task Tracker', async () => {
    const res = await request(app).post(`/api/crm/contacts/${id}/activities`).send({
      kind: 'call', direction: 'outbound', outcome: 'Left voicemail', subject: 'Chasing signed FF',
      followUp: { task: 'Call Lee back about the fact find', due: '2020-01-02', priority: 'High' },
    });
    expect(res.status).toBe(201);
    expect(res.body.activity.kind).toBe('call');
    expect(res.body.task.clientId).toBe(id);
    expect(res.body.task.who).toBe(`Lee ${SURNAME}`);
    activityId = res.body.activity.id;

    const tracker = await request(app).get('/api/tasks');
    expect(tracker.body.tasks.find((t) => t.id === res.body.task.id)).toBeTruthy();
  });

  it('drops direction from a note', async () => {
    const res = await request(app).post(`/api/crm/contacts/${id}/activities`).send({
      kind: 'note', direction: 'inbound', body: 'Prefers calls after 5pm',
    });
    expect(res.body.activity.direction).toBeNull();
  });

  it('shows the last contact, the overdue task and a reason on the contact list', async () => {
    const res = await request(app).get('/api/crm/contacts');
    const lee = res.body.contacts.find((c) => c.id === id);
    expect(lee.last_contact_kind).toBe('call');
    expect(lee.open_tasks).toBe(1);
    expect(lee.overdue_tasks).toBe(1);
    expect(lee.attention[0]).toMatch(/overdue/);
    expect(res.body.summary.loggedThisWeek).toBeGreaterThanOrEqual(2);
  });

  it('does not count a note or a future meeting as last contact', async () => {
    await request(app).post(`/api/crm/contacts/${id}/activities`).send({
      kind: 'meeting', subject: 'Present SOA', occurred_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    const res = await request(app).get('/api/crm/contacts');
    const lee = res.body.contacts.find((c) => c.id === id);
    expect(lee.last_contact_kind).toBe('call');
    expect(lee.upcoming_subject).toBe('Present SOA');
  });

  it('edits and deletes an activity, but not a stage change', async () => {
    const edit = await request(app).patch(`/api/crm/activities/${activityId}`).send({ outcome: 'Spoke' });
    expect(edit.body.outcome).toBe('Spoke');

    const detail = await request(app).get(`/api/crm/contacts/${id}`);
    const stage = detail.body.activities.find((a) => a.kind === 'stage');
    expect((await request(app).patch(`/api/crm/activities/${stage.id}`).send({ subject: 'x' })).status).toBe(400);

    expect((await request(app).delete(`/api/crm/activities/${activityId}`)).status).toBe(204);
    expect((await request(app).delete(`/api/crm/activities/${activityId}`)).status).toBe(404);
  });

  it('lists the practice-wide feed with contact names', async () => {
    const res = await request(app).get('/api/crm/activities?kind=note');
    expect(res.status).toBe(200);
    expect(res.body.find((a) => a.client_id === id)?.display_name).toBe(`Lee ${SURNAME}`);
  });
});

describe('tasks and contacts together', () => {
  let id;

  beforeAll(async () => {
    const res = await request(app).post('/api/crm/contacts').send({ first_name: 'Robin', last_name: SURNAME });
    id = res.body.id;
  });

  it('links a tracker task typed with a matching name', async () => {
    const res = await request(app).post('/api/tasks').send({ who: `Robin ${SURNAME}`, task: 'Send the PDS' });
    expect(res.status).toBe(201);
    expect(res.body.clientId).toBe(id);
  });

  it('does not link on a first name alone', async () => {
    const res = await request(app).post('/api/tasks').send({ who: 'Robin', task: 'Something vague' });
    expect(res.body.clientId).toBeUndefined();
  });

  it('rejects a link to a contact that does not exist', async () => {
    const res = await request(app).post('/api/tasks')
      .send({ task: 'x', clientId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(400);
  });

  it('links and unlinks an existing task by PATCH', async () => {
    const t = (await request(app).post('/api/tasks').send({ who: 'Robin', task: 'Loose end' })).body;
    let res = await request(app).patch(`/api/tasks/${t.id}`).send({ clientId: id });
    expect(res.body.clientId).toBe(id);
    res = await request(app).patch(`/api/tasks/${t.id}`).send({ clientId: null });
    expect(res.body.clientId).toBeUndefined();
  });

  it('suggests unlinked tasks that name the contact', async () => {
    await request(app).post('/api/tasks').send({ who: 'Someone Else', task: 'Unrelated', type: 'Internal' });
    const res = await request(app).get(`/api/crm/contacts/${id}`);
    expect(res.body.tasks.map((t) => t.task)).toContain('Send the PDS');
    expect(res.body.suggestedTasks).toEqual([]);
  });
});

describe('Legacy tiers, threads, anniversaries and referral partners', () => {
  let id;
  const inDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  beforeAll(async () => {
    const res = await request(app).post('/api/crm/contacts').send({
      first_name: 'Pat', last_name: SURNAME, client_tier: 'platinum', crm_thread: 'Review',
      referral_source: 'PPA (Performance Property)',
    });
    id = res.body.id;
  });

  it('serves the practice settings with the adviser list', async () => {
    const res = await request(app).get('/api/crm/meta');
    expect(res.body.practice.tiers[0].initialContact).toBe('Adviser');
    expect(res.body.advisers).toEqual(expect.arrayContaining(['Josh Davidson', 'Gary Douglas', 'Tristan Biro']));
  });

  it('rejects a tier, thread or review date Legacy does not use', async () => {
    expect((await request(app).patch(`/api/crm/contacts/${id}`).send({ client_tier: 'diamond' })).status).toBe(400);
    expect((await request(app).patch(`/api/crm/contacts/${id}`).send({ crm_thread: 'Upsell' })).status).toBe(400);
    expect((await request(app).patch(`/api/crm/contacts/${id}`).send({ next_review_date: '1/10/2026' })).status).toBe(400);
  });

  it('flags the referral fee to disclose in the SOA', async () => {
    const res = await request(app).get(`/api/crm/contacts/${id}`);
    expect(res.body.legacy.referralPartner.legalName).toBe('Performance Property Pty Ltd');
  });

  it('flags an anniversary inside the 14-day window, and not one outside it', async () => {
    await request(app).patch(`/api/crm/contacts/${id}`).send({ next_review_date: inDays(10) });
    let list = await request(app).get('/api/crm/contacts');
    let pat = list.body.contacts.find((c) => c.id === id);
    expect(pat.attention).toContain('Anniversary in 10 days');
    expect(list.body.summary.renewalsDue).toBeGreaterThanOrEqual(1);

    await request(app).patch(`/api/crm/contacts/${id}`).send({ next_review_date: inDays(40) });
    list = await request(app).get('/api/crm/contacts');
    pat = list.body.contacts.find((c) => c.id === id);
    expect(pat.attention.some((r) => r.startsWith('Anniversary'))).toBe(false);

    await request(app).patch(`/api/crm/contacts/${id}`).send({ next_review_date: inDays(-3) });
    list = await request(app).get('/api/crm/contacts');
    pat = list.body.contacts.find((c) => c.id === id);
    expect(pat.attention).toContain('Anniversary passed 3 days ago');
  });
});

describe('import from the Task Tracker', () => {
  beforeAll(async () => {
    for (const [who, task] of [
      [`Kim ${OTHER}`, 'Chase medicals'],
      [`Kim & Alex ${OTHER}`, 'Book the SOA presentation'],
      ['Allfin referrals', 'Send referral agreement'],
    ]) {
      await request(app).post('/api/tasks').send({ who, task });
    }
  });

  it('offers merged households and holds back firms', async () => {
    const res = await request(app).get('/api/crm/import/tasks');
    expect(res.status).toBe(200);
    const kim = res.body.candidates.find((c) => c.whos.includes(`Kim ${OTHER}`));
    expect(kim.whos).toEqual([`Kim & Alex ${OTHER}`, `Kim ${OTHER}`].sort());
    expect(kim.suggestion).toMatchObject({ first_name: 'Kim', partner_first_name: 'Alex', last_name: OTHER });
    expect(kim.likely).toBe(true);
    expect(res.body.candidates.find((c) => c.whos.includes('Allfin referrals')).likely).toBe(false);
  });

  it('creates the contact and links every task filed under its names', async () => {
    const { body } = await request(app).get('/api/crm/import/tasks');
    const kim = body.candidates.find((c) => c.whos.includes(`Kim ${OTHER}`));
    const res = await request(app).post('/api/crm/import/tasks').send({
      rows: [{ whos: kim.whos, ...kim.suggestion, crm_stage: 'soa' }],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 1, tasksLinked: 2 });

    const linked = readTasks().filter((t) => t.who.includes(OTHER));
    expect(new Set(linked.map((t) => t.clientId)).size).toBe(1);

    const again = await request(app).get('/api/crm/import/tasks');
    expect(again.body.candidates.find((c) => c.whos.includes(`Kim ${OTHER}`))).toBeUndefined();
  });

  it('rejects an empty import', async () => {
    expect((await request(app).post('/api/crm/import/tasks').send({ rows: [] })).status).toBe(400);
  });
});
