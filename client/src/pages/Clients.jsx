import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, initials } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import ClientForm from '../components/ClientForm.jsx';

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [showClient, setShowClient] = useState(false);
  const [imported, setImported] = useState(null);   // everything a scanned profile produced
  const [drag, setDrag] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const nav = useNavigate();
  const toast = useToast();

  const load = () => api.get('/clients').then(setClients).catch(() => setClients([]));
  useEffect(() => { load(); }, []);

  // Drag a client profile onto the page → AI extracts the whole file → open the
  // create form pre-filled. Saving writes the personal details AND every list
  // the scan found, so the new client page opens fully populated.
  const importFromFile = async (files) => {
    const file = files?.[0];
    if (!file || importing) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/clients/import', fd);
      if (!res.ai) toast('Read in offline mode — double-check every field', 'info');
      setImported(res.parsed || {});
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
        actions={<button className="btn primary" onClick={() => { setImported(null); setShowClient(true); }}>+ New Client</button>}
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
          <div className="muted">
            {importing
              ? 'Reading personal details, family, holdings, assets, debts, income, insurance and goals…'
              : 'or click to browse · PDF, DOC, DOCX, XLSX, XLS, CSV, TXT — everything found is pre-filled for review before saving'}
          </div>
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
        <ClientForm parsed={imported}
          onClose={() => setShowClient(false)}
          onSaved={(created) => {
            setShowClient(false); setImported(null);
            if (created?.id) nav(`/clients/${created.id}`); else { toast('Client saved', 'success'); load(); }
          }} />
      )}
    </>
  );
}

