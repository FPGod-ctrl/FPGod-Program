import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { currency, pct } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { Select, TextInput, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];

export default function Investments() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [data, setData] = useState(null);
  const [showRec, setShowRec] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/clients').then((cs) => {
      setClients(cs);
      if (cs[0]) setClientId(cs[0].id);
    }).catch(() => setClients([]));
  }, []);

  const load = () => {
    if (!clientId) return;
    setData(null);
    api.get(`/investments/comparison/${clientId}`).then(setData).catch(() => setData(false));
  };
  useEffect(load, [clientId]);

  const curCols = [
    { key: 'fund_name', header: 'Fund', render: (r) => <span className="t-strong">{r.fund_name}</span> },
    { key: 'account_type', header: 'Account', render: (r) => r.account_type || '—' },
    { key: 'balance', header: 'Balance', num: true, render: (r) => currency(r.balance) },
    { key: 'allocation_pct', header: 'Alloc', num: true, render: (r) => pct(r.allocation_pct) },
    { key: 'risk_profile', header: 'Risk', render: (r) => (r.risk_profile ? <Badge value={r.risk_profile} /> : '—') },
    { key: 'fee_pct', header: 'Fee', num: true, render: (r) => pct(r.fee_pct, 2) },
  ];
  const recCols = [
    { key: 'fund_name', header: 'Fund', render: (r) => <span className="t-strong">{r.fund_name}</span> },
    { key: 'account_type', header: 'Account', render: (r) => r.account_type || '—' },
    { key: 'target_amount', header: 'Target', num: true, render: (r) => currency(r.target_amount) },
    { key: 'allocation_pct', header: 'Alloc', num: true, render: (r) => pct(r.allocation_pct) },
    { key: 'fee_pct', header: 'Fee', num: true, render: (r) => pct(r.fee_pct, 2) },
  ];

  const totals = data?.totals;
  const feeDelta = totals ? totals.recommendedWeightedFee - totals.currentWeightedFee : 0;

  return (
    <>
      <PageHeader title="Investment Comparison"
        sub="Current holdings vs. your recommended managed funds"
        actions={
          <Select options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
            value={clientId} onChange={(e) => setClientId(e.target.value)} />
        } />
      <div className="content stack">
        {!clientId ? <Empty icon="📊" title="No clients" /> :
         data == null ? <Loading /> :
         data === false ? <Empty icon="🚫" title="Couldn't load comparison" /> : (
          <>
            <div className="grid grid-4">
              <div className="stat blue"><div className="stat-label">Current Portfolio</div>
                <div className="stat-value">{currency(totals.currentBalance)}</div></div>
              <div className="stat accent"><div className="stat-label">Recommended Target</div>
                <div className="stat-value">{currency(totals.recommendedTarget)}</div></div>
              <div className="stat purple"><div className="stat-label">Current Avg Fee</div>
                <div className="stat-value">{pct(totals.currentWeightedFee, 2)}</div>
                <div className="stat-foot">weighted by balance</div></div>
              <div className={`stat ${feeDelta <= 0 ? 'green' : 'amber'}`}><div className="stat-label">Recommended Avg Fee</div>
                <div className="stat-value">{pct(totals.recommendedWeightedFee, 2)}</div>
                <div className="stat-foot">{feeDelta <= 0 ? `${pct(Math.abs(feeDelta), 2)} lower` : `${pct(feeDelta, 2)} higher`}</div></div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Current Investments</h3></div>
              <DataTable columns={curCols} rows={data.current} empty={<Empty icon="📊" title="No current holdings" />} />
            </div>

            <div className="card">
              <div className="card-head"><h3>Recommended Investments</h3>
                <button className="btn sm primary" onClick={() => setShowRec(true)}>+ Add Recommendation</button></div>
              <DataTable columns={recCols} rows={data.recommended}
                empty={<Empty icon="💡" title="No recommendations yet">Add your managed-fund suggestions.</Empty>} />
            </div>
          </>
        )}
      </div>

      {showRec && (
        <RecForm clientId={clientId} onClose={() => setShowRec(false)}
          onSaved={() => { setShowRec(false); load(); toast('Recommendation added', 'success'); }} />
      )}
    </>
  );
}

function RecForm({ clientId, onClose, onSaved }) {
  const [f, setF] = useState({ fund_name: '', ticker: '', account_type: '', target_amount: '',
    allocation_pct: '', asset_class: '', risk_profile: '', fee_pct: '', provider: '', rationale: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.fund_name) { toast('Fund name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { client_id: clientId, ...f };
      ['target_amount', 'allocation_pct', 'fee_pct'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/investments/recommended', payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Recommended Investment" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
      </>}>
      <div className="form-grid">
        <TextInput label="Fund name *" value={f.fund_name} onChange={set('fund_name')} />
        <TextInput label="Ticker" value={f.ticker} onChange={set('ticker')} />
        <TextInput label="Account type" value={f.account_type} onChange={set('account_type')} />
        <TextInput label="Provider" value={f.provider} onChange={set('provider')} />
        <TextInput label="Target amount" type="number" value={f.target_amount} onChange={set('target_amount')} />
        <TextInput label="Allocation %" type="number" value={f.allocation_pct} onChange={set('allocation_pct')} />
        <TextInput label="Asset class" value={f.asset_class} onChange={set('asset_class')} />
        <Select label="Risk profile" placeholder="—" options={RISK} value={f.risk_profile} onChange={set('risk_profile')} />
        <TextInput label="Fee % (annual)" type="number" step="0.01" value={f.fee_pct} onChange={set('fee_pct')} />
      </div>
      <TextArea label="Rationale" placeholder="Why you're recommending this fund" value={f.rationale} onChange={set('rationale')} />
    </Modal>
  );
}
