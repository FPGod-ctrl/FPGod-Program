import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { date } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { Select, TextInput, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function Meetings() {
  const [transcripts, setTranscripts] = useState(null);
  const [clients, setClients] = useState([]);
  const [viewTranscript, setViewTranscript] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();

  const loadTranscripts = () => api.get('/transcripts').then(setTranscripts).catch(() => setTranscripts([]));

  useEffect(() => {
    loadTranscripts();
    api.get('/clients').then(setClients).catch(() => setClients([]));
  }, []);

  return (
    <>
      <PageHeader title="Meetings"
        sub="Meeting transcripts — the source for client documents"
        actions={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add Transcript</button>} />
      <div className="content">
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Meeting Transcripts</h3><span className="muted">{transcripts?.length || 0}</span></div>
            {transcripts == null ? <Loading /> : transcripts.length === 0 ? (
              <Empty icon="🎙️" title="No transcripts yet">Add a transcript to work from it.</Empty>
            ) : transcripts.map((t) => (
              <div key={t.id} className="row between" style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => setViewTranscript(t)}>
                  <div className="t-strong">{t.title}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{date(t.meeting_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {viewTranscript && (
        <Modal title={viewTranscript.title} wide onClose={() => setViewTranscript(null)}
          footer={<button className="btn primary" onClick={() => setViewTranscript(null)}>Close</button>}>
          {viewTranscript.summary && <><h4>Summary</h4><p className="muted">{viewTranscript.summary}</p></>}
          <h4>Transcript</h4>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, maxHeight: 360, overflow: 'auto',
            background: 'var(--surface-2)', padding: 14, borderRadius: 8 }}>{viewTranscript.content}</div>
        </Modal>
      )}

      {showAdd && (
        <TranscriptForm clients={clients} onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadTranscripts(); toast('Transcript added', 'success'); }} />
      )}
    </>
  );
}

function TranscriptForm({ clients, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', client_id: '', meeting_date: '', content: '', summary: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.content.trim()) { toast('Transcript content is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/transcripts', payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Meeting Transcript" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add Transcript'}</button>
      </>}>
      <div className="form-grid">
        <TextInput label="Title" placeholder="Q2 Review" value={f.title} onChange={set('title')} />
        <TextInput label="Meeting date" type="date" value={f.meeting_date} onChange={set('meeting_date')} />
      </div>
      <Select label="Client" placeholder="— Unassigned —"
        options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
        value={f.client_id} onChange={set('client_id')} />
      <TextArea label="Transcript content *" placeholder="Paste the meeting transcript…" value={f.content}
        onChange={set('content')} style={{ minHeight: 200 }} />
      <TextArea label="Summary (optional)" value={f.summary} onChange={set('summary')} />
    </Modal>
  );
}
