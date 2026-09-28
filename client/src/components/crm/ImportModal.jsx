import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../ui/Modal.jsx';
import { Loading } from '../ui/Loading.jsx';
import { useToast } from '../ui/Toast.jsx';

/**
 * Turn the names already in the Task Tracker into CRM contacts, and link their
 * tasks. Households are pre-ticked; firms, insurers and first-name-only entries
 * are listed but left for the adviser to decide.
 */
export default function ImportModal({ meta, onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/crm/import/tasks')
      .then(({ candidates }) =>
        setRows(candidates.map((c) => ({
          ...c,
          ...c.suggestion,
          crm_stage: '',
          status: 'prospect',
          selected: Boolean(c.match) || c.likely,
          useMatch: Boolean(c.match),
        }))))
      .catch((err) => setError(err.message));
  }, []);

  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const chosen = useMemo(() => (rows || []).filter((r) => r.selected), [rows]);
  const missingName = chosen.filter((r) => !r.useMatch && !r.first_name.trim());

  const submit = async () => {
    if (!chosen.length || missingName.length) return;
    setSaving(true);
    try {
      const res = await api.post('/crm/import/tasks', {
        rows: chosen.map((r) => (r.useMatch
          ? { whos: r.whos, matchId: r.match.id }
          : {
            whos: r.whos,
            first_name: r.first_name,
            last_name: r.last_name,
            partner_first_name: r.partner_first_name,
            partner_last_name: r.partner_last_name,
            referral_source: r.referral_source,
            notes: r.notes,
            crm_stage: r.crm_stage || null,
            status: r.status,
          })),
      });
      toast(`${res.created} added, ${res.linked} linked, ${res.tasksLinked} tasks attached`, 'success');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (on) => setRows((rs) => rs.map((r) => ({ ...r, selected: on })));

  return (
    <Modal
      title="Import contacts from the Task Tracker"
      wide
      onClose={onClose}
      footer={<>
        {missingName.length > 0 && (
          <span className="faint small" style={{ marginRight: 'auto' }}>
            {missingName.length} ticked {missingName.length === 1 ? 'row needs' : 'rows need'} a first name
          </span>
        )}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}
          disabled={saving || !chosen.length || missingName.length > 0}>
          {saving ? 'Importing…' : `Import ${chosen.length} ${chosen.length === 1 ? 'contact' : 'contacts'}`}
        </button>
      </>}
    >
      {error && <div className="alert red">{error}</div>}
      {!rows && !error && <Loading label="Reading the Task Tracker…" />}
      {rows && !rows.length && (
        <div className="empty">
          <p>Every client in the Task Tracker is already linked to a contact.</p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Each row is a name from your task list, with spelling variants of the same household
            merged. Check the names, pick a stage if you know it, and untick anything that is not a
            client. Their tasks are attached to the new contact.
          </p>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <button className="btn sm ghost" onClick={() => toggleAll(true)}>Tick all</button>
            <button className="btn sm ghost" onClick={() => toggleAll(false)}>Untick all</button>
          </div>
          <div className="imp-list">
            {rows.map((r) => (
              <div key={r.key} className={`imp-row ${r.selected ? '' : 'off'}`}>
                <input
                  type="checkbox"
                  className="imp-check"
                  checked={r.selected}
                  onChange={(e) => update(r.key, { selected: e.target.checked })}
                  aria-label={`Import ${r.whos.join(', ')}`}
                />
                <div className="imp-body">
                  <div className="imp-src">
                    {r.whos.map((w) => <span key={w} className="imp-who">{w}</span>)}
                    <span className="faint small">
                      {r.openCount} open · {r.taskCount} {r.taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  {r.match && (
                    <label className="imp-match">
                      <input
                        type="checkbox"
                        checked={r.useMatch}
                        onChange={(e) => update(r.key, { useMatch: e.target.checked })}
                      />
                      Link to existing contact <strong>{r.match.display_name}</strong>
                    </label>
                  )}
                  {!r.useMatch && (
                    <div className="imp-fields">
                      <input placeholder="First name" value={r.first_name}
                        onChange={(e) => update(r.key, { first_name: e.target.value })} />
                      <input placeholder="Last name" value={r.last_name}
                        onChange={(e) => update(r.key, { last_name: e.target.value })} />
                      <input placeholder="Partner first" value={r.partner_first_name}
                        onChange={(e) => update(r.key, { partner_first_name: e.target.value })} />
                      <input placeholder="Partner last" value={r.partner_last_name}
                        onChange={(e) => update(r.key, { partner_last_name: e.target.value })} />
                      <select value={r.crm_stage} onChange={(e) => update(r.key, { crm_stage: e.target.value })}>
                        <option value="">Stage — not set</option>
                        {(meta?.stages || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <select value={r.status} onChange={(e) => update(r.key, { status: e.target.value })}>
                        <option value="prospect">Prospect</option>
                        <option value="active">Client</option>
                      </select>
                    </div>
                  )}
                  {r.tasks.length > 0 && (
                    <ul className="imp-tasks">
                      {r.tasks.map((t) => (
                        <li key={t.id} className={t.status === 'Done' || t.status === 'Cancelled' ? 'done' : ''}>
                          {t.task}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
