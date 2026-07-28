import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import Modal from './ui/Modal.jsx';
import { TextInput, Select, TextArea } from './ui/Field.jsx';
import { Spinner } from './ui/Loading.jsx';
import { useToast } from './ui/Toast.jsx';
import { CATS, RISK_ENUM, STATUS_ENUM, applyScan, coerceEnum, countItems, estateBits, sanitizeClient } from '../lib/scanApply.js';

export const RISK = RISK_ENUM.allowed;
export const STATUS = STATUS_ENUM.allowed;
const YES_NO = ['yes', 'no'];

// Core fields, always shown.
const CORE = { first_name: '', last_name: '', email: '', phone: '', address: '', occupation: '',
  risk_profile: '', status: 'prospect', annual_income: '', net_worth: '', date_of_birth: '', notes: '',
  partner_first_name: '', partner_last_name: '', partner_email: '', partner_phone: '',
  partner_date_of_birth: '', partner_occupation: '', partner_annual_income: '', partner_risk_profile: '' };

// Extended profile fields — hidden behind "More detail" until a scan fills them.
const EXTRA_CLIENT = [
  { key: 'middle_name', label: 'Middle name' },
  { key: 'preferred_name', label: 'Preferred name' },
  { key: 'marital_status', label: 'Marital status' },
  { key: 'smoker', label: 'Smoker', kind: 'bool' },
  { key: 'employment_status', label: 'Employment status' },
  { key: 'employment_basis', label: 'Employment basis' },
  { key: 'employer_name', label: 'Employer' },
  { key: 'super_balance', label: 'Super balance', type: 'number' },
  { key: 'super_provider', label: 'Super provider' },
  { key: 'super_contributions', label: 'Super contributions', type: 'number' },
];
const EXTRA_PARTNER = EXTRA_CLIENT.map((fl) => ({
  ...fl, key: `partner_${fl.key}`, label: `Partner ${fl.label.toLowerCase()}`,
}));
const EXTRA_NOTES = [
  { key: 'health_notes', label: 'Health background' },
  { key: 'goals_scope', label: 'Goals / scope of advice' },
  { key: 'historic_context', label: 'Background & history' },
  { key: 'other_details', label: 'Other details' },
];
const EXTRA_KEYS = [...EXTRA_CLIENT, ...EXTRA_PARTNER, ...EXTRA_NOTES].map((fl) => fl.key);

/** Build the blank form state (core + extended fields). */
const blankForm = () => {
  const base = { ...CORE };
  for (const k of EXTRA_KEYS) base[k] = '';
  return base;
};

/** Merge a scanned client object into form state, normalising the odd shapes. */
function mergeScanned(prev, scannedClient) {
  const next = { ...prev };
  for (const k of Object.keys(next)) {
    const v = scannedClient?.[k];
    if (v == null || v === '') continue;
    if (k === 'smoker' || k === 'partner_smoker') next[k] = v === true || /^(true|yes|y|smoker)$/i.test(String(v)) ? 'yes' : 'no';
    else if (k.endsWith('date_of_birth')) next[k] = String(v).slice(0, 10);
    // Snap enums onto a real option, or the <Select> shows "—" and the advisor
    // can't see (or keep) what the scan actually detected — "High growth" etc.
    else if (k.endsWith('risk_profile')) next[k] = coerceEnum(v, RISK_ENUM.allowed, '', RISK_ENUM.aliases);
    else if (k === 'status') next[k] = coerceEnum(v, STATUS_ENUM.allowed, STATUS_ENUM.fallback, STATUS_ENUM.aliases);
    else next[k] = String(v);
  }
  if (!next.status) next.status = 'prospect';
  return next;
}

/**
 * Create-a-client modal. Used from the Clients page and inline from any
 * Advisory generator (so a household can be created without leaving the flow).
 * `onSaved(created)` receives the saved client row so callers can select it (or
 * navigate to the new client's page).
 *
 * Drop a client profile (here or on the Clients page) and the AI extracts the
 * whole file — personal details, family, holdings, assets, debts, income,
 * expenses, insurance, goals and estate — into this form for review. Saving
 * writes ALL of it, so the new client page opens already populated.
 */
export default function ClientForm({ parsed, onClose, onSaved }) {
  // Everything the scan found, beyond the personal details in the form itself.
  const [scan, setScan] = useState(parsed || null);
  const [f, setF] = useState(() => (parsed?.client ? mergeScanned(blankForm(), parsed.client) : blankForm()));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [drag, setDrag] = useState(false);
  const [scanned, setScanned] = useState(false);   // a profile was read in this modal
  const [showExtra, setShowExtra] = useState(() => EXTRA_KEYS.some((k) => parsed?.client?.[k] != null && parsed.client[k] !== ''));
  const fileRef = useRef(null);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const prefilled = Boolean(parsed) || scanned;
  const itemCount = countItems(scan);
  const estate = estateBits(scan?.estate);

  // Drop / browse a client profile → extract with AI → merge into the form fields.
  const importFromFile = async (files) => {
    const file = files?.[0];
    if (!file || importing) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/clients/import', fd);
      if (!res.ai) toast('Read in offline mode — double-check every field', 'info');
      const p = res.parsed || {};
      setF((prev) => mergeScanned(prev, p.client));
      // Merge into anything a previous drop already found rather than replacing it.
      setScan((prev) => {
        const merged = { ...(prev || {}), ...p };
        for (const cat of CATS) {
          merged[cat.key] = [...(prev?.[cat.key] || []), ...(p[cat.key] || [])];
        }
        merged.estate = { ...(prev?.estate || {}), ...(p.estate || {}) };
        return merged;
      });
      if (EXTRA_KEYS.some((k) => p.client?.[k] != null && p.client[k] !== '')) setShowExtra(true);
      setScanned(true);
      const found = countItems(p);
      toast(`Profile read${found ? ` — ${found} item${found === 1 ? '' : 's'} found` : ''}. Review below.`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const submit = async () => {
    if (!f.first_name || !f.last_name) { toast('First and last name are required', 'error'); return; }
    setSaving(true);
    try {
      const created = await api.post('/clients', sanitizeClient(f));

      // Write everything else the scan found onto the new file. It's brand new,
      // so there is nothing to de-duplicate against.
      if (created?.id && scan) {
        const { added, skipped } = await applyScan(created.id, scan, { dedupe: false });
        if (added) {
          toast(`Client created with ${added} detail${added === 1 ? '' : 's'} from the profile`
            + (skipped ? ` (${skipped} couldn’t be read)` : ''), 'success');
        }
      }
      onSaved(created);
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  const field = (fl) => (fl.kind === 'bool'
    ? <Select key={fl.key} label={fl.label} placeholder="—" options={YES_NO} value={f[fl.key]} onChange={set(fl.key)} />
    : <TextInput key={fl.key} label={fl.label} type={fl.type || 'text'} value={f[fl.key]} onChange={set(fl.key)} />);

  return (
    <Modal title={prefilled ? 'Review Imported Client' : 'New Client'} wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving || importing}>
          {saving ? 'Saving…' : (prefilled ? 'Save Client' : 'Create Client')}
        </button>
      </>}>

      {/* In-modal drag-and-drop: drop a profile to auto-fill the fields below. */}
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        style={{ padding: '18px 16px', marginBottom: 16 }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); importFromFile(e.dataTransfer.files); }}
        onClick={() => !importing && fileRef.current?.click()}
      >
        <div className="dz-ico" style={{ fontSize: 30 }}>{importing ? <Spinner /> : '📄'}</div>
        <h3 style={{ margin: '8px 0 2px', fontSize: 15 }}>
          {importing ? 'Reading profile…' : 'Drag a client profile here to auto-fill'}
        </h3>
        <div className="muted" style={{ fontSize: 12.5 }}>
          {importing ? 'Extracting details with AI…' : 'or click to browse · PDF, DOC, DOCX, XLSX, CSV, TXT'}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => importFromFile(e.target.files)} />
      </div>

      {prefilled && (
        <div className="md" style={{ marginBottom: 14 }}>
          <blockquote style={{ borderLeftColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            ✨ Pre-filled from the profile. <strong>Review and edit anything</strong> before saving.
          </blockquote>
        </div>
      )}

      <div className="form-grid">
        <TextInput label="First name *" value={f.first_name} onChange={set('first_name')} />
        <TextInput label="Last name *" value={f.last_name} onChange={set('last_name')} />
        <TextInput label="Email" type="email" value={f.email} onChange={set('email')} />
        <TextInput label="Phone" value={f.phone} onChange={set('phone')} />
        <TextInput label="Address" value={f.address} onChange={set('address')} />
        <TextInput label="Occupation" value={f.occupation} onChange={set('occupation')} />
        <TextInput label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
        <Select label="Risk profile" placeholder="—" options={RISK} value={f.risk_profile} onChange={set('risk_profile')} />
        <Select label="Status" options={STATUS} value={f.status} onChange={set('status')} />
        <TextInput label="Annual income" type="number" value={f.annual_income} onChange={set('annual_income')} />
        <TextInput label="Net worth" type="number" value={f.net_worth} onChange={set('net_worth')} />
      </div>

      <h4 style={{ margin: '18px 0 8px' }}>Partner / Spouse
        <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> (optional — leave blank if single)</span></h4>
      <div className="form-grid">
        <TextInput label="Partner first name" value={f.partner_first_name} onChange={set('partner_first_name')} />
        <TextInput label="Partner last name" value={f.partner_last_name} onChange={set('partner_last_name')} />
        <TextInput label="Partner email" type="email" value={f.partner_email} onChange={set('partner_email')} />
        <TextInput label="Partner phone" value={f.partner_phone} onChange={set('partner_phone')} />
        <TextInput label="Partner date of birth" type="date" value={f.partner_date_of_birth} onChange={set('partner_date_of_birth')} />
        <TextInput label="Partner occupation" value={f.partner_occupation} onChange={set('partner_occupation')} />
        <TextInput label="Partner annual income" type="number" value={f.partner_annual_income} onChange={set('partner_annual_income')} />
        <Select label="Partner risk profile" placeholder="—" options={RISK} value={f.partner_risk_profile} onChange={set('partner_risk_profile')} />
      </div>

      {/* Extended profile — employment, super, health, background. */}
      <button className="btn" style={{ margin: '18px 0 0' }} onClick={() => setShowExtra((v) => !v)}>
        {showExtra ? '− Hide extra detail' : '+ More detail (employment, super, background)'}
      </button>
      {showExtra && (
        <>
          <h4 style={{ margin: '16px 0 8px' }}>Employment &amp; super</h4>
          <div className="form-grid">{EXTRA_CLIENT.map(field)}</div>
          <h4 style={{ margin: '16px 0 8px' }}>Partner employment &amp; super</h4>
          <div className="form-grid">{EXTRA_PARTNER.map(field)}</div>
          {EXTRA_NOTES.map((fl) => (
            <TextArea key={fl.key} label={fl.label} value={f[fl.key]} onChange={set(fl.key)} />
          ))}
        </>
      )}

      {/* Everything else the scan found — saved to the client page on submit. */}
      {(itemCount > 0 || estate.length > 0) && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: '0 0 8px' }}>Also saved to this client’s page
            <span className="muted" style={{ fontWeight: 400 }}> — {itemCount} item{itemCount === 1 ? '' : 's'}</span></h4>
          <div className="stack" style={{ gap: 10 }}>
            {CATS.filter((cat) => (scan?.[cat.key] || []).length > 0).map((cat) => (
              <div key={cat.key}>
                <div className="t-strong" style={{ fontSize: 13, marginBottom: 4 }}>
                  {cat.icon} {cat.title} <span className="muted" style={{ fontWeight: 400 }}>({scan[cat.key].length})</span>
                </div>
                <div className="stack" style={{ gap: 4 }}>
                  {scan[cat.key].map((row, i) => (
                    <div key={i} className="faint" style={{ fontSize: 12.5, padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
                      {cat.label(row)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {estate.length > 0 && (
              <div>
                <div className="t-strong" style={{ fontSize: 13, marginBottom: 4 }}>⚖️ Estate planning</div>
                <div className="faint" style={{ fontSize: 12.5, padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
                  {estate.join(' · ')}
                </div>
              </div>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            These are added to the client’s Overview after saving — you can edit or remove any of them there.
          </p>
        </div>
      )}

      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
