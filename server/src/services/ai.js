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
  let cacheSystem = false;
  for (const m of messages || []) {
    if (!m || m.content == null) continue;
    if (m.role === 'system') {
      systemParts.push(String(m.content));
      // `cache: true` on any system message caches the whole system prompt.
      if (m.cache) cacheSystem = true;
      continue;
    }
    // Content may be a plain string, or an array of Anthropic content blocks
    // when the caller wants per-block cache_control (see complete()).
    const content = Array.isArray(m.content) ? m.content : String(m.content);
    msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content });
  }
  // Anthropic requires the first message to be a user turn.
  if (!msgs.length || msgs[0].role !== 'user') {
    msgs.unshift({ role: 'user', content: 'Proceed.' });
  }

  const systemText = systemParts.join('\n\n');
  if (!systemText) return { system: null, msgs };
  // A cached system prompt is sent as a block so cache_control can be attached.
  const system = cacheSystem
    ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }]
    : systemText;
  return { system, msgs };
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
 *
 * Sampling parameters (`temperature`, `top_p`, `top_k`) are REMOVED on current
 * models and return a 400 — they are deliberately never forwarded. Callers may
 * still pass `temperature`; it is ignored. Steer behaviour via the prompt and
 * `effort` instead.
 *
 * Thinking is adaptive: on Claude Opus 5 it is on by default and the model
 * decides how much to think. Cost is tuned with `effort`, not by disabling
 * thinking — disabling it on Opus 5 can cause tool calls and reasoning tags to
 * leak into the visible response.
 *
 * @param {{messages: {role:string, content:string|object[], cache?:boolean}[],
 *          json?:boolean, maxTokens?:number,
 *          effort?:'low'|'medium'|'high'|'xhigh'|'max'}} opts
 * @returns {Promise<string>}
 */
export async function complete({ messages, json = false, maxTokens = 16000, effort }) {
  if (!client) {
    throw new Error('Anthropic is not configured (set ANTHROPIC_API_KEY).');
  }
  const { system, msgs } = toAnthropic(messages);
  const params = {
    model: env.anthropic.model,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    ...(effort ? { output_config: { effort } } : {}),
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
