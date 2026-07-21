import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

let client = null;
if (env.anthropic.enabled) {
  client = new Anthropic({ apiKey: env.anthropic.apiKey });
}

export const aiEnabled = () => env.anthropic.enabled;

/**
 * Convert the OpenAI-style `{role, content}[]` message list this codebase uses
 * into Anthropic's shape: system turns are hoisted into a top-level `system`
 * string; the remainder map to user/assistant turns.
 */
function toAnthropic(messages) {
  const systemParts = [];
  const msgs = [];
  for (const m of messages || []) {
    if (!m || m.content == null) continue;
    if (m.role === 'system') {
      systemParts.push(String(m.content));
      continue;
    }
    msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
  }
  // Anthropic requires the first message to be a user turn.
  if (!msgs.length || msgs[0].role !== 'user') {
    msgs.unshift({ role: 'user', content: 'Proceed.' });
  }
  return { system: systemParts.join('\n\n'), msgs };
}

const textOf = (content) =>
  (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();

/** Best-effort extraction of a JSON document from a model response. */
function coerceJson(s) {
  if (!s) return s;
  let t = s.trim();
  const fence = t.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  if (fence) t = fence[1].trim();
  if (t.startsWith('{') || t.startsWith('[')) return t;
  const i = t.indexOf('{');
  const j = t.lastIndexOf('}');
  if (i !== -1 && j > i) return t.slice(i, j + 1);
  return t;
}

/**
 * Chat completion wrapper (Anthropic Messages API).
 * Keeps the same call shape the rest of the app already uses.
 * Note: `temperature` is accepted for compatibility but ignored — Opus 4.x
 * does not take sampling parameters; behaviour is steered via the prompt.
 *
 * @param {{messages: {role:string,content:string}[], temperature?:number,
 *          json?:boolean, maxTokens?:number}} opts
 * @returns {Promise<string>}
 */
export async function complete({ messages, json = false, maxTokens = 16000 }) {
  if (!client) {
    throw new Error('Anthropic is not configured (set ANTHROPIC_API_KEY).');
  }
  const { system, msgs } = toAnthropic(messages);
  const params = {
    model: env.anthropic.model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: msgs,
  };

  let text;
  // Above ~16K output tokens, stream to avoid SDK HTTP timeouts.
  if (maxTokens > 16000) {
    const stream = client.messages.stream(params);
    const final = await stream.finalMessage();
    text = textOf(final.content);
  } else {
    const res = await client.messages.create(params);
    text = textOf(res.content);
  }
  return json ? coerceJson(text) : text;
}

/**
 * Run `complete`, but if AI is disabled OR the call fails, fall back to a
 * deterministic stub so the app stays usable offline / without a key.
 * @param {Parameters<typeof complete>[0]} opts
 * @param {() => string} stub
 * @returns {Promise<{ text: string, ai: boolean }>}
 */
export async function completeOrStub(opts, stub) {
  if (!client) return { text: stub(), ai: false };
  try {
    const text = await complete(opts);
    return { text, ai: true };
  } catch (err) {
    console.warn('[anthropic] falling back to stub:', err.message);
    return { text: stub(), ai: false };
  }
}

export default { complete, completeOrStub, aiEnabled };
