import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Loading } from '../components/ui/Loading.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { initials } from '../lib/format.js';
import { KIND_META, dayShort, relative, stageTone, tierOf, todayLocal, useCrmMeta } from '../lib/crm.js';
import TierBadge from '../components/crm/TierBadge.jsx';
import ContactModal from '../components/crm/ContactModal.jsx';
import ImportModal from '../components/crm/ImportModal.jsx';
import PipelineBoard from '../components/crm/PipelineBoard.jsx';
import ActivityFeed from '../components/crm/ActivityFeed.jsx';

const VIEWS = [
  { key: 'contacts', label: 'Contacts' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'activity', label: 'Activity' },
];

const OPEN = (stages) => new Set(stages.filter((s) => s.open).map((s) => s.key));

// Days from today to a 'YYYY-MM-DD' anniversary, or null.
const daysTo = (ymd) => {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

const filtersFor = (stages) => {
  const open = OPEN(stages);
  return [
    { key: 'all', label: 'Everyone', match: (c) => c.status !== 'archived' },
    { key: 'attention', label: 'Needs attention', match: (c) => c.status !== 'archived' && c.attention.length > 0 },
    { key: 'pipeline', label: 'In the pipeline', match: (c) => c.status !== 'archived' && open.has(c.crm_stage) },
    { key: 'clients', label: 'Clients', match: (c) => c.status === 'active' },
    { key: 'prospects', label: 'Prospects', match: (c) => c.status === 'prospect' },
    {
      key: 'renewals',
      label: 'Anniversaries (30 days)',
      match: (c) => c.status !== 'archived' && daysTo(c.next_review_date) != null
        && daysTo(c.next_review_date) >= 0 && daysTo(c.next_review_date) <= 30,
    },
    { key: 'archived', label: 'Archived', match: (c) => c.status === 'archived' },
  ];
};

const SORTS = {
  name: { label: 'Name', fn: (a, b) => a.display_name.localeCompare(b.display_name) },
  quiet: {
    label: 'Longest without contact',
    fn: (a, b) => new Date(a.last_contact_at || 0) - new Date(b.last_contact_at || 0),
  },
  due: {
    label: 'Next task due',
    fn: (a, b) => (a.next_task?.due || '9999').localeCompare(b.next_task?.due || '9999'),
  },
  recent: {
    label: 'Recently contacted',
    fn: (a, b) => new Date(b.last_contact_at || 0) - new Date(a.last_contact_at || 0),
  },
};

export default function Crm() {
  const meta = useCrmMeta();
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'contacts';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [tierFilter, setTierFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importable, setImportable] = useState(null);

  const load = useCallback(
    () => api.get('/crm/contacts').then((d) => { setData(d); setError(''); }).catch((err) => setError(err.message)),
    []
  );
  useEffect(() => { load(); }, [load]);

  // How many Task Tracker names could still become contacts — drives the import prompt.
  useEffect(() => {
    api.get('/crm/import/tasks')
      .then(({ candidates }) => setImportable(candidates.length))
      .catch(() => setImportable(0));
  }, [data?.summary?.contacts]);

  const stages = useMemo(() => meta?.stages || [], [meta]);
  const filters = useMemo(() => filtersFor(stages), [stages]);
  const setView = (v) => setParams(v === 'contacts' ? {} : { view: v });

  const visible = useMemo(() => {
    if (!data) return [];
    const f = filters.find((x) => x.key === filter) || filters[0];
    const needle = q.trim().toLowerCase();
    return data.contacts
      .filter(f.match)
      .filter((c) => !stageFilter
        || (stageFilter === 'none' ? !c.crm_stage : c.crm_stage === stageFilter))
      .filter((c) => !tierFilter || c.client_tier === tierFilter)
      .filter((c) => !needle || [c.display_name, c.email, c.phone, c.adviser, c.referral_source]
        .some((v) => v && String(v).toLowerCase().includes(needle)))
      .sort(SORTS[sort].fn);
  }, [data, filters, filter, stageFilter, tierFilter, q, sort]);

  const tallies = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(filters.map((f) => [f.key, data.contacts.filter(f.match).length]));
  }, [data, filters]);

  const moveStage = async (c, key) => {
    // Move the card at once; the reload confirms it, or puts it back on failure.
    setData((d) => ({ ...d, contacts: d.contacts.map((x) => (x.id === c.id ? { ...x, crm_stage: key, crm_stage_changed_at: new Date().toISOString() } : x)) }));
    try {
      await api.patch(`/crm/contacts/${c.id}`, { crm_stage: key });
      toast(`${c.display_name} → ${stages.find((s) => s.key === key)?.label}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
    load();
  };

  const showStage = (key) => {
    setStageFilter(key);
    setFilter('all');
    setView('contacts');
  };

  const s = data?.summary || {};
  const banner = [
    { label: 'Contacts', value: s.contacts ?? 0 },
    { label: 'In the pipeline', value: s.pipeline ?? 0 },
    { label: 'Need attention', value: s.attention ?? 0, tone: s.attention ? 'amber' : '' },
    { label: 'Open tasks', value: s.openTasks ?? 0 },
    { label: 'Overdue', value: s.overdueTasks ?? 0, tone: s.overdueTasks ? 'red' : '' },
    { label: 'Logged this week', value: s.loggedThisWeek ?? 0 },
    { label: 'Anniversaries (30 days)', value: s.renewalsDue ?? 0 },
  ];
  const today = todayLocal();
  const stageLabel = (key) => stages.find((x) => x.key === key)?.label;

  return (
    <>
      <PageHeader
        title="CRM"
        sub="Clients, every conversation, and what is owed to them"
        actions={<>
          {importable > 0 && (
            <button className="btn" onClick={() => setImporting(true)}>
              Import from Task Tracker <span className="pill-count">{importable}</span>
            </button>
          )}
          <button className="btn primary" onClick={() => setAdding(true)}>+ New contact</button>
        </>}
      />

      <div className="content crm-page">
        {error && <div className="alert red">{error}</div>}
        {!data && !error && <Loading />}

        {data && (
          <>
            <div className="tasks-banner">
              <div className="tb-stats">
                {banner.map((b) => (
                  <div key={b.label} className={`tb-stat ${b.tone || ''}`}>
                    <span className="tb-val">{b.value}</span>
                    <span className="tb-label">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="tb-meta">
                Communication is logged by hand
                <br />
                Tasks are shared with the Task Tracker
              </div>
            </div>

            <div className="tabs crm-tabs" role="tablist">
              {VIEWS.map((v) => (
                <button key={v.key} role="tab" aria-selected={view === v.key}
                  className={`tab ${view === v.key ? 'active' : ''}`} onClick={() => setView(v.key)}>
                  {v.label}
                </button>
              ))}
            </div>

            {view === 'contacts' && (
              data.contacts.length === 0 ? (
                <div className="card crm-empty">
                  <div className="e-ico">🤝</div>
                  <h3>No contacts yet</h3>
                  <p className="muted">
                    Start from the names already in your Task Tracker
                    {importable ? ` — ${importable} households are ready to bring across with their tasks` : ''},
                    or add someone by hand.
                  </p>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    {importable > 0 && (
                      <button className="btn primary" onClick={() => setImporting(true)}>Import from Task Tracker</button>
                    )}
                    <button className="btn" onClick={() => setAdding(true)}>+ New contact</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="crm-toolbar">
                    <div className="filter-bar" style={{ margin: 0 }}>
                      {filters.map((f) => (
                        <button key={f.key} className={`filter-pill ${filter === f.key ? 'active' : ''}`}
                          onClick={() => setFilter(f.key)}>
                          {f.label}
                          <span className="pill-count">{tallies[f.key] ?? 0}</span>
                        </button>
                      ))}
                    </div>
                    <div className="crm-search">
                      <input type="search" placeholder="Search name, phone, email, referrer…" value={q}
                        onChange={(e) => setQ(e.target.value)} />
                      <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} aria-label="Client tier">
                        <option value="">All tiers</option>
                        {(meta?.practice?.tiers || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
                        {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {stageFilter && (
                    <div className="crm-active-filter">
                      Showing <strong>{stageFilter === 'none' ? 'not in the pipeline' : stageLabel(stageFilter)}</strong>
                      <button className="link-btn" onClick={() => setStageFilter('')}>Clear</button>
                    </div>
                  )}

                  <div className="card">
                    {!visible.length ? (
                      <div className="empty"><p>No one matches.</p></div>
                    ) : (
                      <div className="table-wrap">
                        <table className="tbl crm-table">
                          <thead>
                            <tr>
                              <th>Contact</th>
                              <th>Tier</th>
                              <th>Stage</th>
                              <th>Last contact</th>
                              <th>Next task</th>
                              <th>Adviser</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((c) => {
                              const overdue = c.next_task?.due && c.next_task.due < today;
                              return (
                                <tr key={c.id} className="clickable" onClick={() => nav(`/crm/${c.id}`)}>
                                  <td>
                                    <div className="row" style={{ gap: 12 }}>
                                      <div className="avatar">{initials(c.first_name, c.last_name)}</div>
                                      <div style={{ minWidth: 0 }}>
                                        <div className="t-strong">{c.display_name}</div>
                                        <div className="faint small">
                                          {[c.phone, c.email].filter(Boolean).join(' · ') || (c.status === 'prospect' ? 'Prospect' : 'No contact details')}
                                        </div>
                                        {c.attention.length > 0 && (
                                          <div className="crm-warn">{c.attention.join(' · ')}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {c.client_tier ? <TierBadge tier={tierOf(meta, c.client_tier)} /> : <span className="faint">—</span>}
                                  </td>
                                  <td>
                                    {c.crm_stage
                                      ? <Badge tone={stageTone(c.crm_stage)}>{stageLabel(c.crm_stage) || 'Unknown stage'}</Badge>
                                      : <span className="faint">—</span>}
                                    {c.crm_thread && <div className="faint small" style={{ marginTop: 3 }}>{c.crm_thread}</div>}
                                  </td>
                                  <td>
                                    {c.last_contact_at ? (
                                      <span title={c.last_contact_subject || ''}>
                                        {KIND_META[c.last_contact_kind]?.icon} {relative(c.last_contact_at)}
                                      </span>
                                    ) : <span className="faint">None logged</span>}
                                    {c.upcoming_at && (
                                      <div className="faint small">
                                        Next: {KIND_META[c.upcoming_kind]?.label.toLowerCase()} {relative(c.upcoming_at)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="crm-next">
                                    {c.next_task ? (
                                      <>
                                        <div className="crm-next-task">{c.next_task.task}</div>
                                        <div className={`small ${overdue ? 'crm-overdue' : 'faint'}`}>
                                          {c.next_task.due ? `${overdue ? 'Overdue · ' : ''}${dayShort(c.next_task.due)}` : ''}
                                          {c.open_tasks > 1 && ` · +${c.open_tasks - 1} more`}
                                        </div>
                                      </>
                                    ) : <span className="faint">—</span>}
                                  </td>
                                  <td>{c.adviser || <span className="faint">—</span>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )
            )}

            {view === 'pipeline' && stages.length > 0 && (
              <PipelineBoard stages={stages} contacts={data.contacts} meta={meta} onMove={moveStage} onShowStage={showStage} />
            )}

            {view === 'activity' && <div className="card card-pad"><ActivityFeed /></div>}
          </>
        )}
      </div>

      {adding && (
        <ContactModal
          meta={meta}
          onClose={() => setAdding(false)}
          onCreated={(c) => { setAdding(false); nav(`/crm/${c.id}`); }}
        />
      )}
      {importing && (
        <ImportModal
          meta={meta}
          onClose={() => setImporting(false)}
          onDone={() => { setImporting(false); load(); }}
        />
      )}
    </>
  );
}
