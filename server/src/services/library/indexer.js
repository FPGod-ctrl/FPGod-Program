import path from 'node:path';
import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { listDir, walkFiles, rootAvailable } from './fsGuard.js';
import { displayNameOf, searchKeyOf, normalise, rankClients } from './match.js';

/**
 * Building the index.
 *
 * Pass 1 (`indexClients`) lists folder and file NAMES only. On the SharePoint
 * library these are Files On-Demand placeholders, so listing ~1,278 client
 * folders costs nothing and downloads nothing.
 *
 * Pass 2 (`indexClientFiles`) is still metadata — it records what files a client
 * has. Only services/library/text.js ever opens one, and only for the client
 * being asked about.
 */

const MONTHS = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';

/**
 * Work out whose file this is from its name, for the repo working folders where
 * there is no folder-per-client. Ordered most specific first; null when the name
 * carries no client (a checklist, a template, a script).
 */
export function clientNameFromFileName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');

  // "Gavin Lau SEP17 - Initial Meeting Notes"
  let m = base.match(new RegExp(`^(.+?)\\s+(?:${MONTHS})\\d{2}\\s*-`, 'i'));
  if (m) return m[1].trim();

  // "2026.09.15 - Soo J - Statement of Advice (DRAFT)"
  m = base.match(/^\d{4}[.\-]\d{2}[.\-]\d{2}\s*-\s*(.+?)\s*-\s*/);
  if (m) return m[1].trim();

  // "2026.09.15 10-Year Premium Summary - Ilancheran, Arun and Keragala, Cherry"
  m = base.match(/-\s*([A-Z][A-Za-z'’-]+,\s*[A-Z][A-Za-z'’-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z'’-]+(?:,\s*[A-Z][A-Za-z'’-]+)?)*)\s*$/);
  if (m) return m[1].trim();

  // Slugged siblings: "gavin-lau-sep17-cds.json", "Paterson-Leigh-Bianca-SEP08.md"
  m = base.match(new RegExp(`^([a-z][a-z-]*?)-(?:${MONTHS})\\d{2}(?:-|$)`, 'i'));
  if (m) return m[1].split('-').filter(Boolean).join(' ').trim();

  return null;
}

const upsertClient = async ({ source, folderName, relPath }) => {
  const { rows } = await query(
    `INSERT INTO library_clients (source, folder_name, display_name, search_key, rel_path)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (source, rel_path) DO UPDATE
       SET folder_name = EXCLUDED.folder_name,
           display_name = EXCLUDED.display_name,
           search_key  = EXCLUDED.search_key,
           updated_at  = now()
     RETURNING *`,
    [source, folderName, displayNameOf(folderName), searchKeyOf(folderName), relPath]
  );
  return rows[0];
};

/** One folder per client under "Clients" — the firm's filing convention. */
async function indexSharepoint(onProgress) {
  if (!(await rootAvailable('sharepoint'))) return { clients: 0, skipped: 'root-unavailable' };
  const dir = env.library.clientsDir;
  const entries = await listDir('sharepoint', dir);
  const folders = entries.filter((e) => e.isDir);
  let n = 0;
  for (const f of folders) {
    await upsertClient({ source: 'sharepoint', folderName: f.name, relPath: f.relPath });
    if (++n % 100 === 0) onProgress?.({ step: 'sharepoint', done: n, total: folders.length });
  }
  onProgress?.({ step: 'sharepoint', done: n, total: folders.length });
  return { clients: n };
}

/**
 * The repo's legacy/ folders are flat: files are named after the client rather
 * than filed under them. Derive the client from each file name, then sweep the
 * leftovers ("arun-cherry-2026-review-brief.md") onto a client already found.
 */
async function indexRepo(onProgress) {
  if (!(await rootAvailable('repo'))) return { clients: 0, skipped: 'root-unavailable' };
  const files = await walkFiles('repo', '', { maxDepth: 3, maxFiles: 3000 });

  const byKey = new Map(); // search key -> { name, files[] }
  const leftovers = [];
  for (const f of files) {
    // Everything under drop/ is a working copy of a case folder, indexed via
    // its own client folder rather than as loose files.
    if (normalise(f.relPath).startsWith('drop')) continue;
    const name = clientNameFromFileName(f.name);
    if (!name) {
      leftovers.push(f);
      continue;
    }
    const key = searchKeyOf(name);
    if (!byKey.has(key)) byKey.set(key, { name, files: [] });
    byKey.get(key).files.push(f);
  }

  // Leftovers join a client whose name is spelled out in the file name.
  const candidates = [...byKey.entries()].map(([key, v]) => ({
    id: key,
    folder_name: v.name,
    display_name: v.name,
    search_key: key,
  }));
  for (const f of leftovers) {
    const [best] = rankClients(f.name.replace(/[-_.]/g, ' '), candidates, { limit: 1 });
    if (best && best.score >= 0.8) byKey.get(best.client.id).files.push(f);
  }

  let n = 0;
  for (const [, v] of byKey) {
    const row = await upsertClient({
      source: 'repo',
      folderName: v.name,
      // Repo "clients" are a set of scattered files, not a folder. Record the
      // common ancestor so the UI has somewhere to open.
      relPath: commonDir(v.files.map((f) => f.relPath)),
    });
    await replaceFiles(row.id, 'repo', v.files);
    n++;
  }
  onProgress?.({ step: 'repo', done: n, total: byKey.size });
  return { clients: n };
}

const commonDir = (paths) => {
  if (!paths.length) return '';
  const parts = paths.map((p) => path.dirname(p).split(/[\\/]/));
  const first = parts[0];
  const out = [];
  for (let i = 0; i < first.length; i++) {
    if (parts.every((p) => p[i] === first[i])) out.push(first[i]);
    else break;
  }
  return out.join(path.sep);
};

/**
 * What a file is, from its name and the folder it sits in. Drives which files
 * are worth downloading for a question — see PRIORITY below.
 */
export function categoryOf(relPath) {
  const s = normalise(relPath);
  if (/\bsoa notes\b/.test(s)) return 'soa-notes';
  if (/risk checklist/.test(s)) return 'risk-checklist';
  if (/(insurance )?cover summary|discussion summary/.test(s)) return 'cover-summary';
  if (/fact find/.test(s)) return 'fact-find';
  if (/meeting notes|file note|client details summary|initial client notes/.test(s)) return 'meeting-notes';
  if (/product disclosure|\bpds\b|financial services guide|\bfsg\b/.test(s)) return 'product';
  if (/statement of advice|\bsoa\b|\broa\b/.test(s)) return 'soa';
  if (/insurance schedule|\bschedule\b/.test(s)) return 'schedule';
  if (/risk research|comparison report|ratings|quote|research/.test(s)) return 'research';
  if (/application|pre assessment|preassessment|underwriting|alternative terms/.test(s)) return 'application';
  if (/certificate of currency|welcome pack|policy \d+/.test(s)) return 'policy-doc';
  if (/authority|third party|servicing rights/.test(s)) return 'authority';
  if (/premium summary|cvc|cost of cover/.test(s)) return 'premium';
  return 'other';
}

/** "2026 Advice & Service" / "2025 Advice" / a "2026.09.15" file name. */
export function adviceYearOf(relPath) {
  const years = [...String(relPath).matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : null;
}

const TEXTUAL = new Set(['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.xlsm', '.csv', '.txt', '.md', '.json', '.msg']);

async function replaceFiles(clientId, source, files) {
  await query('DELETE FROM library_files WHERE client_id = $1', [clientId]);
  let latest = null;
  for (const f of files) {
    const ext = path.extname(f.name).toLowerCase();
    const year = adviceYearOf(f.relPath);
    if (year && (!latest || year > latest)) latest = year;
    await query(
      `INSERT INTO library_files (client_id, rel_path, name, ext, category, advice_year, size_bytes, modified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (client_id, rel_path) DO UPDATE
         SET size_bytes = EXCLUDED.size_bytes, modified_at = EXCLUDED.modified_at`,
      [clientId, f.relPath, f.name, ext, categoryOf(f.relPath), year, f.size, f.modified]
    );
  }
  await query(
    `UPDATE library_clients
        SET file_count = $2, latest_year = $3, files_indexed_at = now(), updated_at = now()
      WHERE id = $1`,
    [clientId, files.length, latest]
  );
  return files.length;
}

/**
 * Pass 2 for one client: list their files. Cheap enough to run on demand, so a
 * client is only walked when someone asks about them.
 */
export async function indexClientFiles(client) {
  if (client.source === 'repo') return client.file_count; // done during indexRepo
  const files = await walkFiles(client.source, client.rel_path, { maxDepth: 6, maxFiles: 800 });
  const keep = files.filter((f) => TEXTUAL.has(path.extname(f.name).toLowerCase()) || f.size > 0);
  return replaceFiles(client.id, client.source, keep);
}

/** Rebuild the whole client index (names only). */
export async function indexClients(onProgress) {
  const sp = await indexSharepoint(onProgress);
  const repo = await indexRepo(onProgress);
  return { sharepoint: sp, repo };
}

export async function listClients({ q = '', limit = 50 } = {}) {
  if (!q) {
    const { rows } = await query(
      `SELECT * FROM library_clients ORDER BY display_name LIMIT $1`, [limit]
    );
    return rows;
  }
  const { rows } = await query('SELECT * FROM library_clients');
  return rankClients(q, rows, { limit }).map((r) => ({ ...r.client, score: r.score }));
}

export async function getClient(id) {
  const { rows } = await query('SELECT * FROM library_clients WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function indexStatus() {
  const { rows } = await query(
    `SELECT source, COUNT(*)::int AS clients, MAX(updated_at) AS last_indexed
       FROM library_clients GROUP BY source`
  );
  const available = {
    sharepoint: await rootAvailable('sharepoint'),
    repo: await rootAvailable('repo'),
  };
  return {
    roots: {
      sharepoint: { path: env.library.sharepointRoot, available: available.sharepoint, readOnly: true },
      repo: { path: env.library.repoRoot, available: available.repo, readOnly: true },
    },
    indexed: rows,
  };
}

export default { indexClients, indexClientFiles, listClients, getClient, indexStatus, categoryOf, adviceYearOf, clientNameFromFileName };
