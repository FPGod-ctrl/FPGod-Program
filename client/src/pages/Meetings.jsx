import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { date, dateTime } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { Select, TextInput, TextArea } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

const EMAIL_STATUS = ['draft', 'approved', 'sent'];

export default function Meetings() {
  const [transcripts, setTranscripts] = useState(null);
  const [emails, setEmails] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [viewTranscript, setViewTranscript] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const toast = useToast();

  const loadTranscripts = () => api.get('/transcripts').then(setTranscripts).catch(() => setTranscripts([]));
  const loadEmails = (selectId) => api.get('/emails').then((rows) => {
    setEmails(rows);
    if (selectId) { const f = rows.find((e) => e.id === selectId); if (f) selectEmail(f); }
  }).catch(() => setEmails([]));

  useEffect(() => {
    loadTranscripts();
    loadEmails();
    api.get('/clients').then(setClients).catch(() => setClients([]));
  }, []);

  const selectEmail = (e) => { setSelectedEmail(e); setEditBody(e.body || ''); setEditSubject(e.subject || ''); };

  const generateEmail = async (transcript) => {
    toast('Generating follow-up email…');
    try {
      const email = await api.post('/emails/generate', { transcriptId: transcript.id });
      loadEmails(email.id);
      toast(email.ai ? 'Email generated' : 'Generated (AI off — stub)', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const saveEmail = async () => {
    try {
      const u = await api.put(`/emails/${selectedEmail.id}`, { subject: editSubject, body: editBody });
      setSelectedEmail(u); loadEmails(); toast('Email saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const setStatus = async (status) => {
    try { const u = await api.put(`/emails/${selectedEmail.id}`, { status }); setSelectedEmail(u); loadEmails(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const onChatUpdate = (body) => { setSelectedEmail((e) => ({ ...e, body })); setEditBody(body); loadEmails(); };

  return (
    <>
      <PageHeader title="Meetings & Emails"
        sub="Upload transcripts and generate AI follow-up emails"
        actions={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add Transcript</button>} />
      <div className="content">
        <div className="split">
          <div className="stack">
            {/* Transcripts */}
            <div className="card">
              <div className="card-head"><h3>Meeting Transcripts</h3><span className="muted">{transcripts?.length || 0}</span></div>
              {transcripts == null ? <Loading /> : transcripts.length === 0 ? (
                <Empty icon="🎙️" title="No transcripts yet">Add a transcript to generate a follow-up email.</Empty>
              ) : transcripts.map((t) => (
                <div key={t.id} className="row between" style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => setViewTranscript(t)}>
                    <div className="t-strong">{t.title}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{date(t.meeting_date)}</div>
                  </div>
                  <button className="btn sm accent" onClick={() => generateEmail(t)}>✨ Generate Email</button>
                </div>
              ))}
            </div>

            {/* Emails list */}
            <div className="card">
              <div className="card-head"><h3>Follow-up Emails</h3><span className="muted">{emails?.length || 0}</span></div>
              {emails == null ? <Loading /> : emails.length === 0 ? (
                <Empty icon="✉️" title="No emails yet" />
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {emails.map((e) => (
                    <div key={e.id} className="row between" onClick={() => selectEmail(e)}
                      style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        background: selectedEmail?.id === e.id ? 'var(--primary-soft)' : 'transparent' }}>
                      <div><div className="t-strong">{e.subject || '(no subject)'}</div>
                        <div className="faint" style={{ fontSize: 12 }}>{dateTime(e.updated_at)}</div></div>
                      <Badge value={e.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email editor */}
            {selectedEmail && (
              <div className="card">
                <div className="card-head">
                  <h3 style={{ margin: 0 }}>Edit Email</h3>
                  <div className="row" style={{ gap: 8 }}>
                    <select value={selectedEmail.status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }}>
                      {EMAIL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn sm primary" onClick={saveEmail}>Save</button>
                  </div>
                </div>
                <div className="card-pad">
                  <TextInput label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                  <TextArea label="Body" value={editBody} onChange={(e) => setEditBody(e.target.value)} style={{ minHeight: 300 }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'sticky', top: 78 }}>
            <ChatPanel targetType="email" targetId={selectedEmail?.id} onUpdate={onChatUpdate} />
          </div>
        </div>
      </div>

      {viewTranscript && (
        <Modal title={viewTranscript.title} wide onClose={() => setViewTranscript(null)}
          footer={<>
            <button className="btn accent" onClick={() => { generateEmail(viewTranscript); setViewTranscript(null); }}>✨ Generate Email</button>
            <button className="btn primary" onClick={() => setViewTranscript(null)}>Close</button>
          </>}>
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
