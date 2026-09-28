import { useMemo, useState } from 'react';
import { KIND_META, activityTitle, relative, whenLong } from '../../lib/crm.js';

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'call', label: 'Calls' },
  { key: 'email', label: 'Emails' },
  { key: 'meeting', label: 'Meetings' },
  { key: 'sms', label: 'Texts' },
  { key: 'letter', label: 'Letters' },
  { key: 'note', label: 'Notes' },
  { key: 'task', label: 'Tasks done' },
  { key: 'stage', label: 'Stage' },
];

const monthLabel = (d) => d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

/**
 * One history for the client: logged contact, stage moves, finished tasks, and
 * the transcripts and documents already on their file, newest first, with
 * anything booked for the future pinned at the top as upcoming.
 */
export default function Timeline({ activities, tasks, transcripts, documents, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState({});

  const items = useMemo(() => {
    const out = activities.map((a) => ({ type: a.kind, at: a.occurred_at, a, id: a.id }));
    for (const t of tasks) {
      if (t.completedAt && t.status === 'Done') out.push({ type: 'task', at: t.completedAt, t, id: `t-${t.id}` });
    }
    for (const m of transcripts) {
      out.push({ type: 'meeting', at: m.meeting_date || m.created_at, m, id: `m-${m.id}` });
    }
    for (const d of documents) out.push({ type: 'doc', at: d.created_at, d, id: `d-${d.id}` });
    return out.sort((x, y) => new Date(y.at) - new Date(x.at));
  }, [activities, tasks, transcripts, documents]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const i of items) c[i.type] = (c[i.type] || 0) + 1;
    return c;
  }, [items]);

  const visible = filter === 'all' ? items : items.filter((i) => i.type === filter);

  // Upcoming first (soonest at the top), then history grouped by month.
  const groups = useMemo(() => {
    const now = Date.now();
    const upcoming = visible.filter((i) => new Date(i.at).getTime() > now).reverse();
    const past = visible.filter((i) => new Date(i.at).getTime() <= now);
    const out = upcoming.length ? [['Upcoming', upcoming]] : [];
    for (const i of past) {
      const label = monthLabel(new Date(i.at));
      const last = out[out.length - 1];
      if (last && last[0] === label) last[1].push(i);
      else out.push([label, [i]]);
    }
    return out;
  }, [visible]);

  return (
    <div className="timeline">
      <div className="tl-filters">
        {FILTERS.filter((f) => f.key === 'all' || counts[f.key]).map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} <span className="chip-n">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {!visible.length && (
        <div className="empty" style={{ padding: '36px 16px' }}>
          <p style={{ margin: 0 }}>Nothing logged yet.</p>
          <p className="muted small">Log a call, email or meeting above and it appears here.</p>
        </div>
      )}

      {groups.map(([label, list]) => (
        <section key={label} className="tl-group">
          <div className="tl-month">{label}</div>
          <ol className="tl-list">
            {list.map((i) => (
              <li key={i.id} className={`tl-item tl-${i.type}`}>
                {i.a && i.type !== 'stage' && (
                  <>
                    <span className={`tl-dot k-${i.type}`} aria-hidden="true">{KIND_META[i.type]?.icon}</span>
                    <div className="tl-card">
                      <div className="tl-head">
                        <span className="tl-title">{activityTitle(i.a)}</span>
                        {i.a.with_whom && <span className="tl-with">with {i.a.with_whom}</span>}
                        {i.a.duration_min ? <span className="tl-with">{i.a.duration_min} min</span> : null}
                        <span className="tl-when" title={whenLong(i.at)}>{relative(i.at)}</span>
                      </div>
                      {i.a.subject && <div className="tl-subject">{i.a.subject}</div>}
                      {i.a.body && (
                        <div className={`tl-body ${open[i.id] || i.a.body.length < 280 ? 'full' : ''}`}>
                          {i.a.body}
                        </div>
                      )}
                      <div className="tl-actions">
                        {i.a.body && i.a.body.length >= 280 && (
                          <button className="link-btn" onClick={() => setOpen({ ...open, [i.id]: !open[i.id] })}>
                            {open[i.id] ? 'Show less' : 'Show more'}
                          </button>
                        )}
                        <span className="faint small">{whenLong(i.at)}</span>
                        <span className="spacer" />
                        <button className="link-btn" onClick={() => onEdit(i.a)}>Edit</button>
                        <button className="link-btn danger" onClick={() => onDelete(i.a)}>Delete</button>
                      </div>
                    </div>
                  </>
                )}
                {i.type === 'stage' && (
                  <div className="tl-mini">
                    <span className="tl-mini-ico" aria-hidden="true">➜</span>
                    <strong>{i.a.subject}</strong>
                    {i.a.body && <span className="faint"> · {i.a.body.replace(/^From /, 'from ')}</span>}
                    <span className="tl-when" title={whenLong(i.at)}>{relative(i.at)}</span>
                  </div>
                )}
                {i.type === 'task' && (
                  <div className="tl-mini">
                    <span className="tl-mini-ico done" aria-hidden="true">✓</span>
                    <span>Task done: <strong>{i.t.task}</strong></span>
                    <span className="tl-when" title={whenLong(i.at)}>{relative(i.at)}</span>
                  </div>
                )}
                {i.m && (
                  <div className="tl-mini">
                    <span className="tl-mini-ico" aria-hidden="true">🎙️</span>
                    <span>Meeting transcript: <strong>{i.m.title}</strong></span>
                    <span className="tl-when">{relative(i.at)}</span>
                  </div>
                )}
                {i.d && (
                  <div className="tl-mini">
                    <span className="tl-mini-ico" aria-hidden="true">📎</span>
                    <span>Document added: <strong>{i.d.original_name}</strong></span>
                    <span className="tl-when">{relative(i.at)}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
