import { useState } from 'react';
import { api } from '../../api/client.js';
import { fileSize } from '../../lib/format.js';
import { fileIcon, fileUrl, reveal, relTime } from './wb.js';
import { useToast } from '../../components/ui/Toast.jsx';

/**
 * Run one of the streamed workbench jobs, keeping a visible log of each step
 * (generators run for one to several minutes).
 */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const run = async (path, body) => {
    setBusy(true);
    setError('');
    setLog([]);
    setProgress(null);
    try {
      return await api.postStream(path, body, (evt) => {
        if (evt.type !== 'progress') return;
        setLog((l) => [...l, evt.label]);
        if (evt.total) setProgress({ done: evt.done, total: evt.total });
      });
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, log, progress, error };
}

export function RunLog({ job }) {
  if (!job.log.length && !job.error) return null;
  return (
    <>
      {job.log.length > 0 && (
        <div className="runlog">
          {job.log.map((l, i) => <div key={i}>{i === job.log.length - 1 && job.busy ? '⏳ ' : '✓ '}{l}</div>)}
          {job.progress?.total > 0 && (
            <div className="runbar"><span style={{ width: `${Math.round((job.progress.done / job.progress.total) * 100)}%` }} /></div>
          )}
        </div>
      )}
      {job.error && <div className="alert red">{job.error}</div>}
    </>
  );
}

export function FileRow({ caseId, file, extra }) {
  const toast = useToast();
  const show = () => reveal(caseId, { source: file.source, path: file.relPath }).catch((e) => toast(e.message, 'error'));
  return (
    <div className="file-row">
      <div className="file-ico">{fileIcon(file.name)}</div>
      <div>
        <a className="fname" href={fileUrl(caseId, file)} target="_blank" rel="noreferrer">{file.name}</a>
        {file.within && file.within !== file.name && <div className="fwithin">{file.within}</div>}
      </div>
      <div className="fmeta">
        {file.size ? fileSize(file.size) : ''}{file.modified ? ` · ${relTime(file.modified)}` : ''}
      </div>
      <div className="row" style={{ gap: 6 }}>
        {extra}
        <button className="btn sm ghost" onClick={show} title="Show in Explorer">📂</button>
      </div>
    </div>
  );
}

/** Highlight TBC and [ADVISER TO CONFIRM], as the Word documents do. */
export function Flagged({ text }) {
  const parts = String(text ?? '').split(/(\bTBC\b|\[ADVIS[EO]R TO CONFIRM[^\]]*\])/g);
  return parts.map((p, i) => (/^(TBC|\[ADVIS)/.test(p) ? <span key={i} className="hl">{p}</span> : p));
}

function Table({ rows }) {
  return (
    <table>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{(Array.isArray(r) ? r : [r]).map((c, j) => <td key={j}><Flagged text={c} /></td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

const pretty = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** A readable preview of a generated data file. */
export function DataPreview({ kind, data }) {
  if (!data) return null;
  if (kind === 'cds') {
    return (
      <div className="doc-preview">
        {(data.sections || []).map((s, i) => (
          <div className="sec" key={i}>
            <div className="sec-label">{s.label}</div>
            <div className="sec-val"><Flagged text={s.value} /></div>
          </div>
        ))}
      </div>
    );
  }
  const entries = kind === 'soa-notes'
    ? [['title', data.title], ['brief', data.brief], ['to_obtain', data.to_obtain], ['outstanding', data.outstanding],
      ['circumstances', data.circumstances], ...(data.sections || []).map((s) => [s.heading, s.body])]
    : Object.entries(data);
  return (
    <div className="doc-preview">
      {entries.filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
        <div className="sec" key={k}>
          <div className="sec-label">{pretty(k)}</div>
          {Array.isArray(v) && Array.isArray(v[0]) ? <Table rows={v} />
            : Array.isArray(v) ? <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{v.map((x, i) => <li key={i}><Flagged text={typeof x === 'string' ? x : JSON.stringify(x)} /></li>)}</ul>
              : typeof v === 'object' ? <div className="sec-val small">{JSON.stringify(v, null, 1)}</div>
                : <div className="sec-val"><Flagged text={v} /></div>}
        </div>
      ))}
    </div>
  );
}
