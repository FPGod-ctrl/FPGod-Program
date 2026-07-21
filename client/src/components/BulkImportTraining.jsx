import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Spinner } from './ui/Loading.jsx';
import { useToast } from './ui/Toast.jsx';

const BATCH_SIZE = 20; // upload in batches so hundreds of files import smoothly

/**
 * Drag-and-drop bulk importer for training data (Word/PDF/TXT plans or emails).
 * Each file's text is extracted server-side and stored as a training example.
 * Props: onDone() — called after a completed import so the parent can refresh.
 */
export default function BulkImportTraining({ onDone }) {
  const [kind, setKind] = useState('plan');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const toast = useToast();

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || busy) return;

    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: files.length });

    let importedCount = 0;
    const failed = [];

    try {
      for (const batch of chunk(files, BATCH_SIZE)) {
        const fd = new FormData();
        fd.append('kind', kind);
        batch.forEach((f) => fd.append('files', f));
        const res = await api.upload('/training-data/import', fd);
        importedCount += res.importedCount;
        failed.push(...res.failed);
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
      setResult({ importedCount, failed });
      toast(`Imported ${importedCount} ${kind}${importedCount === 1 ? '' : 's'}` +
        (failed.length ? `, ${failed.length} skipped` : ''), failed.length ? 'info' : 'success');
      onDone?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    importFiles(e.dataTransfer.files);
  };

  const pctDone = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="card">
      <div className="card-head">
        <h3>Bulk Import Plans</h3>
        <select value={kind} onChange={(e) => setKind(e.target.value)} disabled={busy}
          style={{ width: 'auto', padding: '6px 10px' }}>
          <option value="plan">Import as Plans</option>
          <option value="email">Import as Emails</option>
        </select>
      </div>
      <div className="card-pad">
        <p className="muted" style={{ marginTop: 0 }}>
          Drag in your historical {kind === 'plan' ? 'plans' : 'emails'} (Word, PDF, or TXT).
          The text from each file is extracted and stored as a training example — the AI uses
          these to learn your strategies and house style.
        </p>

        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !busy && fileRef.current?.click()}
        >
          <div className="dz-ico">{busy ? <Spinner /> : '📚'}</div>
          <h3 style={{ margin: '10px 0 4px' }}>
            {busy ? `Importing… ${progress.done}/${progress.total}` : 'Drag & drop plan files here'}
          </h3>
          <div className="muted">{busy ? `${pctDone}% complete` : 'or click to browse · select many at once · PDF, DOC, DOCX, TXT'}</div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={(e) => importFiles(e.target.files)} />
        </div>

        {busy && (
          <div style={{ marginTop: 14, height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pctDone}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>
        )}

        {result && (
          <div className="md" style={{ marginTop: 14 }}>
            <blockquote style={{ borderLeftColor: result.failed.length ? 'var(--amber)' : 'var(--green)',
              background: result.failed.length ? 'var(--amber-soft)' : 'var(--green-soft)' }}>
              ✅ Imported <strong>{result.importedCount}</strong> file(s).
              {result.failed.length > 0 && (
                <> ⚠️ Skipped <strong>{result.failed.length}</strong> (no readable text):{' '}
                  {result.failed.slice(0, 5).map((f) => f.name).join(', ')}
                  {result.failed.length > 5 ? ` and ${result.failed.length - 5} more` : ''}.</>
              )}
            </blockquote>
          </div>
        )}
      </div>
    </div>
  );
}
