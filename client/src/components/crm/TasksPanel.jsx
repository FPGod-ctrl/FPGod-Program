import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useToast } from '../ui/Toast.jsx';
import DueCell from '../TaskDueCell.jsx';
import { parseNotes, prettyDate, TASK_STATUSES, isOpenTask } from '../../lib/taskNotes.js';

/**
 * A contact's tasks. These are Task Tracker tasks, linked to the contact — the
 * same records, so ticking one off here ticks it off there too.
 */
export default function TasksPanel({ contact, tasks, suggested, onChange }) {
  const [draft, setDraft] = useState({ task: '', due: '', priority: 'Medium' });
  const [busy, setBusy] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [noting, setNoting] = useState('');
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState('');
  // Edits shown at once, ahead of the reload that confirms them — as the tracker does.
  const [pending, setPending] = useState({});
  const toast = useToast();

  const shown = tasks.map((t) => (pending[t.id] ? { ...t, ...pending[t.id] } : t));
  const open = shown.filter(isOpenTask);
  const done = shown.filter((t) => !isOpenTask(t));

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); await onChange(); } catch (err) { toast(err.message, 'error'); } finally { setBusy(''); }
  };

  const add = (e) => {
    e.preventDefault();
    if (!draft.task.trim()) return;
    run('new', async () => {
      await api.post('/tasks', {
        ...draft, who: contact.display_name, type: 'Client', clientId: contact.id,
      });
      setDraft({ task: '', due: '', priority: 'Medium' });
    });
  };

  const patch = async (id, body) => {
    setPending((p) => ({ ...p, [id]: { ...p[id], ...body } }));
    await run(id, () => api.patch(`/tasks/${id}`, body));
    setPending((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const addNote = (id) => {
    if (!note.trim()) return;
    run(id, async () => {
      await api.patch(`/tasks/${id}`, { addNote: note.trim() });
      setNote('');
      setNoting('');
    });
  };

  const row = (t) => {
    const entries = parseNotes(t.notes);
    const isExpanded = expanded === t.id;
    return (
      <li key={t.id} className={`ct-row ${isOpenTask(t) ? '' : 'is-done'}`}>
        <input
          type="checkbox"
          className="ct-check"
          checked={!isOpenTask(t)}
          disabled={busy === t.id || t.archived}
          onChange={(e) => patch(t.id, { status: e.target.checked ? 'Done' : 'Open' })}
          aria-label={`Mark "${t.task}" ${isOpenTask(t) ? 'done' : 'open'}`}
        />
        <div className="ct-main">
          <div className="ct-name">
            <span className={`ct-pri p-${(t.priority || '').toLowerCase()}`} title={`${t.priority || 'No'} priority`} />
            {t.task}
          </div>
          <div className="ct-meta">
            {isOpenTask(t) ? (
              <>
                <DueCell task={t} disabled={busy === t.id} onChange={(due) => patch(t.id, { due })} />
                <select
                  className="ct-status"
                  value={t.status}
                  disabled={busy === t.id}
                  onChange={(e) => patch(t.id, { status: e.target.value })}
                >
                  {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </>
            ) : (
              <span className="faint small">{t.status} {t.completedAt && `· ${prettyDate(t.completedAt.slice(0, 10))}`}</span>
            )}
            {entries.length > 0 && (
              <button className="link-btn" onClick={() => setExpanded(isExpanded ? '' : t.id)}>
                {entries.length} {entries.length === 1 ? 'note' : 'notes'}
              </button>
            )}
            {isOpenTask(t) && noting !== t.id && (
              <button className="link-btn" onClick={() => { setNoting(t.id); setNote(''); }}>+ Note</button>
            )}
          </div>
          {isExpanded && (
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
          {noting === t.id && (
            <div className="note-add">
              <input
                className="input"
                autoFocus
                placeholder="Tried calling, left voicemail…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNote(t.id);
                  if (e.key === 'Escape') setNoting('');
                }}
              />
              <button className="btn small" disabled={busy === t.id} onClick={() => addNote(t.id)}>Add</button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="card crm-tasks">
      <div className="card-head">
        <h3>Tasks</h3>
        <Link to="/tasks" className="faint small">Task Tracker →</Link>
      </div>
      <form className="ct-add" onSubmit={add}>
        <input
          placeholder="Add a task for this client"
          value={draft.task}
          onChange={(e) => setDraft({ ...draft, task: e.target.value })}
        />
        {draft.task && (
          <div className="ct-add-row">
            <input type="date" value={draft.due} title="Blank means tomorrow"
              onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
            <button className="btn primary sm" disabled={busy === 'new'}>{busy === 'new' ? 'Adding…' : 'Add'}</button>
          </div>
        )}
      </form>

      {!open.length && <div className="ct-empty faint small">No open tasks.</div>}
      <ul className="ct-list">{open.map(row)}</ul>

      {done.length > 0 && (
        <>
          <button className="ct-toggle" onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Hide' : 'Show'} {done.length} completed
          </button>
          {showDone && <ul className="ct-list">{done.map(row)}</ul>}
        </>
      )}

      {suggested.length > 0 && (
        <div className="ct-suggest">
          <div className="ct-suggest-head">In the Task Tracker under a similar name</div>
          <ul>
            {suggested.map((t) => (
              <li key={t.id}>
                <div>
                  <div className="ct-name">{t.task}</div>
                  <div className="faint small">{t.who} · {t.status}</div>
                </div>
                <button
                  className="btn sm"
                  disabled={busy === t.id || t.archived}
                  title={t.archived ? 'Archived tasks cannot be changed' : 'Attach to this contact'}
                  onClick={() => patch(t.id, { clientId: contact.id })}
                >
                  Link
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
