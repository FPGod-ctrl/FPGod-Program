import { query } from '../config/db.js';
import { completeOrStub } from './ai.js';
import { CALC_GUARDRAILS } from './planGenerator.js';

/**
 * Refine a plan or email through chat. Persists the user + assistant turns and
 * returns the updated document content alongside the assistant reply.
 *
 * @param {{ targetType:'plan'|'email', targetId:string, message:string }} input
 * @returns {Promise<{ reply:string, updatedContent:string|null, ai:boolean }>}
 */
export async function refine({ targetType, targetId, message }) {
  const target = await loadTarget(targetType, targetId);
  if (!target) throw new Error(`${targetType} not found`);

  // Prior conversation for context.
  const { rows: history } = await query(
    `SELECT role, content FROM chat_messages
     WHERE target_type = $1 AND target_id = $2
     ORDER BY created_at ASC LIMIT 20`,
    [targetType, targetId]
  );

  const currentContent = targetType === 'plan' ? target.content : target.body;

  const system =
    targetType === 'plan'
      ? 'You are collaboratively building and refining a client financial plan with the adviser, live. '
        + 'Apply the adviser\'s instruction to the document. Respond with JSON ONLY in this shape: '
        + '{"reply": "a brief, friendly 1-2 sentence summary of exactly what you changed, for the chat", '
        + '"content": "the COMPLETE revised plan in Markdown (the whole document, not a diff)"}. '
        + 'In "content" keep everything that was already good, apply the requested change, preserve '
        + '[ADVISOR TO CONFIRM] markers, and keep the Australian SOA style and AUD. If the adviser is only '
        + 'asking a question (not requesting an edit), answer it in "reply" and return the document unchanged in "content".\n\n'
        + CALC_GUARDRAILS
      : 'You are refining a follow-up email with the adviser. Respond with JSON ONLY: '
        + '{"reply": "a brief summary of what you changed", "content": "the COMPLETE revised email body (plain text, no subject line)"}.';

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Current ${targetType}:\n${currentContent || '(empty)'}` },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const stub = () => JSON.stringify({
    reply: `(Offline stub) Noted: "${message}". Set ANTHROPIC_API_KEY to apply AI edits automatically.`,
    content: currentContent || '',
  });

  const { text, ai } = await completeOrStub(
    { messages, temperature: 0.4, json: true, maxTokens: 8000 },
    stub
  );

  // Separate the short chat reply from the full revised document.
  let reply;
  let revised;
  try {
    const parsed = JSON.parse(text);
    reply = (parsed.reply && String(parsed.reply).trim()) || 'Done — updated the document.';
    revised = (typeof parsed.content === 'string' && parsed.content.trim()) ? parsed.content : currentContent;
  } catch {
    // Malformed response: surface it as a reply but never overwrite the document.
    reply = text || 'Sorry, I could not apply that — please try rephrasing.';
    revised = currentContent;
  }

  const changed = revised !== currentContent;

  // Persist the turns — store the SHORT reply (not the whole document) so the
  // conversation stays readable and history doesn't balloon.
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ($1,$2,'user',$3)`,
    [targetType, targetId, message]
  );
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ($1,$2,'assistant',$3)`,
    [targetType, targetId, reply]
  );

  if (changed) {
    if (targetType === 'plan') {
      await query('UPDATE financial_plans SET content = $1 WHERE id = $2', [revised, targetId]);
    } else {
      await query('UPDATE followup_emails SET body = $1 WHERE id = $2', [revised, targetId]);
    }
  }

  return { reply, updatedContent: changed ? revised : null, ai };
}

async function loadTarget(type, id) {
  const table = type === 'plan' ? 'financial_plans' : 'followup_emails';
  const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getHistory(targetType, targetId) {
  const { rows } = await query(
    `SELECT id, role, content, created_at FROM chat_messages
     WHERE target_type = $1 AND target_id = $2 ORDER BY created_at ASC`,
    [targetType, targetId]
  );
  return rows;
}

export default { refine, getHistory };
