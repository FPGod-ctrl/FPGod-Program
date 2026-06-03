import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client.js';
import { date } from '../lib/format.js';
import { THEMES, ACCENT_PRESETS, loadTemplate, saveTemplate } from '../lib/template.js';
import { Loading, Empty } from '../components/ui/Loading.jsx';

/**
 * Standalone, client-facing presentation of a plan (no app chrome) with a
 * theme switcher and PDF/Word export. Rendered outside the main Layout so it
 * prints cleanly.
 */
export default function PlanPresent() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [client, setClient] = useState(null);
  const [tpl, setTpl] = useState(loadTemplate());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/plans/${id}`).then(async (p) => {
      if (!active) return;
      setPlan(p);
      if (p.client_id) {
        try { setClient(await api.get(`/clients/${p.client_id}`)); } catch { /* optional */ }
      }
    }).catch(() => active && setPlan(false));
    return () => { active = false; };
  }, [id]);

  const update = (patch) => {
    const next = { ...tpl, ...patch };
    setTpl(next);
    saveTemplate(next); // persist choice for next time / Word export
  };

  const downloadWord = async () => {
    setExporting(true);
    try {
      const blob = await api.postForBlob(`/plans/${id}/export/docx`, tpl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(plan.title || 'financial-plan').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Word export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (plan === false) return <div className="present-shell"><Empty icon="🚫" title="Plan not found" /></div>;
  if (!plan) return <div className="present-shell"><Loading /></div>;

  const clientName = client ? `${client.first_name} ${client.last_name}` : '';

  return (
    <div className="present-shell">
      <div className="present-toolbar no-print">
        <button className="btn ghost sm" onClick={() => nav(-1)}>← Back</button>
        <div className="grp">
          <label>Style</label>
          <select value={tpl.theme} onChange={(e) => update({ theme: e.target.value })} style={{ width: 'auto', padding: '6px 10px' }}>
            {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grp">
          <label>Accent</label>
          {ACCENT_PRESETS.map((c) => (
            <button key={c} title={c} onClick={() => update({ accent: c })}
              className="no-print"
              style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                border: tpl.accent === c ? '2px solid #1f2933' : '2px solid #fff', boxShadow: '0 0 0 1px var(--border)' }} />
          ))}
        </div>
        <div className="spacer" />
        <button className="btn sm" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        <button className="btn primary sm" onClick={downloadWord} disabled={exporting}>
          {exporting ? 'Preparing…' : '⬇️ Download Word'}
        </button>
      </div>

      <div className={`plan-doc theme-${tpl.theme}`} style={{ '--accent': tpl.accent }}>
        <div className="plan-cover">
          {tpl.firmName && <div className="plan-firm">{tpl.firmName}</div>}
          {tpl.tagline && <div className="plan-tagline">{tpl.tagline}</div>}
          <div className="plan-title">{plan.title || 'Financial Plan'}</div>
          <div className="plan-meta">
            {clientName && <>Prepared for <strong>{clientName}</strong> &middot; </>}
            {date(plan.updated_at || new Date().toISOString())}
          </div>
        </div>
        <div className="plan-body">
          <ReactMarkdown>{plan.content || '_This plan has no content yet._'}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
