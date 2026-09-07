/**
 * Turn an Outlook scan into a live task list.
 *
 * Reads the JSON produced by automation/outlook/scan-outlook.ps1, sends only the
 * messages it has never seen before to Claude, and merges the resulting tasks
 * into automation/tasks/state/tasks.json.
 *
 * The state file is the source of truth for task CONTENT. Status and Notes are
 * owned by the human in the spreadsheet — write-sheet.ps1 reads those edits back
 * into this file before it rewrites the sheet, and nothing here overwrites them.
 *
 * Usage: node extract-tasks.mjs --scan <scan.json> [--state <tasks.json>] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { complete, aiEnabled } from '../../server/src/services/ai.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATE = path.join(HERE, 'state', 'tasks.json');

// Emails per Claude call. Small enough that one bad batch can't lose a whole
// cycle, large enough that a busy morning is still one or two requests.
const BATCH_SIZE = 12;
// Drop seen-email records older than this so the state file stays bounded.
const SEEN_RETENTION_DAYS = 120;

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (flag) => process.argv.includes(flag);

/**
 * Today's date where the adviser actually is. toISOString() is UTC, which in
 * Australia is yesterday for the first ten hours of every working day — enough
 * to date a note wrongly and to make the model resolve "by Friday" a day early.
 */
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SYSTEM = `You are the practice manager for Tristan Biro, a financial adviser at Legacy Risk Advice (life/risk insurance advice, Australian). You read his inbox and maintain his to-do list.

Your job: from each email, extract the concrete actions TRISTAN or his team must take. Nothing else.

CREATE A TASK when the email means someone is waiting on him or his team:
- A client asks a question, sends a document, requests a change, or chases an update.
- An insurer/provider (AIA, TAL, Zurich, MLC, Neos, Resolution Life, etc.) requests
  information, returns a requirement, issues an outcome, or flags a lapse/arrears.
- The licensee (Synchron) or a compliance/audit request needs a response.
- Underwriting requirements, medical results, or an application need progressing.
- Someone internal asks him for something, or he promised a deliverable.
- A meeting needs preparing, booking, or has follow-up actions.

DO NOT create a task for:
- Newsletters, marketing, webinars, product updates, "thought leadership".
- Automated receipts, delivery/read receipts, out-of-office, calendar accept/decline.
- Pure FYI where no reply or action is expected.
- Spam, or anything he is merely CC'd on with no ask directed at him.

RULES
- One email can produce zero, one, or several tasks. Zero is a normal answer — be
  strict. A cluttered list is worse than a short one.
- Write each task as a specific instruction starting with a verb, naming the person
  and the thing: "Send Adam Kowalczyk the updated income protection quote", NOT
  "Follow up email".
- "who" is the client or organisation the task concerns — the name a human would
  search for. Use the real client name where the email makes it clear.
- "type": "Client" if it concerns a specific client or prospect's matter, otherwise
  "Internal" (compliance, licensee, admin, staff, software, accounts).
- "priority": "High" only for a real deadline, an expiring or lapsing policy, a
  complaint, a compliance due date, or an explicitly urgent client request.
  "Low" for routine admin with no time pressure. Otherwise "Medium".
- "due": an ISO date (YYYY-MM-DD) ONLY when the email states or clearly implies a
  deadline. Otherwise "". Never invent one.
- FOLLOW-UPS: you are given the currently open tasks. If an email is a chaser or a
  reply about something already on that list, do NOT create a duplicate — return it
  under "updates" referencing the existing task id.

Return ONLY a JSON object, no prose and no markdown fence:
{
  "tasks": [
    {"emailRef": <the ref number given with the email>, "task": "...", "who": "...",
     "type": "Client"|"Internal", "priority": "High"|"Medium"|"Low", "due": "YYYY-MM-DD"|""}
  ],
  "updates": [
    {"id": "<existing task id>", "note": "what the new email adds",
     "priority": "High"|"Medium"|"Low"|"", "due": "YYYY-MM-DD"|""}
  ]
}`;

const COMPLETION_SYSTEM = `You are the practice manager for Tristan Biro, a financial adviser at Legacy Risk Advice. You are checking which of his open to-do items he has already dealt with.

You are given his OPEN TASKS and emails he has SENT. Decide which tasks each sent email completes.

CLOSE a task when the sent email actually delivers the thing:
- It attaches or provides what was asked for (quote, report, form, document, costings).
- It answers the question that was put to him.
- It supplies the information an insurer or the licensee requested.
- It books, confirms or reschedules the meeting the task was about.

DO NOT close a task when the email merely:
- Acknowledges ("thanks, will get onto that", "leave it with me", "noted").
- Asks the client or provider for something, rather than supplying it.
- Chases someone else, or forwards it internally for someone else to do.
- Is loosely on the same topic without delivering the specific thing.

THE "BUT" TEST — apply this to every task before you put it in "completed".
Write the reason first. If that reason needs a qualifier to be truthful — "but",
"however", "still outstanding", "no confirmation", "not attached", "no record of",
"expect", "should" — then the thing was NOT delivered. It goes in "progressed",
never in "completed". A reason in "completed" must read as a plain statement of
what was sent, with no hedge in it.

Examples of reasons that mean PROGRESSED, not completed:
- "Sent the summary, but no confirmation the CVC was corrected" -> progressed
- "Sent a pre-assessment request, but the reports were not attached" -> progressed
- "Applications pre-completed. Still outstanding: travel and GP details" -> progressed
- "Forwarded internally saying let's call tomorrow" -> progressed
- "Asks Tristan to confirm X" -> that is a NEW request TO him, not something he did

Be conservative. A task wrongly marked done disappears off his list and the client
is left waiting. Leaving a task open one day too long costs nothing; closing it
wrongly costs a client. When genuinely unsure, use "progressed".

Return ONLY a JSON object, no prose and no markdown fence:
{
  "completed": [
    {"id": "<open task id>", "reason": "what the sent email delivered, one short clause"}
  ],
  "progressed": [
    {"id": "<open task id>", "note": "what he sent that is related but does not finish it"}
  ]
}`;

/**
 * Append a note, keeping the MOST RECENT text when the field overflows.
 *
 * The previous `.slice(0, 500)` kept the oldest notes and silently discarded
 * whatever had just been appended, so on a busy task the reason it closed was
 * thrown away — leaving a task marked Done with no explanation.
 */
function appendNote(existing, line) {
  const joined = existing ? `${existing} | ${line}` : line;
  return joined.length <= 500 ? joined : joined.slice(joined.length - 500);
}

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Due date when the email states no deadline: a 24-hour turnaround from when the
 * mail arrived, not from when the scan ran — a message that landed on Friday is
 * due Saturday, however long it sat before being picked up.
 */
function defaultDue(receivedTime) {
  const base = receivedTime ? new Date(receivedTime) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;
  d.setDate(d.getDate() + 1);
  return localDate(d);
}

/** Compact one scanned message into the shape the model sees. */
function renderEmail(m, ref) {
  const body = (m.bodyPreview || '').trim();
  return [
    `--- EMAIL ${ref} ---`,
    `From: ${m.senderName || ''} <${m.senderEmail || ''}>`,
    `Received: ${m.receivedTime}`,
    `Subject: ${m.subject || '(no subject)'}`,
    m.attachmentNames && m.attachmentNames.length
      ? `Attachments: ${m.attachmentNames.join(', ')}`
      : null,
    body ? `Body: ${body}` : '(no body captured)',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Read a JSON file that may carry a UTF-8 BOM.
 *
 * PowerShell 5.1's `Out-File -Encoding utf8` always writes one, so every scan
 * produced by scan-outlook.ps1 starts with U+FEFF and JSON.parse rejects the
 * whole file. Stripping on read covers any producer rather than chasing each one.
 */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '') || 'null');
}

function loadState(file) {
  if (!fs.existsSync(file)) {
    return { version: 1, lastRun: null, nextId: 1, seenEmails: {}, tasks: [] };
  }
  const s = readJson(file);
  s.seenEmails ||= {};
  s.tasks ||= [];
  s.nextId ||= s.tasks.length + 1;
  return s;
}

function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
}

/** Seen-email records outlive the scan window; prune so the file stays small. */
function pruneSeen(state) {
  const cutoff = Date.now() - SEEN_RETENTION_DAYS * 864e5;
  for (const [id, rec] of Object.entries(state.seenEmails)) {
    if (new Date(rec.at).getTime() < cutoff) delete state.seenEmails[id];
  }
}

const isOpen = (t) => t.status !== 'Done' && t.status !== 'Cancelled';

async function classify(batch, openTasks) {
  const emails = batch.map((m, i) => renderEmail(m, i + 1)).join('\n\n');
  // Only open tasks are offered for dedupe — a closed task should not absorb a
  // fresh request that happens to look similar.
  const openList = openTasks.length
    ? openTasks.map((t) => `${t.id} [${t.who}] ${t.task}`).join('\n')
    : '(none)';

  const raw = await complete({
    messages: [
      { role: 'system', content: SYSTEM, cache: true },
      {
        role: 'user',
        content: `Today is ${localDate()}.

CURRENTLY OPEN TASKS (for follow-up matching):
${openList}

NEW EMAILS:

${emails}`,
      },
    ],
    json: true,
    maxTokens: 8000,
    effort: 'medium',
  });

  try {
    const parsed = JSON.parse(raw);
    return { tasks: parsed.tasks || [], updates: parsed.updates || [] };
  } catch {
    console.warn('[tasks] could not parse model output for a batch; skipping it');
    return { tasks: [], updates: [] };
  }
}

/** Ask which open tasks a batch of SENT emails has actually discharged. */
async function detectCompletions(sentBatch, openTasks) {
  if (!openTasks.length) return { completed: [], progressed: [] };
  const emails = sentBatch
    .map((m, i) => {
      const body = (m.bodyPreview || '').trim();
      return [
        `--- SENT EMAIL ${i + 1} ---`,
        `To: ${m.toRecipients || m.senderName || ''}`,
        `Sent: ${m.receivedTime}`,
        `Subject: ${m.subject || '(no subject)'}`,
        m.attachmentNames && m.attachmentNames.length
          ? `Attachments: ${m.attachmentNames.join(', ')}`
          : 'Attachments: none',
        body ? `Body: ${body}` : '(no body captured)',
      ].join('\n');
    })
    .join('\n\n');

  const raw = await complete({
    messages: [
      { role: 'system', content: COMPLETION_SYSTEM, cache: true },
      {
        role: 'user',
        content: `Today is ${localDate()}.

OPEN TASKS:
${openTasks.map((t) => `${t.id} [${t.who}] ${t.task}`).join('\n')}

EMAILS HE HAS SENT:

${emails}`,
      },
    ],
    json: true,
    maxTokens: 4000,
    effort: 'medium',
  });

  try {
    const parsed = JSON.parse(raw);
    return { completed: parsed.completed || [], progressed: parsed.progressed || [] };
  } catch {
    console.warn('[tasks] could not parse completion output for a batch; skipping it');
    return { completed: [], progressed: [] };
  }
}

/**
 * Close out tasks that his sent mail has already dealt with, so the list reflects
 * what is actually outstanding rather than everything that ever arrived.
 * Returns how many were closed.
 */
async function applySentMail(sentFile, state) {
  if (!sentFile || !fs.existsSync(sentFile)) return 0;
  const sent = readJson(sentFile) || [];
  const all = Array.isArray(sent) ? sent : [sent];
  // --recheck-sent re-examines mail already marked seen. Normally a sent email is
  // judged once, against whatever tasks were open at the time; after a large
  // backfill that is the wrong set, because most tasks did not exist yet.
  const fresh = hasFlag('--recheck-sent')
    ? all.filter((m) => m.entryId)
    : all.filter((m) => m.entryId && !state.seenEmails[m.entryId]);
  if (!fresh.length) return 0;

  let closed = 0;
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    const { completed, progressed } = await detectCompletions(batch, state.tasks.filter(isOpen));
    const stamp = localDate();

    for (const c of completed) {
      const task = state.tasks.find((t) => t.id === c.id && isOpen(t));
      if (!task) continue;
      console.log(`[tasks] CLOSE ${task.id} (${task.who}) - ${c.reason || 'no reason given'}`);
      task.status = 'Done';
      task.completedAt = new Date().toISOString();
      // Always record WHY it closed. A task that vanishes without explanation is
      // worse than one left open, because there is nothing to check against.
      task.notes = appendNote(task.notes, `${stamp}: closed automatically - ${c.reason || 'answered by sent mail'}`);
      closed++;
    }

    for (const p of progressed) {
      const task = state.tasks.find((t) => t.id === p.id && isOpen(t));
      if (!task || !p.note) continue;
      task.notes = appendNote(task.notes, `${stamp}: ${p.note}`);
    }

    for (const m of batch) {
      state.seenEmails[m.entryId] = { at: new Date().toISOString(), subject: m.subject || '' };
    }
  }
  return closed;
}

async function main() {
  const scanFile = arg('--scan');
  const stateFile = arg('--state', DEFAULT_STATE);
  if (!scanFile || !fs.existsSync(scanFile)) {
    console.error('extract-tasks: --scan <file> is required and must exist');
    process.exit(2);
  }
  if (!aiEnabled()) {
    console.error('extract-tasks: ANTHROPIC_API_KEY is not set in server/.env');
    process.exit(3);
  }

  const scanned = readJson(scanFile) || [];
  const messages = Array.isArray(scanned) ? scanned : [scanned];
  const state = loadState(stateFile);

  const fresh = messages.filter((m) => m.entryId && !state.seenEmails[m.entryId]);
  console.log(`[tasks] ${messages.length} scanned, ${fresh.length} not seen before`);

  let added = 0;
  let bumped = 0;
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    const { tasks, updates } = await classify(batch, state.tasks.filter(isOpen));

    for (const t of tasks) {
      if (!t.task) continue;
      const src = batch[(Number(t.emailRef) || 0) - 1];
      state.tasks.push({
        id: `T${String(state.nextId++).padStart(4, '0')}`,
        created: new Date().toISOString(),
        task: String(t.task).trim(),
        who: String(t.who || '').trim(),
        type: t.type === 'Internal' ? 'Internal' : 'Client',
        priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
        // Where the date came from matters: a real deadline lifted out of the
        // email should read differently from an assumed turnaround, and a date
        // the human sets must never be overwritten by a later scan.
        due: RE_DATE.test(t.due || '') ? t.due : defaultDue(src && src.receivedTime),
        dueSource: RE_DATE.test(t.due || '') ? 'email' : 'default',
        status: 'Open',
        notes: '',
        source: src
          ? {
              subject: src.subject || '',
              from: src.senderName || src.senderEmail || '',
              received: src.receivedTime || '',
              entryId: src.entryId || '',
            }
          : null,
      });
      added++;
    }

    // A chaser bumps the existing task rather than cloning it.
    for (const u of updates) {
      const task = state.tasks.find((t) => t.id === u.id && isOpen(t));
      if (!task) continue;
      const stamp = localDate();
      if (u.note) {
        task.notes = appendNote(task.notes, `${stamp}: ${u.note}`);
      }
      if (['High', 'Medium', 'Low'].includes(u.priority)) task.priority = u.priority;
      if (RE_DATE.test(u.due || '') && task.dueSource !== 'user') {
        task.due = u.due;
        task.dueSource = 'email';
      }
      task.lastChased = new Date().toISOString();
      bumped++;
    }

    for (const m of batch) {
      state.seenEmails[m.entryId] = { at: new Date().toISOString(), subject: m.subject || '' };
    }
  }

  // Sent mail is checked even when nothing new arrived — he may have cleared
  // things off the list without any new mail coming in.
  const closed = await applySentMail(arg('--sent'), state);

  pruneSeen(state);
  state.lastRun = new Date().toISOString();
  if (hasFlag('--dry')) {
    console.log(JSON.stringify(state.tasks.slice(-Math.max(added, 1)), null, 2));
    return;
  }
  saveState(stateFile, state);
  console.log(
    `[tasks] +${added} new, ${bumped} updated, ${closed} closed from sent mail, ` +
      `${state.tasks.filter(isOpen).length} open total`
  );
}

main().catch((err) => {
  console.error('[tasks] failed:', err.message);
  process.exit(1);
});
