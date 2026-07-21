import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, initials, titleCase, date as fmtDate } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { TextInput, Select } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import FinancialBreakdown from '../components/FinancialBreakdown.jsx';

const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annual: 1 };
const toAnnual = (a, f) => Number(a || 0) * (PER_YEAR[f] ?? 1);

const sumAssets = (m) =>
  (m.assets || []).reduce((s, r) => s + Number(r.value || 0), 0) +
  (m.current || []).reduce((s, r) => s + Number(r.balance || 0), 0);
const sumLiab = (m) => (m.liabilities || []).reduce((s, r) => s + Number(r.balance || 0), 0);
const sumIncome = (m) => (m.income || []).reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);
const sumExpense = (m) => (m.expenses || []).reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);

export default function HouseholdDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [attachTo, setAttachTo] = useState('__joint__');
  const [docUploading, setDocUploading] = useState(false);
  const [docDrag, setDocDrag] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get(`/client-groups/${id}/detail`).then(setData).catch(() => setData(false));
  useEffect(() => { setData(null); load(); }, [id]);

  const uploadDocs = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length || docUploading) return;
    setDocUploading(true);
    try {
      for (const file of arr) {
        const fd = new FormData();
        fd.append('file', file);
        if (attachTo === '__joint__') fd.append('group_id', id);
        else fd.append('client_id', attachTo);
        fd.append('doc_type', 'client_profile');
        await api.upload('/documents', fd);
      }
      toast(`${arr.length} document${arr.length === 1 ? '' : 's'} uploaded`, 'success');
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setDocUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removeDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;
    try { await api.del(`/documents/${doc.id}`); load(); toast('Document deleted', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  if (data === false) return (<><PageHeader title="Household" /><div className="content"><Empty icon="🚫" title="Household not found" /></div></>);
  if (!data) return (<><PageHeader title="Household" /><div className="content"><Loading /></div></>);

  const { group, members } = data;
  const documents = data.documents || [];
  const memberName = (cid) => {
    const m = members.find((x) => x.client.id === cid);
    return m ? `${m.client.first_name} ${m.client.last_name}` : 'Joint';
  };
  const joint = data.joint || { current: [], assets: [], liabilities: [], income: [], expenses: [], insurance: [], goals: [] };
  const jointHasItems = ['assets', 'liabilities', 'income', 'expenses', 'insurance', 'goals', 'current']
    .some((k) => (joint[k] || []).length > 0);

  // Combined household totals = each partner's items + joint items, counted once
  // (joint items live on the group, never duplicated under a partner).
  const totalAssets = members.reduce((s, m) => s + sumAssets(m), 0) + sumAssets(joint);
  const totalLiab = members.reduce((s, m) => s + sumLiab(m), 0) + sumLiab(joint);
  const netWorth = totalAssets - totalLiab;
  const incomeAnnual = members.reduce((s, m) => s + sumIncome(m), 0) + sumIncome(joint);
  const expenseAnnual = members.reduce((s, m) => s + sumExpense(m), 0) + sumExpense(joint);
  const surplus = incomeAnnual - expenseAnnual;

  // Owners the combined breakdown can attribute each row to.
  const owners = [
    ...members.map((m) => ({
      value: m.client.id,
      label: `${m.client.first_name} ${m.client.last_name}`,
      payload: { client_id: m.client.id, group_id: null },
    })),
    { value: '__joint__', label: 'Joint (household)', payload: { client_id: null, group_id: id } },
  ];

  // One combined list per category: every partner's items + joint items, each
  // appearing exactly once (its owner is shown in the Owner column).
  const KEYS = ['current', 'assets', 'liabilities', 'income', 'expenses', 'insurance', 'goals'];
  const combined = { estate: null };
  for (const k of KEYS) combined[k] = [...members.flatMap((m) => m[k] || []), ...(joint[k] || [])];

  return (
    <>
      <PageHeader
        title={group.name}
        sub={`${titleCase(group.group_type)} · ${members.length} ${members.length === 1 ? 'member' : 'members'}`}
        actions={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add Partner</button>}
      />
      <div className="content">
        <Link to="/clients" className="muted" style={{ fontSize: 13 }}>← Back to clients</Link>

        {/* Combined household position */}
        <div className="grid grid-4" style={{ marginTop: 14 }}>
          <div className="stat green"><div className="stat-label">Combined Assets</div>
            <div className="stat-value">{currency(totalAssets)}</div>
            <div className="stat-foot">across {members.length} partner(s)</div></div>
          <div className="stat red"><div className="stat-label">Combined Liabilities</div>
            <div className="stat-value">{currency(totalLiab)}</div></div>
          <div className="stat accent"><div className="stat-label">Household Net Worth</div>
            <div className="stat-value">{currency(netWorth)}</div>
            <div className="stat-foot">assets − liabilities</div></div>
          <div className={`stat ${surplus >= 0 ? 'blue' : 'amber'}`}><div className="stat-label">Annual Surplus</div>
            <div className="stat-value">{currency(surplus)}</div>
            <div className="stat-foot">{currency(incomeAnnual)} in · {currency(expenseAnnual)} out</div></div>
        </div>

        {/* Partners — each is a full client; open their profile for docs, plans, estate. */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Partners</h3>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}>+ Add Partner</button></div>
          <div className="card-pad">
            {members.length === 0 ? (
              <span className="muted">No partners yet — add one to start.</span>
            ) : (
              <div className="grid grid-2">
                {members.map((m) => (
                  <div key={m.client.id} className="card" style={{ background: 'var(--surface-2)' }}>
                    <div className="card-pad">
                      <div className="row" style={{ gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="row" style={{ gap: 12 }}>
                          <div className="avatar">{initials(m.client.first_name, m.client.last_name)}</div>
                          <div>
                            <div className="t-strong">{m.client.first_name} {m.client.last_name}</div>
                            <div className="faint" style={{ fontSize: 12 }}>{m.client.occupation || 'Client'}</div>
                          </div>
                        </div>
                        <Link to={`/clients/${m.client.id}`} className="btn sm ghost">Open →</Link>
                      </div>
                      <dl className="kv" style={{ marginTop: 12 }}>
                        <dt>Email</dt><dd>{m.client.email || '—'}</dd>
                        <dt>Phone</dt><dd>{m.client.phone || '—'}</dd>
                        <dt>Date of birth</dt><dd>{fmtDate(m.client.date_of_birth)}</dd>
                        <dt>Net worth</dt><dd>{currency(sumAssets(m) - sumLiab(m))}</dd>
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* One combined breakdown — every asset/debt/etc. once, with its owner shown. */}
        <div style={{ marginTop: 18 }}>
          <FinancialBreakdown data={combined} owners={owners} reload={load} showSummary={false} showEstate={false} />
        </div>

        {/* Household documents — uploaded files inform the plan generator. */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>📄 Documents</h3><span className="muted">{documents.length} file(s)</span></div>
          <div className="card-pad">
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              Add the household's documents here (statements, profiles, spreadsheets). The plan generator reads them
              when building plans for this household.
            </p>
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <Select label="Attach uploads to"
                options={[{ value: '__joint__', label: 'Joint / Household' },
                  ...members.map((m) => ({ value: m.client.id, label: `${m.client.first_name} ${m.client.last_name}` }))]}
                value={attachTo} onChange={(e) => setAttachTo(e.target.value)} />
            </div>
            <div
              className={`dropzone ${docDrag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDocDrag(true); }}
              onDragLeave={() => setDocDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDocDrag(false); uploadDocs(e.dataTransfer.files); }}
              onClick={() => !docUploading && fileRef.current?.click()}
            >
              <div className="dz-ico">{docUploading ? <Spinner /> : '⬆️'}</div>
              <h3 style={{ margin: '10px 0 4px' }}>{docUploading ? 'Uploading…' : 'Drag & drop documents for this household'}</h3>
              <div className="muted">{docUploading ? 'Extracting text…' : 'or click to browse · PDF, DOC, DOCX, XLSX, XLS, CSV, TXT'}</div>
              <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
                onChange={(e) => uploadDocs(e.target.files)} />
            </div>
          </div>
          <DataTable columns={[
            { key: 'original_name', header: 'File', render: (r) => <span className="t-strong">{r.original_name}</span> },
            { key: 'owner', header: 'Owner', render: (r) => <span className="badge blue">{r.client_id ? memberName(r.client_id) : 'Joint'}</span> },
            { key: 'doc_type', header: 'Type', render: (r) => <Badge tone="blue" value={r.doc_type} /> },
            { key: 'scan_status', header: 'Scan', render: (r) => <Badge value={r.scan_status} /> },
            { key: 'created_at', header: 'Uploaded', render: (r) => fmtDate(r.created_at) },
            { key: '_a', header: '', render: (r) => (
              <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <a className="btn sm ghost" href={api.downloadUrl(r.id)}>Download</a>
                <button className="btn sm danger" onClick={() => removeDoc(r)}>Delete</button>
              </div>
            ) },
          ]} rows={documents} empty={<Empty icon="📄" title="No documents yet">Drop files above to add them to this household.</Empty>} />
        </div>
      </div>

      {showAdd && (
        <AddPartnerModal groupId={id} memberIds={members.map((m) => m.client.id)}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); toast('Partner added', 'success'); }} />
      )}
    </>
  );
}

function AddPartnerModal({ groupId, memberIds, onClose, onSaved }) {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [linkId, setLinkId] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/clients').then(setClients).catch(() => setClients([])); }, []);

  // Existing clients not already in this household are linkable.
  const linkable = clients.filter((c) => !memberIds.includes(c.id));

  const submit = async () => {
    setSaving(true);
    try {
      if (linkId) {
        await api.put(`/clients/${linkId}`, { group_id: groupId });
      } else if (first && last) {
        await api.post('/clients', { first_name: first, last_name: last, group_id: groupId, status: 'active' });
      } else {
        toast('Pick an existing client or enter a name', 'error');
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Partner to Household" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add Partner'}</button>
      </>}>
      <p className="muted" style={{ marginTop: 0 }}>Link an existing client, or create a brand-new partner.</p>
      <Select label="Link existing client" placeholder="— Select a client —"
        options={linkable.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
        value={linkId} onChange={(e) => setLinkId(e.target.value)} />
      <div className="muted" style={{ textAlign: 'center', margin: '10px 0' }}>— or create new —</div>
      <div className="form-grid">
        <TextInput label="First name" value={first} onChange={(e) => setFirst(e.target.value)} disabled={Boolean(linkId)} />
        <TextInput label="Last name" value={last} onChange={(e) => setLast(e.target.value)} disabled={Boolean(linkId)} />
      </div>
    </Modal>
  );
}
