/**
 * Read mail that Power Automate has dropped into a synced OneDrive folder, and
 * emit the same JSON shape as scan-graph.mjs / scan-outlook.ps1.
 *
 * Why this exists: the mailbox runs on "new Outlook" (olk.exe), which has no COM
 * and no MAPI, and the tenant blocks user consent for a Graph app registration.
 * Power Automate's Office 365 Outlook connector is a Microsoft first-party
 * connector that is already consented in the tenant, so a flow the adviser builds
 * himself can read his own mail with no admin involvement at all. The flow writes
 * one JSON file per email; OneDrive syncs it down; this reads the folder.
 *
 * Nothing here talks to the network. It is a directory read.
 *
 * Usage: node scan-drop.mjs [--dir <folder>] [--days 2] [--body-chars 2500] [--out file.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const EXIT_NO_DROP = 4;   // same "setup incomplete" code the other scanners use

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/**
 * Find the business OneDrive without hard-coding the firm name — it is
 * "OneDrive - <Tenant Display Name>", which changes if the firm is renamed.
 */
function defaultDropDir() {
  if (process.env.MAIL_DROP_DIR) return process.env.MAIL_DROP_DIR;
  const home = os.homedir();
  // The business OneDrive is a junction, not a plain directory, so a dirent
  // isDirectory() check reports false and silently falls through to the personal
  // OneDrive — the wrong account. statSync follows the link.
  const isDir = (name) => {
    try { return fs.statSync(path.join(home, name)).isDirectory(); } catch { return false; }
  };
  const business = fs
    .readdirSync(home)
    .filter((name) => /^OneDrive - /.test(name) && isDir(name))
    .sort();
  const root = business.length ? path.join(home, business[0]) : path.join(home, 'OneDrive');
  // --sent reads the Sent Items drop instead, which is what closes tasks out.
  const sub = process.argv.includes('--sent') ? 'sent-drop' : 'mail-drop';
  return path.join(root, 'FPGod', sub);
}

/** Power Automate field names vary with how the flow is built; accept the usual spellings. */
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return '';
};

/** A flow set to HTML body sends markup; the model should read prose. */
function toText(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toLocalIso(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// The order the Power Automate flow writes fields in. Used to slice a file that
// is not valid JSON, which is the normal case rather than the exception.
const FIELD_ORDER = ['id', 'receivedTime', 'from', 'to', 'subject', 'body', 'hasAttachments'];

/**
 * Decode the JSON string escapes by hand.
 *
 * Power Automate escapes some characters (`&` becomes `&`) while leaving
 * quotes raw. Since the file never reaches JSON.parse, nothing else undoes them,
 * and the model would otherwise read "&" as literal text.
 */
function unescapeJsonString(s) {
  return String(s)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\');
}

/**
 * Recover the fields from a drop file whose JSON is malformed.
 *
 * Power Automate builds the file by string interpolation, so a real email body —
 * HTML, full of double quotes and newlines — is injected unescaped and the result
 * is not parseable JSON. Practically every message with an HTML body lands this
 * way, so this is the normal path, not a fallback for corruption.
 *
 * Fields are located by searching FORWARD only: the literal text `"subject"` can
 * easily appear inside a quoted email body, and a naive indexOf would match that
 * instead of the real field.
 */
function lenientParse(text) {
  const found = [];
  let cursor = 0;
  for (const key of FIELD_ORDER) {
    const marker = `"${key}"`;
    const at = text.indexOf(marker, cursor);
    if (at === -1) continue;
    found.push({ key, at, marker });
    cursor = at + marker.length;
  }

  const out = {};
  for (let i = 0; i < found.length; i++) {
    const { key, at, marker } = found[i];
    const end = found[i + 1] ? found[i + 1].at : text.length;
    let v = text.slice(at + marker.length, end);
    v = v.slice(v.indexOf(':') + 1).trim();
    v = v.replace(/\}\s*$/, '').trim();     // closing brace after the last field
    v = v.replace(/,\s*$/, '').trim();      // separator before the next field
    if (v.startsWith('"')) v = v.slice(1);
    if (v.endsWith('"')) v = v.slice(0, -1);
    out[key] = unescapeJsonString(v);
  }
  if (out.hasAttachments !== undefined) {
    out.hasAttachments = /^true$/i.test(String(out.hasAttachments).trim());
  }
  return out;
}

/**
 * Pull an address out of whichever shape the flow produced.
 *
 * The per-email flow interpolates `from` as a plain string; a bulk "Get emails"
 * export hands back Graph's own objects, where the same field is
 * `{ emailAddress: { name, address } }` and recipients are an array of those.
 */
function addressOf(v) {
  if (!v) return { name: '', email: '' };
  if (Array.isArray(v)) {
    const parts = v.map((x) => addressOf(x).email).filter(Boolean);
    return { name: '', email: parts.join(', ') };
  }
  if (typeof v === 'object') {
    const ea = v.emailAddress || v;
    return { name: ea.name || '', email: ea.address || ea.emailAddress || '' };
  }
  const m = String(v).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1], email: m[2] } : { name: '', email: String(v) };
}

/** Graph returns body as `{ contentType, content }`; the flat flow sends a string. */
function bodyOf(raw) {
  const b = pick(raw, 'body', 'Body', 'bodyPreview', 'bodyPreviewText');
  if (b && typeof b === 'object') return b.content || '';
  return b;
}

function normalise(raw, file, bodyChars) {
  const parsedFrom = addressOf(pick(raw, 'from', 'From', 'sender', 'senderEmail'));
  const senderName = pick(raw, 'senderName', 'fromName') || parsedFrom.name;
  const senderEmail = parsedFrom.email;

  const attachments = pick(raw, 'attachmentNames', 'attachments') || [];
  const names = Array.isArray(attachments)
    ? attachments.map((a) => (typeof a === 'string' ? a : pick(a, 'name', 'Name'))).filter(Boolean)
    : String(attachments).split(',').map((s) => s.trim()).filter(Boolean);

  return {
    receivedTime: toLocalIso(pick(raw, 'receivedTime', 'receivedDateTime', 'DateTimeReceived')),
    senderName: senderName || senderEmail,
    senderEmail,
    subject: pick(raw, 'subject', 'Subject'),
    // Only present on sent mail; names who the reply actually went to.
    toRecipients: addressOf(pick(raw, 'to', 'To', 'toRecipients')).email,
    hasAttachments: Boolean(names.length || raw.hasAttachments),
    attachmentNames: names,
    savedAttachments: [],
    unread: raw.isRead === false || raw.unread !== false,
    // Stable per message. Falls back to the filename, which the per-email flow
    // names after the message id, so dedupe holds even without an id field.
    entryId: String(pick(raw, 'entryId', 'id', 'messageId') || path.basename(file, '.json')),
    bodyPreview: toText(bodyOf(raw)).slice(0, bodyChars),
  };
}

function main() {
  const dir = arg('--dir', defaultDropDir());
  const days = Number(arg('--days', 2));
  const bodyChars = Number(arg('--body-chars', 2500));
  const out = arg('--out', '');

  if (!fs.existsSync(dir)) {
    console.error(
      `scan-drop: drop folder not found at ${dir} — create it and point the Power Automate flow at it (see README).`
    );
    process.exit(EXIT_NO_DROP);
  }

  const archive = path.join(dir, 'processed');
  fs.mkdirSync(archive, { recursive: true });

  const cutoff = Date.now() - days * 864e5;
  const results = [];
  let archived = 0;

  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith('.json')) continue;
    const file = path.join(dir, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (!stat.isFile()) continue;

    // Anything older than the look-back window has certainly been processed
    // already — move it aside rather than re-reading it every cycle forever.
    if (stat.mtimeMs < cutoff) {
      try { fs.renameSync(file, path.join(archive, name)); archived++; } catch { /* keep going */ }
      continue;
    }

    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      // Genuinely unreadable — a OneDrive placeholder not yet hydrated, or a
      // file still being written. The next cycle picks it up.
      console.error(`scan-drop: could not read ${name} yet`);
      continue;
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = lenientParse(text);
    }
    // A bulk export from "Get emails (V3)" is a single file holding an array of
    // messages rather than one file per message. Both shapes are accepted, which
    // is what lets a week of history be backfilled in one go.
    const batch = Array.isArray(raw) ? raw : [raw];
    let usable = 0;
    for (const one of batch) {
      if (!one || (!one.subject && !bodyOf(one) && !one.id)) continue;
      results.push(normalise(one, file, bodyChars));
      usable++;
    }
    if (!usable) console.error(`scan-drop: no usable fields in ${name}`);
  }

  results.sort((a, b) => (a.receivedTime < b.receivedTime ? 1 : -1));

  const json = JSON.stringify(results, null, 2);
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, json, 'utf8');
    console.log(
      `Read ${results.length} message(s) from the drop folder` +
        (archived ? `, archived ${archived} older file(s)` : '') +
        ` -> ${out}`
    );
  } else {
    console.log(json);
  }
}

try {
  main();
} catch (err) {
  console.error(`scan-drop: ${err.message}`);
  process.exit(1);
}
