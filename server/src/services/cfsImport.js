import * as XLSX from 'xlsx';

/**
 * Turn a CFS adviser export (xlsx / xls / csv) into accounts + holdings.
 *
 * CFS reports don't have one fixed shape — the column set differs between the
 * FUM report, the fee report and a portfolio valuation, and the headings get
 * renamed between report versions. So nothing here is hard-coded to a literal
 * heading: every field is matched by a list of patterns, the detected mapping
 * is handed back to the UI, and the user can override any column before the
 * import is committed. `buildAccounts` is therefore pure — the UI re-runs it
 * with an edited map without re-uploading the file.
 */

// --------------------------------------------------------------- value cleaning

const BLANK = /^(|-+|n\/?a|nil|none|null|tbc|unknown)$/i;

/** "$1,234.56" → 1234.56, "(500)" → -500, "0.55%" → 0.55, junk → null. */
export function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return null;
  let s = String(v).trim();
  if (BLANK.test(s)) return null;
  const negative = /^\(.*\)$/.test(s);          // accounting-style negatives
  s = s.replace(/[()]/g, '');
  s = s.replace(/[^0-9.-]/g, '');               // drop $ , % and spaces
  if (s === '' || s === '-' || s === '.') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export function text(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim().replace(/\s+/g, ' ');
  return s === '' || BLANK.test(s) ? null : s;
}

/** Excel serials, Date cells and common written formats → 'YYYY-MM-DD'. */
export function asDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel epoch: day 1 = 1900-01-01, with the historical 1900-leap-year bug.
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s || BLANK.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Australian exports are day-first: 07/06/2026 is 7 June.
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

// --------------------------------------------------------------- column matching

/**
 * Field patterns, most specific first. `exclude` guards against a heading that
 * would otherwise be stolen by a broader pattern — e.g. "Investment Option
 * Value" must land on holding_balance, not account_balance.
 */
const FIELDS = [
  {
    key: 'account_number',
    patterns: [/\b(account|acct|member|investor|portfolio|policy|plan)\s*(no\.?|num(ber)?|#|id)\b/i,
      /\b(account|member|investor)\s*ref/i, /^acc(ount)?\s*#?$/i],
    exclude: [/adviser|agent/i],
  },
  {
    key: 'account_name',
    patterns: [/\b(account|investor|member|client|customer)\s*name\b/i,
      /^(client|investor|member|account holder|name|surname)\b/i, /\bfull name\b/i],
    exclude: [/adviser|agent|option|fund|product|beneficiary/i],
  },
  {
    key: 'product',
    patterns: [/\b(product|plan|platform|offer)\s*(name|type|description)?\b/i,
      /\bfirstchoice|firstwrap|edge\b/i],
    exclude: [/option|adviser|code/i],
  },
  {
    key: 'option_code',
    patterns: [/\b(option|apir|fund|security|investment)\s*code\b/i, /\bapir\b/i],
  },
  {
    key: 'option_name',
    patterns: [/\binvestment\s*option\b/i, /\boption\s*(name|description)\b/i,
      /\b(holding|security|asset)\s*(name|description)\b/i, /^option$/i,
      /\bfund\s*name\b/i, /^investment$/i],
    exclude: [/code|value|balance|amount|%|pct|percent/i],
  },
  {
    key: 'asset_class',
    patterns: [/\basset\s*(class|sector|type|category)\b/i, /^(sector|asset allocation)$/i],
  },
  {
    key: 'units',
    patterns: [/\bunits?\s*(held|balance)?\b/i],
    exclude: [/price|value/i],
  },
  {
    key: 'unit_price',
    patterns: [/\bunit\s*price\b/i, /\bprice\s*per\s*unit\b/i, /^price$/i],
  },
  {
    key: 'holding_balance',
    patterns: [/\b(option|holding|investment|security)\s*(value|balance|amount)\b/i,
      /\bmarket\s*value\b/i, /\bcurrent\s*value\b/i],
    exclude: [/account|total|portfolio/i],
  },
  {
    key: 'account_balance',
    patterns: [/\b(account|portfolio|total|closing|member)\s*(balance|value)\b/i,
      /\bfunds?\s*under\s*(management|advice)\b/i, /\bfum\b/i,
      /\b(balance|value)\b/i],
    exclude: [/option|holding|unit|opening|fee|premium/i],
  },
  {
    key: 'allocation_pct',
    patterns: [/\b(allocation|weight(ing)?|proportion|split)\s*(%|pct|percent)?\b/i,
      /\b%\s*of\s*(portfolio|account|total)\b/i],
    exclude: [/fee|return|growth/i],
  },
  {
    key: 'adviser_fee_pct',
    // No trailing \b after the alternation: '%' is a non-word character, so
    // "Adviser Fee %" has no word boundary at the end and \b would never match.
    patterns: [/\b(?:adviser|advisor|advice|ongoing|service|asset)\s*fee\s*\(?\s*(?:%|pct\b|percent\b|rate\b)/i,
      /\bfee\s*rate\b/i, /\b(?:adviser|advice)\s*%/i],
  },
  {
    key: 'adviser_fee_amount',
    patterns: [/\b(adviser|advisor|advice|ongoing|service)\s*fee[s]?\s*(\$|amount|paid|p\.?a\.?|pa)?\b/i,
      /\b(ongoing|adviser)\s*(service|advice)\s*fee\b/i, /\brevenue\b/i, /\bcommission\b/i],
    exclude: [/%|pct|percent|rate|icr|mer|management/i],
  },
  {
    key: 'mgmt_fee_pct',
    patterns: [/\b(icr|mer)\b/i, /\b(management|investment|indirect)\s*(cost|fee)\s*(ratio|%)?\b/i],
  },
  {
    key: 'as_at_date',
    patterns: [/\bas\s*at\b/i, /\b(valuation|effective|report(ing)?|balance)\s*date\b/i, /^date$/i],
  },
  {
    key: 'account_type',
    patterns: [/\b(account|member|fund)\s*type\b/i, /^type$/i],
    exclude: [/product|option|asset|journal/i],
  },
];

/** Does this heading match a field? Returns the field key or null. */
function fieldFor(heading) {
  const h = String(heading || '').trim();
  if (!h) return null;
  for (const f of FIELDS) {
    if (f.exclude?.some((rx) => rx.test(h))) continue;
    if (f.patterns.some((rx) => rx.test(h))) return f.key;
  }
  return null;
}

/**
 * Find the header row: the row in the first 40 that maps the most distinct
 * fields. CFS reports carry 5-8 rows of title/period preamble before it.
 */
export function detectHeader(rows) {
  let best = { index: -1, score: 0, map: {} };
  const limit = Math.min(rows.length, 40);
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i] || [];
    const map = {};
    let score = 0;
    for (let c = 0; c < row.length; c += 1) {
      const key = fieldFor(row[c]);
      if (key && map[key] === undefined) {
        map[key] = c;
        score += 1;
      }
    }
    // A real header needs an identity column and something numeric to report on.
    const usable = (map.account_name !== undefined || map.account_number !== undefined)
      && (map.account_balance !== undefined || map.holding_balance !== undefined
        || map.option_name !== undefined);
    if (usable && score > best.score) best = { index: i, score, map };
  }
  return best;
}

/** Section headings and totals that must never become an account. */
const NOISE = /^(sub\s*)?total\b|^grand\s+total|^new\s+business$|^on-?going$|^adjust/i;

/**
 * Build accounts (with holdings) from raw sheet rows and a column map.
 * Pure: same inputs → same output, so the UI can re-run it after a remap.
 *
 * @param {any[][]} rows      raw sheet rows (including the header row)
 * @param {object}  columnMap {fieldKey: columnIndex}
 * @param {number}  headerRow index of the header row in `rows`
 */
export function buildAccounts(rows, columnMap, headerRow = 0) {
  const map = columnMap || {};
  const at = (row, key) => (map[key] === undefined ? null : row[map[key]]);
  const groups = new Map();
  const warnings = [];
  let skipped = 0;

  // Account identity often appears once and is blank on the option rows
  // beneath it, so carry the last non-blank value forward.
  const carried = { account_number: null, account_name: null, product: null, as_at_date: null };

  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    if (!row.some((c) => c !== '' && c != null)) continue;

    const rawName = text(at(row, 'account_name'));
    const rawNumber = text(at(row, 'account_number'));
    const optionName = text(at(row, 'option_name'));

    if ((rawName && NOISE.test(rawName)) || (rawNumber && NOISE.test(rawNumber))) continue;
    // A lone label in the first cell is a section heading, not data.
    if (!optionName && row.filter((c) => c !== '' && c != null).length < 2) continue;

    if (rawNumber) carried.account_number = rawNumber;
    if (rawName) carried.account_name = rawName;
    const rowProduct = text(at(row, 'product'));
    if (rowProduct) carried.product = rowProduct;
    const rowDate = asDate(at(row, 'as_at_date'));
    if (rowDate) carried.as_at_date = rowDate;

    const accountNumber = rawNumber || carried.account_number;
    const accountName = rawName || carried.account_name;
    if (!accountName && !accountNumber) { skipped += 1; continue; }

    const key = accountNumber
      ? `n:${accountNumber.toLowerCase()}`
      : `x:${String(accountName).toLowerCase()}|${String(carried.product || '').toLowerCase()}`;

    let acc = groups.get(key);
    if (!acc) {
      acc = {
        account_number: accountNumber || null,
        account_name: accountName || accountNumber,
        product: carried.product || null,
        account_type: null,
        balance: null,
        adviser_fee_pct: null,
        adviser_fee_amount: null,
        fee_basis: text(at(row, 'account_type')) || null,
        as_at_date: carried.as_at_date || null,
        holdings: [],
        _rows: 0,
      };
      groups.set(key, acc);
    }
    acc._rows += 1;

    // Account-level values: first non-null wins (repeated on every option row).
    const accBal = num(at(row, 'account_balance'));
    if (accBal != null && acc.balance == null) acc.balance = accBal;
    const feePct = num(at(row, 'adviser_fee_pct'));
    if (feePct != null && acc.adviser_fee_pct == null) acc.adviser_fee_pct = feePct;
    const feeAmt = num(at(row, 'adviser_fee_amount'));
    if (feeAmt != null && acc.adviser_fee_amount == null) acc.adviser_fee_amount = feeAmt;
    if (!acc.as_at_date && carried.as_at_date) acc.as_at_date = carried.as_at_date;
    if (!acc.product && carried.product) acc.product = carried.product;

    if (optionName) {
      acc.holdings.push({
        option_name: optionName,
        option_code: text(at(row, 'option_code')),
        asset_class: text(at(row, 'asset_class')),
        units: num(at(row, 'units')),
        unit_price: num(at(row, 'unit_price')),
        balance: num(at(row, 'holding_balance')) ?? num(at(row, 'account_balance')) ?? 0,
        allocation_pct: num(at(row, 'allocation_pct')),
        mgmt_fee_pct: num(at(row, 'mgmt_fee_pct')),
        as_at_date: carried.as_at_date || null,
      });
    }
  }

  const accounts = [...groups.values()].map((acc) => finalizeAccount(acc));
  if (skipped) warnings.push(`${skipped} row(s) skipped — no account name or number.`);
  const noBalance = accounts.filter((a) => !a.balance).length;
  if (noBalance) {
    warnings.push(`${noBalance} account(s) came through with a $0 balance — check the balance column mapping.`);
  }
  return { accounts, warnings };
}

/** Derive balance / allocations / fees that the export left implicit. */
function finalizeAccount(acc) {
  const holdings = acc.holdings || [];
  const holdingTotal = holdings.reduce((s, h) => s + (h.balance || 0), 0);

  // When the sheet only itemises options, the account balance is their sum.
  // When both are present, trust the account-level figure and flag a mismatch.
  let balance = acc.balance;
  let notes = null;
  if (balance == null) {
    balance = holdingTotal;
  } else if (holdingTotal > 0 && Math.abs(holdingTotal - balance) > Math.max(1, balance * 0.01)) {
    notes = `Holdings total ${holdingTotal.toFixed(2)} vs account balance ${balance.toFixed(2)}.`;
  }

  for (const h of holdings) {
    if (h.allocation_pct == null && balance > 0) {
      h.allocation_pct = Number(((h.balance / balance) * 100).toFixed(3));
    }
    // Some exports give units + price but no value.
    if (!h.balance && h.units != null && h.unit_price != null) {
      h.balance = Number((h.units * h.unit_price).toFixed(2));
    }
  }

  // Fees: whichever side the export gives, derive the other from the balance.
  let feePct = acc.adviser_fee_pct;
  let feeAmt = acc.adviser_fee_amount;
  if (feePct != null && feePct > 0 && feeAmt == null && balance > 0) {
    feeAmt = Number(((balance * feePct) / 100).toFixed(2));
  } else if (feeAmt != null && feeAmt > 0 && feePct == null && balance > 0) {
    feePct = Number(((feeAmt / balance) * 100).toFixed(4));
  }

  return {
    account_number: acc.account_number,
    account_name: acc.account_name,
    product: acc.product,
    account_type: classifyAccount(acc.product, acc.fee_basis),
    balance: Number((balance || 0).toFixed(2)),
    adviser_fee_pct: feePct,
    adviser_fee_amount: feeAmt,
    fee_basis: acc.fee_basis,
    as_at_date: acc.as_at_date,
    notes,
    holdings,
  };
}

/** Bucket a product string into super / pension / investment. */
export function classifyAccount(product, fallback) {
  const s = `${product || ''} ${fallback || ''}`.toLowerCase();
  if (/pension|allocated|account[- ]based|abp|income stream|ttr|transition to retirement|annuity/.test(s)) return 'pension';
  if (/super|accumulation|smsf|rollover|retirement savings/.test(s)) return 'super';
  if (/invest|wrap|idps|managed account|savings plan|trust|share/.test(s)) return 'investment';
  return 'other';
}

// --------------------------------------------------------------- workbook entry

const MAX_ROWS_PER_SHEET = 20000;

/**
 * Parse an uploaded workbook into one payload per sheet that looks like data.
 * The caller picks a sheet (the first is the best-scoring one) and may edit
 * `columnMap`, then re-runs `buildAccounts` via the remap endpoint.
 */
export function parseWorkbook(buffer, filename = '') {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = [];

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils
      .sheet_to_json(wb.Sheets[name], { header: 1, defval: '', blankrows: false, raw: true })
      .slice(0, MAX_ROWS_PER_SHEET);
    if (!rows.length) continue;

    const header = detectHeader(rows);
    if (header.index === -1) {
      sheets.push({ name, headerRow: -1, headers: [], columnMap: {}, rows: [], accounts: [], warnings: ['No recognisable header row found on this sheet.'], score: 0 });
      continue;
    }
    const { accounts, warnings } = buildAccounts(rows, header.map, header.index);
    sheets.push({
      name,
      headerRow: header.index,
      headers: (rows[header.index] || []).map((h) => text(h) || ''),
      columnMap: header.map,
      rows,
      accounts,
      warnings,
      score: header.score,
    });
  }

  // Best sheet first: most accounts, then richest header.
  sheets.sort((a, b) => (b.accounts.length - a.accounts.length) || (b.score - a.score));
  if (!sheets.length) {
    throw new Error(`Could not read any sheets from ${filename || 'the file'}.`);
  }
  return { sheets, fields: FIELDS.map((f) => f.key) };
}

/** Book-level roll-up used by both the preview and the saved book view. */
export function summarise(accounts) {
  const list = accounts || [];
  const totalFum = list.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalFees = list.reduce((s, a) => {
    const amt = a.adviser_fee_amount != null
      ? Number(a.adviser_fee_amount)
      : (Number(a.adviser_fee_pct || 0) / 100) * Number(a.balance || 0);
    return s + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  const byClass = new Map();
  for (const a of list) {
    for (const h of a.holdings || []) {
      const k = h.asset_class || 'Unclassified';
      byClass.set(k, (byClass.get(k) || 0) + Number(h.balance || 0));
    }
  }
  const byType = new Map();
  for (const a of list) {
    const k = a.account_type || 'other';
    byType.set(k, (byType.get(k) || 0) + Number(a.balance || 0));
  }

  return {
    accountCount: list.length,
    holdingCount: list.reduce((s, a) => s + (a.holdings?.length || 0), 0),
    totalFum: Number(totalFum.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    avgFeePct: totalFum > 0 ? Number(((totalFees / totalFum) * 100).toFixed(4)) : 0,
    byAssetClass: [...byClass.entries()]
      .map(([label, value]) => ({ label, value: Number(value.toFixed(2)), pct: totalFum > 0 ? Number(((value / totalFum) * 100).toFixed(2)) : 0 }))
      .sort((a, b) => b.value - a.value),
    byAccountType: [...byType.entries()]
      .map(([label, value]) => ({ label, value: Number(value.toFixed(2)), pct: totalFum > 0 ? Number(((value / totalFum) * 100).toFixed(2)) : 0 }))
      .sort((a, b) => b.value - a.value),
  };
}

export default { parseWorkbook, buildAccounts, detectHeader, summarise, num, text, asDate, classifyAccount };
