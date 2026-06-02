import { query } from '../config/db.js';
import { completeOrStub } from './openai.js';

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
      ? 'You are refining a client financial plan. The user gives an instruction; you ' +
        'return the COMPLETE revised plan in Markdown (not just the diff). Keep everything ' +
        'good, apply the requested change, preserve [ADVISOR TO CONFIRM] markers.'
      : 'You are refining a follow-up email. The user gives an instruction; you return the ' +
        'COMPLETE revised email body (plain text, no subject line).';

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Current ${targetType}:\n${currentContent || '(empty)'}` },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const stub = () =>
    `${currentContent || ''}\n\n> _Refinement requested (offline stub): "${message}". ` +
    'Set OPENAI_API_KEY to apply AI edits automatically._';

  const { text: revised, ai } = await completeOrStub(
    { messages, temperature: 0.4, maxTokens: 1800 },
    stub
  );

  // Persist the turns and the revised document.
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ($1,$2,'user',$3)`,
    [targetType, targetId, message]
  );
  await query(
    `INSERT INTO chat_messages (target_type, target_id, role, content) VALUES ($1,$2,'assistant',$3)`,
    [targetType, targetId, revised]
  );

  if (targetType === 'plan') {
    await query('UPDATE financial_plans SET content = $1 WHERE id = $2', [revised, targetId]);
  } else {
    await query('UPDATE followup_emails SET body = $1 WHERE id = $2', [revised, targetId]);
  }

  return { reply: revised, updatedContent: revised, ai };
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
