import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, pct, date, titleCase } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { TextInput, Select, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import FinancialBreakdown from '../components/FinancialBreakdown.jsx';
import DocumentReviewModal from '../components/DocumentReviewModal.jsx';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];
const STATUS = ['prospect', 'active', 'inactive', 'archived'];

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [showInv, setShowInv] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [reviewParsed, setReviewParsed] = useState(null); // extracted data awaiting review
  const [showReview, setShowReview] = useState(false);
  const [scanningDocs, setScanningDocs] = useState(false);
  const [scanningDocId, setScanningDocId] = useState(null); // per-document scan in progress
  const [docUploading, setDocUploading] = useState(false);
  const [docDrag, setDocDrag] = useState(false);
  const docFileRef = useRef(null);

  const load = () => api.get(`/clients/${id}/detail`).then(setData).catch(() => setData(false));
  useEffect(() => { setData(null); load(); }, [id]);

  if (data === false) return (<><PageHeader title="Client" /><div className="content"><Empty icon="🚫" title="Client not found" /></div></>);
  if (!data) return (<><PageHeader title="Client" /><div className="content"><Loading /></div></>);

  const { client, current, recommended, plans, transcripts, emails, documents } = data;
  const hasPartner = Boolean(client.partner_first_name || client.partner_last_name);

  const removeClient = async () => {
    if (!window.confirm(`Delete ${client.first_name} ${client.last_name}? This removes all their data.`)) return;
    try { await api.del(`/clients/${id}`); toast('Client deleted', 'success'); nav('/clients'); }
    catch (err) { toast(err.message, 'error'); }
  };

  // Scan every document already attached to this client, merge what the AI finds,
  // and open the edit form pre-filled for review (review-then-save).
  const fillFromDocuments = async () => {
    if (scanningDocs) return;
    setScanningDocs(true);
    toast(`Reading ${documents.length} document${documents.length === 1 ? '' : 's'}…`);
    try {
      const res = await api.post(`/clients/${id}/scan-documents`);
      if (!res.ai) toast('Read in offline mode — please double-check every field', 'info');
      setReviewParsed({ ...res.parsed, scanned: res.scanned });
      setShowReview(true);
    } catch (err) { toast(err.message, 'error'); }
    finally { setScanningDocs(false); }
  };

  // Scan a single document and open the review screen with what it found.
  const scanDocAndFill = async (doc) => {
    if (scanningDocId) return;
    setScanningDocId(doc.id);
    toast(`Reading ${doc.original_name}…`);
    try {
      const res = await api.post(`/documents/${doc.id}/scan`);
      if (res.ai === false) toast('Read in offline mode — please double-check every field', 'info');
      setReviewParsed(res.scan_result || {});
      setShowReview(true);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setScanningDocId(null); }
  };

  // Upload one or more documents straight onto this client, then auto-fill the
  // client's details from them (a single file fills from itself; multiple files
  // merge across everything on file).
  const uploadToClient = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || docUploading) return;
    setDocUploading(true);
    try {
      let lastDoc = null;
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('client_id', id);
        fd.append('doc_type', 'client_profile');
        lastDoc = await api.upload('/documents', fd);
      }
      toast(`${files.length} document${files.length === 1 ? '' : 's'} uploaded — reading…`, 'success');
      load();
      if (files.length === 1 && lastDoc) await scanDocAndFill(lastDoc);
      else await fillFromDocuments();
    } catch (err) { toast(err.message, 'error'); }
    finally {
      setDocUploading(false);
      if (docFileRef.current) docFileRef.current.value = '';
    }
  };

  const removeDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;
    try { await api.del(`/documents/${doc.id}`); load(); toast('Document deleted', 'success'); }
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
          <button className="btn primary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn" onClick={() => setShowImport(true)}>⬆ Fill from Document</button>
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
          <div className="stat green"><div className="stat-label">Partner</div>
            <div className="stat-value" style={{ fontSize: 17, marginTop: 10 }}>{hasPartner ? `${client.partner_first_name || ''} ${client.partner_last_name || ''}`.trim() : 'Individual'}</div></div>
        </div>

        <div className="tabs">
          {['overview', 'investments', 'plans', 'meetings', 'documents'].map((t) => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{titleCase(t)}</div>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="stack">
            <div className="card">
              <div className="card-head"><h3>Personal Details</h3>
                <button className="btn sm ghost" onClick={() => setShowEdit(true)}>Edit</button>
              </div>
              <div className="card-pad">
                <dl className="kv">
                  <dt>Full name</dt><dd>{client.first_name} {client.last_name}</dd>
                  <dt>Email</dt><dd>{client.email || '—'}</dd>
                  <dt>Phone</dt><dd>{client.phone || '—'}</dd>
                  <dt>Address</dt><dd>{client.address || '—'}</dd>
                  <dt>Date of birth</dt><dd>{date(client.date_of_birth)}</dd>
                  <dt>Occupation</dt><dd>{client.occupation || '—'}</dd>
                  <dt>Notes</dt><dd>{client.notes || '—'}</dd>
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Partner / Spouse</h3>
                <button className="btn sm ghost" onClick={() => setShowEdit(true)}>Edit</button></div>
              <div className="card-pad">
                {hasPartner ? (
                  <dl className="kv">
                    <dt>Full name</dt><dd>{client.partner_first_name} {client.partner_last_name}</dd>
                    <dt>Email</dt><dd>{client.partner_email || '—'}</dd>
                    <dt>Phone</dt><dd>{client.partner_phone || '—'}</dd>
                    <dt>Date of birth</dt><dd>{date(client.partner_date_of_birth)}</dd>
                    <dt>Occupation</dt><dd>{client.partner_occupation || '—'}</dd>
                  </dl>
                ) : (
                  <Empty icon="👤" title="No partner on this file">Click Edit to add a husband / wife or partner.</Empty>
                )}
              </div>
            </div>

            <FinancialBreakdown data={data} clientId={id} reload={load} />
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
          <div className="stack">
            <div className="card card-pad">
              <div className="card-head" style={{ padding: 0, marginBottom: 12 }}>
                <h3>Add a document</h3>
                <button className="btn sm primary" onClick={fillFromDocuments}
                  disabled={scanningDocs || docUploading || !documents.length}>
                  {scanningDocs ? 'Reading…' : '✨ Fill from all documents'}
                </button>
              </div>
              <div
                className={`dropzone ${docDrag ? 'drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDocDrag(true); }}
                onDragLeave={() => setDocDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDocDrag(false); uploadToClient(e.dataTransfer.files); }}
                onClick={() => !docUploading && docFileRef.current?.click()}
              >
                <div className="dz-ico">{docUploading || scanningDocId ? <Spinner /> : '⬆️'}</div>
                <h3 style={{ margin: '10px 0 4px' }}>
                  {docUploading ? 'Uploading…' : (scanningDocId ? 'Reading document…' : 'Drag & drop a document for this client')}
                </h3>
                <div className="muted">
                  {docUploading || scanningDocId
                    ? 'It will fill this client’s details automatically'
                    : 'or click to browse · PDF, DOC, DOCX, TXT · auto-fills the client'}
                </div>
                <input ref={docFileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
                  onChange={(e) => uploadToClient(e.target.files)} />
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Documents</h3><span className="muted">{documents.length} file(s)</span></div>
              <DataTable columns={[
                { key: 'original_name', header: 'File', render: (r) => <span className="t-strong">{r.original_name}</span> },
                { key: 'doc_type', header: 'Type', render: (r) => <Badge tone="blue" value={r.doc_type} /> },
                { key: 'scan_status', header: 'Scan', render: (r) => <Badge value={r.scan_status} /> },
                { key: 'created_at', header: 'Uploaded', render: (r) => date(r.created_at) },
                { key: 'actions', header: '', render: (r) => (
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn sm primary" disabled={scanningDocId === r.id}
                      onClick={(e) => { e.stopPropagation(); scanDocAndFill(r); }}>
                      {scanningDocId === r.id ? 'Scanning…' : 'Scan & Fill'}
                    </button>
                    <a className="btn sm ghost" href={api.downloadUrl(r.id)} onClick={(e) => e.stopPropagation()}>Download</a>
                    <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); removeDoc(r); }}>Delete</button>
                  </div>
                ) },
              ]} rows={documents} empty={<Empty icon="📄" title="No documents">Drop a file above to add one.</Empty>} />
            </div>
          </div>
        )}
      </div>

      {showInv && (
        <InvestmentForm clientId={id} onClose={() => setShowInv(false)}
          onSaved={() => { setShowInv(false); load(); toast('Holding added', 'success'); }} />
      )}

      {showImport && (
        <ProfileImportModal onClose={() => setShowImport(false)}
          onParsed={(parsed) => {
            setShowImport(false);
            setReviewParsed(parsed || {});
            setShowReview(true);
          }} />
      )}

      {showReview && (
        <DocumentReviewModal parsed={reviewParsed} client={client} clientId={id}
          onClose={() => { setShowReview(false); setReviewParsed(null); }}
          onSaved={() => { setShowReview(false); setReviewParsed(null); load(); }} />
      )}

      {showEdit && (
        <EditClientForm client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); toast('Client updated', 'success'); }} />
      )}
    </>
  );
}

function ProfileImportModal({ onClose, onParsed }) {
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
    <Modal title="Fill Details from Client Profile" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Cancel</button>}>
      <p className="muted" style={{ marginTop: 0 }}>
        Drag in this client's profile (PDF or Word). The AI reads it and opens the
        <strong> edit form pre-filled</strong> with what it found — nothing is saved until you review and confirm.
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
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files)} />
      </div>
    </Modal>
  );
}

function EditClientForm({ client, overrides, onClose, onSaved }) {
  const fromDoc = Boolean(overrides);
  // Pre-fill from the client's current values; when importing, overlay any
  // fields the document scan found (only non-empty ones win).
  const [f, setF] = useState(() => {
    const base = {
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      occupation: client.occupation ?? '',
      date_of_birth: client.date_of_birth ? String(client.date_of_birth).slice(0, 10) : '',
      risk_profile: client.risk_profile ?? '',
      status: client.status ?? 'prospect',
      annual_income: client.annual_income ?? '',
      net_worth: client.net_worth ?? '',
      partner_first_name: client.partner_first_name ?? '',
      partner_last_name: client.partner_last_name ?? '',
      partner_email: client.partner_email ?? '',
      partner_phone: client.partner_phone ?? '',
      partner_date_of_birth: client.partner_date_of_birth ? String(client.partner_date_of_birth).slice(0, 10) : '',
      partner_occupation: client.partner_occupation ?? '',
      partner_annual_income: client.partner_annual_income ?? '',
      partner_risk_profile: client.partner_risk_profile ?? '',
      notes: client.notes ?? '',
    };
    if (overrides) {
      for (const k of Object.keys(base)) {
        if (overrides[k] != null && overrides[k] !== '') base[k] = String(overrides[k]);
      }
      base.date_of_birth = base.date_of_birth ? String(base.date_of_birth).slice(0, 10) : '';
      base.risk_profile = base.risk_profile.toLowerCase();
      base.partner_date_of_birth = base.partner_date_of_birth ? String(base.partner_date_of_birth).slice(0, 10) : '';
      base.partner_risk_profile = (base.partner_risk_profile || '').toLowerCase();
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.first_name || !f.last_name) { toast('First and last name are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      ['annual_income', 'net_worth', 'partner_annual_income'].forEach((k) => { payload[k] = payload[k] === '' ? null : Number(payload[k]); });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.put(`/clients/${client.id}`, payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={fromDoc ? 'Review Details from Document' : 'Edit Client'} wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </>}>
      {fromDoc && (
        <div className="md" style={{ marginBottom: 14 }}>
          <blockquote style={{ borderLeftColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            ✨ Pre-filled from your document. <strong>Review and edit anything</strong> before saving — only the fields
            below will be written to this client.
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
