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
  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8').replace(/^﻿/, ''));
  s.tasks ||= [];
  return s;
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
    const all = sortTasks(state.tasks);
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

/**
 * PATCH /api/tasks/:id — status and notes only.
 * Everything else (task text, who, priority, due, source) is regenerated from the
 * mail each cycle, so accepting edits to those would silently lose them.
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status, notes, due } = req.body || {};
    if (status !== undefined && !STATUSES.includes(status)) {
      throw badRequest(`status must be one of: ${STATUSES.join(', ')}`);
    }
    if (notes !== undefined && typeof notes !== 'string') {
      throw badRequest('notes must be a string');
    }
    // Empty string clears the date; anything else must be a plain ISO day.
    if (due !== undefined && due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(due))) {
      throw badRequest('due must be YYYY-MM-DD, or "" to clear it');
    }

    const state = readState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task) throw notFound(`No task ${req.params.id}`);

    if (status !== undefined) {
      task.status = status;
      if (status === 'Done' || status === 'Cancelled') {
        task.completedAt = new Date().toISOString();
      } else {
        delete task.completedAt;
      }
    }
    if (notes !== undefined) task.notes = notes.slice(0, 500);
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
