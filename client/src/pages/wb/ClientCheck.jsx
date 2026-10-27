import { Link } from 'react-router-dom';

/**
 * The existing-client check: is this person already in the program, and do
 * they have a client folder in SharePoint? Built from folder names only;
 * nothing in SharePoint is opened.
 */
export default function ClientCheck({ result, busy, linked, onLink, readSharePoint = false, compact = false }) {
  if (busy && !result) return <div className="client-check small faint">Checking for an existing client…</div>;
  if (!result) return null;
  const { program = [], sharepoint = {} } = result;
  const nameHits = (sharepoint.folders || []).filter((f) => f.match === 'name');
  const surnameHits = (sharepoint.folders || []).filter((f) => f.match === 'surname');
  const existing = Boolean(linked) || result.existing;

  return (
    <div className={`client-check ${existing ? 'existing' : 'new'}`}>
      <div className="cc-head">
        <span className={`badge ${existing ? 'teal' : 'green'}`}>{existing ? 'Existing client' : 'New client'}</span>
        <span className="small muted">
          {linked ? `SharePoint client file linked: ${linked}`
            : existing ? 'A record with this name already exists. Check it is the same person.'
              : sharepoint.available === false ? 'SharePoint is not synced to this computer, so only the program was checked.'
                : 'No record in the program and no SharePoint client folder with this name.'}
        </span>
      </div>

      {program.length > 0 && (
        <div className="cc-row">
          <span className="cc-label">In the program</span>
          <div className="cc-items">
            {program.map((p) => (
              <span key={p.id} className="cc-item">
                👤 {p.display_name}
                {p.case_id ? <Link to={`/case/${p.case_id}`} className="small">Open their workspace →</Link>
                  : <span className="small faint">({p.status || 'client'} record, older screens)</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {(nameHits.length > 0 || (!compact && surnameHits.length > 0)) && (
        <div className="cc-row">
          <span className="cc-label">SharePoint</span>
          <div className="cc-items">
            {[...nameHits, ...(compact ? [] : surnameHits.slice(0, 4))].map((f) => (
              <span key={f.folder} className="cc-item">
                📁 {f.folder}
                {f.match === 'surname' && <span className="small faint">same surname only</span>}
                {onLink && (linked === f.folder
                  ? <button type="button" className="btn sm ghost" onClick={() => onLink('')}>Linked ✓ (unlink)</button>
                  : <button type="button" className="btn sm" onClick={() => onLink(f.folder)}>Link</button>)}
              </span>
            ))}
          </div>
        </div>
      )}

      {existing && !readSharePoint && (
        <div className="small faint" style={{ marginTop: 6 }}>
          Information isn’t pulled from the SharePoint file yet. The notes are written from the transcript only.
        </div>
      )}
    </div>
  );
}
