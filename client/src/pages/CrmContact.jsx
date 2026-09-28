import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { initials } from '../lib/format.js';
import {
  KIND_META, copyText, dayShort, daysAgo, referralOptions, refreshCrmMeta, relative, stageTone,
  tierOf, useCrmMeta, whenLong,
} from '../lib/crm.js';
import TierBadge from '../components/crm/TierBadge.jsx';
import StagePath from '../components/crm/StagePath.jsx';
import ActivityComposer from '../components/crm/ActivityComposer.jsx';
import Timeline from '../components/crm/Timeline.jsx';
import TasksPanel from '../components/crm/TasksPanel.jsx';
import SharePointPicker from '../components/crm/SharePointPicker.jsx';

const STATUS_LABEL = { prospect: 'Prospect', active: 'Client', inactive: 'Inactive', archived: 'Archived' };

/**
 * One client's CRM record: where their file is up to, everything said to them,
 * and everything still owed to them.
 */
export default function CrmContact() {
  const { id } = useParams();
  const meta = useCrmMeta();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [stageBusy, setStageBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(
    () => api.get(`/crm/contacts/${id}`).then((d) => { setData(d); setError(''); })
      .catch((err) => setError(err.status === 404 ? 'not-found' : err.message)),
    [id]
  );
  useEffect(() => { setData(null); load(); }, [load]);

  if (error === 'not-found') {
    return (<><PageHeader title="CRM" /><div className="content"><Empty icon="🚫" title="Contact not found">
      <Link to="/crm">Back to the CRM</Link></Empty></div></>);
  }
  if (!data) {
    return (<><PageHeader title="CRM" /><div className="content">
      {error ? <div className="alert red">{error}</div> : <Loading />}</div></>);
  }

  const { contact: c, stats, legacy = {} } = data;
  const tier = tierOf(meta, c.client_tier);
  const renewalWindow = meta?.practice?.renewalWindowDays ?? 14;
  const toAnniversary = legacy.daysToAnniversary;
  const stages = meta?.stages || [];
  const stage = stages.find((s) => s.key === c.crm_stage);
  const inStage = c.crm_stage_changed_at ? daysAgo(c.crm_stage_changed_at) : null;

  const moveStage = async (key) => {
    setStageBusy(true);
    try {
      await api.patch(`/crm/contacts/${id}`, { crm_stage: key });
      const label = stages.find((s) => s.key === key)?.label;
      toast(label ? `Moved to ${label}` : 'Taken off the pipeline', 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setStageBusy(false);
    }
  };

  const removeActivity = async (a) => {
    if (!window.confirm(`Delete this ${KIND_META[a.kind]?.label.toLowerCase() || 'entry'} from ${whenLong(a.occurred_at)}?`)) return;
    try {
      await api.del(`/crm/activities/${a.id}`);
      if (editing?.id === a.id) setEditing(null);
      toast('Entry deleted', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const facts = [
    {
      label: 'Last contact',
      value: stats.last_contact_at ? relative(stats.last_contact_at) : 'None logged',
      foot: stats.last_contact_kind ? KIND_META[stats.last_contact_kind]?.label : '',
    },
    { label: 'Open tasks', value: stats.open_tasks, tone: '' },
    { label: 'Overdue', value: stats.overdue_tasks, tone: stats.overdue_tasks ? 'red' : '' },
    { label: 'In this stage', value: inStage == null ? '—' : inStage === 0 ? 'Today' : `${inStage} ${inStage === 1 ? 'day' : 'days'}` },
    { label: 'Logged', value: stats.activity_count },
    ...(c.next_review_date ? [{
      label: 'Anniversary',
      value: toAnniversary < 0 ? 'Passed' : toAnniversary === 0 ? 'Today' : `${toAnniversary} days`,
      tone: toAnniversary <= renewalWindow ? (toAnniversary < 0 ? 'red' : 'amber') : '',
    }] : []),
  ];

  return (
    <>
      <PageHeader
        title={c.display_name}
        sub="CRM record"
        actions={<>
          <Link className="btn" to="/crm">← All contacts</Link>
          <Link className="btn" to={`/clients/${c.id}`}>Full client profile</Link>
        </>}
      />
      <div className="content crm-page">
        <div className="crm-hero card">
          <div className="crm-hero-top">
            <div className="avatar lg">{initials(c.first_name, c.last_name)}</div>
            <div className="crm-hero-id">
              <h2>{c.display_name}</h2>
              <div className="crm-hero-tags">
                <Badge value={c.status}>{STATUS_LABEL[c.status] || c.status}</Badge>
                <TierBadge tier={tier} />
                {c.crm_thread && <span className="thread-tag" title="XPLAN thread">{c.crm_thread}</span>}
                {stage && <Badge tone={stageTone(stage.key)}>{stage.label}</Badge>}
                {c.adviser && <span className="faint small">Adviser: {c.adviser}</span>}
                {c.referral_source && <span className="faint small">Referred by {c.referral_source}</span>}
              </div>
            </div>
            <div className="crm-facts">
              {facts.map((f) => (
                <div key={f.label} className={`tb-stat ${f.tone || ''}`}>
                  <span className="tb-val">{f.value}</span>
                  <span className="tb-label">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          {stages.length > 0 && (
            <StagePath stages={stages} current={c.crm_stage} onChange={moveStage} busy={stageBusy} />
          )}
        </div>

        {legacy.referralPartner && (
          <div className="legacy-flag">
            <strong>Referral fee to disclose in the SOA.</strong>{' '}
            {legacy.referralPartner.legalName || legacy.referralPartner.name} referred this client:{' '}
            {legacy.referralPartner.fee}. The SOA needs client-specific “will pay / has paid” wording
            with the dollar amount.
          </div>
        )}
        {c.next_review_date && toAnniversary <= renewalWindow && (
          <div className={`legacy-flag ${toAnniversary < 0 ? 'red' : ''}`}>
            <strong>
              {toAnniversary < 0
                ? `Anniversary passed ${-toAnniversary} days ago (${dayShort(c.next_review_date)}).`
                : `Anniversary ${toAnniversary === 0 ? 'today' : `in ${toAnniversary} days`} (${dayShort(c.next_review_date)}).`}
            </strong>{' '}
            {toAnniversary < 0
              ? 'Update the next review date once the renewal is done.'
              : `Inside the ${renewalWindow}-day renewal window, so follow-up is due now.`}
          </div>
        )}

        <div className="crm-record">
          <DetailsPanel contact={c} sharepoint={data.sharepoint} meta={meta} legacy={legacy} onSaved={load} />

          <div className="crm-main">
            <div className="card crm-compose-card">
              {editing && (
                <div className="composer-editing">
                  Editing the {KIND_META[editing.kind]?.label.toLowerCase()} from {whenLong(editing.occurred_at)}
                </div>
              )}
              <ActivityComposer
                key={editing?.id || 'new'}
                contactId={c.id}
                meta={meta}
                editing={editing}
                onSaved={load}
                onCancelEdit={() => setEditing(null)}
              />
            </div>
            <div className="card card-pad">
              <Timeline
                activities={data.activities}
                tasks={data.tasks}
                transcripts={data.transcripts}
                documents={data.documents}
                onEdit={(a) => { setEditing(a); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onDelete={removeActivity}
              />
            </div>
          </div>

          <TasksPanel contact={c} tasks={data.tasks} suggested={data.suggestedTasks} onChange={load} />
        </div>
      </div>
    </>
  );
}

const DETAIL_FIELDS = [
  ['first_name', 'First name'], ['last_name', 'Last name'],
  ['partner_first_name', 'Partner first name'], ['partner_last_name', 'Partner last name'],
  ['phone', 'Phone'], ['email', 'Email'],
  ['partner_phone', 'Partner phone'], ['partner_email', 'Partner email'],
  ['address', 'Address'],
];

/** Contact details, the adviser, the referrer and the SharePoint folder — edited in place. */
function DetailsPanel({ contact: c, sharepoint, meta, legacy, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const startEdit = () => {
    const init = {};
    for (const [k] of DETAIL_FIELDS) init[k] = c[k] || '';
    setF({
      ...init, adviser: c.adviser || '', status: c.status, notes: c.notes || '',
      referral_source: c.referral_source || '', client_tier: c.client_tier || '',
      crm_thread: c.crm_thread || '', next_review_date: c.next_review_date || '',
    });
    setEdit(true);
  };

  const save = async (body) => {
    setSaving(true);
    try {
      await api.patch(`/crm/contacts/${c.id}`, body);
      if (body.adviser !== undefined) refreshCrmMeta();
      setEdit(false);
      setPicking(false);
      await onSaved();
      toast('Saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value, what) => {
    if (await copyText(value)) toast(`${what} copied`, 'success');
  };

  const rows = [
    ['Phone', c.phone, true],
    ['Email', c.email, true],
    ...(c.partner_first_name ? [
      [`${c.partner_first_name}'s phone`, c.partner_phone, true],
      [`${c.partner_first_name}'s email`, c.partner_email, true],
    ] : []),
    ['Address', c.address],
    ['Adviser', c.adviser],
    ['Referral source', c.referral_source],
    ['XPLAN thread', c.crm_thread],
    ['Next review (anniversary)', c.next_review_date
      ? new Date(`${c.next_review_date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : ''],
    ['Added', whenLong(c.created_at)],
  ];
  const tier = tierOf(meta, c.client_tier);
  const suggested = tierOf(meta, legacy?.suggestedTier);

  return (
    <div className="card crm-details">
      <div className="card-head">
        <h3>Details</h3>
        {!edit && <button className="btn sm ghost" onClick={startEdit}>Edit</button>}
      </div>

      {!edit ? (
        <div className="cd-body">
          <dl className="cd-list">
            {rows.map(([label, value, copyable]) => (
              <div key={label} className="cd-row">
                <dt>{label}</dt>
                <dd>
                  {value || <span className="faint">—</span>}
                  {value && copyable && (
                    <button className="copy-btn" title={`Copy ${label.toLowerCase()}`} onClick={() => copy(value, label)}>⧉</button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="cd-tier">
            <div className="cd-tier-head">
              <span>Client tier</span>
              {tier ? <TierBadge tier={tier} /> : <span className="faint small">Not set</span>}
            </div>
            {tier && (
              <dl className="protocol" title="Legacy client contact protocol">
                <dt>Initial contact</dt><dd>{tier.initialContact}</dd>
                <dt>Follow-up email</dt><dd>{tier.followUpEmail}</dd>
                <dt>Phone call</dt><dd>{tier.phoneCall}</dd>
                <dt>Meeting</dt><dd>{tier.meeting}</dd>
              </dl>
            )}
            {tier?.rule && <div className="small muted">{tier.rule}</div>}
            {suggested && suggested.key !== c.client_tier && (
              <div className="small faint">
                Cover on file totals ${Math.round(legacy.annualPremium).toLocaleString('en-AU')} a year, which is {suggested.label}.
              </div>
            )}
          </div>
          {c.notes && <div className="cd-notes">{c.notes}</div>}
        </div>
      ) : (
        <div className="cd-body cd-edit">
          {DETAIL_FIELDS.map(([k, label]) => (
            <label key={k}>
              <span>{label}</span>
              <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </label>
          ))}
          <label>
            <span>Adviser</span>
            <input list="crm-advisers-edit" value={f.adviser} onChange={(e) => setF({ ...f, adviser: e.target.value })} />
            <datalist id="crm-advisers-edit">
              {(meta?.advisers || []).map((a) => <option key={a} value={a} />)}
            </datalist>
          </label>
          <label>
            <span>Status</span>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>
            <span>Client tier</span>
            <select value={f.client_tier} onChange={(e) => setF({ ...f, client_tier: e.target.value })}>
              <option value="">Not set</option>
              {(meta?.practice?.tiers || []).map((t) => (
                <option key={t.key} value={t.key}>{t.label} ({t.premium})</option>
              ))}
            </select>
          </label>
          <label>
            <span>XPLAN thread</span>
            <select value={f.crm_thread} onChange={(e) => setF({ ...f, crm_thread: e.target.value })}>
              <option value="">—</option>
              {(meta?.practice?.threads || []).map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>
            <span>Next review</span>
            <input type="date" value={f.next_review_date}
              onChange={(e) => setF({ ...f, next_review_date: e.target.value })} />
          </label>
          <label className="wide">
            <span>Referral source</span>
            <input list="crm-referrers-edit" value={f.referral_source}
              onChange={(e) => setF({ ...f, referral_source: e.target.value })} />
            <datalist id="crm-referrers-edit">
              {referralOptions(meta).map((r) => <option key={r} value={r} />)}
            </datalist>
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </label>
          <div className="cd-actions">
            <button className="btn sm" onClick={() => setEdit(false)}>Cancel</button>
            <button className="btn primary sm" disabled={saving || !f.first_name?.trim()} onClick={() => save(f)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="cd-sp">
        <div className="cd-sp-head">
          <span>SharePoint folder</span>
          <button className="link-btn" onClick={() => setPicking((v) => !v)}>
            {picking ? 'Close' : sharepoint ? 'Change' : 'Link folder'}
          </button>
        </div>
        {sharepoint ? (
          <div className={`cd-sp-folder ${sharepoint.exists ? '' : 'missing'}`}>
            <div className="cd-sp-name">📁 {sharepoint.folder}</div>
            {sharepoint.exists ? (
              <button className="link-btn" onClick={() => copy(sharepoint.path, 'Folder path')}>
                Copy path to open in Explorer
              </button>
            ) : (
              <div className="small">Not found in the synced library — it may have been renamed.</div>
            )}
          </div>
        ) : (
          !picking && <div className="faint small">Not linked.</div>
        )}
        {picking && (
          <>
            <SharePointPicker
              initialQuery={[c.last_name, c.first_name].filter(Boolean).join(' ')}
              value={c.sharepoint_folder || ''}
              onPick={(name) => save({ sharepoint_folder: name || null })}
            />
            <div className="faint small" style={{ marginTop: 6 }}>
              Read-only: this only records which folder is theirs.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
