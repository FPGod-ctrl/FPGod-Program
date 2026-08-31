import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from './PageHeader.jsx';
import ClientForm from './ClientForm.jsx';
import { Select, TextArea } from './ui/Field.jsx';
import { Spinner } from './ui/Loading.jsx';
import { useToast } from './ui/Toast.jsx';

/**
 * Shared chrome for the Advisory generator pages: a themed hero, a client
 * picker, optional extra controls, an instructions box, a Generate button and a
 * result panel with copy. Pages supply `onGenerate({ clientId, client,
 * instructions })` which returns the text to display (or throws).
 */
export default function GeneratorScaffold({
  title, sub, icon, accent = 'var(--accent)', blurb,
  generateLabel = '✨ Generate', onGenerate,
  ready = true, readyNote,
  clientSelect = true, requireClient = true,
  instructionsLabel = 'Extra instructions (optional)',
  instructionsPlaceholder = 'Anything specific to include or emphasise…',
  extra,
}) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [newClient, setNewClient] = useState(false);
  const toast = useToast();

  const loadClients = () => api.get('/clients').then((r) => setClients(r || [])).catch(() => {});

  useEffect(() => {
    if (clientSelect) loadClients();
  }, [clientSelect]);

  const client = clients.find((c) => String(c.id) === String(clientId)) || null;

  // A client created inline from the picker is loaded into the list and selected
  // so the generation is immediately linked to the new household.
  const onClientCreated = async (created) => {
    setNewClient(false);
    await loadClients();
    if (created?.id) setClientId(String(created.id));
    toast('Client created', 'success');
  };

  const run = async () => {
    if (clientSelect && requireClient && !clientId) { toast('Please pick a client first', 'error'); return; }
    setBusy(true); setResult(''); setSavedNote(''); setProgress(null);
    try {
      const out = await onGenerate({ clientId, client, instructions, onProgress: setProgress });
      const text = typeof out === 'string' ? out : out?.text || '';
      const filed = typeof out === 'object' && out?.saved;
      setResult(text);
      if (filed && client) {
        setSavedNote(`Filed to ${client.first_name} ${client.last_name}'s documents`);
      }
      toast(text ? 'Generated' : 'Nothing was returned', text ? 'success' : 'error');
    } catch (e) {
      toast(e?.message || 'Generation failed', 'error');
    } finally { setBusy(false); setProgress(null); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(result); toast('Copied to clipboard', 'success'); }
    catch { toast('Copy failed', 'error'); }
  };

  const heroBg = `linear-gradient(120deg, var(--navy) 0%, var(--navy-2) 58%, ${accent} 170%)`;

  return (
    <>
      <PageHeader title={title} sub={sub} />
      <div className="content">
        <div className="stack">
          <div className="hub-hero" style={{ background: heroBg }}>
            <div className="row" style={{ gap: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 30, lineHeight: 1 }}>{icon}</div>
              <div>
                <div className="eyebrow" style={{ color: '#fff', opacity: 0.85 }}>Advisory generator</div>
                <h1 style={{ margin: '2px 0 0' }}>{title}</h1>
              </div>
            </div>
            {blurb && <p style={{ marginTop: 10 }}>{blurb}</p>}
          </div>

          <div className="card card-pad">
            {clientSelect && (
              <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label={`Client / household${requireClient ? '' : ' (optional)'}`}
                    placeholder="— Select a client —"
                    options={clients.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}${c.partner_first_name ? ` & ${c.partner_first_name}` : ''}`,
                    }))}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>
                <button className="btn" style={{ marginBottom: 2, whiteSpace: 'nowrap' }} onClick={() => setNewClient(true)}>
                  + New client
                </button>
              </div>
            )}

            {typeof extra === 'function' ? extra({ clientId, client }) : extra}

            <TextArea
              label={instructionsLabel}
              placeholder={instructionsPlaceholder}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />

            {ready ? (
              <>
                <button className="btn primary lg" onClick={run} disabled={busy}>
                  {busy ? <><Spinner /> Generating…</> : generateLabel}
                </button>
                {busy && progress?.total > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round((progress.done / progress.total) * 100)}%`,
                        background: accent,
                        transition: 'width 300ms ease',
                      }} />
                    </div>
                    <div className="hint" style={{ marginTop: 6 }}>
                      Section {progress.done} of {progress.total}
                      {progress.title ? ` — ${progress.title.replace(/^\d+\.\s*/, '')}` : ''}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="md" style={{ marginTop: 4 }}>
                <blockquote>{readyNote || 'This generator is being wired up next.'}</blockquote>
              </div>
            )}
          </div>

          {result && (
            <div className="card">
              <div className="card-head">
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <h3>Result</h3>
                  {savedNote && <span className="badge green">✓ {savedNote}</span>}
                </div>
                <button className="btn sm" onClick={copy}>Copy</button>
              </div>
              <div className="card-pad">
                <div className="md" style={{ whiteSpace: 'pre-wrap' }}>{result}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {newClient && (
        <ClientForm onClose={() => setNewClient(false)} onSaved={onClientCreated} />
      )}
    </>
  );
}
