import { completeOrStub } from './ai.js';
import { num, asDate, text, classifyAccount } from './cfsImport.js';
import { parseStatementText } from './cfsStatementText.js';

/**
 * Read a single CFS PDF statement into the same account+holdings shape the
 * spreadsheet importer produces, so both paths feed one review screen.
 *
 * Statements are the top-up path: they carry the per-option breakdown that a
 * book-level FUM export usually omits.
 */

const SYSTEM_PROMPT =
  'You extract data from Colonial First State (CFS) superannuation, pension and ' +
  'investment statements. Return JSON only, with this exact shape:\n' +
  '{"account_number":string,"account_name":string,"product":string,' +
  '"account_type":"super"|"pension"|"investment"|"other","balance":number,' +
  '"adviser_fee_pct":number,"adviser_fee_amount":number,"as_at_date":"YYYY-MM-DD",' +
  '"holdings":[{"option_name":string,"option_code":string,"asset_class":string,' +
  '"units":number,"unit_price":number,"balance":number,"allocation_pct":number,' +
  '"mgmt_fee_pct":number}]}\n' +
  'Rules:\n' +
  '- account_name is the member/investor name exactly as printed.\n' +
  '- product is the CFS product, e.g. "FirstChoice Wholesale Personal Super".\n' +
  '- balance is the CLOSING account balance for the period.\n' +
  '- adviser_fee_amount is the total ongoing adviser/advice service fee charged ' +
  'for the period (a positive number); adviser_fee_pct only if the statement ' +
  'states a percentage. Do not treat administration fees, investment/management ' +
  'costs or insurance premiums as adviser fees.\n' +
  '- holdings is one entry per investment option held at the close of the period.\n' +
  '- as_at_date is the closing/valuation date of the statement.\n' +
  '- Numbers must be plain (no $, %, commas or words). Omit any field you cannot ' +
  'determine — never guess, and never output "N/A", "Unknown" or similar.';

/**
 * Read a statement into accounts.
 *
 * A genuine CFS "Statement Report" is parsed structurally by cfsStatementText —
 * exact, instant, free, and reproducible, which matters because the result
 * decides whether a client is recorded as paying fees. The model is only asked
 * when that returns nothing, i.e. the PDF is some other kind of statement.
 *
 * @param {string} statementText  extracted PDF text
 * @returns {Promise<{accounts: object[], ai: boolean, warnings: string[]}>}
 */
export async function parseStatement(statementText) {
  const structural = parseStatementText(statementText);
  if (structural.accounts.length) {
    return { accounts: structural.accounts, ai: false, warnings: structural.warnings };
  }

  const { account, ai } = await parseStatementViaAi(statementText);
  const usable = account.account_number || account.balance > 0 || account.holdings.length;
  return {
    accounts: usable ? [account] : [],
    ai,
    warnings: [...structural.warnings, ...(usable ? [] : ['Nothing readable was found in this document.'])],
  };
}

/**
 * @param {string} statementText  extracted PDF text
 * @returns {Promise<{account: object, ai: boolean}>}
 */
export async function parseStatementViaAi(statementText) {
  const trimmed = (statementText || '').slice(0, 14000);
  const stub = () => JSON.stringify(heuristicStatement(trimmed));

  const { text: out, ai } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Statement text:\n${trimmed}` },
      ],
      json: true,
    },
    stub
  );

  let raw;
  try { raw = JSON.parse(out); } catch { raw = {}; }
  return { account: normalise(raw), ai };
}

/** Coerce the model's output into the importer's account shape. */
function normalise(raw) {
  const r = raw || {};
  const holdings = (Array.isArray(r.holdings) ? r.holdings : [])
    .map((h) => ({
      option_name: text(h?.option_name),
      option_code: text(h?.option_code),
      asset_class: text(h?.asset_class),
      units: num(h?.units),
      unit_price: num(h?.unit_price),
      balance: num(h?.balance) ?? 0,
      allocation_pct: num(h?.allocation_pct),
      mgmt_fee_pct: num(h?.mgmt_fee_pct),
      as_at_date: asDate(r.as_at_date),
    }))
    .filter((h) => h.option_name);

  const holdingTotal = holdings.reduce((s, h) => s + (h.balance || 0), 0);
  const balance = num(r.balance) ?? holdingTotal;

  for (const h of holdings) {
    if (h.allocation_pct == null && balance > 0) {
      h.allocation_pct = Number(((h.balance / balance) * 100).toFixed(3));
    }
  }

  let feePct = num(r.adviser_fee_pct);
  let feeAmt = num(r.adviser_fee_amount);
  if (feeAmt != null) feeAmt = Math.abs(feeAmt);   // statements print fees as debits
  if (feePct != null && feePct > 0 && feeAmt == null && balance > 0) {
    feeAmt = Number(((balance * feePct) / 100).toFixed(2));
  } else if (feeAmt != null && feeAmt > 0 && feePct == null && balance > 0) {
    feePct = Number(((feeAmt / balance) * 100).toFixed(4));
  }

  const product = text(r.product);
  const allowed = ['super', 'pension', 'investment', 'other'];
  const type = allowed.includes(String(r.account_type || '').toLowerCase())
    ? String(r.account_type).toLowerCase()
    : classifyAccount(product, null);

  return {
    account_number: text(r.account_number),
    account_name: text(r.account_name) || 'Unknown account',
    product,
    account_type: type,
    balance: Number((balance || 0).toFixed(2)),
    adviser_fee_pct: feePct,
    adviser_fee_amount: feeAmt,
    // Absence of a fee in an AI read is far weaker evidence than absence in a
    // structural read, so it stays 'unknown' rather than asserting 'not_paying'.
    fee_status: feeAmt && feeAmt > 0 ? 'paying' : 'unknown',
    fee_basis: null,
    as_at_date: asDate(r.as_at_date),
    notes: null,
    holdings,
    allocations: [],
  };
}

/** Offline fallback so a dropped statement still yields something reviewable. */
function heuristicStatement(body) {
  const out = { holdings: [] };

  const acct = body.match(/\b(?:account|member|investor)\s*(?:number|no\.?|#)\s*[:-]?\s*([A-Z0-9-]{6,})/i);
  if (acct) out.account_number = acct[1];

  const product = body.match(/\b(FirstChoice[\w -]*|FirstWrap[\w -]*|Essential Super[\w -]*)/i);
  if (product) out.product = product[1].trim();

  const bal = body.match(/\b(?:closing|total|account)\s+balance\s*[:-]?\s*\$?\s*([\d,]+\.\d{2})/i);
  if (bal) out.balance = Number(bal[1].replace(/,/g, ''));

  const asAt = body.match(/\bas\s+at\s+(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (asAt) out.as_at_date = asDate(asAt[1]);

  out.notes = 'Heuristic offline read (no Anthropic key) — verify every field.';
  return out;
}

export default { parseStatement };
