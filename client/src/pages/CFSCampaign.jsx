import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, pct, date } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Loading, Empty } from '../components/ui/Loading.jsx';
import { TextInput, Select } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

/**
 * Re-engagement call list built from the CFS book.
 *
 * The book answers "who isn't paying"; this answers "who do I call first".
 * It groups accounts by person, bands them by age (because the strategy on
 * offer changes at preservation age and again at 60), and flags who already
 * has a drafted email so a second campaign doesn't cover them twice.
 */

const PRESETS = [
  {
    key: 'all', label: 'Everyone not paying',
    filters: { min_age: '', max_age: '', min_balance: '', include_drafted: true, include_entities: true },
  },
  {
    key: 'prior', label: 'Last campaign (55–70, $100k+)',
    filters: { min_age: '55', max_age: '70', min_balance: '100000', include_drafted: true, include_entities: false },
  },
  {
    key: 'gap', label: 'Not yet drafted, $100k+',
    filters: { min_age: '', max_age: '', min_balance: '100000', include_drafted: false, include_entities: true },
  },
  {
    key: 'young', label: 'Under 55 with $250k+',
    filters: { min_age: '', max_age: '54', min_balance: '250000', include_drafted: true, include_entities: true },
  },
];

const BLANK = {
  min_age: '', max_age: '', min_balance: '', include_drafted: true, include_entities: true, rate: '0.55',
};

export default function CFSCampaign() {
  const [data, setData] = useState(null);
  const [f, setF] = useState(BLANK);
  const [preset, setPreset] = useState('all');
  const toast = useToast();

  useEffect(() => {
    const qs = new URLSearchParams();
    if (f.min_age) qs.set('min_age', f.min_age);
    if (f.max_age) qs.set('max_age', f.max_age);
    if (f.min_balance) qs.set('min_balance', f.min_balance);
    if (!f.include_drafted) qs.set('include_drafted', 'false');
    if (!f.include_entities) qs.set('include_entities', 'false');
    if (f.rate) qs.set('rate', f.rate);
    setData(null);
    api.get(`/cfs/campaign?${qs}`).then(setData).catch(() => setData(false));
  }, [f]);

  const applyPreset = (key) => {
    const p = PRESETS.find((x) => x.key === key);
    setPreset(key);
    if (p) setF({ ...BLANK, ...p.filters, rate: f.rate });
  };

  const set = (k) => (e) => {
    setPreset('');
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  };

  const exportCsv = () => {
    const rows = data?.targets || [];
    if (!rows.length) { toast('Nothing to export', 'error'); return; }
    const head = ['Name', 'Age', 'Balance', 'Accounts', 'Products', 'Growth %', 'Email', 'Drafted', 'As at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      head.map(esc).join(','),
      ...rows.map((t) => [t.name, t.age ?? '', t.balance, t.accounts,
        t.products.join(' / '), t.growth_pct ?? '', t.email ?? '',
        t.drafted ? 'yes' : 'no', t.as_at_date ?? ''].map(esc).join(',')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfs-call-list-${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} people`, 'success');
  };

  const maxBand = useMemo(
    () => Math.max(1, ...(data?.segments || []).map((s) => s.balance)),
    [data]
  );

  const columns = [
    {
      key: 'name', header: 'Person',
      render: (r) => (
        <>
          <div className="t-strong">
            {r.client_id ? <Link to={`/clients/${r.client_id}`}>{r.name}</Link> : r.name}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {r.products.join(' · ') || '—'}
            {r.accounts > 1 && ` · ${r.accounts} accounts`}
          </div>
        </>
      ),
    },
    {
      key: 'age', header: 'Age', num: true,
      render: (r) => (r.age == null
        ? <span className="muted" title="No date of birth on the statement">?</span>
        : r.age),
    },
    { key: 'balance', header: 'Balance', num: true, render: (r) => currency(r.balance) },
    {
      key: 'growth_pct', header: 'Growth', num: true,
      render: (r) => (r.growth_pct == null ? '—' : pct(r.growth_pct, 0)),
    },
    {
      key: 'email', header: 'Contact',
      render: (r) => (r.email
        ? <a href={`mailto:${r.email}`}>{r.email}</a>
        : <span className="muted">no email on statement</span>),
    },
    {
      key: 'drafted', header: 'Draft',
      render: (r) => (r.drafted
        ? <Badge tone="green">Drafted</Badge>
        : <Badge tone="amber">None</Badge>),
    },
    { key: 'as_at_date', header: 'As at', render: (r) => date(r.as_at_date) },
  ];

  const sel = data?.selection;
  const totals = data?.totals;

  return (
    <>
      <PageHeader
        title="Review Campaign"
        sub="Who to call first about the un-charged book"
        actions={
          <button className="btn primary" onClick={exportCsv} disabled={!data?.targets?.length}>
            Export call list
          </button>
        }
      />

      <div className="content stack">
        <div className="card card-pad">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {PRESETS.map((p) => (
              <button key={p.key}
                className={`btn sm ${preset === p.key ? 'primary' : ''}`}
                onClick={() => applyPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="cfs-filters">
            <TextInput label="Min age" type="number" placeholder="any" value={f.min_age} onChange={set('min_age')} />
            <TextInput label="Max age" type="number" placeholder="any" value={f.max_age} onChange={set('max_age')} />
            <TextInput label="Min balance" type="number" placeholder="any" value={f.min_balance} onChange={set('min_balance')} />
            <Select label="Fee rate for opportunity" value={f.rate} onChange={set('rate')}
              options={['0.44', '0.55', '0.66', '0.77', '0.88', '1.10'].map((r) => ({ value: r, label: `${r}%` }))} />
            <label className="cfs-check">
              <input type="checkbox" checked={f.include_drafted} onChange={set('include_drafted')} />
              Include people already drafted
            </label>
            <label className="cfs-check">
              <input type="checkbox" checked={f.include_entities} onChange={set('include_entities')} />
              Include SMSFs &amp; companies
            </label>
          </div>
        </div>

        {data == null ? <Loading /> :
         data === false ? <Empty icon="🚫" title="Couldn't load the campaign" /> :
         !totals.people ? (
           <Empty icon="📇" title="No accounts in the book yet">
             Import CFS statements on the CFS Book page first.
           </Empty>
         ) : (
          <>
            <div className="grid grid-4">
              <div className="stat blue">
                <div className="stat-label">People selected</div>
                <div className="stat-value">{sel.people}</div>
                <div className="stat-foot">of {totals.people} not paying</div>
              </div>
              <div className="stat accent">
                <div className="stat-label">FUM in selection</div>
                <div className="stat-value">{currency(sel.balance)}</div>
                <div className="stat-foot">of {currency(totals.balance)} total</div>
              </div>
              <div className="stat green">
                <div className="stat-label">Worth per year</div>
                <div className="stat-value">{currency(sel.opportunity)}</div>
                <div className="stat-foot">at {pct(sel.rate, 2)}</div>
              </div>
              <div className="stat amber">
                <div className="stat-label">Already drafted</div>
                <div className="stat-value">{totals.drafted}</div>
                <div className="stat-foot">
                  {totals.people - totals.drafted} still need an email
                  {totals.withoutEmail > 0 && ` · ${totals.withoutEmail} have no address`}
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Where the money sits by age</h3>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
                Bands cover everyone not paying, so they stay put as you narrow the selection.
                Green shows how many already have a drafted email.
              </div>
              <div className="cfs-bars">
                {data.segments.map((s) => (
                  <div key={s.key} className="cfs-bar-row">
                    <div className="cfs-bar-label">{s.label}</div>
                    <div className="cfs-bar-track">
                      <div className="cfs-bar-fill" style={{ width: `${(s.balance / maxBand) * 100}%` }} />
                    </div>
                    <div className="cfs-bar-value">
                      {currency(s.balance)}{' '}
                      <span className="muted">{s.people} ppl</span>{' '}
                      <Badge tone={s.drafted === s.people ? 'green' : s.drafted ? 'amber' : 'red'}>
                        {s.drafted}/{s.people}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Call list</h3>
                <span className="muted">
                  {sel.people} people, largest first
                  {sel.excluded && (sel.excluded.age + sel.excluded.balance + sel.excluded.drafted + sel.excluded.entity) > 0 && (
                    ` · excluded ${sel.excluded.age} by age, ${sel.excluded.balance} by balance, `
                    + `${sel.excluded.drafted} already drafted, ${sel.excluded.entity} entities`
                  )}
                </span>
              </div>
              <DataTable columns={columns} rows={data.targets}
                empty={<Empty icon="🔍" title="Nobody matches these filters">
                  Loosen the age or balance limits.
                </Empty>} />
              {data.targets.length < sel.people && (
                <div className="muted" style={{ fontSize: 12.5, padding: '10px 16px' }}>
                  Showing the first {data.targets.length} of {sel.people}.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
