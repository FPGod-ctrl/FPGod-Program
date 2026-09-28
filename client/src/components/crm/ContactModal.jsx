import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import Modal from '../ui/Modal.jsx';
import { TextInput, Select, TextArea, Field } from '../ui/Field.jsx';
import { useToast } from '../ui/Toast.jsx';
import SharePointPicker from './SharePointPicker.jsx';
import { refreshCrmMeta, referralOptions } from '../../lib/crm.js';

const BLANK = {
  first_name: '', last_name: '', partner_first_name: '', partner_last_name: '',
  email: '', phone: '', crm_stage: 'lead', status: 'prospect', crm_thread: 'New Prospect',
  client_tier: '', next_review_date: '',
  adviser: '', referral_source: '', sharepoint_folder: '', notes: '',
};

/** Add a contact. A name already in the CRM is flagged before a duplicate is made. */
export default function ContactModal({ meta, onClose, onCreated }) {
  const [f, setF] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [dupes, setDupes] = useState(null);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // New files default to whoever is using the app, when they are one of Legacy's advisers.
  useEffect(() => {
    if (meta?.defaultAdviser) setF((x) => (x.adviser ? x : { ...x, adviser: meta.defaultAdviser }));
  }, [meta?.defaultAdviser]);

  const stageOpts = [
    { value: '', label: 'Not in the pipeline' },
    ...(meta?.stages || []).map((s) => ({ value: s.key, label: s.label })),
  ];

  const save = async (force = false) => {
    if (!f.first_name.trim()) { toast('A first name is needed', 'error'); return; }
    setSaving(true);
    try {
      const created = await api.post('/crm/contacts', {
        ...f, crm_stage: f.crm_stage || null, client_tier: f.client_tier || null,
        crm_thread: f.crm_thread || null, next_review_date: f.next_review_date || null, force,
      });
      if (f.adviser) refreshCrmMeta();
      onCreated(created);
    } catch (err) {
      if (err.status === 409 && err.details?.existing) setDupes(err.details.existing);
      else toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const nameForSearch = [f.last_name, f.first_name].filter(Boolean).join(' ');

  return (
    <Modal
      title="New contact"
      wide
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        {dupes && (
          <button className="btn" onClick={() => save(true)} disabled={saving}>Create anyway</button>
        )}
        <button className="btn primary" onClick={() => save(false)} disabled={saving || !!dupes}>
          {saving ? 'Saving…' : 'Add contact'}
        </button>
      </>}
    >
      {dupes && (
        <div className="alert amber">
          Already in the CRM:{' '}
          {dupes.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ', '}
              <Link to={`/crm/${d.id}`}>{d.display_name}</Link>
            </span>
          ))}
          . Open that record, or choose “Create anyway” if this is someone else.
        </div>
      )}
      <div className="form-grid">
        <TextInput label="First name *" autoFocus value={f.first_name}
          onChange={(e) => { setDupes(null); set('first_name')(e); }} />
        <TextInput label="Last name" value={f.last_name}
          onChange={(e) => { setDupes(null); set('last_name')(e); }} />
        <TextInput label="Partner first name" value={f.partner_first_name} onChange={set('partner_first_name')} />
        <TextInput label="Partner last name" placeholder="Leave blank if the same" value={f.partner_last_name}
          onChange={set('partner_last_name')} />
        <TextInput label="Email" type="email" value={f.email} onChange={set('email')} />
        <TextInput label="Phone" value={f.phone} onChange={set('phone')} />
        <Select label="Stage" options={stageOpts} value={f.crm_stage} onChange={set('crm_stage')} />
        <Select label="Status" value={f.status} onChange={set('status')}
          hint="Matches the XPLAN client category"
          options={[{ value: 'prospect', label: 'Prospect' }, { value: 'active', label: 'Client' }]} />
        <Select label="XPLAN thread" placeholder="—" value={f.crm_thread} onChange={set('crm_thread')}
          options={meta?.practice?.threads || []} />
        <Select label="Client tier" placeholder="Not set" value={f.client_tier} onChange={set('client_tier')}
          hint="Sets who makes contact at renewal"
          options={(meta?.practice?.tiers || []).map((t) => ({ value: t.key, label: `${t.label} — premium ${t.premium}` }))} />
        <TextInput label="Next review (anniversary)" type="date" value={f.next_review_date}
          onChange={set('next_review_date')} />
        <Field label="Adviser">
          <input list="crm-advisers" value={f.adviser} onChange={set('adviser')} placeholder="Who looks after them" />
          <datalist id="crm-advisers">
            {(meta?.advisers || []).map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>
        <Field label="Referral source">
          <input list="crm-referrers" value={f.referral_source} onChange={set('referral_source')}
            placeholder="A referral partner, Allfin, an existing client…" />
          <datalist id="crm-referrers">
            {referralOptions(meta).map((r) => <option key={r} value={r} />)}
          </datalist>
        </Field>
      </div>
      <Field label="SharePoint folder" hint={f.sharepoint_folder ? `Linked: ${f.sharepoint_folder}` : 'Optional — link the client’s file in the library'}>
        <SharePointPicker
          suggest={nameForSearch}
          value={f.sharepoint_folder}
          onPick={(name) => setF({ ...f, sharepoint_folder: name })}
        />
      </Field>
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
