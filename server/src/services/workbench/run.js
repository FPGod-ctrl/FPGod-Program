import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SCRIPTS, FILE_NOTES, assertWritable } from './paths.js';

/**
 * Runs the existing document builders as child processes. The builders are the
 * same scripts the /meeting-notes skill uses, so the app and Claude produce
 * identical documents from the same JSON.
 */

const SERVER_DIR = path.resolve(SCRIPTS, '..');

function run(cmd, args, { timeout = 180000, cwd = SERVER_DIR } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd, args,
      { cwd, timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      (err, stdout, stderr) => {
        if (err) {
          const detail = (stderr || stdout || err.message).toString().trim().split('\n').slice(-6).join('\n');
          return reject(new Error(`${path.basename(args[0] || cmd)} failed: ${detail}`));
        }
        resolve(String(stdout || ''));
      }
    );
  });
}

/** Write the data file the builders read, in legacy/file-notes/ (gitignored). */
export async function writeDataFile(slug, kind, data) {
  await fs.mkdir(FILE_NOTES, { recursive: true });
  const p = assertWritable(path.join(FILE_NOTES, `${slug}-${kind}.json`));
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
}

export async function buildMeetingNotes(jsonPath, outPath) {
  assertWritable(outPath);
  await run(process.execPath, [path.join(SCRIPTS, 'generate-client-details-summary.mjs'), jsonPath, outPath]);
  return outPath;
}

export async function buildFactFind(jsonPath, outPath) {
  assertWritable(outPath);
  await run('python', [path.join(SCRIPTS, 'generate_fact_find.py'), jsonPath, outPath]);
  return outPath;
}

export async function buildSoaNotes(jsonPath, outPath) {
  assertWritable(outPath);
  await run('python', [path.join(SCRIPTS, 'build_soa_notes.py'), jsonPath, outPath]);
  return outPath;
}

/**
 * Export .docx files to PDF with Word, read-only. Never throws: Word's export
 * sometimes hangs on this machine and the .docx is the deliverable, so failures
 * come back as warnings.
 * @returns {Promise<{pdfs:string[], warnings:string[]}>}
 */
export async function exportPdfs(docxPaths) {
  const paths = docxPaths.filter(Boolean);
  if (!paths.length || process.platform !== 'win32') return { pdfs: [], warnings: [] };
  paths.forEach((p) => assertWritable(p.replace(/\.docx$/i, '.pdf')));
  try {
    const out = await run(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(SCRIPTS, 'docx-to-pdf.ps1'), ...paths],
      { timeout: 240000 }
    );
    const lines = out.split(/\r?\n/).filter(Boolean);
    return {
      pdfs: lines.filter((l) => l.startsWith('OK ')).map((l) => l.slice(3).trim()),
      warnings: lines.filter((l) => l.startsWith('FAIL ')).map((l) => `PDF export: ${l.slice(5)}`),
    };
  } catch (err) {
    return { pdfs: [], warnings: [`PDF export did not run: ${err.message}`] };
  }
}

/** Show a file or folder in Explorer. Viewing only. */
export function reveal(absPath, { isDir = false } = {}) {
  if (process.platform !== 'win32') return;
  const args = isDir ? [absPath] : [`/select,${absPath}`];
  execFile('explorer.exe', args, { windowsHide: false }, () => {});
}
