import OpenAI from 'openai';
import { env } from '../config/env.js';

let client = null;
if (env.openai.enabled) {
  client = new OpenAI({ apiKey: env.openai.apiKey });
}

export const aiEnabled = () => env.openai.enabled;

/**
 * Chat completion wrapper.
 * @param {{messages: {role:string,content:string}[], temperature?:number,
 *          json?:boolean, maxTokens?:number}} opts
 * @returns {Promise<string>}
 */
export async function complete({ messages, temperature = 0.4, json = false, maxTokens }) {
  if (!client) {
    throw new Error('OpenAI is not configured (set OPENAI_API_KEY).');
  }
  const res = await client.chat.completions.create({
    model: env.openai.model,
    temperature,
    messages,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
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
    console.warn('[openai] falling back to stub:', err.message);
    return { text: stub(), ai: false };
  }
}

export default { complete, completeOrStub, aiEnabled };
