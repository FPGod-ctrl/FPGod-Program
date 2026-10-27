import path from 'node:path';
import fs from 'node:fs/promises';
import { env } from '../../config/env.js';
import { walkFiles, readFileBuffer, statFile, rootAvailable } from '../library/fsGuard.js';
import { categoryOf, adviceYearOf } from '../library/indexer.js';
import { extractText } from '../documentExtractor.js';
import { caseDirs, SOA_ROOT } from './paths.js';

/**
 * The files behind a case, from two places:
 *
 *  - SharePoint: Clients/<folder>/, READ ONLY, through fsGuard. Listing is
 *    metadata only; reading a file downloads the OneDrive placeholder.
 *  - Repo: legacy/soa/<case name>/, where the workbench writes its documents.
 */

export const sharepointRel = (folder) => path.join(env.library.clientsDir, folder);

const describe = (f, source, base) => ({
  source,
  name: f.name,
  relPath: f.relPath,
  // Path inside the client folder, for display ("1. Advice\2026 ...\x.pdf").
  within: path.relative(base, f.relPath),
  ext: path.extname(f.name).toLowerCase(),
  size: f.size,
  modified: f.modified,
  category: categoryOf(f.relPath),
  year: adviceYearOf(f.relPath),
});

export async function sharepointFiles(folder) {
  if (!folder) return { available: true, linked: false, files: [] };
  if (!(await rootAvailable('sharepoint'))) return { available: false, linked: true, files: [] };
  const rel = sharepointRel(folder);
  try {
    if (!(await statFile('sharepoint', rel)).isDir) return { available: true, linked: true, missing: true, files: [] };
  } catch {
    return { available: true, linked: true, missing: true, files: [] };
  }
  const files = await walkFiles('sharepoint', rel, { maxDepth: 6, maxFiles: 1500 });
  return {
    available: true,
    linked: true,
    files: files.map((f) => describe(f, 'sharepoint', rel)).sort((a, b) => new Date(b.modified) - new Date(a.modified)),
  };
}

export async function caseFiles(wb) {
  const rel = path.relative(path.dirname(SOA_ROOT), caseDirs(wb).caseRoot); // soa/<case name>
  try {
    await fs.access(caseDirs(wb).caseRoot);
  } catch {
    return [];
  }
  const files = await walkFiles('repo', rel, { maxDepth: 6, maxFiles: 500 });
  return files.map((f) => describe(f, 'repo', rel)).sort((a, b) => new Date(b.modified) - new Date(a.modified));
}

/** Is `relPath` one of this case's own files (and not some other client's)? */
export function belongsToCase(wb, source, relPath) {
  const norm = (s) => path.normalize(String(s || '')).toLowerCase();
  const p = norm(relPath);
  if (source === 'sharepoint') {
    return Boolean(wb.sharepoint_folder) && p.startsWith(norm(sharepointRel(wb.sharepoint_folder)) + path.sep);
  }
  if (source === 'repo') {
    return p.startsWith(norm(path.join('soa', wb.case_name)) + path.sep);
  }
  return false;
}

const READABLE = new Set(['.docx', '.pdf', '.xlsx', '.xls', '.xlsm', '.csv', '.txt', '.md']);

/**
 * Text of the most useful SharePoint files for a case, newest advice year
 * first, in the order `categories` lists them. Capped by `maxChars`.
 */
export async function sharepointText(folder, { categories, maxFiles = 10, maxChars = 120000, onFile } = {}) {
  const { files } = await sharepointFiles(folder);
  const want = new Map(categories.map((c, i) => [c, i]));
  const picked = files
    .filter((f) => want.has(f.category) && READABLE.has(f.ext) && f.size > 0 && f.size <= env.library.maxFileBytes)
    .sort((a, b) => (b.year || 0) - (a.year || 0) || want.get(a.category) - want.get(b.category)
      || new Date(b.modified) - new Date(a.modified))
    .slice(0, maxFiles);

  let out = '';
  const used = [];
  for (const f of picked) {
    if (out.length >= maxChars) break;
    onFile?.(f);
    try {
      const buf = await readFileBuffer('sharepoint', f.relPath);
      const text = (await extractText(buf, '', f.name)).slice(0, 40000);
      if (!text.trim()) continue;
      out += `\n\n===== ${f.within} (${f.category}) =====\n${text}`;
      used.push(f.within);
    } catch {
      // A placeholder that will not download, or a corrupt file: skip it.
    }
  }
  return { text: out.slice(0, maxChars), used };
}
