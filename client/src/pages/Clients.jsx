import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, initials } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { TextInput, Select, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];
const STATUS = ['prospect', 'active', 'inactive', 'archived'];
const GROUP_TYPES = ['couple', 'family', 'household', 'other'];

export default function Clients() {
  const [tab, setTab] = useState('clients');
  const [clients, setClients] = useState(null);
  const [groups, setGroups] = useState(null);
  const [showClient, setShowClient] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importInitial, setImportInitial] = useState(null);   // parsed client fields to prefill
  const [pendingInv, setPendingInv] = useState([]);           // parsed holdings to add after save
  const nav = useNavigate();
  const toast = useToast();

  const load = () => {
    api.get('/clients').then(setClients).catch(() => setClients([]));
    api.get('/client-groups').then(setGroups).catch(() => setGroups([]));
  };
  useEffect(load, []);

  const clientCols = [
    {
      key: 'name', header: 'Client',
      render: (r) => (
        <div className="row">
          <div className="avatar">{initials(r.first_name, r.last_name)}</div>
          <div>
            <div className="t-strong">{r.first_name} {r.last_name}</div>
            <div className="faint" style={{ fontSize: 12 }}>{r.email || 'No email'}</div>
          </div>
        </div>
      ),
    },
    { key: 'group_name', header: 'Household', render: (r) => r.group_name || <span className="faint">—</span> },
    { key: 'risk', header: 'Risk', render: (r) => (r.risk_profile ? <Badge value={r.risk_profile} /> : '—') },
    { key: 'holdings_count', header: 'Holdings', num: true, render: (r) => r.holdings_count || 0 },
    { key: 'total_balance', header: 'Portfolio', num: true, render: (r) => currency(r.total_balance) },
    { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
  ];

  const groupCols = [
    { key: 'name', header: 'Household', render: (r) => <span className="t-strong">{r.name}</span> },
    { key: 'group_type', header: 'Type', render: (r) => <Badge tone="blue" value={r.group_type} /> },
    { key: 'member_count', header: 'Members', num: true },
    { key: 'total_balance', header: 'Combined Portfolio', num: true, render: (r) => currency(r.total_balance) },
  ];

  return (
    <>
      <PageHeader
        title="Client Management"
        sub="Individuals and households"
        actions={
          tab === 'clients'
            ? (
              <>
                <button className="btn" onClick={() => setShowImport(true)}>⬆ Import from Document</button>
                <button className="btn primary" onClick={() => { setImportInitial(null); setPendingInv([]); setShowClient(true); }}>+ New Client</button>
              </>
            )
            : <button className="btn primary" onClick={() => setShowGroup(true)}>+ New Household</button>
        }
      />
      <div className="content">
        <div className="tabs">
          <div className={`tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
            Clients {clients ? `(${clients.length})` : ''}
          </div>
          <div className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
            Households {groups ? `(${groups.length})` : ''}
          </div>
        </div>

        <div className="card">
          {tab === 'clients' ? (
            clients == null ? <Loading /> :
              <DataTable columns={clientCols} rows={clients} onRowClick={(r) => nav(`/clients/${r.id}`)}
                empty={<Empty icon="👥" title="No clients yet">Create your first client to get started.</Empty>} />
          ) : (
            groups == null ? <Loading /> :
              <DataTable columns={groupCols} rows={groups}
                empty={<Empty icon="🏠" title="No households yet">Group couples and families together.</Empty>} />
          )}
        </div>
      </div>

      {showImport && (
        <ImportClientModal
          onClose={() => setShowImport(false)}
          onParsed={(parsed) => {
            setShowImport(false);
            setImportInitial(parsed.client || {});
            setPendingInv(parsed.investments || []);
            setShowClient(true);
          }} />
      )}
      {showClient && (
        <ClientForm groups={groups || []} initial={importInitial} pendingInvestments={pendingInv}
          onClose={() => setShowClient(false)}
          onSaved={() => { setShowClient(false); setImportInitial(null); setPendingInv([]); load(); toast('Client saved', 'success'); }} />
      )}
      {showGroup && (
        <GroupForm onClose={() => setShowGroup(false)}
          onSaved={() => { setShowGroup(false); load(); toast('Household created', 'success'); }} />
      )}
    </>
  );
}

function ClientForm({ groups, initial, pendingInvestments = [], onClose, onSaved }) {
  // Build the starting form values, pre-filling from a scanned document when present.
  const [f, setF] = useState(() => {
    const base = { first_name: '', last_name: '', email: '', phone: '', occupation: '',
      risk_profile: '', status: 'prospect', group_id: '', annual_income: '', net_worth: '', date_of_birth: '', notes: '' };
    if (initial) {
      for (const k of Object.keys(base)) {
        if (initial[k] != null && initial[k] !== '') base[k] = String(initial[k]);
      }
      // Normalise enum-ish fields so the dropdowns match.
      base.risk_profile = base.risk_profile.toLowerCase();
      base.status = base.status.toLowerCase() || 'prospect';
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fromDoc = Boolean(initial);

  const submit = async () => {
    if (!f.first_name || !f.last_name) { toast('First and last name are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      ['annual_income', 'net_worth'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      const created = await api.post('/clients', payload);

      // If this client was imported from a document, also add any parsed holdings.
      if (created?.id && pendingInvestments.length) {
        for (const inv of pendingInvestments) {
          if (!inv || !inv.fund_name) continue;
          const ip = {
            client_id: created.id,
            fund_name: inv.fund_name,
            ticker: inv.ticker ?? null,
            account_type: inv.account_type ?? null,
            balance: inv.balance ?? null,
            allocation_pct: inv.allocation_pct ?? null,
            asset_class: inv.asset_class ?? null,
            fee_pct: inv.fee_pct ?? null,
            provider: inv.provider ?? null,
          };
          try { await api.post('/investments/current', ip); } catch { /* skip rows the AI got wrong */ }
        }
      }
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={fromDoc ? 'Review Imported Client' : 'New Client'} wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : (fromDoc ? 'Save Client' : 'Create Client')}</button>
      </>}>
      {fromDoc && (
        <div className="md" style={{ marginBottom: 14 }}>
          <blockquote style={{ borderLeftColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            ✨ Pre-filled from your document. <strong>Review and edit anything</strong> before saving.
            {pendingInvestments.length ? ` ${pendingInvestments.length} holding(s) found will be added too.` : ''}
          </blockquote>
        </div>
      )}
      <div className="form-grid">
        <TextInput label="First name *" value={f.first_name} onChange={set('first_name')} />
        <TextInput label="Last name *" value={f.last_name} onChange={set('last_name')} />
        <TextInput label="Email" type="email" value={f.email} onChange={set('email')} />
        <TextInput label="Phone" value={f.phone} onChange={set('phone')} />
        <TextInput label="Occupation" value={f.occupation} onChange={set('occupation')} />
        <TextInput label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
        <Select label="Risk profile" placeholder="—" options={RISK} value={f.risk_profile} onChange={set('risk_profile')} />
        <Select label="Status" options={STATUS} value={f.status} onChange={set('status')} />
        <TextInput label="Annual income" type="number" value={f.annual_income} onChange={set('annual_income')} />
        <TextInput label="Net worth" type="number" value={f.net_worth} onChange={set('net_worth')} />
        <Select label="Household" placeholder="None" options={groups.map((g) => ({ value: g.id, label: g.name }))}
          value={f.group_id} onChange={set('group_id')} />
      </div>
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}

function ImportClientModal({ onClose, onParsed }) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();

  const handle = async (files) => {
    const file = files?.[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/clients/import', fd);
      if (!res.ai) toast('Read in offline mode — please double-check every field', 'info');
      onParsed(res.parsed || {});
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title="Import Client from Document" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Cancel</button>}>
      <p className="muted" style={{ marginTop: 0 }}>
        Drag in a client profile (PDF or Word). The AI reads it and opens a <strong>pre-filled, editable
        form</strong> — nothing is saved until you review and confirm it.
      </p>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
        onClick={() => !busy && fileRef.current?.click()}
      >
        <div className="dz-ico">{busy ? <Spinner /> : '👤'}</div>
        <h3 style={{ margin: '10px 0 4px' }}>{busy ? 'Reading document…' : 'Drag & drop a client profile'}</h3>
        <div className="muted">{busy ? 'Extracting details with AI…' : 'or click to browse · PDF, DOC, DOCX, TXT'}</div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files)} />
      </div>
    </Modal>
  );
}

function GroupForm({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', group_type: 'couple', notes: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.name) { toast('Name is required', 'error'); return; }
    setSaving(true);
    try { await api.post('/client-groups', f); onSaved(); }
    catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="New Household" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create Household'}</button>
      </>}>
      <TextInput label="Household name *" placeholder="e.g. The Harrison Household" value={f.name} onChange={set('name')} />
      <Select label="Type" options={GROUP_TYPES} value={f.group_type} onChange={set('group_type')} />
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
