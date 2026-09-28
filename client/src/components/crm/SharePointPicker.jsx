import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

/**
 * Find a client's folder in the SharePoint library by name. Searching lists
 * folder names only — nothing in the library is opened, downloaded or changed.
 */
export default function SharePointPicker({ initialQuery = '', suggest = '', value, onPick }) {
  const [q, setQ] = useState(initialQuery);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRes(null); return undefined; }
    let live = true;
    setBusy(true);
    const t = setTimeout(() => {
      api.get(`/crm/sharepoint/folders?q=${encodeURIComponent(term)}`)
        .then((r) => live && setRes(r))
        .catch(() => live && setRes({ available: false, folders: [] }))
        .finally(() => live && setBusy(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="sp-picker">
      <input
        placeholder="Search SharePoint client folders — e.g. Borsky"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!q.trim() && suggest.trim() && (
        <button type="button" className="sp-suggest" onClick={() => setQ(suggest)}>
          Search for “{suggest}”
        </button>
      )}
      {res && !res.available && (
        <div className="faint small">The SharePoint library is not synced to this computer.</div>
      )}
      {res?.available && (
        <ul className="sp-results">
          {!res.folders.length && !busy && <li className="faint small">No folder matches “{q}”.</li>}
          {res.folders.map((f) => (
            <li key={f}>
              <button
                type="button"
                className={`sp-hit ${value === f ? 'on' : ''}`}
                onClick={() => onPick(value === f ? '' : f)}
              >
                <span aria-hidden="true">📁</span> {f}
                {value === f && <span className="sp-tick">Linked ✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
