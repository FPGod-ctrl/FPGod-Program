import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

/**
 * The Task Tracker's list, shared by the tracker page and the CRM.
 *
 * Tasks are added and edited in the app by hand, and this file is the only copy.
 *
 * Every read-modify-write here is synchronous. Callers must finish any awaited
 * work (a database lookup) BEFORE calling readState, and must not await between
 * readState and writeState — that is what stops two requests interleaving and
 * one silently dropping the other's change.
 */

const stateFile = () => path.join(env.tasks.stateDir, 'tasks.json');
const archiveFile = () => path.join(env.tasks.stateDir, 'archive.jsonl');

export const STATUSES = ['Open', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const TYPES = ['Client', 'Internal'];
export const isOpen = (t) => t.status !== 'Done' && t.status !== 'Cancelled';

export const stateExists = () => fs.existsSync(stateFile());

export function readState() {
  if (!fs.existsSync(stateFile())) {
    return { version: 1, lastRun: null, nextId: 1, seenEmails: {}, tasks: [] };
  }
  // A file last saved by PowerShell's `Out-File -Encoding utf8` starts with a
  // UTF-8 BOM (U+FEFF). JSON.parse rejects that outright, which reads to the
  // user as "no tasks".
  const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8').replace(/^\uFEFF/, ''));
  s.tasks ||= [];
  return s;
}

/**
 * Completed work that is no longer in the live state file.
 *
 * The archive is append-only, so a task that was finished stays readable even
 * after tasks.json is reset. Anything still present in state wins — the live copy
 * carries any notes or status changes made since it was archived.
 */
export function readArchive(liveIds) {
  if (!fs.existsSync(archiveFile())) return [];
  const seen = new Set();
  const out = [];
  for (const line of fs.readFileSync(archiveFile(), 'utf8').split('\n')) {
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

/** Live tasks plus archived ones, the way both screens list them. */
export function readAllTasks() {
  const state = readState();
  const liveIds = new Set(state.tasks.map((t) => t.id));
  return { state, all: [...state.tasks, ...readArchive(liveIds)] };
}

/**
 * Write via a temp file and rename, so a reader never sees a half-written file.
 */
export function writeState(state) {
  fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
  const tmp = `${stateFile()}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, stateFile());
}

/**
 * Append a note, keeping the MOST RECENT text when the field overflows.
 *
 * Notes are one pipe-delimited string of dated entries, so older entries and the
 * adviser's new ones read as a single log. Trimming from the front is
 * deliberate: the newest entry is the one worth keeping.
 */
export function appendNote(existing, line) {
  const joined = existing ? `${existing} | ${line}` : line;
  return joined.length <= 500 ? joined : joined.slice(joined.length - 500);
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Timestamp for a note entry: local date AND time.
 *
 * Local, not toISOString - UTC is yesterday for most of an Australian workday.
 * "Tried calling" three times in one afternoon is only legible with the hour.
 */
export function noteStamp() {
  const d = new Date();
  return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Today as a local calendar day, for due-date comparisons. */
export const localToday = () => ymd(new Date());

/** Default 24-hour turnaround for a task entered without a date. */
export function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return ymd(d);
}

const statusRank = { 'In Progress': 0, Open: 1, Waiting: 2, Done: 3, Cancelled: 4 };
const prioRank = { High: 0, Medium: 1, Low: 2 };

/** Same ordering the spreadsheet uses, so the two views read identically. */
export function sortTasks(tasks) {
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

export const DUE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a manual task and add it to `state`. Validation is the caller's job;
 * this only shapes the record, so the tracker and the CRM create identical ones.
 */
export function addTask(state, { task, who, type, priority, due, notes, clientId }) {
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
    // The CRM contact this task belongs to. Optional: internal and practice work
    // has no contact, and older tasks predate the CRM.
    ...(clientId ? { clientId } : {}),
  };
  state.nextId = nextId + 1;
  state.tasks.push(created);
  return created;
}

/** Mark done/cancelled with a completion time, or reopen and clear it. */
export function applyStatus(task, status) {
  task.status = status;
  if (status === 'Done' || status === 'Cancelled') task.completedAt = new Date().toISOString();
  else delete task.completedAt;
}
