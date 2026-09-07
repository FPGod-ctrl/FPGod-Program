import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loading } from '../components/ui/Loading.jsx';
import Badge from '../components/ui/Badge.jsx';

const STATUSES = ['Open', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
const isOpen = (t) => t.status !== 'Done' && t.status !== 'Cancelled';
const today = () => new Date().toISOString().slice(0, 10);

/** Overdue and due-today are the only date states worth colouring. */
function DueCell({ due, status }) {
  if (!due) return <span className="faint">—</span>;
  if (!isOpen({ status })) return <span className="faint">{due}</span>;
  if (due < today()) return <Badge tone="red">Overdue · {due}</Badge>;
  if (due === today()) return <Badge tone="amber">Today</Badge>;
  return <span className="muted">{due}</span>;
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

export default function Tasks() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');
  const [saving, setSaving] = useState('');

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

  async function setStatus(id, status) {
    setSaving(id);
    // Update in place so ticking something off feels instant; the reload that
    // follows re-sorts it into the right group.
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    try {
      await api.patch(`/tasks/${id}`, { status });
      await load();
    } catch (err) {
      setError(err.message);
      await load();
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
        sub="Built from your mailbox every 30 minutes"
        actions={
          <button className="btn" onClick={load}>
            Refresh
          </button>
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
                        {t.notes && <div className="muted small">{t.notes}</div>}
                        {t.source?.subject && (
                          <div className="faint small">
                            {t.source.from} — {t.source.subject}
                          </div>
                        )}
                      </div>
                      <div className="task-due">
                        <DueCell due={t.due} status={t.status} />
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
