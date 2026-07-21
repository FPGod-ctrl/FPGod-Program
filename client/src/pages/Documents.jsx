import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { date, fileSize, titleCase } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { Select } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import OutlookScan from '../components/OutlookScan.jsx';

const DOC_TYPES = ['client_profile', 'statement', 'tax', 'identification', 'insurance', 'estate', 'plan', 'other'];

export default function Documents() {
  const [docs, setDocs] = useState(null);
  const [clients, setClients] = useState([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [docType, setDocType] = useState('statement');
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef(null);
  const toast = useToast();

  const load = () => api.get('/documents').then(setDocs).catch(() => setDocs([]));
  useEffect(() => {
    load();
    api.get('/clients').then(setClients).catch(() => setClients([]));
  }, []);

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        if (clientId) fd.append('client_id', clientId);
        fd.append('doc_type', docType);
        await api.upload('/documents', fd);
      }
      toast(`${files.length} document(s) uploaded`, 'success');
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    upload(Array.from(e.dataTransfer.files));
  };

  const scan = async (doc) => {
    toast('Scanning document…');
    try {
      const res = await api.post(`/documents/${doc.id}/scan`);
      setViewing(res);
      load();
      toast(res.ai ? 'AI scan complete' : 'Heuristic scan complete (AI off)', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;
    try { await api.del(`/documents/${doc.id}`); load(); toast('Deleted', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  const cols = [
    { key: 'original_name', header: 'File', render: (r) => (
      <div><div className="t-strong">{r.original_name}</div>
        <div className="faint" style={{ fontSize: 12 }}>{fileSize(r.size_bytes)}</div></div>
    ) },
    { key: 'doc_type', header: 'Type', render: (r) => <Badge tone="blue" value={r.doc_type} /> },
    { key: 'scan_status', header: 'Scan', render: (r) => <Badge value={r.scan_status} /> },
    { key: 'created_at', header: 'Uploaded', render: (r) => date(r.created_at) },
    { key: 'actions', header: '', render: (r) => (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn sm" onClick={(e) => { e.stopPropagation(); scan(r); }}>Scan</button>
        <a className="btn sm ghost" href={api.downloadUrl(r.id)} onClick={(e) => e.stopPropagation()}>Download</a>
        <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); remove(r); }}>Delete</button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Documents" sub="Upload statements & paperwork — AI extracts the details" />
      <div className="content stack">
        <div className="card card-pad">
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Select label="Attach to client" placeholder="— Unassigned —"
              options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
              value={clientId} onChange={(e) => setClientId(e.target.value)} />
            <Select label="Document type" options={DOC_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
              value={docType} onChange={(e) => setDocType(e.target.value)} />
          </div>
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="dz-ico">{uploading ? <Spinner /> : '⬆️'}</div>
            <h3 style={{ margin: '10px 0 4px' }}>{uploading ? 'Uploading…' : 'Drag & drop files here'}</h3>
            <div className="muted">or click to browse · PDF, DOC, DOCX, TXT</div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={(e) => upload(Array.from(e.target.files))} />
          </div>
        </div>

        <OutlookScan clientId={clientId} docType={docType} onIngested={load} />

        <div className="card">
          <div className="card-head"><h3>All Documents</h3><span className="muted">{docs?.length || 0} files</span></div>
          {docs == null ? <Loading /> :
            <DataTable columns={cols} rows={docs} onRowClick={(r) => setViewing(r)}
              empty={<Empty icon="📄" title="No documents yet">Upload your first document above.</Empty>} />}
        </div>
      </div>

      {viewing && (
        <Modal title={viewing.original_name || 'Document'} wide onClose={() => setViewing(null)}
          footer={<button className="btn primary" onClick={() => setViewing(null)}>Close</button>}>
          <h4>Extracted fields</h4>
          {viewing.scan_result ? (
            <pre style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 12.5 }}>
              {JSON.stringify(viewing.scan_result, null, 2)}
            </pre>
          ) : <p className="muted">Not scanned yet. Click “Scan” to extract structured data.</p>}
          {viewing.extracted_text && (
            <>
              <h4 style={{ marginTop: 18 }}>Extracted text (preview)</h4>
              <div className="muted" style={{ maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 12.5,
                background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                {viewing.extracted_text.slice(0, 4000) || '(empty)'}
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
