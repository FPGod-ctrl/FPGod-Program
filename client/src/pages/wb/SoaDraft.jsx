import { useState } from 'react';
import MarkdownView from '../../components/ui/MarkdownView.jsx';
import { FileRow, RunLog, useRun } from './parts.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

/** Stage 4: draft the Statement of Advice once the paraplanner has filed the documents. */
export default function SoaDraft({ wb, outputs, onChanged }) {
  const job = useRun();
  const toast = useToast();
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState(null);
  const ready = wb.has?.soa_notes || wb.has?.fact_find;

  const generate = async () => {
    if (wb.soa_markdown && !window.confirm('Draft the SOA again? This writes a new draft over today\'s.')) return;
    const r = await job.run(`/workbench/cases/${wb.id}/soa`, { instructions });
    if (r) {
      setResult(r);
      toast('Draft SOA written', 'success');
      onChanged();
    }
  };

  const md = result?.markdown || wb.soa_markdown;
  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="panel-title"><span style={{ fontSize: 20 }}>📄</span><h3>Statement of Advice: draft</h3>
          {wb.soa_markdown && <span className="badge green">Drafted</span>}
        </div>
        <p className="panel-blurb">
          Run this once Howard has filed the quotes, Risk Researcher, Risk Checklist and cover summary in the SharePoint
          folder. Claude reads them with the SOA Notes and fact find and writes a risk-only SOA draft, section by section.
          Anything the file does not settle is left as <span className="hl">[ADVISOR TO CONFIRM]</span>.
          For the final version, the house method is still to clone a same-adviser SOA in Word: ask Claude
          to “build the SOA for {wb.display_name}”.
        </p>
        {!wb.sharepoint_folder && (
          <div className="alert amber small" style={{ marginBottom: 12 }}>
            No SharePoint folder is linked, so the draft will only use the SOA Notes and fact find. Link one on the Details tab.
          </div>
        )}
        <textarea
          placeholder="Anything else for this SOA: recommended insurer, structure, what to replace, referral fee to disclose…"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          style={{ minHeight: 90, marginBottom: 12 }}
        />
        <button className="btn primary" disabled={job.busy || !ready} onClick={generate}>
          {job.busy ? 'Writing… (a few minutes)' : wb.soa_markdown ? '↻ Draft again' : '✨ Draft the SOA'}
        </button>
        {!ready && <span className="small faint" style={{ marginLeft: 10 }}>Build the fact find and SOA Notes first.</span>}
        <RunLog job={job} />
        {result?.sourcesRead?.length > 0 && (
          <div className="small muted">Read from SharePoint: {result.sourcesRead.join(' · ')}</div>
        )}
        {(result?.warnings || []).map((w, i) => <div key={i} className="alert amber small" style={{ marginTop: 8 }}>{w}</div>)}
      </div>

      {outputs.length > 0 && (
        <div className="card card-pad">
          <h3>Documents</h3>
          <div className="file-list">{outputs.map((f) => <FileRow key={f.relPath} caseId={wb.id} file={f} />)}</div>
        </div>
      )}

      {md && (
        <div className="card card-pad">
          <h3>Preview</h3>
          <MarkdownView>{md}</MarkdownView>
        </div>
      )}
    </div>
  );
}
