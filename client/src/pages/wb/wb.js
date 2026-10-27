import { api } from '../../api/client.js';

/** The five generated documents, in pipeline order, as the server's `has` keys. */
export const STEP_KEYS = ['meeting_notes', 'fact_find', 'soa_notes', 'soa', 'pack'];

export const stageLabel = (stages, key) => stages.find((s) => s.key === key)?.label || key || '—';

export function relTime(d) {
  if (!d) return '—';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const fileUrl = (caseId, f) =>
  `/api/workbench/cases/${caseId}/file?source=${encodeURIComponent(f.source)}&path=${encodeURIComponent(f.relPath)}`;

/** A repo-relative output path ("soa\\X\\...\\file.docx") as a case file reference. */
export const repoFile = (rel) => ({ source: 'repo', relPath: rel, name: rel.split(/[\\/]/).pop() });

export const reveal = (caseId, body) => api.post(`/workbench/cases/${caseId}/reveal`, body);

export const fileIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return '📕';
  if (n.endsWith('.docx') || n.endsWith('.doc')) return '📘';
  if (/\.(xlsx|xls|xlsm|csv)$/.test(n)) return '📗';
  if (/\.(png|jpe?g|gif)$/.test(n)) return '🖼️';
  if (n.endsWith('.msg') || n.endsWith('.eml')) return '✉️';
  return '📄';
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
