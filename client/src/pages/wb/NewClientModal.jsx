import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../../components/ui/Modal.jsx';
import { TextInput, Field } from '../../components/ui/Field.jsx';
import SharePointPicker from '../../components/crm/SharePointPicker.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { today } from './wb.js';
import ClientCheck from './ClientCheck.jsx';

export default function NewClientModal({ defaultAdviser = '', onClose, onCreated }) {
  const [f, setF] = useState({
    first_name: '', last_name: '', partner_first_name: '', partner_last_name: '',
    email: '', phone: '', adviser: defaultAdviser || '', referral_source: '',
    meeting_date: today(), sharepoint_folder: '', transcript: '',
  });
  const [couple, setCouple] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Existing-client check, as the names are typed. Folder names only.
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const folderTouched = useRef(false);
  const pf = couple ? f.partner_first_name : '';
  const pl = couple ? f.partner_last_name : '';
  useEffect(() => {
    if (!f.first_name.trim() || f.last_name.trim().length < 2) { setCheck(null); return undefined; }
    let live = true;
    setChecking(true);
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ first_name: f.first_name, last_name: f.last_name, partner_first_name: pf, partner_last_name: pl });
      api.get(`/workbench/lookup?${qs}`)
        .then((r) => {
          if (!live) return;
          setCheck(r);
          // One folder naming them in full: link it, unless Tristan has chosen already.
          // A folder linked automatically for an earlier spelling drops off again.
          if (!folderTouched.current) {
            setF((x) => ({ ...x, sharepoint_folder: r.sharepoint?.suggested || '' }));
          }
        })
        .catch(() => live && setCheck(null))
        .finally(() => live && setChecking(false));
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [f.first_name, f.last_name, pf, pl]);
  const linkFolder = (folder) => { folderTouched.current = true; setF((x) => ({ ...x, sharepoint_folder: folder })); };

  const save = async () => {
    if (!f.first_name.trim() || !f.last_name.trim()) { toast('First and last name are required', 'error'); return; }
    setBusy(true);
    try {
      const body = { ...f };
      if (!couple) { body.partner_first_name = ''; body.partner_last_name = ''; }
      const c = await api.post('/workbench/cases', body);
      toast(`${c.display_name} added`, 'success');
      onCreated(c);
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New client"
      wide
      onClose={onClose}
      footer={(
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add client'}</button>
        </>
      )}
    >
      <div className="form-grid">
        <TextInput label="First name" value={f.first_name} onChange={set('first_name')} autoFocus />
        <TextInput label="Surname" value={f.last_name} onChange={set('last_name')} />
      </div>
      <label className="row small" style={{ gap: 6, marginBottom: 12 }}>
        <input type="checkbox" checked={couple} onChange={(e) => setCouple(e.target.checked)} style={{ width: 'auto' }} />
        Couple: add a partner
      </label>
      {couple && (
        <div className="form-grid">
          <TextInput label="Partner first name" value={f.partner_first_name} onChange={set('partner_first_name')} />
          <TextInput label="Partner surname" hint="Leave blank if the same" value={f.partner_last_name} onChange={set('partner_last_name')} />
        </div>
      )}
      <ClientCheck result={check} busy={checking} linked={f.sharepoint_folder} onLink={linkFolder} />
      <div className="form-grid">
        <TextInput label="Mobile" value={f.phone} onChange={set('phone')} />
        <TextInput label="Email" value={f.email} onChange={set('email')} />
        <TextInput label="Adviser" value={f.adviser} onChange={set('adviser')} />
        <TextInput label="Referred by" value={f.referral_source} onChange={set('referral_source')} />
        <TextInput label="Initial meeting date" type="date" value={f.meeting_date} onChange={set('meeting_date')} />
      </div>
      <Field label="SharePoint client folder" hint="Found automatically when the name matches one folder. Read only.">
        <SharePointPicker
          suggest={f.last_name}
          value={f.sharepoint_folder}
          onPick={linkFolder}
        />
      </Field>
      <Field label="Meeting transcript" hint="Optional now; you can paste it on the client page.">
        <textarea className="transcript-box" style={{ minHeight: 140 }} value={f.transcript} onChange={set('transcript')} placeholder="Paste the initial meeting transcript…" />
      </Field>
    </Modal>
  );
}
