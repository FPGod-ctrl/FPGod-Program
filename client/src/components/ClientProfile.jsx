import { Fragment, useState } from 'react';
import { api } from '../api/client.js';
import { currency, date as fmtDate, titleCase, initials } from '../lib/format.js';
import FinancialBreakdown from './FinancialBreakdown.jsx';
import Modal from './ui/Modal.jsx';
import Badge from './ui/Badge.jsx';
import { Empty } from './ui/Loading.jsx';
import { TextInput, Select, TextArea } from './ui/Field.jsx';
import { useToast } from './ui/Toast.jsx';

const RELATIONSHIPS = ['child', 'stepchild', 'dependent', 'parent', 'sibling', 'grandchild', 'other'];
const MARITAL = ['single', 'married', 'de_facto', 'separated', 'divorced', 'widowed'];
const EMPLOYMENT = ['employed', 'self_employed', 'contractor', 'retired', 'unemployed', 'home_duties', 'student'];
const EMP_BASIS = ['full_time', 'part_time', 'casual', 'contract', 'seasonal'];

// Whole-year age from a date of birth (null-safe).
function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a >= 0 && a < 130 ? a : null;
}

const fullName = (first, middle, last) => [first, middle, last].filter(Boolean).join(' ') || '—';

// ---- Section heading with a trailing rule (matches the generator-hub look) ----
function SectionLabel({ children }) {
  return <div className="section-label" style={{ marginTop: 8 }}>{children}</div>;
}

export default function ClientProfile({ data, clientId, reload, onEdit }) {
  const { client } = data;
  const family = data.family || [];
  const hasPartner = Boolean(client.partner_first_name || client.partner_last_name);
  const combinedIncome = Number(client.annual_income || 0) + Number(client.partner_annual_income || 0);

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* ---------------- IDENTITY ---------------- */}
      <SectionLabel>Identity · People</SectionLabel>
      <div className="grid grid-2">
        <PersonCard client={client} role="Primary · Client" onEdit={onEdit} />
        {hasPartner
          ? <PersonCard client={client} partner role="Partner · Joint client" onEdit={onEdit} />
          : (
            <div className="card card-pad" style={{ display: 'grid', placeItems: 'center' }}>
              <Empty icon="👤" title="No partner on this file">
                <button className="btn sm primary" style={{ marginTop: 10 }} onClick={onEdit}>+ Add partner</button>
              </Empty>
            </div>
          )}
      </div>
      {combinedIncome > 0 && (
        <div className="muted" style={{ marginTop: -6 }}>
          Combined income <span className="t-strong">{currency(combinedIncome)}</span>
        </div>
      )}

      {/* ---------------- FAMILY ---------------- */}
      <FamilySection clientId={clientId} groupId={client.group_id} members={family} reload={reload} />

      {/* ---------------- WEALTH · ESTATE (existing breakdown, incl. insurance/goals/estate) ---------------- */}
      <SectionLabel>Assets · Liabilities · Insurance · Estate</SectionLabel>
      <FinancialBreakdown data={data} clientId={clientId} reload={reload} showSummary showEstate />

      {/* ---------------- PERSONAL ---------------- */}
      <SectionLabel>Personal</SectionLabel>
      <ProseCard clientId={clientId} icon="🩺" title="Health" field="health_notes"
        value={client.health_notes} placeholder="Medical history, conditions relevant to insurance / advice…" reload={reload} />
      <ProseCard clientId={clientId} icon="🎯" title="Goals & scope" field="goals_scope"
        value={client.goals_scope} placeholder="What the client wants to achieve and the scope of advice…" reload={reload} />

      {/* ---------------- HISTORY ---------------- */}
      <SectionLabel>History</SectionLabel>
      <ProseCard clientId={clientId} icon="📜" title="Historic context" field="historic_context"
        value={client.historic_context} placeholder="Background, prior advice, legacy context…" reload={reload} />
      <ProseCard clientId={clientId} icon="🗒️" title="Other details" field="other_details"
        value={client.other_details} placeholder="Anything else worth recording…" reload={reload} />
    </div>
  );
}

// =====================================================================
// Person card (primary client or partner). Reads client.* or client.partner_*.
// =====================================================================
function PersonCard({ client, partner = false, role, onEdit }) {
  const p = (key) => client[partner ? `partner_${key}` : key];
  const first = p('first_name');
  const name = fullName(first, p('middle_name'), p('last_name'));
  const age = ageFrom(p('date_of_birth'));
  const smoker = p('smoker');
  const money = (v) => (v == null || v === '' ? '—' : currency(v));

  const rows = [
    ['Preferred name', p('preferred_name') || '—'],
    ['Date of birth', fmtDate(p('date_of_birth'))],
    ['Age', age == null ? '—' : age],
    ['Occupation', p('occupation') || '—'],
    ['Employment', p('employment_status') ? <Badge value={p('employment_status')} /> : '—'],
    ['Employment basis', p('employment_basis') ? titleCase(p('employment_basis')) : '—'],
    ['Employer', p('employer_name') || '—'],
    ['Marital status', p('marital_status') ? titleCase(p('marital_status')) : '—'],
    ['Annual income', money(p('annual_income'))],
    ['Super balance', money(p('super_balance'))],
    ['Super provider', p('super_provider') || '—'],
    ['Super contributions', money(p('super_contributions'))],
    ['Smoker', smoker == null ? '—' : (smoker ? <Badge tone="red" value="Smoker" /> : <Badge tone="green" value="Non-smoker" />)],
  ];

  return (
    <div className="card card-pad">
      <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="avatar" style={{ width: 40, height: 40 }}>{initials(first, p('last_name'))}</div>
          <div>
            <div className="t-strong" style={{ fontSize: 16 }}>{name}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{role}</div>
          </div>
        </div>
        <button className="btn sm ghost" onClick={onEdit}>Edit</button>
      </div>
      <dl className="kv">
        {rows.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
      </dl>
    </div>
  );
}

// =====================================================================
// Family members / dependents
// =====================================================================
function FamilySection({ clientId, groupId, members, reload }) {
  const [editing, setEditing] = useState(null); // row | {} | null
  const toast = useToast();

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.first_name || 'this family member'}?`)) return;
    try { await api.del(`/family/${row.id}`); reload(); toast('Removed', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>👨‍👩‍👧 Family <span className="muted" style={{ fontWeight: 500 }}>{members.length}</span></h3>
        <button className="btn sm primary" onClick={() => setEditing({})}>+ Add member</button>
      </div>
      {members.length === 0 ? (
        <Empty icon="👨‍👩‍👧" title="No family members on record">Add children or dependents on this file.</Empty>
      ) : (
        <div className="card-pad stack" style={{ gap: 8 }}>
          {members.map((m) => {
            const age = ageFrom(m.date_of_birth);
            return (
              <div key={m.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{initials(m.first_name, m.last_name)}</div>
                  <div>
                    <div className="t-strong">{fullName(m.first_name, null, m.last_name)}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      <Badge tone="blue" value={titleCase(m.relationship)} />
                      {age != null && <span style={{ marginLeft: 8 }}>{age} yrs</span>}
                      {m.date_of_birth && <span style={{ marginLeft: 8 }}>· {fmtDate(m.date_of_birth)}</span>}
                      {m.is_dependent && <span style={{ marginLeft: 8 }}>· dependent</span>}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm ghost" onClick={() => setEditing(m)}>Edit</button>
                  <button className="btn sm danger" onClick={() => remove(m)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <FamilyForm row={editing} clientId={clientId} groupId={groupId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); toast('Saved', 'success'); }} />
      )}
    </div>
  );
}

function FamilyForm({ row, clientId, groupId, onClose, onSaved }) {
  const isEdit = Boolean(row.id);
  const [f, setF] = useState(() => ({
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    relationship: row.relationship || 'child',
    date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
    is_dependent: row.is_dependent ?? true,
    notes: row.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.first_name) { toast('First name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { client_id: clientId, group_id: groupId || null, ...f };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      if (isEdit) await api.put(`/family/${row.id}`, payload);
      else await api.post('/family', payload);
      onSaved();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`${isEdit ? 'Edit' : 'Add'} family member`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </>}>
      <div className="form-grid">
        <TextInput label="First name *" value={f.first_name} onChange={set('first_name')} />
        <TextInput label="Last name" value={f.last_name} onChange={set('last_name')} />
        <Select label="Relationship" options={RELATIONSHIPS.map((r) => ({ value: r, label: titleCase(r) }))}
          value={f.relationship} onChange={set('relationship')} />
        <TextInput label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
      </div>
      <label className="row" style={{ gap: 8, margin: '4px 0 12px' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={f.is_dependent}
          onChange={(e) => setF({ ...f, is_dependent: e.target.checked })} />
        <span className="t-strong">Financially dependent</span>
      </label>
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}

// =====================================================================
// Inline-editable prose card (Health, Goals & scope, Historic context, Other)
// =====================================================================
function ProseCard({ clientId, icon, title, field, value, placeholder, reload }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${clientId}`, { [field]: draft || null });
      setEditing(false);
      reload();
      toast('Saved', 'success');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>{icon} {title}</h3>
        {editing ? (
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm ghost" onClick={() => { setDraft(value || ''); setEditing(false); }}>Cancel</button>
            <button className="btn sm primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        ) : (
          <button className="btn sm ghost" onClick={() => { setDraft(value || ''); setEditing(true); }}>Edit</button>
        )}
      </div>
      <div className="card-pad">
        {editing ? (
          <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} autoFocus />
        ) : value
          ? <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
          : <span className="faint">{placeholder}</span>}
      </div>
    </div>
  );
}
