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

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [showClient, setShowClient] = useState(false);
  const [importInitial, setImportInitial] = useState(null);   // parsed client fields to prefill
  const [pendingInv, setPendingInv] = useState([]);           // parsed holdings to add after save
  const [drag, setDrag] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const nav = useNavigate();
  const toast = useToast();

  const load = () => api.get('/clients').then(setClients).catch(() => setClients([]));
  useEffect(() => { load(); }, []);

  // Drag a client profile onto the page → extract → open the create form pre-filled.
  const importFromFile = async (files) => {
    const file = files?.[0];
    if (!file || importing) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/clients/import', fd);
      if (!res.ai) toast('Read in offline mode — double-check every field', 'info');
      const parsed = res.parsed || {};
      setImportInitial(parsed.client || {});
      setPendingInv(parsed.investments || []);
      setShowClient(true);
    } catch (err) { toast(err.message, 'error'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const hasPartner = (r) => Boolean(r.partner_first_name || r.partner_last_name);

  const clientCols = [
    {
      key: 'name', header: 'Client',
      render: (r) => (
        <div className="row">
          <div className="avatar">{initials(r.first_name, r.last_name)}</div>
          <div>
            <div className="t-strong">
              {r.first_name} {r.last_name}
              {hasPartner(r) && <span className="muted"> &amp; {r.partner_first_name} {r.partner_last_name}</span>}
            </div>
            <div className="faint" style={{ fontSize: 12 }}>{r.email || 'No email'}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => (hasPartner(r)
      ? <Badge tone="purple" value="Couple" /> : <span className="faint">Individual</span>) },
    { key: 'holdings_count', header: 'Holdings', num: true, render: (r) => r.holdings_count || 0 },
    { key: 'total_balance', header: 'Portfolio', num: true, render: (r) => currency(r.total_balance) },
    { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Client Management"
        sub="One file per client or couple"
        actions={<button className="btn primary" onClick={() => { setImportInitial(null); setPendingInv([]); setShowClient(true); }}>+ New Client</button>}
      />
      <div className="content stack">
        {/* Drag a profile to create a client file */}
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); importFromFile(e.dataTransfer.files); }}
          onClick={() => !importing && fileRef.current?.click()}
        >
          <div className="dz-ico">{importing ? <Spinner /> : '👤'}</div>
          <h3 style={{ margin: '10px 0 4px' }}>{importing ? 'Reading profile…' : 'Drag a client profile here to create a file'}</h3>
          <div className="muted">{importing ? 'Extracting details with AI…' : 'or click to browse · PDF, DOC, DOCX, XLSX, XLS, CSV, TXT — review before saving'}</div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={(e) => importFromFile(e.target.files)} />
        </div>

        <div className="card">
          <div className="card-head"><h3>Clients</h3><span className="muted">{clients?.length || 0}</span></div>
          {clients == null ? <Loading /> :
            <DataTable columns={clientCols} rows={clients} onRowClick={(r) => nav(`/clients/${r.id}`)}
              empty={<Empty icon="👥" title="No clients yet">Drag a profile above or click “+ New Client”.</Empty>} />}
        </div>
      </div>

      {showClient && (
        <ClientForm initial={importInitial} pendingInvestments={pendingInv}
          onClose={() => setShowClient(false)}
          onSaved={() => { setShowClient(false); setImportInitial(null); setPendingInv([]); load(); toast('Client saved', 'success'); }} />
      )}
    </>
  );
}

function ClientForm({ initial, pendingInvestments = [], onClose, onSaved }) {
  // Build the starting form values, pre-filling from a scanned document when present.
  const [f, setF] = useState(() => {
    const base = { first_name: '', last_name: '', email: '', phone: '', address: '', occupation: '',
      risk_profile: '', status: 'prospect', annual_income: '', net_worth: '', date_of_birth: '', notes: '',
      partner_first_name: '', partner_last_name: '', partner_email: '', partner_phone: '',
      partner_date_of_birth: '', partner_occupation: '', partner_annual_income: '', partner_risk_profile: '' };
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
      ['annual_income', 'net_worth', 'partner_annual_income'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
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
        <TextInput label="Address" value={f.address} onChange={set('address')} />
        <TextInput label="Occupation" value={f.occupation} onChange={set('occupation')} />
        <TextInput label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
        <Select label="Risk profile" placeholder="—" options={RISK} value={f.risk_profile} onChange={set('risk_profile')} />
        <Select label="Status" options={STATUS} value={f.status} onChange={set('status')} />
        <TextInput label="Annual income" type="number" value={f.annual_income} onChange={set('annual_income')} />
        <TextInput label="Net worth" type="number" value={f.net_worth} onChange={set('net_worth')} />
      </div>

      <h4 style={{ margin: '18px 0 8px' }}>Partner / Spouse
        <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> (optional — leave blank if single)</span></h4>
      <div className="form-grid">
        <TextInput label="Partner first name" value={f.partner_first_name} onChange={set('partner_first_name')} />
        <TextInput label="Partner last name" value={f.partner_last_name} onChange={set('partner_last_name')} />
        <TextInput label="Partner email" type="email" value={f.partner_email} onChange={set('partner_email')} />
        <TextInput label="Partner phone" value={f.partner_phone} onChange={set('partner_phone')} />
        <TextInput label="Partner date of birth" type="date" value={f.partner_date_of_birth} onChange={set('partner_date_of_birth')} />
        <TextInput label="Partner occupation" value={f.partner_occupation} onChange={set('partner_occupation')} />
        <TextInput label="Partner annual income" type="number" value={f.partner_annual_income} onChange={set('partner_annual_income')} />
        <Select label="Partner risk profile" placeholder="—" options={RISK} value={f.partner_risk_profile} onChange={set('partner_risk_profile')} />
      </div>
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}

