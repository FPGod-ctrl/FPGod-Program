import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { currency, pct } from '../lib/format.js';
import Modal from './ui/Modal.jsx';
import Badge from './ui/Badge.jsx';
import { Select } from './ui/Field.jsx';
import { Spinner } from './ui/Loading.jsx';
import { useToast } from './ui/Toast.jsx';

/**
 * Review screen between "file dropped" and "book updated".
 *
 * Nothing is written until Import is pressed. Two things need the adviser's
 * eyes first: which sheet column fed which field (CFS renames headings between
 * report versions), and which client each account attached to (a wrong link
 * puts one client's money on another's file).
 */

// Fields the user can remap, in the order they matter.
const MAPPABLE = [
  ['account_number', 'Account number'],
  ['account_name', 'Account name'],
  ['product', 'Product'],
  ['account_balance', 'Account balance'],
  ['adviser_fee_pct', 'Adviser fee %'],
  ['adviser_fee_amount', 'Adviser fee $'],
  ['option_name', 'Investment option'],
  ['option_code', 'Option code'],
  ['asset_class', 'Asset class'],
  ['holding_balance', 'Option value'],
  ['allocation_pct', 'Allocation %'],
  ['units', 'Units'],
  ['unit_price', 'Unit price'],
  ['mgmt_fee_pct', 'Management fee %'],
  ['as_at_date', 'As-at date'],
];

const CONFIDENCE_TONE = { high: 'green', medium: 'amber', low: 'red' };
const FEE_TONE = { paying: 'green', not_paying: 'red', unknown: 'amber' };
const FEE_LABEL = { paying: 'Paying', not_paying: 'Not paying', unknown: 'Unknown' };

// A folder of statements can be hundreds of accounts; rendering every row with
// its own client picker bogs the modal down. All of them still import.
const MAX_ROWS = 150;

export default function CFSImportReview({ preview, clients, onClose, onImported }) {
  const [columnMap, setColumnMap] = useState(preview.columnMap || {});
  const [accounts, setAccounts] = useState(preview.accounts || []);
  const [summary, setSummary] = useState(preview.summary);
  const [warnings, setWarnings] = useState(preview.warnings || []);
  const [skip, setSkip] = useState(() => new Set());
  const [remapping, setRemapping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const toast = useToast();

  const isSpreadsheet = preview.source === 'spreadsheet';
  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` })),
    [clients]
  );

  const included = accounts.filter((_, i) => !skip.has(i));
  const needsReview = accounts.filter((a, i) => !skip.has(i) && !a.client_id).length;

  /** Re-derive accounts server-side from an edited column mapping. */
  const remap = async (nextMap) => {
    setColumnMap(nextMap);
    if (!isSpreadsheet || !preview.rows?.length) return;
    setRemapping(true);
    try {
      const res = await api.post('/cfs/import/remap', {
        rows: preview.rows, columnMap: nextMap, headerRow: preview.headerRow,
      });
      setAccounts(res.accounts);
      setSummary(res.summary);
      setWarnings(res.warnings || []);
      setSkip(new Set());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRemapping(false);
    }
  };

  const setColumn = (field, value) => {
    const next = { ...columnMap };
    if (value === '') delete next[field];
    else next[field] = Number(value);
    remap(next);
  };

  const setClient = (i, clientId) => {
    setAccounts((prev) => prev.map((a, idx) => (idx === i
      ? { ...a, client_id: clientId || null, match_status: clientId ? 'matched' : 'unmatched',
        match_confidence: clientId ? (a.match_confidence || 'high') : null }
      : a)));
  };

  const toggleSkip = (i) => {
    setSkip((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const commit = async () => {
    if (!included.length) { toast('Nothing selected to import', 'error'); return; }
    setSaving(true);
    try {
      const res = await api.post('/cfs/import/commit', {
        filename: preview.filename,
        source: preview.source,
        column_map: columnMap,
        accounts: included,
      });
      toast(`${res.created} added, ${res.updated} updated`, 'success');
      onImported();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const fum = included.reduce((s, a) => s + Number(a.balance || 0), 0);
    const fees = included.reduce((s, a) => {
      const amt = a.adviser_fee_amount != null
        ? Number(a.adviser_fee_amount)
        : (Number(a.adviser_fee_pct || 0) / 100) * Number(a.balance || 0);
      return s + (Number.isFinite(amt) ? amt : 0);
    }, 0);
    const notPaying = included.filter((a) => a.fee_status === 'not_paying');
    return {
      fum,
      fees,
      avg: fum > 0 ? (fees / fum) * 100 : 0,
      notPayingCount: notPaying.length,
      notPayingFum: notPaying.reduce((s, a) => s + Number(a.balance || 0), 0),
    };
  }, [included]);

  return (
    <Modal
      title={`Review import — ${preview.filename}`}
      wide
      onClose={onClose}
      footer={<>
        <span className="muted" style={{ marginRight: 'auto', fontSize: 12.5 }}>
          {included.length} of {accounts.length} accounts
          {needsReview > 0 && ` · ${needsReview} not linked to a client`}
        </span>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={commit} disabled={saving || remapping || !included.length}>
          {saving ? 'Importing…' : `Import ${included.length} account${included.length === 1 ? '' : 's'}`}
        </button>
      </>}
    >
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="stat blue">
          <div className="stat-label">Funds under management</div>
          <div className="stat-value">{currency(totals.fum)}</div>
          <div className="stat-foot">{included.length} accounts</div>
        </div>
        <div className="stat accent">
          <div className="stat-label">Adviser fees p.a.</div>
          <div className="stat-value">{currency(totals.fees)}</div>
        </div>
        <div className="stat red">
          <div className="stat-label">Not paying fees</div>
          <div className="stat-value">{currency(totals.notPayingFum)}</div>
          <div className="stat-foot">{totals.notPayingCount} accounts</div>
        </div>
        <div className="stat purple">
          <div className="stat-label">Average fee</div>
          <div className="stat-value">{pct(totals.avg, 2)}</div>
          <div className="stat-foot">{summary?.holdingCount || 0} holdings</div>
        </div>
      </div>

      {preview.ai === false && preview.source === 'pdf' && (
        <div className="cfs-warn">⚠️ AI is not configured — this statement was read heuristically. Check every value.</div>
      )}
      {warnings.map((w, i) => <div key={i} className="cfs-warn">⚠️ {w}</div>)}

      {isSpreadsheet && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>Column mapping</strong>
              <div className="muted" style={{ fontSize: 12.5 }}>
                Sheet “{preview.selectedSheet}” · detected {Object.keys(columnMap).length} of {MAPPABLE.length} fields
                {remapping && <> · <Spinner /> re-reading…</>}
              </div>
            </div>
            <button className="btn sm" onClick={() => setShowMapping((v) => !v)}>
              {showMapping ? 'Hide' : 'Adjust columns'}
            </button>
          </div>

          {showMapping && (
            <div className="form-grid" style={{ marginTop: 14 }}>
              {MAPPABLE.map(([field, label]) => (
                <Select
                  key={field}
                  label={label}
                  placeholder="— not mapped —"
                  value={columnMap[field] ?? ''}
                  onChange={(e) => setColumn(field, e.target.value)}
                  options={preview.headers.map((h, i) => ({
                    value: i, label: h ? `${col(i)} · ${h}` : `${col(i)} · (blank)`,
                  }))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 34 }}></th>
              <th>Account</th>
              <th>Product</th>
              <th className="num">Balance</th>
              <th>Fees</th>
              <th style={{ width: 230 }}>Client</th>
            </tr>
          </thead>
          <tbody>
            {accounts.slice(0, MAX_ROWS).map((a, i) => {
              const skipped = skip.has(i);
              return (
                <tr key={`${a.account_number || a.account_name}-${i}`} className={skipped ? 'cfs-skipped' : ''}>
                  <td>
                    <input type="checkbox" checked={!skipped} onChange={() => toggleSkip(i)}
                      title={skipped ? 'Include' : 'Skip this account'} />
                  </td>
                  <td>
                    <div className="t-strong">{a.account_name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {a.account_number || 'no account number'}
                      {a.holdings?.length ? ` · ${a.holdings.length} options` : ''}
                    </div>
                    {a.notes && <div className="cfs-note">{a.notes}</div>}
                  </td>
                  <td>
                    <div>{a.product || '—'}</div>
                    <Badge value={a.account_type} />
                  </td>
                  <td className="num">{currency(a.balance)}</td>
                  <td>
                    <Badge tone={FEE_TONE[a.fee_status] || 'amber'}>
                      {FEE_LABEL[a.fee_status] || 'Unknown'}
                    </Badge>
                    {a.fee_status === 'paying' && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                        {currency(a.adviser_fee_amount)} · {pct(a.adviser_fee_pct, 2)}
                      </div>
                    )}
                  </td>
                  <td>
                    <select value={a.client_id || ''} onChange={(e) => setClient(i, e.target.value)}>
                      <option value="">— not linked —</option>
                      {clientOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {a.client_id && a.match_confidence && (
                      <Badge tone={CONFIDENCE_TONE[a.match_confidence]}>
                        {a.match_confidence} confidence
                      </Badge>
                    )}
                    {!a.client_id && a.match_note && (
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{a.match_note}</div>
                    )}
                    {!a.client_id && a.match_options?.length > 0 && (
                      <div className="cfs-suggest">
                        {a.match_options.slice(0, 3).map((o) => (
                          <button key={o.id} className="btn sm ghost" onClick={() => setClient(i, o.id)}>
                            {o.label}?
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {accounts.length > MAX_ROWS && (
          <div className="muted" style={{ fontSize: 12.5, padding: '10px 4px' }}>
            Showing the first {MAX_ROWS} of {accounts.length} accounts. All {accounts.length} will be
            imported — link the rest from the CFS Book page afterwards.
          </div>
        )}
      </div>
    </Modal>
  );
}

/** 0 → A, 25 → Z, 26 → AA — so the mapping list reads like the spreadsheet. */
function col(i) {
  let n = i;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
