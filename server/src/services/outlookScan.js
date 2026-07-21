import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Paths to the local Outlook COM scripts (repo-root/automation/outlook/…).
const SCRIPT = fileURLToPath(
  new URL('../../../automation/outlook/scan-outlook.ps1', import.meta.url)
);
const SAVE_SCRIPT = fileURLToPath(
  new URL('../../../automation/outlook/save-attachments.ps1', import.meta.url)
);

// Run a PowerShell script with args and return trimmed stdout (rejects on non-zero).
function runPowerShell(scriptPath, extraArgs) {
  const args = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath, ...extraArgs,
  ];
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', args, { windowsHide: true });
    let out = '';
    let err = '';
    ps.stdout.on('data', (d) => { out += d; });
    ps.stderr.on('data', (d) => { err += d; });
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code !== 0) return reject(new Error(err.trim() || `PowerShell exited ${code}`));
      resolve(out.trim());
    });
  });
}

export const outlookAvailable = () => process.platform === 'win32';

/**
 * Run the local Outlook desktop scanner and return parsed messages.
 * Reads the mailbox already signed in to Outlook on this machine (COM) — no
 * cloud/Azure. Windows-only.
 *
 * @param {{days?:number, from?:string, subject?:string, folder?:string, maxItems?:number}} opts
 * @returns {Promise<Array>} message metadata rows
 */
export function scanOutlook({ days = 7, from = '', subject = '', folder = 'Inbox', maxItems = 200 } = {}) {
  if (!outlookAvailable()) {
    return Promise.reject(new Error('Outlook scan is only available on the Windows desktop host'));
  }

  const args = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT,
    '-Days', String(Math.max(1, Math.min(365, Number(days) || 7))),
    '-Folder', ['Inbox', 'SentItems', 'Drafts'].includes(folder) ? folder : 'Inbox',
    '-MaxItems', String(Math.max(1, Math.min(1000, Number(maxItems) || 200))),
  ];
  if (from) args.push('-From', String(from));
  if (subject) args.push('-Subject', String(subject));

  return runPowerShell(SCRIPT, args.slice(6)).then((text) => {
    if (!text) return []; // zero messages -> empty stdout
    const parsed = JSON.parse(text);
    // ConvertTo-Json emits a bare object for a single result — normalise.
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

/**
 * Save one message's file attachments (by EntryID) to a temp dir, read them
 * into memory, and clean up. Returns the message meta plus attachment buffers
 * ready to feed the document pipeline.
 *
 * @param {string} entryId  Outlook message EntryID (from scanOutlook)
 * @returns {Promise<{subject:string, senderName:string, senderEmail:string,
 *   receivedTime:string, attachments:Array<{name:string, buffer:Buffer}>}>}
 */
export async function getOutlookAttachments(entryId) {
  if (!outlookAvailable()) throw new Error('Outlook is only available on the Windows desktop host');
  if (!entryId) throw new Error('entryId is required');

  const dir = path.join(os.tmpdir(), `fpgod-outlook-${randomUUID()}`);
  try {
    const text = await runPowerShell(SAVE_SCRIPT, ['-EntryId', String(entryId), '-OutDir', dir]);
    const meta = text ? JSON.parse(text) : {};
    const raw = meta.attachments || [];
    const list = Array.isArray(raw) ? raw : [raw]; // single-item -> object
    const attachments = [];
    for (const a of list) {
      if (!a?.path) continue;
      attachments.push({ name: a.name, buffer: await fs.readFile(a.path) });
    }
    return {
      subject: meta.subject || '',
      senderName: meta.senderName || '',
      senderEmail: meta.senderEmail || '',
      receivedTime: meta.receivedTime || '',
      attachments,
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
};

/** Best-effort MIME from a filename (for the documents.mime_type column). */
export function mimeFromName(name = '') {
  return MIME_BY_EXT[path.extname(name).toLowerCase()] || 'application/octet-stream';
}
