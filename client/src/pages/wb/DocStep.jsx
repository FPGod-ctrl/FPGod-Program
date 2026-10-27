import { useEffect, useState } from 'react';
import { DataPreview, FileRow, RunLog, useRun } from './parts.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../api/client.js';

const DATA_KEY = { cds: 'cds_json', ff: 'ff_json', 'soa-notes': 'soa_notes_json' };

/**
 * One generated document: Initial Meeting Notes (cds), Fact Find (ff) or the
 * SOA Notes brief (soa-notes). Generate with Claude, preview, hand-edit the
 * data and rebuild, open the Word/PDF output.
 */
export default function DocStep({ wb, kind, title, icon, blurb, outputs, onChanged, children, generateLabel }) {
  const job = useRun();
  const toast = useToast();
  const data = wb[DATA_KEY[kind]];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [warnings, setWarnings] = useState([]);

  useEffect(() => { setEditing(false); }, [kind]);

  const generate = async (extraBody = {}) => {
    if (data && !window.confirm(`Re-generate the ${title}? This replaces the current version (the Word file is rebuilt).`)) return;
    setWarnings([]);
    const r = await job.run(`/workbench/cases/${wb.id}/generate/${kind}`, extraBody);
    if (r) {
      setWarnings(r.warnings || []);
      toast(`${title} built${r.copiedToDownloads ? ' and copied to Downloads' : ''}`, 'success');
      onChanged();
    }
  };

  const startEdit = () => { setDraft(JSON.stringify(data, null, 2)); setEditing(true); };
  const saveEdit = async () => {
    let parsed;
    try { parsed = JSON.parse(draft); } catch { toast('That is not valid JSON', 'error'); return; }
    const r = await job.run(`/workbench/cases/${wb.id}/data/${kind}`, { data: parsed });
    if (r) {
      setWarnings(r.warnings || []);
      setEditing(false);
      toast(`${title} rebuilt`, 'success');
      onChanged();
    }
  };

  // Expose generate() to the parent's controls (the transcript panel).
  const controls = typeof children === 'function' ? children({ generate, busy: job.busy }) : children;

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="panel-title"><span style={{ fontSize: 20 }}>{icon}</span><h3>{title}</h3>
          {data && <span className="badge green">Built</span>}
        </div>
        <p className="panel-blurb">{blurb}</p>
        {controls}
        {typeof children !== 'function' && (
          <div className="row">
            <button className="btn primary" disabled={job.busy} onClick={() => generate()}>
              {job.busy ? 'Working…' : data ? `↻ Re-generate` : (generateLabel || `✨ Generate ${title}`)}
            </button>
          </div>
        )}
        <RunLog job={job} />
        {warnings.map((w, i) => <div key={i} className="alert amber small" style={{ marginTop: 8 }}>{w}</div>)}
      </div>

      {outputs.length > 0 && (
        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Documents</h3>
            <span className="small faint">In the case folder (legacy\soa). Move to SharePoint yourself when it is right.</span>
          </div>
          <div className="file-list">
            {outputs.map((f) => (
              <FileRow
                key={f.relPath}
                caseId={wb.id}
                file={f}
                extra={(
                  <button
                    className="btn sm ghost"
                    title="Copy to Downloads"
                    onClick={() => api.post(`/workbench/cases/${wb.id}/copy-to-downloads`, { path: f.relPath })
                      .then(() => toast('Copied to Downloads', 'success')).catch((e) => toast(e.message, 'error'))}
                  >⬇</button>
                )}
              />
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{editing ? 'Edit the data' : 'Preview'}</h3>
            <div className="row" style={{ gap: 8 }}>
              {editing ? (
                <>
                  <button className="btn ghost sm" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn primary sm" disabled={job.busy} onClick={saveEdit}>Save &amp; rebuild</button>
                </>
              ) : <button className="btn sm" onClick={startEdit}>✎ Edit</button>}
            </div>
          </div>
          {editing
            ? <textarea className="json-box" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
            : <DataPreview kind={kind} data={data} />}
        </div>
      )}
    </div>
  );
}
