import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { Loading } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { RunLog, useRun } from './parts.jsx';
import { fileIcon, fileUrl, reveal, relTime } from './wb.js';

/**
 * Stage 5: the DocuSign SOA pack. Pick the documents, check the names, build.
 * Firm documents are plain copies with a hash check; nothing is edited.
 */
export default function PackTab({ wb, onChanged }) {
  const [cand, setCand] = useState(null);
  const [items, setItems] = useState([]);
  const [makePdfs, setMakePdfs] = useState(true);
  const [filter, setFilter] = useState('suggested');
  const [result, setResult] = useState(null);
  const job = useRun();
  const toast = useToast();

  const load = () => {
    setCand(null);
    api.get(`/workbench/cases/${wb.id}/pack`).then((r) => { setCand(r); setItems(r.items); }).catch((e) => toast(e.message, 'error'));
  };
  useEffect(load, [wb.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cand) return <div className="card card-pad"><Loading label="Looking through the client folder…" /></div>;

  const set = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const chosen = items.filter((x) => x.include);
  const shown = items.map((x, i) => [x, i]).filter(([x]) => filter === 'all' || x.include || (filter === 'suggested' && x.slot));

  const build = async () => {
    const bad = chosen.find((x) => !x.slot);
    if (bad) { toast(`Pick what "${bad.name}" is before building`, 'error'); return; }
    const r = await job.run(`/workbench/cases/${wb.id}/pack`, {
      makePdfs,
      items: chosen.map(({ source, relPath, name, slot, packName, within }) => ({ source, relPath, name, slot, packName, within })),
    });
    if (r) { setResult(r); toast('Pack built in Downloads', 'success'); onChanged(); }
  };

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="panel-title"><span style={{ fontSize: 20 }}>📦</span><h3>SOA pack</h3>
          {wb.pack_dir && <span className="badge green">Built</span>}
        </div>
        <p className="panel-blurb">
          Order: SOA, FSG, Fact Find, application summaries, letters, PDS, FINAL Insurance Summaries, Risk Checklist. No quotes.
          Firm documents are copied byte-for-byte and hash-checked. Files are numbered 01, 02… and date-stamped so they sort in order.
          Output: <code>{cand.downloads}\{cand.packFolder}</code>. A rebuild replaces only the files the last build wrote;
          letters, a CvC or anything added or edited by hand stay in the folder and are listed for review.
        </p>
        {cand.adviser && !cand.adviser.fsgs && (
          <div className="alert amber small">No FSG found in <code>{cand.adviser.folder}</code> for {cand.adviser.name}. A SharePoint FSG is only a fallback and will be flagged.</div>
        )}
        {!cand.sharepoint.linked && <div className="alert amber small">No SharePoint folder linked. Only the case folder and Downloads are listed.</div>}
        {cand.sharepoint.missing && <div className="alert red small">The linked SharePoint folder was not found.</div>}

        <div className="row wrap" style={{ margin: '10px 0' }}>
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 0 }}>
            {[['suggested', 'Pack documents'], ['all', 'All files']].map(([k, l]) => (
              <button key={k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div className="spacer" />
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={makePdfs} onChange={(e) => setMakePdfs(e.target.checked)} style={{ width: 'auto' }} />
            Add a PDF next to Word-only documents
          </label>
          <button className="btn ghost sm" onClick={load}>↻ Rescan</button>
        </div>

        <div className="table-wrap">
          <table className="pack-table">
            <thead>
              <tr><th /><th>Document</th><th>Is a…</th><th>Name in the pack</th><th>Modified</th></tr>
            </thead>
            <tbody>
              {shown.map(([x, i]) => (
                <tr key={`${x.source}|${x.relPath}`} className={x.include ? '' : 'off'}>
                  <td><input type="checkbox" checked={x.include} onChange={(e) => set(i, { include: e.target.checked })} style={{ width: 'auto' }} /></td>
                  <td>
                    {fileIcon(x.name)}{' '}
                    {x.source === 'downloads' || x.adviserFile || /^compliance[\\/]/i.test(x.relPath) ? x.name : <a href={fileUrl(wb.id, x)} target="_blank" rel="noreferrer">{x.name}</a>}
                    <div className="src">{x.source === 'sharepoint' ? 'SharePoint' : x.adviserFile ? 'Adviser folder' : x.source === 'repo' ? 'Case folder' : 'Downloads'} · {x.within}</div>
                    {x.note && <div className="alert amber small" style={{ marginTop: 4, padding: '2px 6px' }}>{x.note}</div>}
                  </td>
                  <td>
                    <select value={x.slot || ''} onChange={(e) => set(i, { slot: e.target.value || null })}>
                      <option value="">—</option>
                      {cand.slots.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td><input type="text" value={x.packName} onChange={(e) => set(i, { packName: e.target.value })} /></td>
                  <td className="small faint" style={{ whiteSpace: 'nowrap' }}>{relTime(x.modified)}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} className="faint">Nothing found. Try “All files”.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" disabled={job.busy || !chosen.length} onClick={build}>
            {job.busy ? 'Building…' : `📦 Build pack (${chosen.length} file${chosen.length === 1 ? '' : 's'})`}
          </button>
          {wb.pack_dir && (
            <button className="btn" onClick={() => reveal(wb.id, { target: 'pack-folder' })}>📂 Open pack folder</button>
          )}
        </div>
        <RunLog job={job} />
      </div>

      {result && (
        <div className="card card-pad">
          <h3>Built: {result.outDir}</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {result.files.map((f) => <li key={f}>{f}{result.extras?.includes(f) ? ' (already in the folder, left as is)' : ''}</li>)}
          </ul>
          <h3 style={{ marginTop: 12 }}>Review list</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>{result.review.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
