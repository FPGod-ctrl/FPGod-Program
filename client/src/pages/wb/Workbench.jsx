import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Loading, Empty } from '../../components/ui/Loading.jsx';
import NewClientModal from './NewClientModal.jsx';
import { STEP_KEYS, relTime, stageLabel } from './wb.js';

function Stat({ label, value, foot, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

const initialsOf = (c) =>
  `${(c.first_name || '')[0] || ''}${(c.partner_first_name || c.last_name || '')[0] || ''}`.toUpperCase();

/** The new home screen: every client in the SOA pipeline, CRM style. */
export default function Workbench() {
  const [cases, setCases] = useState(null);
  const [meta, setMeta] = useState(null);
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [archived, setArchived] = useState(false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const showNew = params.get('new') === '1';

  const load = () => api.get(`/workbench/cases?archived=${archived}`).then(setCases).catch(() => setCases([]));
  useEffect(() => { api.get('/workbench/meta').then(setMeta).catch(() => {}); }, []);
  useEffect(() => { setCases(null); load(); }, [archived]); // eslint-disable-line react-hooks/exhaustive-deps

  const stages = meta?.stages || [];
  const counts = useMemo(() => {
    const m = {};
    (cases || []).forEach((c) => { m[c.stage] = (m[c.stage] || 0) + 1; });
    return m;
  }, [cases]);

  const shown = (cases || []).filter((c) => {
    if (stage && c.stage !== stage) return false;
    if (!q.trim()) return true;
    const hay = `${c.display_name} ${c.case_name} ${c.adviser || ''} ${c.sharepoint_folder || ''}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });

  const all = cases || [];
  const waiting = all.filter((c) => ['meeting', 'fact_find', 'soa_notes'].includes(c.stage)).length;
  const withPara = all.filter((c) => c.stage === 'paraplanner').length;
  const soa = all.filter((c) => ['soa', 'pack'].includes(c.stage)).length;

  return (
    <>
      <PageHeader
        title="Clients"
        sub={`${meta?.firm || 'Legacy Risk Advice'} · SOA workbench`}
        actions={<button className="btn primary" onClick={() => setParams({ new: '1' })}>＋ New client</button>}
      />
      <div className="content">
        <div className="wb-hero">
          <div>
            <h2>From first meeting to signed pack</h2>
            <p>
              Add a client, paste the meeting transcript, and build the Initial Meeting Notes, Fact Find and SOA Notes.
              Once Howard has filed the quotes, draft the SOA and assemble the DocuSign pack. SharePoint is only ever read.
            </p>
          </div>
          <div className="spacer" />
          <button className="btn accent lg" onClick={() => setParams({ new: '1' })}>＋ Add a client</button>
        </div>

        <div className="wb-stats">
          <Stat label="Active clients" value={all.length} tone="accent" foot={archived ? 'Archived view' : 'In the pipeline'} />
          <Stat label="Meeting → brief" value={waiting} tone="blue" foot="Notes, fact find, SOA Notes" />
          <Stat label="With paraplanner" value={withPara} tone="amber" foot="Quotes and research" />
          <Stat label="SOA & pack" value={soa} tone="green" foot="Drafting or packing" />
        </div>

        <div className="wb-stages">
          <button className={`wb-stage ${!stage ? 'on' : ''}`} onClick={() => setStage('')}>
            All<span className="n">{all.length}</span>
          </button>
          {stages.map((s) => (
            <button key={s.key} className={`wb-stage ${stage === s.key ? 'on' : ''}`} onClick={() => setStage(stage === s.key ? '' : s.key)}>
              {s.label}<span className="n">{counts[s.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="wb-toolbar">
          <input type="search" placeholder="Search clients, advisers, SharePoint folders…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="row small muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} style={{ width: 'auto' }} />
            Show archived
          </label>
        </div>

        <div className="card">
          {!cases ? <Loading /> : !shown.length ? (
            <Empty icon="👥" title={all.length ? 'No clients match' : 'No clients yet'}>
              {!all.length && (
                <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setParams({ new: '1' })}>＋ Add your first client</button>
              )}
            </Empty>
          ) : (
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th>Adviser</th>
                  <th>SharePoint</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/case/${c.id}`)}>
                    <td>
                      <div className="row" style={{ gap: 12 }}>
                        <div className="wb-avatar">{initialsOf(c)}</div>
                        <div>
                          <div className="wb-name">
                            {c.display_name}{' '}
                            {c.client_kind && (
                              <span className={`badge ${c.client_kind === 'existing' ? 'teal' : 'green'}`} style={{ marginLeft: 6 }}>
                                {c.client_kind === 'existing' ? 'Existing' : 'New'}
                              </span>
                            )}
                          </div>
                          <div className="wb-sub">{c.case_name}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge teal">{stageLabel(stages, c.stage)}</span></td>
                    <td>
                      <div className="wb-dots" title="Notes · Fact find · SOA Notes · SOA · Pack">
                        {STEP_KEYS.map((k) => <span key={k} className={`wb-dot ${c.has?.[k] ? 'on' : ''}`} />)}
                      </div>
                    </td>
                    <td className="muted">{c.adviser || '—'}</td>
                    <td className="small">{c.sharepoint_folder ? <span title={c.sharepoint_folder}>📁 Linked</span> : <span className="faint">Not linked</span>}</td>
                    <td className="small faint">{relTime(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNew && (
        <NewClientModal
          defaultAdviser={meta?.defaultAdviser}
          onClose={() => setParams({})}
          onCreated={(c) => navigate(`/case/${c.id}`)}
        />
      )}
    </>
  );
}
