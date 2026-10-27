import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Loading } from '../../components/ui/Loading.jsx';
import { TextInput, Field } from '../../components/ui/Field.jsx';
import SharePointPicker from '../../components/crm/SharePointPicker.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import DocStep from './DocStep.jsx';
import SoaDraft from './SoaDraft.jsx';
import PackTab from './PackTab.jsx';
import { FileRow } from './parts.jsx';
import { reveal } from './wb.js';
import ClientCheck from './ClientCheck.jsx';

const TABS = [
  { key: 'files', label: 'Client files', num: '📁' },
  { key: 'notes', label: 'Initial Meeting Notes', num: 1, has: 'meeting_notes' },
  { key: 'ff', label: 'Fact Find', num: 2, has: 'fact_find' },
  { key: 'brief', label: 'SOA Notes', num: 3, has: 'soa_notes' },
  { key: 'soa', label: 'SOA', num: 4, has: 'soa' },
  { key: 'pack', label: 'SOA Pack', num: 5, has: 'pack' },
];

const outputsFor = (files, re) => files.filter((f) => re.test(f.name));

function FilesTab({ wb, files, onRefresh }) {
  const [q, setQ] = useState('');
  const toast = useToast();
  if (!files) return <div className="card card-pad"><Loading /></div>;
  const match = (f) => !q.trim() || `${f.name} ${f.within}`.toLowerCase().includes(q.toLowerCase());
  const sp = files.sharepoint;
  const open = (target) => reveal(wb.id, { target }).catch((e) => toast(e.message, 'error'));
  return (
    <div className="stack">
      <div className="row">
        <input type="search" placeholder="Filter files…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={onRefresh}>↻ Refresh</button>
      </div>
      <div className="card card-pad">
        <div className="row between" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Case folder</h3>
            <div className="small faint">{files.case.path} · what this program has built</div>
          </div>
          <button className="btn sm" onClick={() => open('case-folder')}>📂 Open</button>
        </div>
        {files.case.files.filter(match).length
          ? <div className="file-list">{files.case.files.filter(match).map((f) => <FileRow key={f.relPath} caseId={wb.id} file={f} />)}</div>
          : <div className="faint small">Nothing built yet. Start with the Initial Meeting Notes.</div>}
      </div>
      <div className="card card-pad">
        <div className="row between" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>SharePoint: {sp.folder || 'not linked'}</h3>
            <div className="small faint">Read only. Nothing here is ever changed by this program.</div>
          </div>
          {sp.linked && !sp.missing && <button className="btn sm" onClick={() => open('sharepoint-folder')}>📂 Open</button>}
        </div>
        {!sp.linked && <div className="faint small">Link the client’s SharePoint folder on the Details tab.</div>}
        {sp.linked && !sp.available && <div className="alert amber small">The SharePoint library is not synced to this computer.</div>}
        {sp.missing && <div className="alert red small">No folder called “{sp.folder}” in SharePoint Clients.</div>}
        {sp.files.filter(match).length > 0 && (
          <div className="file-list">{sp.files.filter(match).slice(0, 400).map((f) => <FileRow key={f.relPath} caseId={wb.id} file={f} />)}</div>
        )}
      </div>
    </div>
  );
}

function DetailsTab({ wb, onSaved }) {
  const [f, setF] = useState(() => ({
    first_name: wb.first_name || '', last_name: wb.last_name || '',
    partner_first_name: wb.partner_first_name || '', partner_last_name: wb.partner_last_name || '',
    email: wb.email || '', phone: wb.phone || '', adviser: wb.adviser || '', referral_source: wb.referral_source || '',
    sharepoint_folder: wb.sharepoint_folder || '', adviser_notes: wb.adviser_notes || '',
  }));
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try { onSaved(await api.patch(`/workbench/cases/${wb.id}`, f)); toast('Saved', 'success'); } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const archive = async () => {
    const r = await api.patch(`/workbench/cases/${wb.id}`, { archived: !wb.archived });
    onSaved(r);
    toast(r.archived ? 'Archived' : 'Restored', 'success');
  };
  return (
    <div className="card card-pad">
      <h3>Client details</h3>
      <div className="form-grid">
        <TextInput label="First name" value={f.first_name} onChange={set('first_name')} />
        <TextInput label="Surname" value={f.last_name} onChange={set('last_name')} />
        <TextInput label="Partner first name" value={f.partner_first_name} onChange={set('partner_first_name')} />
        <TextInput label="Partner surname" value={f.partner_last_name} onChange={set('partner_last_name')} />
        <TextInput label="Mobile" value={f.phone} onChange={set('phone')} />
        <TextInput label="Email" value={f.email} onChange={set('email')} />
        <TextInput label="Adviser" value={f.adviser} onChange={set('adviser')} />
        <TextInput label="Referred by" value={f.referral_source} onChange={set('referral_source')} />
      </div>
      <Field label="SharePoint client folder" hint={f.sharepoint_folder ? `Linked: ${f.sharepoint_folder}` : 'Read only'}>
        <SharePointPicker suggest={f.last_name} value={f.sharepoint_folder} onPick={(v) => setF((x) => ({ ...x, sharepoint_folder: v }))} />
      </Field>
      <Field label="Adviser notes" hint="Given to Claude with every document. They take precedence over the transcript.">
        <textarea value={f.adviser_notes} onChange={set('adviser_notes')} style={{ minHeight: 100 }} />
      </Field>
      <div className="small faint" style={{ marginBottom: 12 }}>Case folder name: {wb.case_name} · File names use “{wb.short_name}”</div>
      <div className="row">
        <button className="btn primary" disabled={busy} onClick={save}>Save</button>
        <div className="spacer" />
        <button className="btn danger" onClick={archive}>{wb.archived ? 'Restore client' : 'Archive client'}</button>
      </div>
    </div>
  );
}

export default function CaseView() {
  const { id } = useParams();
  const [wb, setWb] = useState(null);
  const [meta, setMeta] = useState(null);
  const [files, setFiles] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [look, setLook] = useState(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'notes';
  const toast = useToast();

  const loadFiles = useCallback(() => api.get(`/workbench/cases/${id}/files`).then(setFiles).catch(() => {}), [id]);
  const load = useCallback(() => api.get(`/workbench/cases/${id}`).then((r) => {
    setWb(r);
    setTranscript(r.transcript || '');
    setMeetingDate(r.meeting_date || '');
  }), [id]);
  const loadLook = useCallback(() => api.get(`/workbench/cases/${id}/lookup`).then(setLook).catch(() => setLook(null)), [id]);
  const refresh = () => { load(); loadFiles(); };

  useEffect(() => { api.get('/workbench/meta').then(setMeta).catch(() => {}); }, []);
  useEffect(() => { load(); loadFiles(); loadLook(); }, [load, loadFiles, loadLook]);

  if (!wb) return <><PageHeader title="Client" /><div className="content"><Loading /></div></>;

  const caseFiles = files?.case.files || [];
  const linkFolder = (folder) => api.patch(`/workbench/cases/${id}`, { sharepoint_folder: folder })
    .then((r) => { setWb(r); loadFiles(); loadLook(); toast(folder ? `Linked to ${folder}` : 'SharePoint folder unlinked', 'success'); })
    .catch((e) => toast(e.message, 'error'));
  const existing = Boolean(wb.sharepoint_folder) || look?.existing;
  const setStage = (stage) => api.patch(`/workbench/cases/${id}`, { stage }).then(setWb).catch((e) => toast(e.message, 'error'));
  const saveTranscript = () => {
    if ((transcript || '') === (wb.transcript || '') && (meetingDate || '') === (wb.meeting_date || '')) return;
    api.patch(`/workbench/cases/${id}`, { transcript, meeting_date: meetingDate || null }).then(setWb).catch((e) => toast(e.message, 'error'));
  };

  const transcriptNote = !wb.has.transcript && (
    <div className="alert amber small" style={{ marginBottom: 12 }}>
      No transcript yet. Paste it on the <button className="btn ghost sm" onClick={() => setParams({ tab: 'notes' })}>Initial Meeting Notes</button> step.
    </div>
  );

  return (
    <>
      <PageHeader
        title={wb.display_name}
        sub={<><Link to="/">Clients</Link> / {wb.case_name}</>}
        actions={(
          <>
            {wb.sharepoint_folder && <button className="btn" onClick={() => reveal(id, { target: 'sharepoint-folder' })}>📁 SharePoint</button>}
            <button className="btn" onClick={() => reveal(id, { target: 'case-folder' })}>📂 Case folder</button>
          </>
        )}
      />
      <div className="content">
        <div className="card case-head">
          <div className="wb-avatar" style={{ width: 46, height: 46, fontSize: 16 }}>
            {`${(wb.first_name || '')[0] || ''}${(wb.partner_first_name || wb.last_name || '')[0] || ''}`.toUpperCase()}
          </div>
          <div>
            <h2>{wb.display_name}</h2>
            <div className="meta">
              <span>👤 {wb.adviser || 'No adviser'}</span>
              {wb.phone && <span>📱 {wb.phone}</span>}
              {wb.email && <span>✉ {wb.email}</span>}
              <span>{wb.sharepoint_folder ? `📁 ${wb.sharepoint_folder}` : '📁 SharePoint not linked'}</span>
              {look && <span className={`badge ${existing ? 'teal' : 'green'}`}>{existing ? 'Existing client' : 'New client'}</span>}
              {wb.archived && <span className="badge amber">Archived</span>}
            </div>
          </div>
          <div className="spacer" />
          <label className="small muted">Stage</label>
          <select value={wb.stage} onChange={(e) => setStage(e.target.value)}>
            {(meta?.stages || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className={`btn ${tab === 'details' ? 'primary' : ''}`} onClick={() => setParams({ tab: 'details' })}>✎ Details</button>
        </div>

        <div className="steps">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`step ${tab === t.key ? 'active' : ''} ${t.has && wb.has[t.has] ? 'done' : ''}`}
              onClick={() => setParams({ tab: t.key })}
            >
              <span className="num">{t.has && wb.has[t.has] ? '✓' : t.num}</span>
              <span>
                <div className="lbl">{t.label}</div>
                <div className="st">{t.key === 'files' ? `${caseFiles.length + (files?.sharepoint.files.length || 0)} files` : t.has && wb.has[t.has] ? 'Done' : 'To do'}</div>
              </span>
            </button>
          ))}
        </div>

        {tab === 'files' && <FilesTab wb={wb} files={files} onRefresh={loadFiles} />}
        {tab === 'details' && <DetailsTab key={wb.updated_at} wb={wb} onSaved={(r) => { setWb(r); loadFiles(); loadLook(); }} />}

        {tab === 'notes' && (
          <DocStep
            wb={wb} kind="cds" icon="📝" title="Initial Meeting Notes"
            blurb="Paste the transcript of the initial meeting. The program first checks whether they are an existing client (in the program or with a SharePoint client file). Claude then writes the Client Details Summary in the house style (circumstances only, TBC where something was not said), builds the Word document and PDF, and copies both to Downloads."
            outputs={outputsFor(caseFiles, /Initial Meeting Notes/i)}
            onChanged={refresh}
          >
            {({ generate, busy }) => (
              <>
                <ClientCheck result={look} linked={wb.sharepoint_folder} onLink={linkFolder} readSharePoint={meta?.readSharePoint} />
                <div className="form-grid" style={{ gridTemplateColumns: '220px 1fr' }}>
                  <TextInput label="Meeting date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} onBlur={saveTranscript} />
                </div>
                <Field label="Meeting transcript" hint={`${transcript.length.toLocaleString()} characters · saved when you click away`}>
                  <textarea className="transcript-box" value={transcript} onChange={(e) => setTranscript(e.target.value)} onBlur={saveTranscript} placeholder="Paste the full transcript here…" />
                </Field>
                <button className="btn primary" disabled={busy || !transcript.trim()} onClick={() => generate({ transcript, meeting_date: meetingDate || undefined })}>
                  {busy ? 'Working… (a minute or two)' : wb.has.meeting_notes ? '↻ Re-generate meeting notes' : '✨ Generate Initial Meeting Notes'}
                </button>
              </>
            )}
          </DocStep>
        )}

        {tab === 'ff' && (
          <DocStep
            wb={wb} kind="ff" icon="🗂️" title="Fact Find"
            blurb="Fills the firm's 2026 Fact Find from the same transcript (and the meeting notes, if built): second-person story and goals, TBC for anything that should be known, DOBs and addresses in house format. Known facts are pulled from the SharePoint folder when one is linked."
            outputs={outputsFor(caseFiles, /Fact Find/i)}
            onChanged={refresh}
            generateLabel="✨ Generate Fact Find"
          >
            {transcriptNote}
          </DocStep>
        )}

        {tab === 'brief' && (
          <DocStep
            wb={wb} kind="soa-notes" icon="🧭" title="SOA Notes"
            blurb="The draft SOA Notes: the brief to Howard (what to quote, documents to obtain, what is still TBC) plus the SOA notes by section. Undecided points are left as [ADVISER TO CONFIRM]. When it's built, the case moves to “With paraplanner”."
            outputs={outputsFor(caseFiles, /SOA Notes/i)}
            onChanged={refresh}
            generateLabel="✨ Generate SOA Notes brief"
          >
            {!wb.has.fact_find && <div className="alert amber small" style={{ marginBottom: 12 }}>Tip: build the Fact Find first; the brief lists its TBCs.</div>}
          </DocStep>
        )}

        {tab === 'soa' && <SoaDraft wb={wb} outputs={outputsFor(caseFiles, /Statement of Advice/i)} onChanged={refresh} />}
        {tab === 'pack' && <PackTab wb={wb} onChanged={refresh} />}
      </div>
    </>
  );
}
