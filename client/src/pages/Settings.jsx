import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { date } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { Select, TextInput, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import BulkImportTraining from '../components/BulkImportTraining.jsx';
import { THEMES, ACCENT_PRESETS, loadTemplate, saveTemplate } from '../lib/template.js';

export default function Settings() {
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [training, setTraining] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();

  const load = () => {
    api.get('/meta').then(setMeta).catch(() => setMeta(false));
    api.get('/training-data/stats').then(setStats).catch(() => setStats(null));
    api.get('/training-data?limit=100').then(setTraining).catch(() => setTraining([]));
  };
  useEffect(load, []);

  const remove = async (row) => {
    if (!window.confirm('Delete this training example?')) return;
    try { await api.del(`/training-data/${row.id}`); load(); toast('Deleted', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Settings" sub="Configuration & AI training data" />
      <div className="content stack">
        <div className="card">
          <div className="card-head"><h3>Service Configuration</h3></div>
          <div className="card-pad">
            {meta == null ? <Loading /> : meta === false ? <Empty icon="🚫" title="API unreachable" /> : (
              <dl className="kv">
                <dt>API version</dt><dd>{meta.version}</dd>
                <dt>AI generation</dt><dd>{meta.aiEnabled ? <Badge tone="green">Enabled</Badge> : <Badge tone="amber">Stub mode</Badge>}</dd>
                <dt>Model</dt><dd>{meta.model}</dd>
                <dt>Storage driver</dt><dd><Badge tone="blue">{meta.storageDriver}</Badge></dd>
                <dt>Max upload</dt><dd>{meta.maxUploadMb} MB</dd>
              </dl>
            )}
            {meta && !meta.aiEnabled && (
              <div className="md" style={{ marginTop: 14 }}>
                <blockquote>
                  AI is running in <strong>stub mode</strong>. Set <code>OPENAI_API_KEY</code> in
                  <code> server/.env</code> and restart the API to enable live plan/email generation and chat.
                </blockquote>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-3">
          <div className="stat blue"><div className="stat-label">Training Plans</div>
            <div className="stat-value">{stats?.plan ?? '—'}</div></div>
          <div className="stat purple"><div className="stat-label">Training Emails</div>
            <div className="stat-value">{stats?.email ?? '—'}</div></div>
          <div className="stat accent"><div className="stat-label">Total Examples</div>
            <div className="stat-value">{stats?.total ?? '—'}</div></div>
        </div>

        <PlanTemplateSettings />

        <BulkImportTraining onDone={load} />

        <div className="card">
          <div className="card-head"><h3>Training Data</h3>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}>+ Add Example</button></div>
          {training == null ? <Loading /> : (
            <DataTable
              columns={[
                { key: 'kind', header: 'Kind', render: (r) => <Badge tone={r.kind === 'plan' ? 'blue' : 'purple'}>{r.kind}</Badge> },
                { key: 'title', header: 'Title', render: (r) => <span className="t-strong">{r.title || '(untitled)'}</span> },
                { key: 'created_at', header: 'Added', render: (r) => date(r.created_at) },
                { key: 'actions', header: '', render: (r) => (
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>
                  </div>
                ) },
              ]}
              rows={training}
              empty={<Empty icon="📚" title="No training data">Add historical plans & emails for the AI to learn from.</Empty>} />
          )}
        </div>
      </div>

      {showAdd && (
        <TrainingForm onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); toast('Training example added', 'success'); }} />
      )}
    </>
  );
}

function TrainingForm({ onClose, onSaved }) {
  const [f, setF] = useState({ kind: 'plan', title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.content.trim()) { toast('Content is required', 'error'); return; }
    setSaving(true);
    try { await api.post('/training-data', f); onSaved(); }
    catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Training Example" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
      </>}>
      <div className="form-grid">
        <Select label="Kind" options={[{ value: 'plan', label: 'Plan' }, { value: 'email', label: 'Email' }]}
          value={f.kind} onChange={set('kind')} />
        <TextInput label="Title" value={f.title} onChange={set('title')} />
      </div>
      <TextArea label="Content *" placeholder="Paste a historical plan or email…" value={f.content}
        onChange={set('content')} style={{ minHeight: 240 }} />
    </Modal>
  );
}

function PlanTemplateSettings() {
  const [tpl, setTpl] = useState(loadTemplate());
  const toast = useToast();
  const set = (patch) => setTpl((t) => ({ ...t, ...patch }));
  const save = () => { saveTemplate(tpl); toast('Template style saved', 'success'); };

  return (
    <div className="card">
      <div className="card-head"><h3>Plan Template Style</h3>
        <button className="btn sm primary" onClick={save}>Save Style</button></div>
      <div className="card-pad">
        <p className="muted" style={{ marginTop: 0 }}>
          Controls how finished plans look to clients (on screen, PDF, and Word) — independent of the
          old plans' formatting. Choose a style and your branding, then use “Present / Export” on any plan.
        </p>
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="field">
              <label>Style</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {THEMES.map((t) => (
                  <button key={t.id} className={`btn sm ${tpl.theme === t.id ? 'primary' : ''}`}
                    onClick={() => set({ theme: t.id })} title={t.blurb}>{t.name}</button>
                ))}
              </div>
              <span className="hint">{THEMES.find((t) => t.id === tpl.theme)?.blurb}</span>
            </div>
            <div className="field">
              <label>Accent colour</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {ACCENT_PRESETS.map((c) => (
                  <button key={c} onClick={() => set({ accent: c })} title={c}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: tpl.accent === c ? '2px solid var(--text)' : '2px solid #fff', boxShadow: '0 0 0 1px var(--border)' }} />
                ))}
                <input type="color" value={tpl.accent} onChange={(e) => set({ accent: e.target.value })}
                  style={{ width: 40, height: 30, padding: 2 }} />
              </div>
            </div>
            <TextInput label="Firm name" value={tpl.firmName} onChange={(e) => set({ firmName: e.target.value })} />
            <TextInput label="Tagline" value={tpl.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </div>

          <div>
            <label className="hint" style={{ display: 'block', marginBottom: 6 }}>Live preview</label>
            <div className={`template-preview theme-${tpl.theme}`} style={{ '--accent': tpl.accent }}>
              <div className="tp-cover">
                {tpl.firmName && <div className="tp-firm">{tpl.firmName}</div>}
                {tpl.tagline && <div className="hint" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tpl.tagline}</div>}
                <div className="tp-title">Financial Plan</div>
                <div className="hint">Prepared for Jane Client</div>
              </div>
              <div className="tp-h">Executive Summary</div>
              <div className="tp-line" /><div className="tp-line" /><div className="tp-line short" />
              <div className="tp-h">Recommendations</div>
              <div className="tp-line" /><div className="tp-line short" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
