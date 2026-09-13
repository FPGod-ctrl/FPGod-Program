import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();

/**
 * The task list is owned by automation/tasks — the mail scanner writes it and
 * write-sheet.ps1 syncs the spreadsheet against it. The app reads and edits that
 * same file rather than keeping its own copy, so the sheet, the app and the
 * scanner can never disagree about what is outstanding.
 */
const STATE_FILE = fileURLToPath(
  new URL('../../../automation/tasks/state/tasks.json', import.meta.url)
);

const STATUSES = ['Open', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
const isOpen = (t) => t.status !== 'Done' && t.status !== 'Cancelled';

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { version: 1, lastRun: null, nextId: 1, seenEmails: {}, tasks: [] };
  }
  // PowerShell's `Out-File -Encoding utf8` writes a UTF-8 BOM, so the state file
  // starts with U+FEFF whenever write-sheet.ps1 last touched it. JSON.parse
  // rejects that outright, which reads to the user as "no tasks".
  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8').replace(/^\uFEFF/, ''));
  s.tasks ||= [];
  return s;
}

const ARCHIVE_FILE = fileURLToPath(
  new URL('../../../automation/tasks/state/archive.jsonl', import.meta.url)
);

/**
 * Completed work that is no longer in the live state file.
 *
 * The archive is append-only, so a task that was finished stays readable even
 * after tasks.json is reset. Anything still present in state wins — the live copy
 * carries any notes or status changes made since it was archived.
 */
function readArchive(liveIds) {
  if (!fs.existsSync(ARCHIVE_FILE)) return [];
  const seen = new Set();
  const out = [];
  for (const line of fs.readFileSync(ARCHIVE_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let t;
    try {
      t = JSON.parse(line);
    } catch {
      continue; // a torn final line from an interrupted append
    }
    if (!t?.id || liveIds.has(t.id)) continue;
    // Later lines supersede earlier ones for the same task.
    if (seen.has(t.id)) out[out.findIndex((x) => x.id === t.id)] = { ...t, archived: true };
    else {
      seen.add(t.id);
      out.push({ ...t, archived: true });
    }
  }
  return out;
}

/**
 * Write via a temp file and rename. The scanner rewrites this file on its own
 * schedule; a plain truncate-and-write could be read half-finished mid-cycle.
 */
function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

/**
 * Append a note, keeping the MOST RECENT text when the field overflows.
 *
 * Matches how extract-tasks.mjs writes notes, so the scanner's entries and the
 * adviser's read as one dated log rather than two competing formats. Trimming
 * from the front is deliberate: the newest entry is the one worth keeping.
 */
function appendNote(existing, line) {
  const joined = existing ? `${existing} | ${line}` : line;
  return joined.length <= 500 ? joined : joined.slice(joined.length - 500);
}

/**
 * Timestamp for a note entry: local date AND time.
 *
 * Local, not toISOString - UTC is yesterday for most of an Australian workday.
 * The time matters here in a way it does not for the scanner's own notes: "tried
 * calling" three times in one afternoon is only legible with the hour attached.
 */
function noteStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const statusRank = { 'In Progress': 0, Open: 1, Waiting: 2, Done: 3, Cancelled: 4 };
const prioRank = { High: 0, Medium: 1, Low: 2 };

/** Same ordering the spreadsheet uses, so the two views read identically. */
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const s = (statusRank[a.status] ?? 1) - (statusRank[b.status] ?? 1);
    if (s) return s;
    const p = (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1);
    if (p) return p;
    const ad = a.due || '9999-12-31';
    const bd = b.due || '9999-12-31';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (b.source?.received || '') > (a.source?.received || '') ? 1 : -1;
  });
}

/**
 * GET /api/tasks
 * Everything the tracker needs in one call: the list, plus the counts that drive
 * the header. `?open=1` drops finished work.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const state = readState();
    const liveIds = new Set(state.tasks.map((t) => t.id));
    const archived = readArchive(liveIds);
    const all = sortTasks([...state.tasks, ...archived]);
    const today = new Date().toISOString().slice(0, 10);

    const open = all.filter(isOpen);
    const counts = {
      total: all.length,
      open: open.length,
      overdue: open.filter((t) => t.due && t.due < today).length,
      dueToday: open.filter((t) => t.due === today).length,
      client: open.filter((t) => t.type === 'Client').length,
      internal: open.filter((t) => t.type === 'Internal').length,
      high: open.filter((t) => t.priority === 'High').length,
    };

    res.json({
      lastRun: state.lastRun,
      configured: fs.existsSync(STATE_FILE),
      counts,
      tasks: req.query.open ? open : all,
    });
  })
);

const PRIORITIES = ['High', 'Medium', 'Low'];
const TYPES = ['Client', 'Internal'];

/** 24-hour turnaround, matching what the scanner assumes for mail with no deadline. */
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * POST /api/tasks — add a task by hand.
 *
 * Manual tasks carry `origin: 'manual'` and no source email. The scanner keys
 * everything on message id, so it has no way to recreate or close one of these —
 * they live and die by hand, which is the point.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { task, who, type, priority, due, notes } = req.body || {};
    if (!task || !String(task).trim()) throw badRequest('task is required');
    if (type !== undefined && type !== '' && !TYPES.includes(type)) {
      throw badRequest(`type must be one of: ${TYPES.join(', ')}`);
    }
    if (priority !== undefined && priority !== '' && !PRIORITIES.includes(priority)) {
      throw badRequest(`priority must be one of: ${PRIORITIES.join(', ')}`);
    }
    if (due !== undefined && due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(due))) {
      throw badRequest('due must be YYYY-MM-DD, or "" to clear it');
    }

    const state = readState();
    const nextId = state.nextId || state.tasks.length + 1;
    const created = {
      id: `T${String(nextId).padStart(4, '0')}`,
      created: new Date().toISOString(),
      task: String(task).trim().slice(0, 500),
      who: String(who || '').trim().slice(0, 120),
      type: TYPES.includes(type) ? type : 'Client',
      priority: PRIORITIES.includes(priority) ? priority : 'Medium',
      due: due || tomorrow(),
      dueSource: due ? 'user' : 'default',
      status: 'Open',
      notes: String(notes || '').slice(0, 500),
      origin: 'manual',
      source: null,
    };
    state.nextId = nextId + 1;
    state.tasks.push(created);
    writeState(state);
    res.status(201).json(created);
  })
);

/**
 * PATCH /api/tasks/:id — status and notes only.
 * Everything else (task text, who, priority, due, source) is regenerated from the
 * mail each cycle, so accepting edits to those would silently lose them.
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status, notes, due, addNote } = req.body || {};
    if (status !== undefined && !STATUSES.includes(status)) {
      throw badRequest(`status must be one of: ${STATUSES.join(', ')}`);
    }
    if (notes !== undefined && typeof notes !== 'string') {
      throw badRequest('notes must be a string');
    }
    if (addNote !== undefined && (typeof addNote !== 'string' || !addNote.trim())) {
      throw badRequest('addNote must be a non-empty string');
    }
    // Empty string clears the date; anything else must be a plain ISO day.
    if (due !== undefined && due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(due))) {
      throw badRequest('due must be YYYY-MM-DD, or "" to clear it');
    }

    const state = readState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task) {
      // Archived-only tasks are history, not working items — the archive is
      // append-only and editing it would defeat the point of keeping it.
      const inArchive = readArchive(new Set()).some((t) => t.id === req.params.id);
      throw notFound(
        inArchive
          ? `Task ${req.params.id} is archived and cannot be edited`
          : `No task ${req.params.id}`
      );
    }

    if (status !== undefined) {
      task.status = status;
      if (status === 'Done' || status === 'Cancelled') {
        task.completedAt = new Date().toISOString();
      } else {
        delete task.completedAt;
      }
    }
    // `notes` replaces the field outright; `addNote` appends a dated entry and is
    // what the UI uses, so the scanner's log is never overwritten by hand.
    if (notes !== undefined) task.notes = notes.slice(0, 500);
    if (addNote !== undefined) {
      task.notes = appendNote(task.notes, `${noteStamp()}: ${addNote.trim()}`);
    }
    if (due !== undefined) {
      task.due = String(due);
      // Marks the date as the human's. extract-tasks will not overwrite it on a
      // later scan, which it otherwise would every time a chaser arrives.
      task.dueSource = 'user';
    }

    writeState(state);
    res.json(task);
  })
);

export default router;
