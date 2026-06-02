import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, pct, date, initials, titleCase } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { TextInput, Select } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [showInv, setShowInv] = useState(false);

  const load = () => api.get(`/clients/${id}/detail`).then(setData).catch(() => setData(false));
  useEffect(() => { setData(null); load(); }, [id]);

  if (data === false) return (<><PageHeader title="Client" /><div className="content"><Empty icon="🚫" title="Client not found" /></div></>);
  if (!data) return (<><PageHeader title="Client" /><div className="content"><Loading /></div></>);

  const { client, group, current, recommended, plans, transcripts, emails, documents } = data;

  const removeClient = async () => {
    if (!window.confirm(`Delete ${client.first_name} ${client.last_name}? This removes all their data.`)) return;
    try { await api.del(`/clients/${id}`); toast('Client deleted', 'success'); nav('/clients'); }
    catch (err) { toast(err.message, 'error'); }
  };

  const invCols = [
    { key: 'fund_name', header: 'Fund', render: (r) => <span className="t-strong">{r.fund_name}</span> },
    { key: 'account_type', header: 'Account', render: (r) => r.account_type || '—' },
    { key: 'balance', header: 'Balance', num: true, render: (r) => currency(r.balance) },
    { key: 'allocation_pct', header: 'Alloc', num: true, render: (r) => pct(r.allocation_pct) },
    { key: 'risk_profile', header: 'Risk', render: (r) => (r.risk_profile ? <Badge value={r.risk_profile} /> : '—') },
    { key: 'fee_pct', header: 'Fee', num: true, render: (r) => pct(r.fee_pct, 2) },
  ];

  return (
    <>
      <PageHeader
        title={`${client.first_name} ${client.last_name}`}
        sub={client.occupation || 'Client'}
        actions={<>
          <button className="btn" onClick={() => nav('/plans')}>Generate Plan</button>
          <button className="btn danger" onClick={removeClient}>Delete</button>
        </>}
      />
      <div className="content">
        <Link to="/clients" className="muted" style={{ fontSize: 13 }}>← Back to clients</Link>

        <div className="grid grid-4" style={{ marginTop: 14, marginBottom: 18 }}>
          <div className="stat accent"><div className="stat-label">Portfolio</div>
            <div className="stat-value">{currency(current.reduce((s, i) => s + Number(i.balance || 0), 0))}</div>
            <div className="stat-foot">{current.length} holdings</div></div>
          <div className="stat blue"><div className="stat-label">Status</div>
            <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}><Badge value={client.status} /></div></div>
          <div className="stat purple"><div className="stat-label">Risk Profile</div>
            <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}>{client.risk_profile ? <Badge value={client.risk_profile} /> : '—'}</div></div>
          <div className="stat green"><div className="stat-label">Household</div>
            <div className="stat-value" style={{ fontSize: 17, marginTop: 10 }}>{group ? group.name : 'Individual'}</div></div>
        </div>

        <div className="tabs">
          {['overview', 'investments', 'plans', 'meetings', 'documents'].map((t) => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{titleCase(t)}</div>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="card card-pad">
            <dl className="kv">
              <dt>Full name</dt><dd>{client.first_name} {client.last_name}</dd>
              <dt>Email</dt><dd>{client.email || '—'}</dd>
              <dt>Phone</dt><dd>{client.phone || '—'}</dd>
              <dt>Date of birth</dt><dd>{date(client.date_of_birth)}</dd>
              <dt>Occupation</dt><dd>{client.occupation || '—'}</dd>
              <dt>Annual income</dt><dd>{client.annual_income ? currency(client.annual_income) : '—'}</dd>
              <dt>Net worth</dt><dd>{client.net_worth ? currency(client.net_worth) : '—'}</dd>
              <dt>Notes</dt><dd>{client.notes || '—'}</dd>
            </dl>
          </div>
        )}

        {tab === 'investments' && (
          <div className="stack">
            <div className="card">
              <div className="card-head"><h3>Current Investments</h3>
                <button className="btn sm primary" onClick={() => setShowInv(true)}>+ Add Holding</button></div>
              <DataTable columns={invCols} rows={current} empty={<Empty icon="📊" title="No holdings recorded" />} />
            </div>
            <div className="card">
              <div className="card-head"><h3>Recommended Investments</h3>
                <Link to="/investments" className="btn sm ghost">Comparison view →</Link></div>
              <DataTable
                columns={[
                  { key: 'fund_name', header: 'Fund', render: (r) => <span className="t-strong">{r.fund_name}</span> },
                  { key: 'target_amount', header: 'Target', num: true, render: (r) => currency(r.target_amount) },
                  { key: 'allocation_pct', header: 'Alloc', num: true, render: (r) => pct(r.allocation_pct) },
                  { key: 'fee_pct', header: 'Fee', num: true, render: (r) => pct(r.fee_pct, 2) },
                  { key: 'rationale', header: 'Rationale', render: (r) => <span className="muted">{r.rationale || '—'}</span> },
                ]}
                rows={recommended} empty={<Empty icon="💡" title="No recommendations yet" />} />
            </div>
          </div>
        )}

        {tab === 'plans' && (
          <div className="card">
            <div className="card-head"><h3>Financial Plans</h3>
              <Link to="/plans" className="btn sm primary">Generate Plan →</Link></div>
            <DataTable
              columns={[
                { key: 'title', header: 'Title', render: (r) => <span className="t-strong">{r.title}</span> },
                { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
                { key: 'completeness', header: 'Complete', num: true, render: (r) => `${r.completeness}%` },
              ]}
              rows={plans}
              onRowClick={() => nav('/plans')}
              empty={<Empty icon="📝" title="No plans yet" />} />
          </div>
        )}

        {tab === 'meetings' && (
          <div className="stack">
            <div className="card">
              <div className="card-head"><h3>Meeting Transcripts</h3><Link to="/meetings" className="btn sm ghost">Open →</Link></div>
              <DataTable columns={[
                { key: 'title', header: 'Title', render: (r) => <span className="t-strong">{r.title}</span> },
                { key: 'meeting_date', header: 'Date', render: (r) => date(r.meeting_date) },
              ]} rows={transcripts} empty={<Empty icon="🎙️" title="No transcripts" />} />
            </div>
            <div className="card">
              <div className="card-head"><h3>Follow-up Emails</h3><Link to="/meetings" className="btn sm ghost">Open →</Link></div>
              <DataTable columns={[
                { key: 'subject', header: 'Subject', render: (r) => <span className="t-strong">{r.subject || '(no subject)'}</span> },
                { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              ]} rows={emails} empty={<Empty icon="✉️" title="No emails" />} />
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="card">
            <div className="card-head"><h3>Documents</h3><Link to="/documents" className="btn sm primary">Upload →</Link></div>
            <DataTable columns={[
              { key: 'original_name', header: 'File', render: (r) => <span className="t-strong">{r.original_name}</span> },
              { key: 'doc_type', header: 'Type', render: (r) => <Badge tone="blue" value={r.doc_type} /> },
              { key: 'scan_status', header: 'Scan', render: (r) => <Badge value={r.scan_status} /> },
              { key: 'created_at', header: 'Uploaded', render: (r) => date(r.created_at) },
            ]} rows={documents} empty={<Empty icon="📄" title="No documents" />} />
          </div>
        )}
      </div>

      {showInv && (
        <InvestmentForm clientId={id} onClose={() => setShowInv(false)}
          onSaved={() => { setShowInv(false); load(); toast('Holding added', 'success'); }} />
      )}
    </>
  );
}

function InvestmentForm({ clientId, onClose, onSaved }) {
  const [f, setF] = useState({ fund_name: '', ticker: '', account_type: '', balance: '',
    allocation_pct: '', asset_class: '', risk_profile: '', fee_pct: '', provider: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.fund_name) { toast('Fund name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { client_id: clientId, ...f };
      ['balance', 'allocation_pct', 'fee_pct'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/investments/current', payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Current Holding" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add Holding'}</button>
      </>}>
      <div className="form-grid">
        <TextInput label="Fund name *" value={f.fund_name} onChange={set('fund_name')} />
        <TextInput label="Ticker" value={f.ticker} onChange={set('ticker')} />
        <TextInput label="Account type" placeholder="IRA, 401k, ISA…" value={f.account_type} onChange={set('account_type')} />
        <TextInput label="Provider" value={f.provider} onChange={set('provider')} />
        <TextInput label="Balance" type="number" value={f.balance} onChange={set('balance')} />
        <TextInput label="Allocation %" type="number" value={f.allocation_pct} onChange={set('allocation_pct')} />
        <TextInput label="Asset class" placeholder="equity, bond, cash…" value={f.asset_class} onChange={set('asset_class')} />
        <Select label="Risk profile" placeholder="—" options={RISK} value={f.risk_profile} onChange={set('risk_profile')} />
        <TextInput label="Fee % (annual)" type="number" step="0.01" value={f.fee_pct} onChange={set('fee_pct')} />
      </div>
    </Modal>
  );
}
