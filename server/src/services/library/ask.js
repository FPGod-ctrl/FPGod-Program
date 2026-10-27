import { query } from '../../config/db.js';
import { completeOrStub } from '../ai.js';
import { resolveClient } from './match.js';
import { getClient, indexClientFiles } from './indexer.js';
import { selectFiles, gatherContext } from './text.js';

/**
 * Ask a question about a client and get a summary back.
 *
 * The answer is grounded in three places, in this order of authority: the
 * client's own files (SharePoint and the repo working folders), then whatever
 * the app's database already holds for them. Nothing else — a risk summary that
 * quietly invents a sum insured is worse than one that says the file doesn't say.
 */

const SYSTEM = `You are the client research assistant inside FPGod, the practice system of Legacy Risk Advice — an Australian personal risk (life insurance) advice firm, corporate authorised representative of Synchron. You are reading a client's own file and answering the adviser's question about them.

GROUND RULES
- Use ONLY the supplied client files and database records. If something is not in them, say so plainly — "the file doesn't say" — and never estimate, infer or fill a figure from general knowledge.
- Every number (sum insured, premium, income, debt) must be traceable to a supplied file. Quote it as written.
- Australian context throughout: AUD, "superannuation", "income protection", "TPD", "trauma", insurer names as written.
- Where files disagree (a quote at one premium, a checklist at another), say so and name both files. Inconsistencies are the most useful thing you can surface.
- Be concise and specific. The reader is the adviser who owns this client; they want facts, not preamble.
- This is an internal research note, not advice to a client.

Respond with JSON ONLY, in this shape:
{
  "headline": "one sentence: who this client is and where things stand",
  "identity": [{"label": "Age", "value": "38"}, {"label": "Occupation", "value": "Pharmacist and pharmacy owner"}],
  "cover": [{"type": "Life", "insurer": "TAL", "amount": "$2,000,000", "owner": "Superannuation", "premium": "$3,420 pa", "status": "In force"}],
  "latestAdvice": {"date": "October 2025", "summary": "what was advised and what happened"},
  "openItems": ["anything outstanding, in progress, or awaiting the client"],
  "flags": ["inconsistencies between files, missing compliance documents, stale data"],
  "answer": "Markdown answering exactly what the adviser asked. Reference file names inline where a fact comes from one.",
  "sources": [{"name": "2025 Statement of Advice - Citizen, Jane.docx", "why": "cover levels and premiums"}]
}

Leave "cover" as an empty array if the files show no insurance. Keep "identity" to the handful of facts that matter (age, occupation, income, household, health/smoker status). Omit nothing you found, invent nothing you didn't.`;

/** How many prior library turns are replayed into a follow-up. */
export const HISTORY_TURNS = 12;

/** The most recent N turns for a client, returned in chronological order. */
export const HISTORY_SQL = `SELECT role, content FROM (
    SELECT role, content, created_at FROM chat_messages
     WHERE target_type = 'library' AND target_id = $1
     ORDER BY created_at DESC LIMIT $2
  ) latest
  ORDER BY created_at ASC`;

/** Lower-case name tokens of more than two letters, as dbFacts searches on. */
export function nameTokens(displayName) {
  return String(displayName || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
}

/**
 * Pick the DB client row for a library client. A row only counts when BOTH its
 * first name and surname are in the library name (the client's own pair, or
 * the partner's pair) — a surname alone would match every client sharing it,
 * and attaching the wrong person's record is worse than attaching none.
 */
export function pickClientRecord(tokens, rows) {
  const has = (v) => v != null && String(v).trim() !== '' && tokens.includes(String(v).trim().toLowerCase());
  return (rows || []).find((c) => has(c.first_name) && has(c.last_name))
    || (rows || []).find((c) => has(c.partner_first_name) && has(c.partner_last_name))
    || null;
}

/** Facts the app already holds, so the summary reflects the system too. */
async function dbFacts(displayName) {
  const tokens = nameTokens(displayName);
  if (!tokens.length) return null;
  const { rows: clients } = await query(
    `SELECT * FROM clients
      WHERE (LOWER(first_name) = ANY($1) AND LOWER(last_name) = ANY($1))
         OR (LOWER(partner_first_name) = ANY($1) AND LOWER(partner_last_name) = ANY($1))
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 5`,
    [tokens]
  );
  const best = pickClientRecord(tokens, clients);
  if (!best) return null;

  const [{ rows: policies }, { rows: plans }] = await Promise.all([
    query('SELECT * FROM insurance_policies WHERE client_id = $1', [best.id]),
    query('SELECT id, title, status, created_at FROM financial_plans WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5', [best.id]),
  ]);
  return { client: best, policies, plans };
}

/** Deterministic answer for when there is no API key — still useful, just not prose. */
function stubAnswer(client, files) {
  const byCategory = files.reduce((acc, f) => {
    (acc[f.category] ||= []).push(f.name);
    return acc;
  }, {});
  const lines = Object.entries(byCategory)
    .map(([cat, names]) => `- **${cat}** — ${names.join(', ')}`)
    .join('\n');
  return JSON.stringify({
    headline: `${client.display_name} — ${files.length} file(s) indexed from ${client.source === 'repo' ? 'the working folders' : 'the client library'}.`,
    identity: [],
    cover: [],
    latestAdvice: { date: client.latest_year ? String(client.latest_year) : '', summary: '' },
    openItems: [],
    flags: ['AI is off (no ANTHROPIC_API_KEY), so this is a file listing rather than a summary.'],
    answer: `I can see this client's file but can't read it into a summary without AI enabled.\n\nWhat's on file:\n\n${lines || '- (no readable documents)'}`,
    sources: files.slice(0, 10).map((f) => ({ name: f.name, why: f.category })),
  });
}

/**
 * @param {{question:string, clientId?:string, onProgress?:(p:object)=>void}} input
 */
export async function ask({ question, clientId, onProgress }) {
  if (!question || !question.trim()) throw new Error('Ask a question first');

  // 1. Who are we talking about?
  let client = clientId ? await getClient(clientId) : null;
  if (!client) {
    onProgress?.({ step: 'resolving' });
    const { rows } = await query('SELECT * FROM library_clients');
    if (!rows.length) return { status: 'not-indexed' };
    const resolved = resolveClient(question, rows);
    if (!resolved.client) {
      return { status: resolved.reason === 'no-match' ? 'not-found' : 'ambiguous', candidates: resolved.candidates };
    }
    client = resolved.client;
  }

  // 2. What files do they have? (Indexed on first ask, then cached.)
  if (!client.files_indexed_at) {
    onProgress?.({ step: 'indexing', client: client.display_name });
    await indexClientFiles(client);
    client = await getClient(client.id);
  }

  // 3. Read them, and pull anything the app already knows.
  const selected = await selectFiles(client.id);
  const [{ text, files }, facts] = await Promise.all([
    gatherContext(client, selected, onProgress),
    dbFacts(client.display_name),
  ]);

  // 4. Prior turns, so follow-ups ("why didn't we change hers?") have context.
  //    The LATEST 12, replayed oldest-first.
  const { rows: history } = await query(HISTORY_SQL, [client.id, HISTORY_TURNS]);

  onProgress?.({ step: 'thinking', files: files.filter((f) => f.chars).length });

  const context = [
    `CLIENT: ${client.display_name} (filed as "${client.folder_name}", source: ${client.source === 'repo' ? 'repo working folders' : 'SharePoint client library'})`,
    facts ? `\nAPP DATABASE RECORD:\n${JSON.stringify(facts, null, 1)}` : '\nAPP DATABASE RECORD: none — this client is not in the app database.',
    `\nFILES ON RECORD (${files.length} read):\n${text || '(no readable text)'}`,
  ].join('\n');

  const messages = [
    { role: 'system', content: SYSTEM },
    // The file bundle is large and identical across follow-ups — cache it.
    { role: 'user', content: [{ type: 'text', text: context, cache_control: { type: 'ephemeral' } }] },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: question },
  ];

  const { text: raw, ai } = await completeOrStub(
    { messages, json: true, maxTokens: 8000, effort: 'medium' },
    () => stubAnswer(client, files)
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { headline: '', identity: [], cover: [], openItems: [], flags: [], answer: raw, sources: [] };
  }

  // 5. Remember the exchange. Only the prose is stored — the file bundle is
  //    rebuilt from the cache each time, so history stays small and current.
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ('library',$1,'user',$2)`,
    [client.id, question]
  );
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ('library',$1,'assistant',$2)`,
    [client.id, parsed.answer || '']
  );

  return {
    status: 'ok',
    ai,
    client: {
      id: client.id,
      displayName: client.display_name,
      folderName: client.folder_name,
      source: client.source,
      relPath: client.rel_path,
      latestYear: client.latest_year,
      fileCount: client.file_count,
    },
    summary: {
      headline: parsed.headline || '',
      identity: parsed.identity || [],
      cover: parsed.cover || [],
      latestAdvice: parsed.latestAdvice || null,
      openItems: parsed.openItems || [],
      flags: parsed.flags || [],
    },
    answer: parsed.answer || '',
    sources: (parsed.sources || []).map((s) => {
      const match = files.find((f) => f.name === s.name);
      return { ...s, id: match?.id || null, relPath: match?.rel_path || null };
    }),
    filesRead: files.map((f) => ({
      id: f.id, name: f.name, category: f.category, year: f.advice_year,
      chars: f.chars, skipped: f.skipped || null, relPath: f.rel_path,
    })),
  };
}

export async function history(clientId) {
  const { rows } = await query(
    `SELECT id, role, content, created_at FROM chat_messages
      WHERE target_type = 'library' AND target_id = $1 ORDER BY created_at ASC`,
    [clientId]
  );
  return rows;
}

export async function clearHistory(clientId) {
  await query(`DELETE FROM chat_messages WHERE target_type = 'library' AND target_id = $1`, [clientId]);
}

export default { ask, history, clearHistory };
