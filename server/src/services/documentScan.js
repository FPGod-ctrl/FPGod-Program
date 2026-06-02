import { completeOrStub } from './openai.js';

const SYSTEM_PROMPT =
  'You extract structured data from financial documents. Given the raw text of a ' +
  'client document, return a JSON object with any of these keys you can confidently ' +
  'populate: client {first_name,last_name,email,phone,date_of_birth,occupation,' +
  'annual_income,net_worth,risk_profile}, investments [{fund_name,ticker,account_type,' +
  'balance,allocation_pct,asset_class,fee_pct,provider}], and notes (string). ' +
  'Omit keys you cannot determine. Numbers must be plain numbers. Respond with JSON only.';

/**
 * Scan extracted document text into structured fields.
 * @param {string} text
 * @returns {Promise<{ result: object, ai: boolean }>}
 */
export async function scanDocument(text) {
  const trimmed = (text || '').slice(0, 12000); // keep prompt within budget
  const stub = () => JSON.stringify(heuristicScan(trimmed), null, 2);

  const { text: out, ai } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Document text:\n${trimmed}` },
      ],
      temperature: 0,
      json: true,
    },
    stub
  );

  let result;
  try {
    result = JSON.parse(out);
  } catch {
    result = { notes: out };
  }
  return { result, ai };
}

/** Very small regex-based fallback so offline scans still return *something*. */
function heuristicScan(text) {
  const out = { client: {}, investments: [], notes: 'Heuristic offline scan (no OpenAI key).' };

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) out.client.email = email[0];

  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  if (phone) out.client.phone = phone[0].trim();

  // Lines that look like "Fund Name .... $123,456"
  const fundLine = /([A-Z][A-Za-z0-9 &.'-]{3,})\s*[:-]?\s*\$?([\d,]+(?:\.\d{2})?)/g;
  let m;
  let count = 0;
  while ((m = fundLine.exec(text)) && count < 10) {
    const balance = Number(m[2].replace(/,/g, ''));
    if (balance > 100) {
      out.investments.push({ fund_name: m[1].trim(), balance });
      count += 1;
    }
  }
  return out;
}

export default { scanDocument };
