import { useState } from 'react';
import { api } from '../api/client.js';
import Modal from './ui/Modal.jsx';
import { TextInput, Select } from './ui/Field.jsx';
import { useToast } from './ui/Toast.jsx';
import { CATS, applyScan, estateBits, hasEstate, sanitizeClient } from '../lib/scanApply.js';

const RISK = ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'];

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

  const estateSummary = estateBits(p.estate);
  const showEstate = hasEstate(p.estate);
  const [applyEstate, setApplyEstate] = useState(showEstate);

  const activeCats = CATS.filter((cat) => (p[cat.key] || []).length > 0);
  const selectedCount = CATS.reduce((n, cat) => n + (sel[cat.key] || []).filter(Boolean).length, 0);
  const hasPersonal = Object.keys(p.client || {}).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      // 1) Personal details
      await api.put(`/clients/${clientId}`, sanitizeClient(personal));

      // 2) Everything else — de-duplicated against what's already on file so
      //    re-scanning or double-applying can't create duplicates.
      const { added, skipped } = await applyScan(clientId, p, {
        selection: sel,
        estate: applyEstate && showEstate,
      });

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
      {showEstate && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ margin: '0 0 8px' }}>⚖️ Estate planning</h4>
          <label className="row" style={{ gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={applyEstate} onChange={(e) => setApplyEstate(e.target.checked)} />
            <span>{estateSummary.join(' · ')}</span>
          </label>
        </div>
      )}

      {!hasPersonal && activeCats.length === 0 && !showEstate && (
        <p className="muted" style={{ marginTop: 16 }}>
          The scan didn’t find any structured financial details in this document. You can still add items manually on the Overview tab.
        </p>
      )}
    </Modal>
  );
}
