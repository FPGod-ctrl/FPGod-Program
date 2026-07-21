import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { date } from '../lib/format.js';
import DataTable from './ui/DataTable.jsx';
import Badge from './ui/Badge.jsx';
import { Empty, Spinner } from './ui/Loading.jsx';
import { TextInput } from './ui/Field.jsx';
import { useToast } from './ui/Toast.jsx';

/**
 * Scan the locally signed-in Outlook desktop mailbox and list recent messages.
 * Read-only — reads via the /api/outlook/scan endpoint (Windows COM). Lets the
 * adviser pull in recent client correspondence without leaving the app.
 */
export default function OutlookScan({ clientId = '', docType = 'other', onIngested }) {
  const [available, setAvailable] = useState(null);
  const [days, setDays] = useState(7);
  const [from, setFrom] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get('/outlook/status').then((s) => setAvailable(s.available)).catch(() => setAvailable(false));
  }, []);

  const scan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (from.trim()) params.set('from', from.trim());
      const res = await api.get(`/outlook/scan?${params.toString()}`);
      setRows(res.messages);
      toast(`Found ${res.count} message(s) in the last ${days} day(s)`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const ingest = async (row) => {
    setBusyId(row.entryId);
    try {
      const res = await api.post('/outlook/ingest', {
        entryId: row.entryId,
        clientId: clientId || null,
        docType,
        autoScan: true,
      });
      if (res.count === 0) {
        toast(res.message || 'No file attachments to ingest', 'info');
      } else {
        const parsed = res.documents.filter((d) => d.scanned).length;
        toast(`Ingested ${res.count} attachment(s)${parsed ? `, ${parsed} AI-scanned` : ''}`, 'success');
        onIngested?.();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cols = [
    { key: 'receivedTime', header: 'Received', width: 150, render: (r) => date(r.receivedTime) },
    { key: 'senderName', header: 'From', render: (r) => (
      <div>
        <div className="t-strong">{r.senderName || r.senderEmail || '—'}</div>
        {r.senderName && r.senderEmail && (
          <div className="faint" style={{ fontSize: 12 }}>{r.senderEmail}</div>
        )}
      </div>
    ) },
    { key: 'subject', header: 'Subject', render: (r) => (
      <div>
        {r.unread ? <strong>{r.subject}</strong> : r.subject || '(no subject)'}
      </div>
    ) },
    { key: 'attachmentNames', header: 'Attachments', render: (r) =>
      r.hasAttachments
        ? <Badge tone="blue" value={`📎 ${r.attachmentNames.length}`} />
        : <span className="faint">—</span>
    },
    { key: 'actions', header: '', render: (r) =>
      r.hasAttachments ? (
        <button className="btn sm" disabled={busyId === r.entryId}
          onClick={(e) => { e.stopPropagation(); ingest(r); }}
          title="Save attachments into Documents and AI-scan them">
          {busyId === r.entryId ? <Spinner /> : 'Ingest'}
        </button>
      ) : null
    },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <h3>Scan Outlook</h3>
        <span className="muted">Recent mail from your desktop Outlook</span>
      </div>
      <div className="card-pad">
        {available === false ? (
          <p className="muted">
            The Outlook connector runs on the Windows desktop host only — it isn’t available here.
          </p>
        ) : (
          <>
            <div className="row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ width: 110 }}>
                <TextInput label="Last N days" type="number" min={1} max={365}
                  value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <TextInput label="From contains (optional)" placeholder="e.g. aia.com"
                  value={from} onChange={(e) => setFrom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && scan()} />
              </div>
              <button className="btn primary" onClick={scan} disabled={loading || available === null}>
                {loading ? <Spinner /> : 'Scan inbox'}
              </button>
            </div>

            {rows != null && (
              <div style={{ marginTop: 14 }}>
                <DataTable columns={cols} rows={rows}
                  empty={<Empty icon="✉️" title="No messages">Nothing in that window — widen the days or clear the filter.</Empty>} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
