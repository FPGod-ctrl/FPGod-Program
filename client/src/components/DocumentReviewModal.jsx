import { useState } from 'react';
import { api } from '../api/client.js';
import { currency, titleCase } from '../lib/format.js';
import Modal from './ui/Modal.jsx';
import { TextInput, Select } from './ui/Field.jsx';
import { useToast } from './ui/Toast.jsx';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];

// Financial categories the scanner can extract, with where to POST them and how
// to label each extracted row in the review list.
const CATS = [
  { key: 'investments', title: 'Investment holdings', icon: '📊', endpoint: '/investments/current', req: 'fund_name', keyFields: ['fund_name', 'balance'],
    label: (r) => `${r.fund_name || 'Holding'}${r.balance ? ` — ${currency(r.balance)}` : ''}` },
  { key: 'assets', title: 'Assets', icon: '🏦', endpoint: '/assets', req: 'name', keyFields: ['name', 'value'],
    label: (r) => `${r.name || 'Asset'}${r.category ? ` · ${titleCase(r.category)}` : ''}${r.value ? ` — ${currency(r.value)}` : ''}` },
  { key: 'liabilities', title: 'Debts & liabilities', icon: '💳', endpoint: '/liabilities', req: 'name', keyFields: ['name', 'balance'],
    label: (r) => `${r.name || 'Debt'}${r.liability_type ? ` · ${titleCase(r.liability_type)}` : ''}${r.balance ? ` — ${currency(r.balance)}` : ''}` },
  { key: 'income', title: 'Income', icon: '💰', endpoint: '/income', req: 'name', keyFields: ['name', 'amount'],
    label: (r) => `${r.name || 'Income'}${r.amount ? ` — ${currency(r.amount)}/${r.frequency || 'annual'}` : ''}` },
  { key: 'expenses', title: 'Expenses', icon: '🧾', endpoint: '/expenses', req: 'name', keyFields: ['name', 'amount'],
    label: (r) => `${r.name || 'Expense'}${r.amount ? ` — ${currency(r.amount)}/${r.frequency || 'monthly'}` : ''}` },
  { key: 'insurance', title: 'Insurance', icon: '🛡️', endpoint: '/insurance', req: 'policy_type', keyFields: ['policy_type', 'provider', 'cover_amount'],
    label: (r) => `${titleCase(r.policy_type || 'policy')}${r.provider ? ` · ${r.provider}` : ''}${r.cover_amount ? ` — ${currency(r.cover_amount)} cover` : ''}` },
  { key: 'goals', title: 'Goals', icon: '🎯', endpoint: '/goals', req: 'name', keyFields: ['name', 'target_amount'],
    label: (r) => `${r.name || 'Goal'}${Number.isFinite(Number(r.target_amount)) && r.target_amount !== '' ? ` — ${currency(r.target_amount)}` : ''}` },
];

// Identifying key so we never insert an item the client already has.
const keyOf = (row, fields) => fields.map((f) => String(row[f] ?? '').trim().toLowerCase()).join('|');

// Fields that map to DATE / NUMERIC database columns — must be cleaned before
// saving so the AI's stray text ("Not provided", "$NaN") never hits the DB.
const DATE_FIELDS = ['date_of_birth', 'partner_date_of_birth', 'target_date', 'will_date'];
const NUMERIC_FIELDS = ['value', 'balance', 'amount', 'interest_rate', 'monthly_payment',
  'cover_amount', 'premium', 'target_amount', 'current_amount', 'allocation_pct', 'fee_pct',
  'annual_income', 'net_worth', 'partner_annual_income'];
const PLACEHOLDER = /^(not provided|not provid\w*|n\/?a|unknown|none|null|tbc|tba|-+)$/i;
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));

// Coerce a payload so date/number columns get valid values or null.
function sanitize(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v === '' || v == null) { out[k] = null; continue; }
    const s = String(v).trim();
    if (PLACEHOLDER.test(s)) { out[k] = null; continue; }
    if (DATE_FIELDS.includes(k)) {
      out[k] = isValidDate(s) ? s.slice(0, 10) : null;
    } else if (NUMERIC_FIELDS.includes(k)) {
      const digits = s.replace(/[^0-9.\-]/g, '');
      const n = Number(digits);
      out[k] = digits !== '' && Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

const PERSONAL = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { key: 'annual_income', label: 'Annual income', type: 'number' },
  { key: 'net_worth', label: 'Net worth', type: 'number' },
  { key: 'partner_first_name', label: 'Partner first name' },
  { key: 'partner_last_name', label: 'Partner last name' },
  { key: 'partner_email', label: 'Partner email', type: 'email' },
  { key: 'partner_phone', label: 'Partner phone' },
  { key: 'partner_date_of_birth', label: 'Partner DOB', type: 'date' },
  { key: 'partner_occupation', label: 'Partner occupation' },
  { key: 'partner_annual_income', label: 'Partner annual income', type: 'number' },
];

/**
 * Review screen for everything a document scan extracted: editable personal
 * details, plus tick-to-apply lists of assets/debts/income/etc. and estate
 * details. Nothing is written until the advisor confirms.
 */
export default function DocumentReviewModal({ parsed, client, clientId, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const p = parsed || {};

  const [personal, setPersonal] = useState(() => {
    const base = {};
    for (const fl of PERSONAL) {
      let v = client[fl.key];
      if (fl.type === 'date' && v) v = String(v).slice(0, 10);
      base[fl.key] = v ?? '';
    }
    base.risk_profile = client.risk_profile ?? '';
    const o = p.client || {};
    for (const k of Object.keys(base)) {
      if (o[k] != null && o[k] !== '') {
        base[k] = k.endsWith('date_of_birth') ? String(o[k]).slice(0, 10)
          : k.endsWith('risk_profile') ? String(o[k]).toLowerCase()
            : String(o[k]);
      }
    }
    return base;
  });
  const setP = (k) => (e) => setPersonal({ ...personal, [k]: e.target.value });

  // Per-category selection (everything checked by default).
  const [sel, setSel] = useState(() => {
    const s = {};
    for (const cat of CATS) s[cat.key] = (p[cat.key] || []).map(() => true);
    return s;
  });
  const toggle = (key, i) => setSel((s) => ({ ...s, [key]: s[key].map((v, idx) => (idx === i ? !v : v)) }));

  const estate = p.estate || {};
  const estateBits = [];
  if (estate.has_will) estateBits.push('Will' + (estate.executor ? ` (executor: ${estate.executor})` : ''));
  if (estate.has_poa) estateBits.push('POA' + (estate.poa_type ? ` (${titleCase(estate.poa_type)})` : ''));
  if (estate.has_testamentary_trust) estateBits.push('Testamentary trust');
  if (estate.beneficiaries) estateBits.push(`Beneficiaries: ${estate.beneficiaries}`);
  const hasEstate = estateBits.length > 0;
  const [applyEstate, setApplyEstate] = useState(hasEstate);

  const activeCats = CATS.filter((cat) => (p[cat.key] || []).length > 0);
  const selectedCount = CATS.reduce((n, cat) => n + (sel[cat.key] || []).filter(Boolean).length, 0);
  const hasPersonal = Object.keys(p.client || {}).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      // 1) Personal details
      await api.put(`/clients/${clientId}`, sanitize(personal));

      // 2) Financial line items — skip anything the client already has so
      //    re-scanning or double-applying can't create duplicates.
      let added = 0;
      let skipped = 0;
      for (const cat of CATS) {
        const items = p[cat.key] || [];
        const chosen = items.filter((_, i) => sel[cat.key][i]);
        if (!chosen.length) continue;

        let existing = [];
        try { existing = await api.get(`${cat.endpoint}?client_id=${clientId}`); } catch { existing = []; }
        const seen = new Set((existing || []).map((r) => keyOf(r, cat.keyFields)));

        for (const raw of chosen) {
          const item = sanitize({ ...raw, client_id: clientId });
          if (cat.req === 'policy_type' && !item.policy_type) item.policy_type = 'other';
          if (cat.req !== 'policy_type' && !item[cat.req]) continue;
          const k = keyOf(item, cat.keyFields);
          if (seen.has(k)) { skipped += 1; continue; }   // already on file
          seen.add(k);
          try { await api.post(cat.endpoint, item); added += 1; } catch { /* skip rows the AI got wrong */ }
        }
      }

      // 3) Estate planning
      if (applyEstate && hasEstate) {
        try { await api.put(`/clients/${clientId}/estate`, sanitize(estate)); } catch { /* non-fatal */ }
      }

      toast(`Applied — ${added} item${added === 1 ? '' : 's'} added`
        + (skipped ? `, ${skipped} skipped (already on file)` : ''), 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Review Extracted Details" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Applying…' : `Apply to client${selectedCount ? ` (${selectedCount} item${selectedCount === 1 ? '' : 's'})` : ''}`}
        </button>
      </>}>
      <div className="md" style={{ marginBottom: 14 }}>
        <blockquote style={{ borderLeftColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          ✨ Pulled from your document{p.scanned > 1 ? 's' : ''}. <strong>Review, untick anything wrong</strong>, then apply.
          Existing data is only overwritten where the document had a value.
        </blockquote>
      </div>

      {/* Personal details */}
      <h4 style={{ margin: '4px 0 8px' }}>Personal details {hasPersonal ? '' : <span className="muted">(nothing new found)</span>}</h4>
      <div className="form-grid">
        {PERSONAL.map((fl) => (
          <TextInput key={fl.key} label={fl.label} type={fl.type || 'text'}
            value={personal[fl.key] ?? ''} onChange={setP(fl.key)} />
        ))}
        <Select label="Risk profile" placeholder="—" options={RISK} value={personal.risk_profile} onChange={setP('risk_profile')} />
      </div>

      {/* Financial line items */}
      {activeCats.map((cat) => (
        <div key={cat.key} style={{ marginTop: 18 }}>
          <h4 style={{ margin: '0 0 8px' }}>{cat.icon} {cat.title}
            <span className="muted" style={{ fontWeight: 400 }}> — {(p[cat.key] || []).length} found</span></h4>
          <div className="stack" style={{ gap: 6 }}>
            {(p[cat.key] || []).map((row, i) => (
              <label key={i} className="row" style={{ gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={sel[cat.key][i]} onChange={() => toggle(cat.key, i)} />
                <span>{cat.label(row)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Estate planning */}
      {hasEstate && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ margin: '0 0 8px' }}>⚖️ Estate planning</h4>
          <label className="row" style={{ gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={applyEstate} onChange={(e) => setApplyEstate(e.target.checked)} />
            <span>{estateBits.join(' · ')}</span>
          </label>
        </div>
      )}

      {!hasPersonal && activeCats.length === 0 && !hasEstate && (
        <p className="muted" style={{ marginTop: 16 }}>
          The scan didn’t find any structured financial details in this document. You can still add items manually on the Overview tab.
        </p>
      )}
    </Modal>
  );
}
