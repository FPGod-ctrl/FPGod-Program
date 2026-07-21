import { completeOrStub } from './ai.js';

const SYSTEM_PROMPT =
  'You extract structured data from financial documents. Given the raw text of a ' +
  'client document, return a JSON object with any of these keys you can confidently ' +
  'populate. Use exactly these field names so they map to our system:\n' +
  '- client {first_name,last_name,email,phone,address,date_of_birth,occupation,annual_income,net_worth,risk_profile,' +
  'partner_first_name,partner_last_name,partner_email,partner_phone,partner_date_of_birth,partner_occupation,partner_annual_income,partner_risk_profile} ' +
  '(partner_* is the spouse/partner if the document describes a couple)\n' +
  '- investments [{fund_name,ticker,account_type,balance,allocation_pct,asset_class,fee_pct,provider}]\n' +
  '- assets [{category,name,value,owner}] — category one of cash,property,vehicle,business,investment,superannuation,collectible,other\n' +
  '- liabilities [{liability_type,name,balance,interest_rate,monthly_payment,lender,owner}] — liability_type one of mortgage,personal_loan,auto_loan,credit_card,student_loan,tax,business_loan,other\n' +
  '- income [{income_type,name,amount,frequency,owner}] — income_type one of salary,rental,pension,dividends,business,government,trust,other; frequency one of weekly,fortnightly,monthly,quarterly,annual\n' +
  '- expenses [{category,name,amount,frequency}] — category one of housing,utilities,living,transport,insurance,education,discretionary,other\n' +
  '- insurance [{policy_type,provider,cover_amount,premium,frequency,policy_number}] — policy_type one of life,tpd,income_protection,trauma,health,home,auto,other\n' +
  '- goals [{name,target_amount,current_amount,target_date,priority}] — priority one of low,medium,high\n' +
  '- estate {has_will,will_date,will_location,executor,has_poa,poa_type,poa_attorney,has_testamentary_trust,trust_details,beneficiaries} — has_* are booleans; poa_type one of financial,medical,both,enduring\n' +
  '- notes (string)\n' +
  'Omit any key, array item, or field you cannot determine. Do NOT invent values. ' +
  'NEVER output placeholder text such as "Not provided", "N/A", "Unknown", "TBC" or similar — ' +
  'if you do not know a value, OMIT that field entirely. ' +
  'Numbers must be plain numbers (no currency symbols, words or commas); never put text in a number field. ' +
  'Dates must be valid YYYY-MM-DD; never put words in a date field. ' +
  'Respond with JSON only.';

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
  const out = {
    client: {}, investments: [], assets: [], liabilities: [],
    income: [], expenses: [], insurance: [], goals: [], estate: {},
    notes: 'Heuristic offline scan (no OpenAI key).',
  };

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
