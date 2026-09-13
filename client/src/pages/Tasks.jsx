import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loading } from '../components/ui/Loading.jsx';

const STATUSES = ['Open', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
const isOpen = (t) => t.status !== 'Done' && t.status !== 'Cancelled';
const today = () => new Date().toISOString().slice(0, 10);

/** Overdue and due-today are the only date states worth colouring. */
function dueTone(due, status) {
  if (!due || !isOpen({ status })) return '';
  if (due < today()) return 'overdue';
  if (due === today()) return 'today';
  return '';
}

/**
 * Split the notes field into dated entries.
 *
 * Notes are stored as one pipe-delimited string so the spreadsheet's Notes column
 * stays a single editable cell. Entries the app writes carry a date and time; the
 * scanner's carry a date only, and anything without a leading stamp at all (a note
 * typed straight into Excel) is kept as an undated entry rather than dropped.
 */
function parseNotes(notes) {
  if (!notes) return [];
  return notes
    .split(' | ')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?:\s*([\s\S]*)$/);
      if (!m) return { date: '', time: '', text: chunk };
      return { date: m[1], time: m[2] || '', text: m[3] };
    });
}

/** 2026-09-09 -> "Tue 9 Sep", which is what a person actually reads. */
function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Where the date came from, so an assumed turnaround is not mistaken for a deadline. */
const DUE_ORIGIN = {
  email: 'Deadline stated in the email',
  user: 'You set this date',
  default: 'Assumed 24-hour turnaround — no deadline was given',
};

/**
 * Editable due date. A native date input keeps the keyboard and picker behaviour
 * without a dependency, and the tone class carries the overdue/today colouring
 * that the read-only badge used to.
 */
function DueCell({ task, disabled, onChange }) {
  const tone = dueTone(task.due, task.status);
  return (
    <input
      type="date"
      className={`task-date ${tone} ${task.dueSource === 'default' ? 'assumed' : ''}`}
      value={task.due || ''}
      disabled={disabled}
      title={DUE_ORIGIN[task.dueSource] || 'No due date'}
      aria-label={`Due date for ${task.task}`}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const FILTERS = [
  { key: 'open', label: 'To do', blurb: 'Everything still open', match: (t) => isOpen(t) },
  {
    key: 'overdue',
    label: 'Overdue',
    blurb: 'Past their due date and still open',
    match: (t) => isOpen(t) && t.due && t.due < today(),
  },
  {
    key: 'client',
    label: 'Clients',
    blurb: 'Open work sitting with a client file',
    match: (t) => isOpen(t) && t.type === 'Client',
  },
  {
    key: 'internal',
    label: 'Internal',
    blurb: 'Open practice and admin work',
    match: (t) => isOpen(t) && t.type === 'Internal',
  },
  { key: 'done', label: 'Done', blurb: 'Closed and cancelled', match: (t) => !isOpen(t) },
  { key: 'all', label: 'Everything', blurb: 'The whole tracker', match: () => true },
];

// `who` is the name the task sits under; `task` is what actually has to be done.
// Leaving due blank lets the API apply the same 24-hour turnaround the scanner does.
const BLANK_TASK = { who: '', task: '', due: '', notes: '' };

export default function Tasks() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');
  const [saving, setSaving] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_TASK);
  // Which row has its note box open, and the unsent text per row.
  const [noting, setNoting] = useState('');
  const [noteDraft, setNoteDraft] = useState({});
  // Only one note log is open at a time - the list stays scannable.
  const [expanded, setExpanded] = useState('');

  async function load() {
    try {
      setData(await api.get('/tasks'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /**
   * Save one field. Applied in place first so ticking something off or nudging a
   * date feels instant; the reload that follows re-sorts it into the right group.
   */
  async function patchTask(id, patch) {
    setSaving(id);
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    try {
      await api.patch(`/tasks/${id}`, patch);
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setSaving('');
    }
  }

  /** Appends a dated entry rather than replacing the field, so the scanner's log survives. */
  async function addNote(id) {
    const text = (noteDraft[id] || '').trim();
    if (!text) return;
    await patchTask(id, { addNote: text });
    setNoteDraft((d) => ({ ...d, [id]: '' }));
    setNoting('');
  }

  const setStatus = (id, status) => patchTask(id, { status });
  // Sent as dueSource 'user' by the API, so a later scan cannot overwrite it.
  const setDue = (id, due) => patchTask(id, { due });

  async function createTask(e) {
    e.preventDefault();
    if (!form.task.trim()) return;
    setSaving('new');
    try {
      await api.post('/tasks', form);
      setForm(BLANK_TASK);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  const active = FILTERS.find((x) => x.key === filter) || FILTERS[0];

  const visible = useMemo(() => (data ? data.tasks.filter(active.match) : []), [data, active]);

  // Each filter carries its own tally so the bar doubles as a count of the book.
  const tallies = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(FILTERS.map((f) => [f.key, data.tasks.filter(f.match).length]));
  }, [data]);

  // Grouped by who is waiting — the practice thinks in clients, not in rows.
  const groups = useMemo(() => {
    const by = new Map();
    for (const t of visible) {
      const key = t.who || 'Unattributed';
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(t);
    }
    return [...by.entries()].sort((a, b) => {
      const aOver = a[1].some((t) => isOpen(t) && t.due && t.due < today());
      const bOver = b[1].some((t) => isOpen(t) && t.due && t.due < today());
      if (aOver !== bOver) return aOver ? -1 : 1;
      return b[1].length - a[1].length;
    });
  }, [visible]);

  if (!data && !error) return <Loading />;

  const c = data?.counts || {};
  const lastRun = data?.lastRun
    ? new Date(data.lastRun).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
    : 'never';

  const summary = [
    { label: 'To do', value: c.open ?? 0 },
    { label: 'Overdue', value: c.overdue ?? 0, tone: c.overdue ? 'red' : '' },
    { label: 'Due today', value: c.dueToday ?? 0, tone: c.dueToday ? 'amber' : '' },
    { label: 'High priority', value: c.high ?? 0 },
    { label: 'Client', value: c.client ?? 0 },
    { label: 'Internal', value: c.internal ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Task Tracker"
        sub="Built from your mailbox every hour"
        actions={
          <>
            <button className="btn primary" onClick={() => setAdding((v) => !v)}>
              {adding ? 'Cancel' : '+ Add task'}
            </button>
            <button className="btn" onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <div className="content">
        {error && <div className="alert red">{error}</div>}

        <div className="tasks-banner">
          <div className="tb-stats">
            {summary.map((s) => (
              <div key={s.label} className={`tb-stat ${s.tone || ''}`}>
                <span className="tb-val">{s.value}</span>
                <span className="tb-label">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="tb-meta">
            {data?.tasks?.length ?? 0} tracked
            <br />
            Last scan {lastRun}
          </div>
        </div>

        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="pill-count">{tallies[f.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="list-head">
          <div>
            <h2>{active.label}</h2>
            <div className="blurb">{active.blurb}</div>
          </div>
          <span className="faint small">
            {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {adding && (
          <form className="task-new" onSubmit={createTask}>
            <div className="tn-grid">
              <label className="tn-field">
                <span>Name</span>
                <input
                  className="input"
                  placeholder="Client or organisation"
                  value={form.who}
                  onChange={(e) => setForm({ ...form, who: e.target.value })}
                />
              </label>
              <label className="tn-field tn-wide">
                <span>Description</span>
                <input
                  className="input"
                  placeholder="What needs doing"
                  required
                  autoFocus
                  value={form.task}
                  onChange={(e) => setForm({ ...form, task: e.target.value })}
                />
              </label>
              <label className="tn-field">
                <span>Due</span>
                <input
                  type="date"
                  className="input"
                  value={form.due}
                  onChange={(e) => setForm({ ...form, due: e.target.value })}
                />
              </label>
              <label className="tn-field tn-wide">
                <span>Notes</span>
                <input
                  className="input"
                  placeholder="Optional"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
            </div>
            <div className="tn-actions">
              <span className="faint small">
                Leave the date blank for a 24-hour turnaround.
              </span>
              <button className="btn primary" type="submit" disabled={saving === 'new'}>
                {saving === 'new' ? 'Adding…' : 'Add task'}
              </button>
            </div>
          </form>
        )}

        <div className="task-sheet">
          {!data?.tasks?.length ? (
            <div className="empty">
              <p>No tasks yet.</p>
              <p className="muted">
                The scanner writes here every 30 minutes. If this stays empty, check{' '}
                <code>automation/tasks/logs/cycle.log</code> — a cycle with no mail source exits 4
                rather than reporting success.
              </p>
            </div>
          ) : !visible.length ? (
            <div className="empty">
              <p>Nothing here.</p>
              <p className="muted">Try another filter above.</p>
            </div>
          ) : (
            groups.map(([who, tasks]) => (
              <section key={who} className="tg">
                <div className="tg-head">
                  <span className="tg-name">{who}</span>
                  <span className="tg-rule" />
                  <span className="tg-count">{tasks.length}</span>
                </div>
                <ul className="task-list">
                  {tasks.map((t) => (
                    <li key={t.id} className={`task-row ${isOpen(t) ? '' : 'is-done'}`}>
                      <span
                        className={`task-pri p-${(t.priority || '').toLowerCase()}`}
                        title={`${t.priority || 'No'} priority`}
                      />
                      <div className="task-main">
                        <div className="task-name">{t.task}</div>
                        {t.source?.subject && (
                          <div className="faint small">
                            {t.source.from} — {t.source.subject}
                          </div>
                        )}
                        {(() => {
                          const entries = parseNotes(t.notes);
                          if (!entries.length) return null;
                          const open = expanded === t.id;
                          const latest = entries[entries.length - 1];
                          return (
                            <div className="note-log">
                              <button
                                className="note-toggle"
                                aria-expanded={open}
                                onClick={() => setExpanded(open ? '' : t.id)}
                              >
                                <span className={`caret ${open ? 'open' : ''}`} aria-hidden="true" />
                                {entries.length} {entries.length === 1 ? 'note' : 'notes'}
                                {!open && <span className="note-peek">{latest.text}</span>}
                              </button>
                              {open && (
                                <ol className="note-list">
                                  {entries.map((n, i) => (
                                    <li key={i}>
                                      <span className="note-when">
                                        {prettyDate(n.date) || 'Undated'}
                                        {n.time && <span className="note-time"> {n.time}</span>}
                                      </span>
                                      <span className="note-text">{n.text}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          );
                        })()}
                        {noting === t.id ? (
                          <div className="note-add">
                            <input
                              className="input"
                              autoFocus
                              placeholder="Tried contacting, left voicemail…"
                              value={noteDraft[t.id] || ''}
                              onChange={(e) =>
                                setNoteDraft({ ...noteDraft, [t.id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addNote(t.id);
                                if (e.key === 'Escape') setNoting('');
                              }}
                            />
                            <button
                              className="btn small"
                              disabled={saving === t.id}
                              onClick={() => addNote(t.id)}
                            >
                              Add
                            </button>
                            <button className="btn small ghost" onClick={() => setNoting('')}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="note-trigger" onClick={() => setNoting(t.id)}>
                            + Note
                          </button>
                        )}
                      </div>
                      <div className="task-due">
                        <DueCell
                          task={t}
                          disabled={saving === t.id}
                          onChange={(due) => setDue(t.id, due)}
                        />
                      </div>
                      <select
                        className="task-status"
                        value={t.status}
                        disabled={saving === t.id}
                        onChange={(e) => setStatus(t.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
