import { classifyAccount } from './cfsImport.js';

/**
 * Deterministic reader for Colonial First State "Statement Report" PDFs.
 *
 * CFS generates these to a fixed template, so they are parsed by structure
 * rather than by AI: it is exact, free, instant, and — most importantly —
 * reproducible, which matters when the output decides whether a client is
 * recorded as paying fees or not. `parseStatement` in cfsStatement.js falls
 * back to the model only when this returns nothing usable.
 *
 * Verified against 252 real statements (258 accounts, 1,300 holdings).
 */

// ------------------------------------------------------------------ text repair

/**
 * pdf-parse emits NUL where the PDF used an fi/fl/ffi ligature glyph, so
 * "beneficiary" arrives as "bene\0ciary" and "reflected" as "re\0ected".
 * Guessing one expansion corrupts the other, and these appear in client names
 * and email addresses ("Whit\0eld", "\0avia@..."), so try each expansion and
 * keep the one that produces a word we recognise; default to the commonest.
 */
const LIGATURES = ['fi', 'fl', 'ffi', 'ff'];
const KNOWN = new Set([
  'financial', 'figures', 'figure', 'beneficiary', 'benefit', 'benefits', 'reflected',
  'significant', 'significantly', 'profiles', 'profile', 'colonialfirststate', 'sacrifice',
  'diversified', 'griffiths', 'nilfisk', 'flavia', 'flyingsamurai', 'raffin', 'whitfield',
  'lakesidefinancial', 'inflation', 'float', 'flexible', 'fixed', 'first', 'firstchoice',
  'confirmation', 'notification', 'classification', 'specified', 'unflagged', 'offices',
]);

const NUL = '\u0000';
// The control character is the point: pdf-parse emits a literal NUL where
// the PDF used a ligature glyph, so matching it is deliberate.
// eslint-disable-next-line no-control-regex
const NUL_WORD_RE = /[A-Za-z]*\u0000[A-Za-z]*/g;

export function deligature(input) {
  if (!input || !input.includes(NUL)) return input || '';
  return input.replace(NUL_WORD_RE, (word) => {
    for (const lig of LIGATURES) {
      const candidate = word.split(NUL).join(lig);
      if (KNOWN.has(candidate.toLowerCase())) return candidate;
    }
    return word.split(NUL).join('fi');   // by far the most common
  });
}

// ------------------------------------------------------------------ primitives

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "30 Jun. 2026" / "1 July 2025" → "2026-06-30". */
export function cfsDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z.]*\.?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

const money = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * One row of the "Your account valuation" table. The columns run together in
 * the extracted text, e.g.
 *   Ausbil Aust Active Equity036FSF0585AU6,836.5107$6.6857$45,706.8615.7%
 * = name, option code (3 digits), APIR code, units, unit price, value, weight.
 * Non-super statements append an extra dollar column (unrealised gain).
 */
const HOLDING_RE =
  /^(.+?)(\d{3})([A-Z]{3}\d{4}A[UI])([\d,]+\.\d+)\$([\d,]+\.\d+)\$([\d,]+\.\d{2})([\d.]+)%(?:-?\$[\d,]+\.\d{2})?$/;

/** A real adviser fee charge — not the boilerplate that merely mentions one. */
const ADVISER_FEE_RE = /^(?:ongoing\s+)?advis(?:er|or)\s+service\s+fee\b[^$]*\$([\d,]+\.\d{2})$/i;

// ------------------------------------------------------------------ parsing

/**
 * Split a statement PDF's text into one record per account. A single PDF can
 * hold several accounts (pension + super + TAP for the same member).
 *
 * @param {string} rawText  text extracted from the PDF
 * @returns {{accounts: object[], warnings: string[]}}
 */
export function parseStatementText(rawText) {
  const text = deligature(rawText || '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const warnings = [];

  // Details that sit in the page-1 preamble, above the first account block.
  const preamble = lines.slice(0, indexOrEnd(lines, /^Account number:/));
  const adviser = firstCapture(preamble, /^Adviser:\s*(.+)$/);
  const period = firstCapture(lines, /^Report period:\s*(.+)$/);
  let periodStart = null;
  let periodEnd = null;
  if (period) {
    const m = period.match(/^(.+?)\s*-\s*(.+?)\s*$/);
    periodStart = cfsDate(m?.[1]);
    periodEnd = cfsDate(m?.[2]);
  }

  const starts = [];
  lines.forEach((l, i) => { if (/^Account number:/.test(l)) starts.push(i); });

  if (!starts.length) {
    warnings.push('No account number found — this looks like an empty or closed-account statement.');
    return { accounts: [], warnings };
  }

  // Each account's personal details (address, email, date of birth) are printed
  // immediately ABOVE its "Account number:" line, so a chunk has to start a
  // little before that line. Boundaries stay ordered so two accounts in the
  // same PDF can never read each other's details.
  const LOOKBACK = 14;
  const bounds = starts.map((s, k) => {
    const floor = k === 0 ? 0 : starts[k - 1] + 1;
    return Math.max(floor, s - LOOKBACK);
  });

  const accounts = [];
  starts.forEach((start, k) => {
    // The body runs to the next account's number, NOT to that account's
    // lookback boundary — otherwise two accounts printed close together would
    // cut the first one's valuation off. Overlapping the tail is harmless
    // because personal details are read from `details`, never from the body.
    const end = k + 1 < starts.length ? starts[k + 1] : lines.length;
    const details = lines.slice(bounds[k], start);
    const chunk = lines.slice(start, end);
    const account = parseAccountChunk(chunk, { adviser, periodStart, periodEnd, details });
    if (!account) return;
    if (account.balance == null) {
      warnings.push(`${account.account_name || account.account_number}: no account value found — skipped.`);
      return;
    }
    accounts.push(account);
  });

  if (!accounts.length && !warnings.length) warnings.push('No accounts could be read from this statement.');
  return { accounts, warnings };
}

function parseAccountChunk(chunk, ctx) {
  const details = ctx.details || [];
  const accountNumber = (chunk[0].replace(/^Account number:\s*/, '').match(/[\d\s]+/) || [''])[0]
    .replace(/\s+/g, '');
  if (!accountNumber) return null;

  // The member name sits directly above "Statement Report", the product below.
  const sr = chunk.findIndex((l) => /^Statement Report$/i.test(l));
  const accountName = sr > 0 ? chunk[sr - 1] : null;
  const product = sr !== -1 && chunk[sr + 1] ? chunk[sr + 1] : null;

  const balance = money(firstCapture(chunk, /^Account value\$([\d,]+\.\d{2})/))
    ?? money(firstCapture(chunk, /^Closing balance as at .*?\$([\d,]+\.\d{2})$/));
  const opening = money(firstCapture(chunk, /^Opening balance as at .*?\$([\d,]+\.\d{2})$/));

  // "As at 30 Jun. 2026" — the valuation date, not the print date.
  const asAt = cfsDate(firstCapture(chunk, /^As at (\d{1,2} [A-Za-z]{3}\.? \d{4})$/)) || ctx.periodEnd;

  const feeAmount = money(firstCapture(chunk, ADVISER_FEE_RE));
  const holdings = readHoldings(chunk);
  const allocations = readAllocations(chunk);

  const growth = allocations
    .filter((a) => a.bucket === 'growth')
    .reduce((s, a) => s + (a.pct || 0), 0);

  const feePct = feeAmount && balance > 0
    ? Number(((feeAmount / balance) * 100).toFixed(4))
    : null;

  return {
    account_number: accountNumber,
    account_name: accountName,
    product,
    account_type: classifyAccount(product, null),
    balance,
    opening_balance: opening,
    adviser_fee_amount: feeAmount ?? 0,
    adviser_fee_pct: feePct,
    // The whole point of the exercise: an account with no adviser service fee
    // line is being administered for free.
    fee_status: feeAmount && feeAmount > 0 ? 'paying' : 'not_paying',
    fee_basis: null,
    as_at_date: asAt,
    report_period_start: ctx.periodStart,
    report_period_end: ctx.periodEnd,
    adviser: ctx.adviser,
    email: firstCapture(details, /^Email address:\s*(.+)$/),
    date_of_birth: cfsDate(firstCapture(details, /^Date of birth:\s*(.+)$/)),
    growth_pct: allocations.length ? Number(growth.toFixed(2)) : null,
    notes: null,
    holdings,
    allocations,
  };
}

/** Rows of the account valuation table. */
function readHoldings(chunk) {
  const start = chunk.findIndex((l) => /^Investments\s*Option code/i.test(l.replace(/\s+/g, ' ')));
  const end = chunk.findIndex((l) => /^Account value\$/i.test(l));
  if (start === -1 || end <= start) return [];

  const out = [];
  for (let i = start + 1; i < end; i += 1) {
    const m = chunk[i].match(HOLDING_RE);
    if (!m) continue;
    out.push({
      option_name: m[1].trim(),
      option_code: m[3],                      // APIR — the useful identifier
      asset_class: null,                      // statements classify per account, not per option
      units: money(m[4]),
      unit_price: money(m[5]),
      balance: money(m[6]),
      allocation_pct: Number(m[7]),
      mgmt_fee_pct: null,
      as_at_date: null,
    });
  }
  return out;
}

/**
 * "Your asset allocation" — the growth/defensive split CFS derives from each
 * option's benchmark. Reads as label / $amount / percentage triples beneath a
 * "Defensive assets" or "Growth assets" heading.
 */
function readAllocations(chunk) {
  const start = chunk.findIndex((l) => /^Your asset allocation$/i.test(l));
  if (start === -1) return [];

  const out = [];
  let bucket = null;
  for (let i = start + 1; i < chunk.length; i += 1) {
    const line = chunk[i];
    if (/^(Note:|\*|Your investment manager|Your performance|Page \d)/i.test(line)) break;
    if (/^Defensive assets$/i.test(line)) { bucket = 'defensive'; continue; }
    if (/^Growth assets$/i.test(line)) { bucket = 'growth'; continue; }
    if (/^Your account balance$/i.test(line)) continue;
    if (/^\$[\d,]+\.\d{2}$/.test(line)) continue;      // the account total itself

    // label, then $amount, then percentage on the following two lines.
    const value = money((chunk[i + 1] || '').match(/^\$([\d,]+\.\d{2})$/)?.[1]);
    const pctMatch = (chunk[i + 2] || '').match(/^([\d.]+)%$/);
    if (bucket && value != null && pctMatch) {
      out.push({
        asset_class: line.replace(/\*+$/, '').trim(),
        bucket,
        value,
        pct: Number(pctMatch[1]),
      });
      i += 2;
    }
  }
  return out;
}

// ------------------------------------------------------------------ helpers

const firstCapture = (lines, re) => {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return (m[1] || '').trim();
  }
  return null;
};

const indexOrEnd = (lines, re) => {
  const i = lines.findIndex((l) => re.test(l));
  return i === -1 ? lines.length : i;
};

export default { parseStatementText, deligature, cfsDate };
