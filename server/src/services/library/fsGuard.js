import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

/**
 * The only door between this app and the firm's document folders.
 *
 * Two rules, both enforced here rather than trusted to callers:
 *
 *  1. READ ONLY. This module exports no write, rename, delete or mkdir. The
 *     SharePoint root is the firm's live record — anything written there syncs
 *     firm-wide within minutes and would alter client and compliance files.
 *     Nothing anywhere else in the app is allowed to open these roots directly.
 *
 *  2. CONFINED. Every path is resolved against a named root and rejected unless
 *     it stays inside it, symlinks included. Callers pass relative paths that
 *     arrive from HTTP, so `..`, an absolute path or a junction pointing out of
 *     the library must not be able to reach the rest of the disk.
 */

export const SOURCES = ['sharepoint', 'repo'];

export function rootFor(source) {
  if (source === 'sharepoint') return env.library.sharepointRoot;
  if (source === 'repo') return env.library.repoRoot;
  throw new Error(`Unknown library source: ${source}`);
}

/** Windows paths are case-insensitive; comparisons below must be too. */
const sameCase = (s) => (process.platform === 'win32' ? s.toLowerCase() : s);

const isInside = (root, target) => {
  const r = sameCase(path.resolve(root));
  const t = sameCase(path.resolve(target));
  return t === r || t.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
};

/**
 * Resolve `relPath` inside `source`'s root, or throw.
 * @returns {string} absolute path, guaranteed to be within the root
 */
export function resolveIn(source, relPath = '') {
  const root = rootFor(source);
  const rel = String(relPath || '').replace(/^[\\/]+/, '');
  if (path.isAbsolute(rel)) throw new Error('Absolute paths are not accepted');
  const abs = path.resolve(root, rel);
  if (!isInside(root, abs)) throw new Error('Path escapes the library root');
  return abs;
}

/**
 * Resolve and follow symlinks, then re-check containment. A junction or symlink
 * inside the library could otherwise point anywhere on the machine.
 * Non-existent paths fall back to the lexical check (realpath would throw).
 */
async function resolveReal(source, relPath) {
  const abs = resolveIn(source, relPath);
  try {
    const real = await fs.realpath(abs);
    if (!isInside(rootFor(source), real)) throw new Error('Path escapes the library root');
    return real;
  } catch (err) {
    if (err.code === 'ENOENT') return abs;
    throw err;
  }
}

/** Does this source's root actually exist on this machine? */
export async function rootAvailable(source) {
  try {
    const st = await fs.stat(rootFor(source));
    return st.isDirectory();
  } catch {
    return false;
  }
}

/**
 * One directory level. Metadata only — on a Files On-Demand folder this does
 * NOT download anything, which is what makes indexing the whole library cheap.
 * @returns {Promise<{name:string, relPath:string, isDir:boolean, size:number, modified:Date}[]>}
 */
export async function listDir(source, relPath = '') {
  const abs = await resolveReal(source, relPath);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    // Skip OneDrive/Office bookkeeping and lock files.
    if (e.name.startsWith('~$') || e.name === '.DS_Store' || e.name === 'Thumbs.db') continue;
    const childRel = path.join(relPath, e.name);
    let st;
    try {
      st = await fs.stat(path.join(abs, e.name));
    } catch {
      continue; // vanished mid-walk, or permission denied
    }
    out.push({
      name: e.name,
      relPath: childRel,
      isDir: st.isDirectory(),
      size: st.isDirectory() ? 0 : st.size,
      modified: st.mtime,
    });
  }
  return out;
}

/**
 * Every file under `relPath`, depth-first.
 * @param {string} source
 * @param {string} relPath
 * @param {{maxDepth?:number, maxFiles?:number}} [opts]
 */
export async function walkFiles(source, relPath = '', { maxDepth = 8, maxFiles = 2000 } = {}) {
  const files = [];
  const queue = [{ rel: relPath, depth: 0 }];
  while (queue.length && files.length < maxFiles) {
    const { rel, depth } = queue.shift();
    let entries;
    try {
      entries = await listDir(source, rel);
    } catch {
      continue; // unreadable subfolder shouldn't abort the whole walk
    }
    for (const e of entries) {
      if (e.isDir) {
        if (depth < maxDepth) queue.push({ rel: e.relPath, depth: depth + 1 });
      } else if (files.length < maxFiles) {
        files.push(e);
      }
    }
  }
  return files;
}

export async function statFile(source, relPath) {
  const abs = await resolveReal(source, relPath);
  const st = await fs.stat(abs);
  return { size: st.size, modified: st.mtime, isDir: st.isDirectory() };
}

/**
 * Read one file. This is the call that makes OneDrive download a placeholder,
 * so it is size-capped and always goes through the cache in text.js.
 * @returns {Promise<Buffer>}
 */
export async function readFileBuffer(source, relPath, { maxBytes = env.library.maxFileBytes } = {}) {
  const abs = await resolveReal(source, relPath);
  const st = await fs.stat(abs);
  if (st.isDirectory()) throw new Error('Not a file');
  if (st.size > maxBytes) {
    throw new Error(`File is ${Math.round(st.size / 1024 / 1024)}MB, over the ${Math.round(maxBytes / 1024 / 1024)}MB read limit`);
  }
  return fs.readFile(abs);
}

/** Absolute path, for opening a file in Explorer/Word from the UI. */
export const absolutePathOf = (source, relPath) => resolveIn(source, relPath);

export default {
  SOURCES,
  rootFor,
  rootAvailable,
  resolveIn,
  listDir,
  walkFiles,
  statFile,
  readFileBuffer,
  absolutePathOf,
};
