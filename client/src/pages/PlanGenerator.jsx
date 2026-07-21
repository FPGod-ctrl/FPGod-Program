import { useEffect, useRef, useState } from 'react';
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
import { loadTemplate } from '../lib/template.js';

const STATUSES = ['draft', 'in_review', 'final', 'delivered'];

/** One selectable target per client file (couples show both names). */
function buildTargets(clients) {
  return clients.map((c) => {
    const coupleName = (c.partner_first_name || c.partner_last_name)
      ? `${c.first_name} ${c.last_name} & ${[c.partner_first_name, c.partner_last_name].filter(Boolean).join(' ')}`
      : null;
    return {
      value: c.id,
      label: coupleName || `${c.first_name} ${c.last_name}`,
      household: coupleName, // used for the default plan title
      groupId: null,
      memberIds: [c.id],
    };
  });
}

export default function PlanGenerator() {
  const [plans, setPlans] = useState(null);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [showGen, setShowGen] = useState(false);
  const [targetVal, setTargetVal] = useState('');   // selected client/household filter
  const [exporting, setExporting] = useState(false);
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

  // Download the selected plan as a branded Word document (uses saved style).
  const downloadWord = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const blob = await api.postForBlob(`/plans/${selected.id}/export/docx`, loadTemplate());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(selected.title || 'financial-plan').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Word document downloaded', 'success');
    } catch (err) { toast(`Word export failed: ${err.message}`, 'error'); }
    finally { setExporting(false); }
  };

  // Filter the plan list to the selected client / household.
  const targets = buildTargets(clients);
  const selectedTarget = targets.find((t) => t.value === targetVal);
  const visiblePlans = (plans || []).filter((p) => {
    if (!selectedTarget) return true;
    return selectedTarget.groupId
      ? (p.group_id === selectedTarget.groupId || selectedTarget.memberIds.includes(p.client_id))
      : p.client_id === selectedTarget.value;
  });

  return (
    <>
      <PageHeader title="Financial Plan Generator"
        sub="Select a client, generate, then discuss &amp; refine before exporting to Word"
        actions={<button className="btn primary" onClick={() => setShowGen(true)}>✨ Generate Plan</button>} />
      <div className="content">
        {/* Setup: choose the client/household + master template */}
        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="card-head"><h3>Client / Household</h3>
              <button className="btn sm primary" onClick={() => setShowGen(true)}>✨ Generate</button></div>
            <div className="card-pad">
              <Select label="Show plans for" placeholder="— All clients —"
                options={targets.map((t) => ({ value: t.value, label: t.label }))}
                value={targetVal} onChange={(e) => setTargetVal(e.target.value)} />
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                {selectedTarget ? `${visiblePlans.length} plan(s) for this ${selectedTarget.household ? 'household' : 'client'}` : `${visiblePlans.length} plan(s) total`}
              </div>
            </div>
          </div>
          <MasterTemplateCard />
        </div>

        <div className="split split-chat">
          <div className="stack">
            {/* Plan list */}
            <div className="card">
              <div className="card-head"><h3>Plans</h3><span className="muted">{visiblePlans.length}</span></div>
              {plans == null ? <Loading /> : visiblePlans.length === 0 ? (
                <Empty icon="📝" title="No plans yet">Generate a plan for this client.</Empty>
              ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {visiblePlans.map((p) => (
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
                        <button className="btn sm primary" onClick={downloadWord} disabled={exporting}>{exporting ? 'Preparing…' : '⬇️ Download Word'}</button>
                        <button className="btn sm accent" onClick={() => window.open(`/present/${selected.id}`, '_blank')}>Present / Style</button>
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

          {/* Chat — discuss & refine the document before exporting */}
          <div style={{ position: 'sticky', top: 78, height: 'calc(100vh - 104px)' }}>
            <ChatPanel targetType="plan" targetId={selected?.id} onUpdate={onChatUpdate} />
          </div>
        </div>
      </div>

      {showGen && (
        <GenerateModal clients={clients} onClose={() => setShowGen(false)}
          onGenerated={(plan) => { setShowGen(false); setTargetVal(''); loadPlans(plan.id); toast(plan.ai ? 'Plan generated' : 'Generated (AI off — stub)', 'success'); }} />
      )}
    </>
  );
}

function MasterTemplateCard() {
  const [tpl, setTpl] = useState(undefined); // undefined = loading, null = none, object = set
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();

  const load = () => api.get('/training-data/template').then(setTpl).catch(() => setTpl(null));
  useEffect(() => { load(); }, []);

  const upload = async (files) => {
    const file = files?.[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const row = await api.upload('/training-data/template/upload', fd);
      setTpl(row);
      toast(`Master template set: ${row.title}`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const clear = async () => {
    if (!window.confirm('Clear the master template? Generation will fall back to your historical plans only.')) return;
    try { await api.del('/training-data/template'); setTpl(null); toast('Master template cleared', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="card">
      <div className="card-head"><h3>⭐ Master Plan Template</h3>
        {tpl && <button className="btn sm ghost" onClick={clear}>Clear</button>}
      </div>
      <div className="card-pad">
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Upload the one plan you want every generated plan to look like. The AI mirrors its structure &amp; style
          and draws strategies from it.
        </p>
        {tpl === undefined ? <span className="muted">Loading…</span> : tpl ? (
          <div className="row between" style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8 }}>
            <div>
              <div className="t-strong">{tpl.title}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {tpl.chars ? `${Number(tpl.chars).toLocaleString()} chars · ` : ''}active template
              </div>
            </div>
            <button className="btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Replace'}</button>
          </div>
        ) : (
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : '⬆ Upload master template'}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
}

function GenerateModal({ clients, onClose, onGenerated }) {
  // One entry per client file (couples show both names).
  const targets = buildTargets(clients);

  const [targetVal, setTargetVal] = useState(targets[0]?.value || '');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const selected = targets.find((t) => t.value === targetVal);

  const generate = async () => {
    if (!targetVal) { toast('Select a client', 'error'); return; }
    setBusy(true);
    try {
      const finalTitle = title || (selected?.household ? `Financial Plan — ${selected.household}` : undefined);
      const plan = await api.post('/plans/generate', { clientId: targetVal, title: finalTitle, instructions });
      onGenerated(plan);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal title="Generate Financial Plan" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={generate} disabled={busy}>{busy ? 'Generating…' : '✨ Generate'}</button>
      </>}>
      <p className="muted" style={{ marginTop: 0 }}>
        Choose the client or household. The AI builds a full plan from that file — profile, assets, debts, income,
        expenses, insurance, goals, estate and uploaded documents — writing it <strong>section by section</strong> to
        match your master template's depth. This takes a few minutes; keep this window open.
      </p>
      <Select label="Client / Household *" placeholder="— Select —"
        options={targets.map((t) => ({ value: t.value, label: t.label }))}
        value={targetVal} onChange={(e) => setTargetVal(e.target.value)} />
      <TextInput label="Title (optional)" placeholder="Auto-generated if blank" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Extra instructions (optional)" placeholder="e.g. Emphasise SMSF and retirement at 60."
        value={instructions} onChange={(e) => setInstructions(e.target.value)} />
    </Modal>
  );
}
