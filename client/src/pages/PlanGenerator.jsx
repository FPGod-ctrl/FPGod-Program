import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { dateTime } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import MarkdownView from '../components/ui/MarkdownView.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { Select, TextArea, TextInput } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const STATUSES = ['draft', 'in_review', 'final', 'delivered'];

export default function PlanGenerator() {
  const [plans, setPlans] = useState(null);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [showGen, setShowGen] = useState(false);
  const toast = useToast();

  const loadPlans = (selectId) => api.get('/plans').then((rows) => {
    setPlans(rows);
    if (selectId) {
      const found = rows.find((p) => p.id === selectId);
      if (found) selectPlan(found.id);
    } else if (!selected && rows[0]) {
      selectPlan(rows[0].id);
    }
  }).catch(() => setPlans([]));

  useEffect(() => {
    loadPlans();
    api.get('/clients').then(setClients).catch(() => setClients([]));
  }, []);

  const selectPlan = async (id) => {
    setEditing(false);
    const p = await api.get(`/plans/${id}`);
    setSelected(p);
    setDraftContent(p.content || '');
  };

  const saveContent = async () => {
    try {
      const updated = await api.put(`/plans/${selected.id}`, { content: draftContent });
      setSelected(updated); setEditing(false); toast('Plan saved', 'success'); loadPlans();
    } catch (err) { toast(err.message, 'error'); }
  };

  const setStatus = async (status) => {
    try { const u = await api.put(`/plans/${selected.id}`, { status }); setSelected(u); loadPlans(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const regenerate = async () => {
    if (!window.confirm('Regenerate this plan from the client data? Current content will be replaced.')) return;
    toast('Regenerating…');
    try {
      const u = await api.post(`/plans/${selected.id}/regenerate`, {});
      setSelected(u); setDraftContent(u.content || '');
      toast(u.ai ? 'Plan regenerated' : 'Regenerated (AI off — stub)', 'success'); loadPlans();
    } catch (err) { toast(err.message, 'error'); }
  };

  const onChatUpdate = (content) => {
    setSelected((p) => ({ ...p, content }));
    setDraftContent(content);
    loadPlans();
  };

  return (
    <>
      <PageHeader title="Financial Plan Generator"
        sub="Generate ~95% complete plans, then refine in the editor or with AI chat"
        actions={<button className="btn primary" onClick={() => setShowGen(true)}>✨ Generate Plan</button>} />
      <div className="content">
        <div className="split">
          <div className="stack">
            {/* Plan list */}
            <div className="card">
              <div className="card-head"><h3>Plans</h3><span className="muted">{plans?.length || 0}</span></div>
              {plans == null ? <Loading /> : plans.length === 0 ? (
                <Empty icon="📝" title="No plans yet">Generate your first plan.</Empty>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {plans.map((p) => (
                    <div key={p.id} className="row between" onClick={() => selectPlan(p.id)}
                      style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        background: selected?.id === p.id ? 'var(--primary-soft)' : 'transparent' }}>
                      <div><div className="t-strong">{p.title}</div>
                        <div className="faint" style={{ fontSize: 12 }}>Updated {dateTime(p.updated_at)}</div></div>
                      <Badge value={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor / viewer */}
            {selected && (
              <div className="card">
                <div className="card-head">
                  <div className="row" style={{ gap: 10 }}>
                    <h3 style={{ margin: 0 }}>{selected.title}</h3>
                    {selected.generated_by_ai && <Badge tone="teal">AI · {selected.completeness}%</Badge>}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <select value={selected.status} onChange={(e) => setStatus(e.target.value)}
                      style={{ width: 'auto', padding: '6px 10px' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    {editing ? (
                      <>
                        <button className="btn sm" onClick={() => { setEditing(false); setDraftContent(selected.content || ''); }}>Cancel</button>
                        <button className="btn sm primary" onClick={saveContent}>Save</button>
                      </>
                    ) : (
                      <>
                        <button className="btn sm accent" onClick={() => window.open(`/present/${selected.id}`, '_blank')}>Present / Export</button>
                        <button className="btn sm ghost" onClick={regenerate}>Regenerate</button>
                        <button className="btn sm" onClick={() => setEditing(true)}>Edit</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="card-pad">
                  {editing ? (
                    <textarea value={draftContent} onChange={(e) => setDraftContent(e.target.value)}
                      style={{ minHeight: 460, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
                  ) : (
                    <MarkdownView>{selected.content}</MarkdownView>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div style={{ position: 'sticky', top: 78 }}>
            <ChatPanel targetType="plan" targetId={selected?.id} onUpdate={onChatUpdate} />
          </div>
        </div>
      </div>

      {showGen && (
        <GenerateModal clients={clients} onClose={() => setShowGen(false)}
          onGenerated={(plan) => { setShowGen(false); loadPlans(plan.id); toast(plan.ai ? 'Plan generated' : 'Generated (AI off — stub)', 'success'); }} />
      )}
    </>
  );
}

function GenerateModal({ clients, onClose, onGenerated }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const go = async () => {
    if (!clientId) { toast('Select a client', 'error'); return; }
    setBusy(true);
    try {
      const plan = await api.post('/plans/generate', { clientId, title: title || undefined, instructions });
      onGenerated(plan);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal title="Generate Financial Plan" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={go} disabled={busy}>{busy ? 'Generating…' : '✨ Generate'}</button>
      </>}>
      <p className="muted" style={{ marginTop: 0 }}>
        The AI builds a plan from the client's profile and holdings, using your historical plans as strategy references.
      </p>
      <Select label="Client *" placeholder="— Select —"
        options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
        value={clientId} onChange={(e) => setClientId(e.target.value)} />
      <TextInput label="Title (optional)" placeholder="Auto-generated if blank" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Extra instructions (optional)" placeholder="e.g. Emphasise tax efficiency and early retirement at 55."
        value={instructions} onChange={(e) => setInstructions(e.target.value)} />
    </Modal>
  );
}
