import { useState } from 'react';
import { api } from '../api/client.js';
import { currency, pct, date as fmtDate, titleCase } from '../lib/format.js';
import DataTable from './ui/DataTable.jsx';
import Modal from './ui/Modal.jsx';
import Badge from './ui/Badge.jsx';
import { Empty } from './ui/Loading.jsx';
import { TextInput, Select, TextArea } from './ui/Field.jsx';
import { useToast } from './ui/Toast.jsx';

const FREQ = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annual'];
const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annual: 1 };
const toAnnual = (amount, freq) => Number(amount || 0) * (PER_YEAR[freq] ?? 1);

// In a household (combined) view, every row belongs to one of several owners
// (each partner, or the joint household). These resolve a row to its owner.
const ownerValueOf = (row, owners) => {
  for (const o of owners) {
    if (o.payload.client_id && row.client_id === o.payload.client_id) return o.value;
    if (o.payload.group_id && !row.client_id && row.group_id === o.payload.group_id) return o.value;
  }
  return owners[0]?.value;
};
const ownerLabelOf = (row, owners) => {
  const v = ownerValueOf(row, owners);
  return owners.find((o) => o.value === v)?.label || '—';
};

/**
 * Config-driven list section: a titled card with a total, an itemized table,
 * and add / edit / delete via a modal form. One config drives both the table
 * columns and the form fields.
 */
const SECTIONS = [
  {
    key: 'assets', title: 'Assets', icon: '🏦', endpoint: '/assets',
    totalKey: 'value', totalLabel: 'Total',
    numericKeys: ['value'],
    defaults: { category: 'cash', name: '', value: '', owner: '', notes: '' },
    columns: [
      { key: 'name', header: 'Asset', render: (r) => <span className="t-strong">{r.name}</span> },
      { key: 'category', header: 'Category', render: (r) => <Badge tone="blue" value={r.category} /> },
      { key: 'owner', header: 'Owner', render: (r) => r.owner || '—' },
      { key: 'value', header: 'Value', num: true, render: (r) => currency(r.value) },
    ],
    fields: [
      { key: 'name', label: 'Asset name *' },
      { key: 'category', label: 'Category', type: 'select',
        options: ['cash', 'property', 'vehicle', 'business', 'investment', 'superannuation', 'collectible', 'other'] },
      { key: 'value', label: 'Value', type: 'number' },
      { key: 'owner', label: 'Owner', type: 'select', options: ['self', 'partner', 'joint'] },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    key: 'liabilities', title: 'Debts & Liabilities', icon: '💳', endpoint: '/liabilities',
    totalKey: 'balance', totalLabel: 'Total owed',
    numericKeys: ['balance', 'interest_rate', 'monthly_payment'],
    defaults: { liability_type: 'mortgage', name: '', balance: '', interest_rate: '', monthly_payment: '', lender: '', owner: '', notes: '' },
    columns: [
      { key: 'name', header: 'Debt', render: (r) => <span className="t-strong">{r.name}</span> },
      { key: 'liability_type', header: 'Type', render: (r) => <Badge tone="red" value={r.liability_type} /> },
      { key: 'interest_rate', header: 'Rate', num: true, render: (r) => pct(r.interest_rate, 2) },
      { key: 'monthly_payment', header: 'Monthly', num: true, render: (r) => (r.monthly_payment ? currency(r.monthly_payment) : '—') },
      { key: 'balance', header: 'Balance', num: true, render: (r) => currency(r.balance) },
    ],
    fields: [
      { key: 'name', label: 'Debt name *' },
      { key: 'liability_type', label: 'Type', type: 'select',
        options: ['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'student_loan', 'tax', 'business_loan', 'other'] },
      { key: 'balance', label: 'Balance owed', type: 'number' },
      { key: 'interest_rate', label: 'Interest rate %', type: 'number', step: '0.01' },
      { key: 'monthly_payment', label: 'Monthly payment', type: 'number' },
      { key: 'lender', label: 'Lender' },
      { key: 'owner', label: 'Owner', type: 'select', options: ['self', 'partner', 'joint'] },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    key: 'income', title: 'Income', icon: '💰', endpoint: '/income',
    annualTotal: true, totalLabel: 'Annual income',
    numericKeys: ['amount'],
    defaults: { income_type: 'salary', name: '', amount: '', frequency: 'annual', owner: '', notes: '' },
    columns: [
      { key: 'name', header: 'Source', render: (r) => <span className="t-strong">{r.name}</span> },
      { key: 'income_type', header: 'Type', render: (r) => <Badge tone="green" value={r.income_type} /> },
      { key: 'amount', header: 'Amount', num: true, render: (r) => `${currency(r.amount)} / ${r.frequency}` },
      { key: 'annual', header: 'Annual', num: true, render: (r) => currency(toAnnual(r.amount, r.frequency)) },
    ],
    fields: [
      { key: 'name', label: 'Source name *' },
      { key: 'income_type', label: 'Type', type: 'select',
        options: ['salary', 'rental', 'pension', 'dividends', 'business', 'government', 'trust', 'other'] },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: FREQ },
      { key: 'owner', label: 'Owner', type: 'select', options: ['self', 'partner', 'joint'] },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    key: 'expenses', title: 'Expenses', icon: '🧾', endpoint: '/expenses',
    annualTotal: true, totalLabel: 'Annual expenses',
    numericKeys: ['amount'],
    defaults: { category: 'housing', name: '', amount: '', frequency: 'monthly', notes: '' },
    columns: [
      { key: 'name', header: 'Expense', render: (r) => <span className="t-strong">{r.name}</span> },
      { key: 'category', header: 'Category', render: (r) => <Badge tone="amber" value={r.category} /> },
      { key: 'amount', header: 'Amount', num: true, render: (r) => `${currency(r.amount)} / ${r.frequency}` },
      { key: 'annual', header: 'Annual', num: true, render: (r) => currency(toAnnual(r.amount, r.frequency)) },
    ],
    fields: [
      { key: 'name', label: 'Expense name *' },
      { key: 'category', label: 'Category', type: 'select',
        options: ['housing', 'utilities', 'living', 'transport', 'insurance', 'education', 'discretionary', 'other'] },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: FREQ },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    key: 'insurance', title: 'Insurance', icon: '🛡️', endpoint: '/insurance',
    totalKey: 'cover_amount', totalLabel: 'Total cover',
    numericKeys: ['cover_amount', 'premium'],
    defaults: { policy_type: 'life', provider: '', cover_amount: '', premium: '', frequency: 'annual', policy_number: '', notes: '' },
    columns: [
      { key: 'policy_type', header: 'Policy', render: (r) => <Badge tone="teal" value={r.policy_type} /> },
      { key: 'provider', header: 'Provider', render: (r) => r.provider || '—' },
      { key: 'premium', header: 'Premium', num: true, render: (r) => (r.premium ? `${currency(r.premium)} / ${r.frequency}` : '—') },
      { key: 'cover_amount', header: 'Cover', num: true, render: (r) => (r.cover_amount ? currency(r.cover_amount) : '—') },
    ],
    fields: [
      { key: 'policy_type', label: 'Policy type *', type: 'select',
        options: ['life', 'tpd', 'income_protection', 'trauma', 'health', 'home', 'auto', 'other'] },
      { key: 'provider', label: 'Provider' },
      { key: 'cover_amount', label: 'Cover amount', type: 'number' },
      { key: 'premium', label: 'Premium', type: 'number' },
      { key: 'frequency', label: 'Premium frequency', type: 'select', options: FREQ },
      { key: 'policy_number', label: 'Policy number' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    key: 'goals', title: 'Goals', icon: '🎯', endpoint: '/goals',
    numericKeys: ['target_amount', 'current_amount'],
    defaults: { name: '', target_amount: '', current_amount: '', target_date: '', priority: 'medium', notes: '' },
    columns: [
      { key: 'name', header: 'Goal', render: (r) => <span className="t-strong">{r.name}</span> },
      { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
      { key: 'target_date', header: 'Target date', render: (r) => fmtDate(r.target_date) },
      { key: 'progress', header: 'Progress', num: true,
        render: (r) => (r.target_amount
          ? `${currency(r.current_amount)} / ${currency(r.target_amount)}`
          : currency(r.current_amount)) },
    ],
    fields: [
      { key: 'name', label: 'Goal name *' },
      { key: 'target_amount', label: 'Target amount', type: 'number' },
      { key: 'current_amount', label: 'Saved so far', type: 'number' },
      { key: 'target_date', label: 'Target date', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
];

export default function FinancialBreakdown({ data, clientId, owner, owners, reload, showSummary = true, showEstate = true }) {
  // Items are owned by either a client (individual) or a group (joint/household).
  // In `owners` (combined household) mode each row carries its own owner.
  const ownerObj = owner || { client_id: clientId };
  const investments = data.current || [];
  const assets = data.assets || [];
  const liabilities = data.liabilities || [];
  const income = data.income || [];
  const expenses = data.expenses || [];

  const investTotal = investments.reduce((s, r) => s + Number(r.balance || 0), 0);
  const assetTotal = assets.reduce((s, r) => s + Number(r.value || 0), 0) + investTotal;
  const liabilityTotal = liabilities.reduce((s, r) => s + Number(r.balance || 0), 0);
  const netWorth = assetTotal - liabilityTotal;
  const incomeAnnual = income.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);
  const expenseAnnual = expenses.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);
  const surplus = incomeAnnual - expenseAnnual;

  const rowsFor = (key) => data[key] || [];

  return (
    <div className="stack">
      {/* Net position summary */}
      {showSummary && (
        <div className="grid grid-4">
          <div className="stat green"><div className="stat-label">Total Assets</div>
            <div className="stat-value">{currency(assetTotal)}</div>
            <div className="stat-foot">{assets.length + (investTotal ? 1 : 0)} items incl. investments</div></div>
          <div className="stat red"><div className="stat-label">Total Liabilities</div>
            <div className="stat-value">{currency(liabilityTotal)}</div>
            <div className="stat-foot">{liabilities.length} debts</div></div>
          <div className="stat accent"><div className="stat-label">Net Worth</div>
            <div className="stat-value">{currency(netWorth)}</div>
            <div className="stat-foot">assets − liabilities</div></div>
          <div className={`stat ${surplus >= 0 ? 'blue' : 'amber'}`}><div className="stat-label">Annual Surplus</div>
            <div className="stat-value">{currency(surplus)}</div>
            <div className="stat-foot">{currency(incomeAnnual)} in · {currency(expenseAnnual)} out</div></div>
        </div>
      )}

      {/* Investments are managed on their own tab — show a read-only roll-up here. */}
      {investTotal > 0 && (
        <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><span style={{ marginRight: 8 }}>📊</span>
            <span className="t-strong">Investment holdings</span>{' '}
            <span className="muted">— {investments.length} holding(s), managed on the Investments tab</span></div>
          <span className="t-strong">{currency(investTotal)}</span>
        </div>
      )}

      {SECTIONS.map((cfg) => (
        <Section key={cfg.key} cfg={cfg} rows={rowsFor(cfg.key)} owner={ownerObj} owners={owners} reload={reload} />
      ))}

      {showEstate && clientId && <EstatePanel clientId={clientId} estate={data.estate} reload={reload} />}
    </div>
  );
}

function Section({ cfg, rows, owner, owners, reload }) {
  const [editing, setEditing] = useState(null); // a row (edit), {} (new), or null (closed)
  const toast = useToast();

  let total = null;
  if (cfg.totalKey) total = rows.reduce((s, r) => s + Number(r[cfg.totalKey] || 0), 0);
  else if (cfg.annualTotal) total = rows.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.name || titleCase(row.policy_type || 'item')}"?`)) return;
    try { await api.del(`${cfg.endpoint}/${row.id}`); reload(); toast('Deleted', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  const ownerCol = owners ? [{
    key: '_owner', header: 'Owner',
    render: (r) => <span className="badge blue">{ownerLabelOf(r, owners)}</span>,
  }] : [];

  const columns = [
    ...cfg.columns,
    ...ownerCol,
    { key: '_actions', header: '', render: (r) => (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); setEditing(r); }}>Edit</button>
        <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); remove(r); }}>Delete</button>
      </div>
    ) },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <h3>{cfg.icon} {cfg.title}</h3>
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          {total != null && <span className="muted">{cfg.totalLabel}: <span className="t-strong">{currency(total)}</span></span>}
          <button className="btn sm primary" onClick={() => setEditing({})}>+ Add</button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} onRowClick={(r) => setEditing(r)}
        empty={<Empty icon={cfg.icon} title={`No ${cfg.title.toLowerCase()} recorded`}>Click “+ Add” to add one.</Empty>} />
      {editing && (
        <RowForm cfg={cfg} row={editing} owner={owner} owners={owners}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); toast('Saved', 'success'); }} />
      )}
    </div>
  );
}

function RowForm({ cfg, row, owner, owners, onClose, onSaved }) {
  const isEdit = Boolean(row.id);
  const [f, setF] = useState(() => {
    const init = { ...cfg.defaults };
    for (const fl of cfg.fields) {
      let v = row[fl.key];
      if (v == null) continue;
      if (fl.type === 'date' && v) v = String(v).slice(0, 10);
      init[fl.key] = v;
    }
    return init;
  });
  // In combined household mode the advisor also picks who the item belongs to.
  const [ownerVal, setOwnerVal] = useState(() => (owners ? ownerValueOf(row, owners) : null));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const requiredField = cfg.fields.find((x) => x.label.includes('*'));
  // The free-text "owner" field is replaced by the structured owner picker in combined mode.
  const formFields = owners ? cfg.fields.filter((fl) => fl.key !== 'owner') : cfg.fields;

  const submit = async () => {
    if (requiredField && !f[requiredField.key]) {
      toast(`${requiredField.label.replace(' *', '')} is required`, 'error');
      return;
    }
    setSaving(true);
    try {
      const ownerPayload = owners
        ? (owners.find((o) => o.value === ownerVal) || owners[0]).payload
        : owner;
      const payload = { ...ownerPayload, ...f };
      (cfg.numericKeys || []).forEach((k) => {
        payload[k] = payload[k] === '' || payload[k] == null ? null : Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      if (isEdit) await api.put(`${cfg.endpoint}/${row.id}`, payload);
      else await api.post(cfg.endpoint, payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`${isEdit ? 'Edit' : 'Add'} — ${cfg.title}`} wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </>}>
      <div className="form-grid">
        {owners && (
          <Select label="Belongs to" options={owners.map((o) => ({ value: o.value, label: o.label }))}
            value={ownerVal ?? ''} onChange={(e) => setOwnerVal(e.target.value)} />
        )}
        {formFields.filter((fl) => fl.type !== 'textarea').map((fl) => (
          fl.type === 'select'
            ? <Select key={fl.key} label={fl.label} options={fl.options} value={f[fl.key] ?? ''} onChange={set(fl.key)} />
            : <TextInput key={fl.key} label={fl.label} type={fl.type || 'text'} step={fl.step}
                placeholder={fl.placeholder} value={f[fl.key] ?? ''} onChange={set(fl.key)} />
        ))}
      </div>
      {formFields.filter((fl) => fl.type === 'textarea').map((fl) => (
        <TextArea key={fl.key} label={fl.label} value={f[fl.key] ?? ''} onChange={set(fl.key)} />
      ))}
    </Modal>
  );
}

const POA_TYPES = ['financial', 'medical', 'both', 'enduring'];

function EstatePanel({ clientId, estate, reload }) {
  const [f, setF] = useState(() => ({
    has_will: estate?.has_will || false,
    will_date: estate?.will_date ? String(estate.will_date).slice(0, 10) : '',
    will_location: estate?.will_location || '',
    executor: estate?.executor || '',
    has_poa: estate?.has_poa || false,
    poa_type: estate?.poa_type || '',
    poa_attorney: estate?.poa_attorney || '',
    has_testamentary_trust: estate?.has_testamentary_trust || false,
    trust_details: estate?.trust_details || '',
    has_binding_nomination: estate?.has_binding_nomination || false,
    binding_nomination: estate?.binding_nomination || '',
    death_income_goal: estate?.death_income_goal ?? '',
    beneficiaries: estate?.beneficiaries || '',
    notes: estate?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => (e) => setF({ ...f, [k]: e.target.checked });

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...f };
      payload.death_income_goal = payload.death_income_goal === '' ? null : Number(payload.death_income_goal);
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.put(`/clients/${clientId}/estate`, payload);
      reload();
      toast('Estate planning saved', 'success');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>⚖️ Estate Planning</h3>
        <button className="btn sm primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="card-pad stack">
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.has_will} onChange={toggle('has_will')} />
          <span className="t-strong">Has a current will</span>
        </label>
        {f.has_will && (
          <div className="form-grid">
            <TextInput label="Will date" type="date" value={f.will_date} onChange={set('will_date')} />
            <TextInput label="Will location" value={f.will_location} onChange={set('will_location')} placeholder="e.g. with solicitor" />
            <TextInput label="Executor" value={f.executor} onChange={set('executor')} />
          </div>
        )}

        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.has_poa} onChange={toggle('has_poa')} />
          <span className="t-strong">Has Power of Attorney (POA)</span>
        </label>
        {f.has_poa && (
          <div className="form-grid">
            <Select label="POA type" placeholder="—" options={POA_TYPES} value={f.poa_type} onChange={set('poa_type')} />
            <TextInput label="Attorney" value={f.poa_attorney} onChange={set('poa_attorney')} />
          </div>
        )}

        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.has_testamentary_trust} onChange={toggle('has_testamentary_trust')} />
          <span className="t-strong">Testamentary trust (family ongoing income)</span>
        </label>
        {f.has_testamentary_trust && (
          <TextArea label="Trust details" value={f.trust_details} onChange={set('trust_details')}
            placeholder="Structure, trustees, ongoing income arrangements…" />
        )}

        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.has_binding_nomination} onChange={toggle('has_binding_nomination')} />
          <span className="t-strong">Binding death benefit nomination (super)</span>
        </label>
        {f.has_binding_nomination && (
          <TextInput label="Nominated beneficiaries" value={f.binding_nomination} onChange={set('binding_nomination')}
            placeholder="e.g. Spouse 100%" />
        )}

        <div className="form-grid">
          <TextInput label="Death planning — income goal" type="number" value={f.death_income_goal}
            onChange={set('death_income_goal')} placeholder="Annual income for dependents on death" />
        </div>

        <TextArea label="Beneficiaries" value={f.beneficiaries} onChange={set('beneficiaries')} />
        <TextArea label="Estate notes" value={f.notes} onChange={set('notes')} />
      </div>
    </div>
  );
}
