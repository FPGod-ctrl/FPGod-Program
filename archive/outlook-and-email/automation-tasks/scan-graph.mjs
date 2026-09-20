/**
 * Scan the Microsoft 365 mailbox through Graph and emit the same JSON that
 * ../outlook/scan-outlook.ps1 produces.
 *
 * Matching that shape is the point: extract-tasks.mjs and write-sheet.ps1 are
 * unchanged by the move off COM. The only field that shifts meaning is entryId,
 * which becomes the Graph message id rather than the MAPI EntryID — still stable
 * per message, which is all the dedupe needs.
 *
 * Unlike the COM scanner this needs nothing running locally, so the scheduled
 * task works with Outlook closed, or from a machine that has never opened it.
 *
 * Usage: node scan-graph.mjs [--days 2] [--max 300] [--body-chars 2500] [--out file.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { getTokenSilent } from './graph-auth.mjs';

const GRAPH = 'https://graph.microsoft.com/v1.0';

// Exit codes the orchestrator distinguishes: 4 means "needs a one-off sign-in",
// which is a setup state, not a failure to alarm about.
const EXIT_NEEDS_SIGNIN = 4;

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Graph returns UTC; the rest of the pipeline reads local wall-clock time. */
function toLocalIso(utcString) {
  const d = new Date(utcString);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function graphGet(url, token, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Graph ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Attachment names, real documents only. Graph counts inline signature images as
 * attachments, so hasAttachments is true for a great many ordinary emails; the
 * inline ones are filtered out to keep the model's view of the mail honest.
 */
async function attachmentNames(messageId, token) {
  try {
    const url = `${GRAPH}/me/messages/${messageId}/attachments?$select=name,isInline,size`;
    const data = await graphGet(url, token);
    return (data.value || [])
      .filter((a) => !a.isInline && a.name)
      .map((a) => a.name);
  } catch {
    return [];
  }
}

async function main() {
  const days = Number(arg('--days', 2));
  const max = Number(arg('--max', 300));
  const bodyChars = Number(arg('--body-chars', 2500));
  const out = arg('--out', '');
  const folder = arg('--folder', 'inbox');

  // Both "never configured" and "token lapsed" are the same thing to the
  // operator — setup is incomplete — so they report identically rather than one
  // of them surfacing as a generic crash.
  let token = null;
  try {
    token = await getTokenSilent();
  } catch (err) {
    console.error(`scan-graph: ${err.message}`);
    process.exit(EXIT_NEEDS_SIGNIN);
  }
  if (!token) {
    console.error(
      'scan-graph: no usable Microsoft sign-in. Run `npm run setup` in automation/tasks once to authorise the mailbox.'
    );
    process.exit(EXIT_NEEDS_SIGNIN);
  }

  const since = new Date(Date.now() - days * 864e5).toISOString();
  const select = 'id,receivedDateTime,subject,from,hasAttachments,isRead';
  let url =
    `${GRAPH}/me/mailFolders/${encodeURIComponent(folder)}/messages` +
    `?$select=${select},body` +
    `&$filter=receivedDateTime ge ${since}` +
    `&$orderby=receivedDateTime desc` +
    `&$top=50`;

  const results = [];
  // Ask for plain text rather than HTML — the model reads the body, and stripping
  // markup here would otherwise be guesswork.
  const headers = { Prefer: 'outlook.body-content-type="text"' };

  while (url && results.length < max) {
    const page = await graphGet(url, token, headers);
    for (const m of page.value || []) {
      if (results.length >= max) break;
      const bodyText = (m.body?.content || '').replace(/\s+/g, ' ').trim();
      results.push({
        receivedTime: toLocalIso(m.receivedDateTime),
        senderName: m.from?.emailAddress?.name || '',
        senderEmail: m.from?.emailAddress?.address || '',
        subject: m.subject || '',
        hasAttachments: Boolean(m.hasAttachments),
        attachmentNames: m.hasAttachments ? await attachmentNames(m.id, token) : [],
        savedAttachments: [],
        unread: m.isRead === false,
        entryId: m.id,
        bodyPreview: bodyText.slice(0, bodyChars),
      });
    }
    url = page['@odata.nextLink'] || null;
  }

  const json = JSON.stringify(results, null, 2);
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, json, 'utf8');
    console.log(`Wrote ${results.length} messages -> ${out}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(`scan-graph: ${err.message}`);
  process.exit(1);
});
