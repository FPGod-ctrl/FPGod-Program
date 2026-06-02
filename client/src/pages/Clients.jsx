import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, initials } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
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
            ? <button className="btn primary" onClick={() => setShowClient(true)}>+ New Client</button>
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

      {showClient && (
        <ClientForm groups={groups || []} onClose={() => setShowClient(false)}
          onSaved={() => { setShowClient(false); load(); toast('Client created', 'success'); }} />
      )}
      {showGroup && (
        <GroupForm onClose={() => setShowGroup(false)}
          onSaved={() => { setShowGroup(false); load(); toast('Household created', 'success'); }} />
      )}
    </>
  );
}

function ClientForm({ groups, onClose, onSaved }) {
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', phone: '', occupation: '',
    risk_profile: '', status: 'prospect', group_id: '', annual_income: '', net_worth: '', date_of_birth: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.first_name || !f.last_name) { toast('First and last name are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      ['annual_income', 'net_worth'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/clients', payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="New Client" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create Client'}</button>
      </>}>
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
