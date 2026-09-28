import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import {
  STATUSES, PRIORITIES, TYPES, DUE_RE, isOpen, stateExists, readState, readAllTasks,
  readArchive, writeState, appendNote, noteStamp, sortTasks, addTask, applyStatus, localToday,
} from '../services/taskStore.js';
import { displayName, whoMatchesClient } from '../services/crm/names.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The CRM contact a task is being linked to, or a 400 if there is no such contact. */
async function contactFor(clientId) {
  if (!UUID_RE.test(String(clientId))) throw badRequest('clientId must be a contact id');
  const { rows } = await query(
    'SELECT id, first_name, last_name, partner_first_name, partner_last_name FROM clients WHERE id = $1',
    [clientId]
  );
  if (!rows[0]) throw badRequest(`No CRM contact ${clientId}`);
  return rows[0];
}

/**
 * The one contact a typed name unambiguously belongs to, or null. Needs a full
 * first-and-last match, and exactly one candidate — a guess is worse than no link.
 */
async function contactNamed(who) {
  if (!who || !String(who).trim()) return null;
  const { rows } = await query(
    `SELECT id, first_name, last_name, preferred_name, partner_first_name, partner_last_name
       FROM clients WHERE status <> 'archived'`
  );
  const hits = rows.filter((c) => whoMatchesClient(who, c));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * GET /api/tasks
 * Everything the tracker needs in one call: the list, plus the counts that drive
 * the header. `?open=1` drops finished work.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { state, all: unsorted } = readAllTasks();
    const all = sortTasks(unsorted);
    const today = localToday();

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
      configured: stateExists(),
      counts,
      tasks: req.query.open ? open : all,
    });
  })
);

/**
 * POST /api/tasks — add a task by hand.
 *
 * `clientId` links it to a CRM contact. Without one, a name that matches exactly
 * one contact links itself, so a task typed on the tracker still appears on the
 * client's CRM record.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { task, who, type, priority, due, notes, clientId } = req.body || {};
    if (!task || !String(task).trim()) throw badRequest('task is required');
    if (type !== undefined && type !== '' && !TYPES.includes(type)) {
      throw badRequest(`type must be one of: ${TYPES.join(', ')}`);
    }
    if (priority !== undefined && priority !== '' && !PRIORITIES.includes(priority)) {
      throw badRequest(`priority must be one of: ${PRIORITIES.join(', ')}`);
    }
    if (due !== undefined && due !== '' && !DUE_RE.test(String(due))) {
      throw badRequest('due must be YYYY-MM-DD, or "" to clear it');
    }

    // Database work first: nothing may be awaited once the task file is read.
    let contact = null;
    if (clientId) contact = await contactFor(clientId);
    else if (type !== 'Internal') contact = await contactNamed(who);

    const state = readState();
    const created = addTask(state, {
      task,
      who: who || (contact ? displayName(contact) : ''),
      type,
      priority,
      due,
      notes,
      clientId: contact?.id,
    });
    writeState(state);
    res.status(201).json(created);
  })
);

/**
 * PATCH /api/tasks/:id — status, due date, notes, and the CRM link.
 * `clientId: null` unlinks a task from its contact.
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status, notes, due, addNote, clientId } = req.body || {};
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
    if (due !== undefined && due !== '' && !DUE_RE.test(String(due))) {
      throw badRequest('due must be YYYY-MM-DD, or "" to clear it');
    }
    const contact = clientId ? await contactFor(clientId) : null;

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

    if (status !== undefined) applyStatus(task, status);
    // `notes` replaces the field outright; `addNote` appends a dated entry and is
    // what the UI uses, so the existing log is never overwritten by hand.
    if (notes !== undefined) task.notes = notes.slice(0, 500);
    if (addNote !== undefined) {
      task.notes = appendNote(task.notes, `${noteStamp()}: ${addNote.trim()}`);
    }
    if (due !== undefined) {
      task.due = String(due);
      // Marks the date as the adviser's own rather than an assumed turnaround.
      task.dueSource = 'user';
    }
    if (clientId !== undefined) {
      if (contact) task.clientId = contact.id;
      else delete task.clientId;
    }

    writeState(state);
    res.json(task);
  })
);

export default router;
