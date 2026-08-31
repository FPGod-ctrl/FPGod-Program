import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, pct, date, titleCase } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Loading, Empty, Spinner } from '../components/ui/Loading.jsx';
import { Select } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import CFSImportReview from '../components/CFSImportReview.jsx';

/**
 * The CFS book: every account under this adviser's management, imported from
 * a CFS export and topped up from PDF statements. Drop a file, review what was
 * read, then the book view shows FUM, fee revenue and the investment mix.
 */

const FILTERS = [
  { value: '', label: 'All accounts' },
  { value: 'unmatched', label: 'Not linked to a client' },
  { value: 'matched', label: 'Linked to a client' },
];

const FEE_FILTERS = [
  { value: '', label: 'Paying & not paying' },
  { value: 'not_paying', label: 'Not paying fees' },
  { value: 'paying', label: 'Paying fees' },
  { value: 'unknown', label: 'Fee status unknown' },
];

const FEE_TONE = { paying: 'green', not_paying: 'red', unknown: 'amber' };
const FEE_LABEL = { paying: 'Paying', not_paying: 'Not paying', unknown: 'Unknown' };

export default function CFSBook() {
  const [book, setBook] = useState(null);
  const [clients, setClients] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);       // filename currently parsing
  const [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [feeFilter, setFeeFilter] = useState('');
  // What you'd charge the un-charged book, so the opportunity figure is yours
  // rather than an assumption. Blank lets the server decide.
  const [rate, setRate] = useState('');
  const [openAccount, setOpenAccount] = useState(null);
  const fileRef = useRef(null);
  const toast = useToast();

  const load = () => {
    const qs = new URLSearchParams();
    if (filter) qs.set('match_status', filter);
    if (typeFilter) qs.set('account_type', typeFilter);
    if (feeFilter) qs.set('fee_status', feeFilter);
    if (rate !== '' && Number(rate) > 0) qs.set('rate', rate);
    api.get(`/cfs/book${qs.toString() ? `?${qs}` : ''}`).then(setBook).catch(() => setBook(false));
  };
  useEffect(load, [filter, typeFilter, feeFilter, rate]);
  useEffect(() => { api.get('/clients').then(setClients).catch(() => setClients([])); }, []);

  /**
   * Parse dropped files into a preview — nothing is saved until confirmed.
   * A whole folder of statements can go in at once; spreadsheets go one at a
   * time because each needs its own column mapping reviewed.
   */
  const ingest = async (files) => {
    if (!files?.length) return;
    setBusy(files.length === 1 ? files[0].name : `${files.length} files`);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await api.upload('/cfs/import/preview', fd);
      if (!res.accounts?.length) {
        toast('No accounts found — check these are CFS statements or an adviser export', 'error');
        return;
      }
      setPreview(res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    ingest(Array.from(e.dataTransfer.files || []));
  };

  const link = async (account, clientId) => {
    try {
      await api.put(`/cfs/accounts/${account.id}`, { client_id: clientId || null });
      toast(clientId ? 'Account linked' : 'Account unlinked', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const totals = book?.totals;
  const fees = book?.fees;

  const columns = [
    {
      key: 'account_name', header: 'Account',
      render: (r) => (
        <>
          <div className="t-strong">{r.account_name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {r.account_number || 'no number'}{r.product ? ` · ${r.product}` : ''}
          </div>
        </>
      ),
    },
    {
      key: 'client', header: 'Client',
      render: (r) => (r.client_id
        ? <Link to={`/clients/${r.client_id}`}>{r.first_name} {r.last_name}</Link>
        : (
          <select value="" onChange={(e) => link(r, e.target.value)} onClick={(e) => e.stopPropagation()}>
            <option value="">— link a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        )),
    },
    { key: 'account_type', header: 'Type', render: (r) => <Badge value={r.account_type} /> },
    { key: 'balance', header: 'Balance', num: true, render: (r) => currency(r.balance) },
    {
      key: 'fee_status', header: 'Fees',
      render: (r) => (
        <>
          <Badge tone={FEE_TONE[r.fee_status]}>{FEE_LABEL[r.fee_status] || 'Unknown'}</Badge>
          {r.fee_status === 'paying' && (
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
              {currency(r.adviser_fee_amount)} · {pct(r.adviser_fee_pct, 2)}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'holding_count', header: 'Options', num: true,
      render: (r) => (r.holding_count ? r.holding_count : <span className="muted">—</span>),
    },
    { key: 'as_at_date', header: 'As at', render: (r) => date(r.as_at_date) },
  ];

  return (
    <>
      <PageHeader
        title="CFS Book"
        sub="Accounts under your management — funds, fees and investment mix"
        actions={<>
          <Select options={FEE_FILTERS} value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} />
          <Select options={FILTERS} value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Select
            options={[{ value: '', label: 'All types' },
              ...(book?.byAccountType || []).map((t) => ({ value: t.label, label: titleCase(t.label) }))]}
            value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
        </>}
      />

      <div className="content stack">
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="dz-ico">{busy ? <Spinner /> : '📥'}</div>
          <h3 style={{ margin: '10px 0 4px' }}>
            {busy ? `Reading ${busy}…` : 'Drop CFS statements or an adviser export here'}
          </h3>
          <div className="muted">
            or click to browse · drop a whole folder of PDF statements at once · XLSX, XLS, CSV one at a time
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" multiple style={{ display: 'none' }}
            onChange={(e) => { ingest(Array.from(e.target.files)); e.target.value = ''; }} />
        </div>

        {book == null ? <Loading /> :
         book === false ? <Empty icon="🚫" title="Couldn't load the book" /> :
         !book.accounts.length && !totals.accountCount ? (
           <Empty icon="📊" title="No CFS accounts yet">
             Drop a CFS adviser export above to build your book.
           </Empty>
         ) : (
          <>
            <div className="grid grid-4">
              <div className="stat blue">
                <div className="stat-label">Funds under management</div>
                <div className="stat-value">{currency(totals.totalFum)}</div>
                <div className="stat-foot">{totals.accountCount} accounts · {totals.clientCount} clients</div>
              </div>
              <div className="stat accent">
                <div className="stat-label">Adviser fees p.a.</div>
                <div className="stat-value">{currency(totals.totalFees)}</div>
                <div className="stat-foot">{currency(totals.totalFees / 12)} / month</div>
              </div>
              <div className="stat purple">
                <div className="stat-label">Average fee</div>
                <div className="stat-value">{pct(totals.avgFeePct, 2)}</div>
                <div className="stat-foot">weighted by balance</div>
              </div>
              <div className={`stat ${totals.unmatchedCount ? 'amber' : 'green'}`}>
                <div className="stat-label">Unlinked accounts</div>
                <div className="stat-value">{totals.unmatchedCount}</div>
                <div className="stat-foot">
                  {totals.unmatchedCount ? 'not attached to a client file' : 'every account is linked'}
                </div>
              </div>
            </div>

            {fees && (fees.notPayingCount > 0 || fees.payingCount > 0) && (
              <div className="card card-pad cfs-fee-panel">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Fee-paying vs not</h3>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      An account with no adviser service fee on its statement is being serviced for nothing.
                    </div>
                  </div>
                  <button className="btn sm" onClick={() => setFeeFilter(feeFilter === 'not_paying' ? '' : 'not_paying')}>
                    {feeFilter === 'not_paying' ? 'Show all accounts' : 'Show the non-payers'}
                  </button>
                </div>

                <div className="grid grid-3" style={{ marginTop: 14 }}>
                  <div className="stat red">
                    <div className="stat-label">FUM paying you nothing</div>
                    <div className="stat-value">{currency(fees.notPayingFum)}</div>
                    <div className="stat-foot">
                      {fees.notPayingCount} accounts · {pct(fees.notPayingPct, 1)} of the book
                    </div>
                  </div>
                  <div className="stat green">
                    <div className="stat-label">FUM paying fees</div>
                    <div className="stat-value">{currency(fees.payingFum)}</div>
                    <div className="stat-foot">{fees.payingCount} accounts</div>
                  </div>
                  <div className="stat accent">
                    <div className="stat-label">Revenue opportunity</div>
                    <div className="stat-value">{currency(fees.opportunity)}</div>
                    <div className="stat-foot cfs-rate-foot">
                      p.a. at
                      <input type="number" step="0.05" min="0" max="5" value={rate}
                        onChange={(e) => setRate(e.target.value)} aria-label="Fee rate %" />
                      %
                      <span>
                        {fees.rateSource === 'book' ? 'your current rate'
                          : fees.rateSource === 'chosen' ? 'your figure' : 'indicative'}
                      </span>
                    </div>
                  </div>
                </div>

                {fees.unknownCount > 0 && (
                  <div className="cfs-warn" style={{ marginTop: 12, marginBottom: 0 }}>
                    {fees.unknownCount} account(s) holding {currency(fees.unknownFum)} have an unknown fee
                    status — they came from a source that doesn&apos;t state adviser fees. Import their
                    statements to confirm.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-2">
              <Breakdown title="Investment mix" rows={book.byAssetClass}
                empty="Drop a PDF statement or a valuation export to see the option breakdown." />
              <Breakdown title="Account types" rows={book.byAccountType} labelFn={titleCase} />
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Accounts</h3>
                <span className="muted">{book.accounts.length} shown</span>
              </div>
              <DataTable columns={columns} rows={book.accounts} onRowClick={setOpenAccount}
                empty={<Empty icon="🔍" title="No accounts match this filter" />} />
            </div>
          </>
        )}
      </div>

      {preview && (
        <CFSImportReview
          preview={preview}
          clients={clients}
          onClose={() => setPreview(null)}
          onImported={() => { setPreview(null); load(); }}
        />
      )}

      {openAccount && (
        <AccountDetail
          account={openAccount}
          clients={clients}
          onClose={() => setOpenAccount(null)}
          onChanged={() => { setOpenAccount(null); load(); }}
        />
      )}
    </>
  );
}

/** Horizontal share-of-book bars. */
function Breakdown({ title, rows, labelFn = (s) => s, empty }) {
  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {!rows?.length ? <div className="muted" style={{ fontSize: 13 }}>{empty || 'Nothing to show yet.'}</div> : (
        <div className="cfs-bars">
          {rows.map((r) => (
            <div key={r.label} className="cfs-bar-row">
              <div className="cfs-bar-label">{labelFn(r.label)}</div>
              <div className="cfs-bar-track">
                <div className="cfs-bar-fill" style={{ width: `${Math.max(r.pct, 0.5)}%` }} />
              </div>
              <div className="cfs-bar-value">
                {currency(r.value)} <span className="muted">{pct(r.pct, 1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Drill-down: the account's investment options as CFS reported them. */
function AccountDetail({ account, clients, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get(`/cfs/accounts/${account.id}`).then(setData).catch(() => setData(false));
  }, [account.id]);

  const relink = async (clientId) => {
    try {
      await api.put(`/cfs/accounts/${account.id}`, { client_id: clientId || null });
      toast(clientId ? 'Account linked' : 'Account unlinked', 'success');
      onChanged();
    } catch (err) { toast(err.message, 'error'); }
  };

  const remove = async () => {
    try {
      await api.del(`/cfs/accounts/${account.id}`);
      toast('Account removed from the book', 'success');
      onChanged();
    } catch (err) { toast(err.message, 'error'); }
  };

  const cols = [
    { key: 'option_name', header: 'Investment option', render: (r) => (
      <>
        <div className="t-strong">{r.option_name}</div>
        {r.option_code && <div className="muted" style={{ fontSize: 12 }}>{r.option_code}</div>}
      </>
    ) },
    { key: 'asset_class', header: 'Asset class', render: (r) => r.asset_class || '—' },
    { key: 'balance', header: 'Value', num: true, render: (r) => currency(r.balance) },
    { key: 'allocation_pct', header: 'Allocation', num: true, render: (r) => pct(r.allocation_pct, 1) },
    { key: 'mgmt_fee_pct', header: 'Mgmt fee', num: true, render: (r) => pct(r.mgmt_fee_pct, 2) },
  ];

  return (
    <Modal
      title={account.account_name}
      wide
      onClose={onClose}
      footer={<>
        <button className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>Remove from book</button>
        <button className="btn" onClick={onClose}>Close</button>
      </>}
    >
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="stat blue">
          <div className="stat-label">Balance</div>
          <div className="stat-value">{currency(account.balance)}</div>
          <div className="stat-foot">as at {date(account.as_at_date)}</div>
        </div>
        <div className={`stat ${account.fee_status === 'paying' ? 'green' : 'red'}`}>
          <div className="stat-label">Adviser fee p.a.</div>
          <div className="stat-value">
            {account.fee_status === 'paying' ? currency(account.adviser_fee_amount) : 'Nothing'}
          </div>
          <div className="stat-foot">
            {account.fee_status === 'paying'
              ? `${pct(account.adviser_fee_pct, 2)} of balance`
              : 'no adviser service fee on this statement'}
          </div>
        </div>
        <div className="stat purple">
          <div className="stat-label">Growth / defensive</div>
          <div className="stat-value">
            {account.growth_pct != null ? pct(account.growth_pct, 1) : '—'}
          </div>
          <div className="stat-foot">
            {account.growth_pct != null
              ? `growth · ${pct(100 - account.growth_pct, 1)} defensive`
              : 'no allocation on file'}
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
        {account.product || 'Unknown product'} · {account.account_number || 'no account number'}
        {account.email ? ` · ${account.email}` : ''}
        {account.date_of_birth ? ` · born ${date(account.date_of_birth)}` : ''}
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>Linked client</label>
        <select value={account.client_id || ''} onChange={(e) => relink(e.target.value)}>
          <option value="">— not linked —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>
      </div>

      {data == null ? <Loading /> :
       data === false ? <Empty icon="🚫" title="Couldn't load holdings" /> : (
        <>
          {data.allocations?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 8px' }}>Asset allocation</h4>
              <div className="cfs-bars">
                {data.allocations.map((a) => (
                  <div key={a.id} className="cfs-bar-row">
                    <div className="cfs-bar-label">
                      {a.asset_class}
                      <span className="muted" style={{ fontSize: 11 }}> · {a.bucket}</span>
                    </div>
                    <div className="cfs-bar-track">
                      <div className={`cfs-bar-fill ${a.bucket === 'defensive' ? 'defensive' : ''}`}
                        style={{ width: `${Math.max(Number(a.pct) || 0, 0.5)}%` }} />
                    </div>
                    <div className="cfs-bar-value">
                      {currency(a.value)} <span className="muted">{pct(a.pct, 1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <h4 style={{ margin: '0 0 8px' }}>Investment options</h4>
          <DataTable columns={cols} rows={data.holdings}
            empty={<Empty icon="📄" title="No investment breakdown yet">
              Drop this client&apos;s CFS PDF statement to add their option-level holdings.
            </Empty>} />
        </>
      )}
    </Modal>
  );
}
