import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../ui/Toast.jsx';
import { KIND_META, counterparties, toLocalInput } from '../../lib/crm.js';

const KINDS = ['call', 'email', 'meeting', 'sms', 'letter', 'note'];

// Direction wording per kind: a call is outgoing/incoming, a letter sent/received.
const DIRECTION_LABELS = {
  call: ['Outgoing', 'Incoming'],
  email: ['Sent', 'Received'],
  sms: ['Sent', 'Received'],
  letter: ['Sent', 'Received'],
};

const COPY = {
  call: { subject: 'What was it about?', body: 'What was said, and what happens next' },
  email: { subject: 'Subject line', body: 'A summary, or paste the part that matters' },
  meeting: { subject: 'Purpose — e.g. Present SOA', body: 'Meeting notes' },
  sms: { subject: null, body: 'The message' },
  letter: { subject: 'What was sent — e.g. Servicing rights letter', body: 'Notes' },
  note: { subject: 'Title (optional)', body: 'File note' },
};

const blank = (kind = 'call') => ({
  kind,
  direction: 'outbound',
  outcome: '',
  subject: '',
  body: '',
  with_whom: '',
  duration_min: '',
  occurred_at: toLocalInput(),
});

/**
 * Log contact with a client — or edit a logged entry when `editing` is set.
 * Nothing here sends anything: it records what already happened (or a meeting
 * that is booked), by hand.
 */
export default function ActivityComposer({ contactId, meta, editing, onSaved, onCancelEdit }) {
  const [f, setF] = useState(blank());
  const [followUp, setFollowUp] = useState(false);
  const [fu, setFu] = useState({ task: '', due: '', priority: 'Medium' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (editing) {
      setF({
        kind: editing.kind,
        direction: editing.direction || 'outbound',
        outcome: editing.outcome || '',
        subject: editing.subject || '',
        body: editing.body || '',
        with_whom: editing.with_whom || '',
        duration_min: editing.duration_min ?? '',
        occurred_at: toLocalInput(editing.occurred_at),
      });
      setFollowUp(false);
    }
  }, [editing]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickKind = (kind) => setF({ ...blank(kind), subject: f.subject, body: f.body, occurred_at: f.occurred_at });
  const copy = COPY[f.kind];
  const dirs = DIRECTION_LABELS[f.kind];
  const outcomes = meta?.callOutcomes || ['Spoke', 'Left voicemail', 'No answer'];
  const hasContent = f.subject.trim() || f.body.trim() || f.outcome;

  const reset = () => {
    setF(blank(f.kind));
    setFollowUp(false);
    setFu({ task: '', due: '', priority: 'Medium' });
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!hasContent) { toast('Add a subject, some notes or an outcome', 'error'); return; }
    if (followUp && !fu.task.trim()) { toast('Say what the follow-up task is', 'error'); return; }
    setSaving(true);
    const payload = {
      kind: f.kind,
      direction: dirs ? f.direction : null,
      outcome: f.kind === 'call' ? f.outcome : '',
      subject: copy.subject ? f.subject : '',
      body: f.body,
      with_whom: f.with_whom,
      duration_min: f.duration_min === '' ? null : Number(f.duration_min),
      // A cleared date/time field means "now" rather than an error.
      occurred_at: Number.isNaN(new Date(f.occurred_at).getTime())
        ? new Date().toISOString()
        : new Date(f.occurred_at).toISOString(),
    };
    try {
      if (editing) {
        await api.patch(`/crm/activities/${editing.id}`, payload);
        toast('Entry updated', 'success');
        onCancelEdit?.();
      } else {
        const res = await api.post(`/crm/contacts/${contactId}/activities`, {
          ...payload,
          ...(followUp ? { followUp: fu } : {}),
        });
        toast(res.task ? `${KIND_META[f.kind].label} logged, follow-up task added` : `${KIND_META[f.kind].label} logged`, 'success');
        reset();
      }
      onSaved?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isFuture = new Date(f.occurred_at).getTime() > Date.now() + 60000;

  return (
    <form
      className={`composer ${editing ? 'is-editing' : ''}`}
      onSubmit={submit}
      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }}
    >
      <div className="composer-kinds" role="tablist" aria-label="What to log">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={f.kind === k}
            className={`ck ${f.kind === k ? 'on' : ''}`}
            onClick={() => pickKind(k)}
          >
            <span aria-hidden="true">{KIND_META[k].icon}</span> {KIND_META[k].label}
          </button>
        ))}
      </div>

      <div className="composer-body">
        {(dirs || f.kind === 'call') && (
          <div className="composer-line">
            {dirs && (
              <div className="seg" role="group" aria-label="Direction">
                {['outbound', 'inbound'].map((d, i) => (
                  <button key={d} type="button" className={f.direction === d ? 'on' : ''}
                    onClick={() => setF({ ...f, direction: d })}>
                    {dirs[i]}
                  </button>
                ))}
              </div>
            )}
            {f.kind === 'call' && (
              <div className="chips" role="group" aria-label="Outcome">
                {outcomes.map((o) => (
                  <button key={o} type="button" className={`chip ${f.outcome === o ? 'on' : ''}`}
                    onClick={() => setF({ ...f, outcome: f.outcome === o ? '' : o })}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {copy.subject && (
          <input placeholder={copy.subject} value={f.subject} onChange={set('subject')} maxLength={300} />
        )}
        <textarea placeholder={copy.body} value={f.body} onChange={set('body')} rows={3} />

        <div className="composer-meta">
          <label>
            <span>When</span>
            <input type="datetime-local" value={f.occurred_at} onChange={set('occurred_at')} />
          </label>
          {(f.kind === 'call' || f.kind === 'meeting') && (
            <label className="narrow">
              <span>Minutes</span>
              <input type="number" min="0" max="1440" value={f.duration_min} onChange={set('duration_min')} />
            </label>
          )}
          {f.kind !== 'note' && (
            <label className="grow">
              <span>With, if not the client</span>
              <input list="crm-counterparties" placeholder="e.g. TAL underwriting, Howard Cortes"
                value={f.with_whom} onChange={set('with_whom')} />
              <datalist id="crm-counterparties">
                {counterparties(meta).map((x) => <option key={x} value={x} />)}
              </datalist>
            </label>
          )}
        </div>
        {isFuture && <div className="faint small">This is in the future, so it shows as upcoming.</div>}

        {!editing && (
          <div className="followup">
            <label className="fu-toggle">
              <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
              Add a follow-up task
            </label>
            {followUp && (
              <div className="fu-fields">
                <input autoFocus placeholder="e.g. Call back re signed fact find" value={fu.task}
                  onChange={(e) => setFu({ ...fu, task: e.target.value })} />
                <input type="date" value={fu.due} title="Blank means tomorrow"
                  onChange={(e) => setFu({ ...fu, due: e.target.value })} />
                <select value={fu.priority} onChange={(e) => setFu({ ...fu, priority: e.target.value })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div className="composer-actions">
          <span className="faint small">Ctrl + Enter to save</span>
          <div className="row" style={{ gap: 8 }}>
            {editing && <button type="button" className="btn sm" onClick={onCancelEdit}>Cancel</button>}
            <button type="submit" className="btn primary sm" disabled={saving || !hasContent}>
              {saving ? 'Saving…' : editing ? 'Save changes' : `Log ${KIND_META[f.kind].label.toLowerCase()}`}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
