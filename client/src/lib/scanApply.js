import { api } from '../api/client.js';
import { currency, titleCase } from './format.js';

/**
 * Shared plumbing for "a profile was scanned → write everything it found onto a
 * client file". Used by the Clients page import (brand-new client) and by the
 * document review modal on an existing client, so both land the same data.
 *
 * The AI is asked for exact field names, but it still hands back the odd
 * "$1,200 p.a.", "Home Loan" or "Not provided" — every value therefore goes
 * through sanitize()/coerceEnum() before it reaches a typed database column.
 * Without that, a single bad enum fails the row's CHECK constraint and the item
 * silently never appears on the client page.
 */

// ------------------------------------------------------------------ value cleaning

const DATE_FIELDS = ['date_of_birth', 'partner_date_of_birth', 'target_date', 'will_date'];

const NUMERIC_FIELDS = ['value', 'balance', 'amount', 'interest_rate', 'monthly_payment',
  'cover_amount', 'premium', 'target_amount', 'current_amount', 'allocation_pct', 'fee_pct',
  'annual_income', 'net_worth', 'partner_annual_income',
  'super_balance', 'super_contributions', 'partner_super_balance', 'partner_super_contributions'];

const BOOLEAN_FIELDS = ['smoker', 'partner_smoker', 'is_dependent',
  'has_will', 'has_poa', 'has_testamentary_trust', 'has_binding_nomination'];

const PLACEHOLDER = /^(not provided|not provid\w*|not stated|not specified|n\/?a|unknown|none|null|nil|tbc|tba|-+)$/i;
const TRUEISH = /^(true|yes|y|1|smoker|current smoker)$/i;
const FALSEISH = /^(false|no|n|0|non-?smoker|never smoked)$/i;

const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));

/** Coerce a payload so date / number / boolean columns get valid values or null. */
export function sanitize(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v === '' || v == null) { out[k] = null; continue; }
    if (typeof v === 'boolean') continue;
    const s = String(v).trim();
    if (PLACEHOLDER.test(s)) { out[k] = null; continue; }
    if (DATE_FIELDS.includes(k)) {
      out[k] = isValidDate(s) ? s.slice(0, 10) : null;
    } else if (NUMERIC_FIELDS.includes(k)) {
      const digits = s.replace(/[^0-9.-]/g, '');
      const n = Number(digits);
      out[k] = digits !== '' && Number.isFinite(n) ? n : null;
    } else if (BOOLEAN_FIELDS.includes(k)) {
      out[k] = TRUEISH.test(s) ? true : FALSEISH.test(s) ? false : null;
    }
  }
  return out;
}

/**
 * Map a loose AI value onto one of a column's allowed CHECK values.
 * Falls back to `fallback` (null drops the field rather than failing the row).
 */
export function coerceEnum(value, allowed, fallback = null, aliases = {}) {
  if (value == null || value === '') return fallback;
  const s = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (allowed.includes(s)) return s;
  if (aliases[s]) return aliases[s];
  // Loose contains-match, e.g. "life_insurance_policy" → "life".
  const hit = allowed.find((a) => s.includes(a) || a.includes(s));
  if (hit) return hit;
  const alias = Object.keys(aliases).find((a) => s.includes(a));
  return alias ? aliases[alias] : fallback;
}

const FREQUENCY = {
  allowed: ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annual'],
  fallback: null,
  aliases: { yearly: 'annual', year: 'annual', per_annum: 'annual', 'p.a.': 'annual', 'p.a': 'annual',
    pa: 'annual', annually: 'annual', month: 'monthly', week: 'weekly',
    fortnight: 'fortnightly', quarter: 'quarterly' },
};

export const RISK_ENUM = {
  allowed: ['conservative', 'moderate', 'balanced', 'growth', 'aggressive'],
  fallback: null,
  aliases: { defensive: 'conservative', low: 'conservative', cautious: 'conservative',
    medium: 'moderate', high: 'aggressive', high_growth: 'aggressive', assertive: 'growth' },
};

export const STATUS_ENUM = {
  allowed: ['prospect', 'active', 'inactive', 'archived'],
  fallback: 'prospect',
  aliases: { new: 'prospect', lead: 'prospect', client: 'active', current: 'active' },
};

// ------------------------------------------------------------------ categories

/**
 * Every financial category the scanner can extract: where to POST it, which
 * field must be present, how to de-dupe it, how to label it in a review list,
 * and which of its columns are constrained enums.
 */
export const CATS = [
  {
    key: 'investments', title: 'Investment holdings', icon: '📊',
    endpoint: '/investments/current', req: 'fund_name', keyFields: ['fund_name', 'balance'],
    enums: { risk_profile: RISK_ENUM },
    label: (r) => `${r.fund_name || 'Holding'}${r.balance ? ` — ${currency(r.balance)}` : ''}`,
  },
  {
    key: 'assets', title: 'Assets', icon: '🏦',
    endpoint: '/assets', req: 'name', keyFields: ['name', 'value'],
    enums: {
      category: {
        allowed: ['cash', 'property', 'vehicle', 'business', 'investment', 'superannuation', 'collectible', 'other'],
        fallback: 'other',
        aliases: { home: 'property', house: 'property', real_estate: 'property', land: 'property',
          car: 'vehicle', motor_vehicle: 'vehicle', shares: 'investment', stocks: 'investment',
          managed_fund: 'investment', portfolio: 'investment', super: 'superannuation',
          savings: 'cash', bank: 'cash', bank_account: 'cash', term_deposit: 'cash' },
      },
    },
    label: (r) => `${r.name || 'Asset'}${r.category ? ` · ${titleCase(r.category)}` : ''}${r.value ? ` — ${currency(r.value)}` : ''}`,
  },
  {
    key: 'liabilities', title: 'Debts & liabilities', icon: '💳',
    endpoint: '/liabilities', req: 'name', keyFields: ['name', 'balance'],
    enums: {
      liability_type: {
        allowed: ['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'student_loan', 'tax', 'business_loan', 'other'],
        fallback: 'other',
        aliases: { home_loan: 'mortgage', house_loan: 'mortgage', investment_loan: 'mortgage',
          car_loan: 'auto_loan', vehicle_loan: 'auto_loan', creditcard: 'credit_card',
          hecs: 'student_loan', help: 'student_loan', hecs_help: 'student_loan',
          ato: 'tax', tax_debt: 'tax', margin_loan: 'other', buy_now_pay_later: 'other' },
      },
    },
    label: (r) => `${r.name || 'Debt'}${r.liability_type ? ` · ${titleCase(r.liability_type)}` : ''}${r.balance ? ` — ${currency(r.balance)}` : ''}`,
  },
  {
    key: 'income', title: 'Income', icon: '💰',
    endpoint: '/income', req: 'name', keyFields: ['name', 'amount'],
    enums: {
      income_type: {
        allowed: ['salary', 'rental', 'pension', 'dividends', 'business', 'government', 'trust', 'other'],
        fallback: 'other',
        aliases: { wages: 'salary', wage: 'salary', employment: 'salary', employment_income: 'salary',
          rent: 'rental', investment_property: 'rental', superannuation_pension: 'pension',
          account_based_pension: 'pension', interest: 'dividends', investment: 'dividends',
          distributions: 'dividends', self_employed: 'business', sole_trader: 'business',
          centrelink: 'government', age_pension: 'government', benefits: 'government' },
      },
      frequency: FREQUENCY,
    },
    label: (r) => `${r.name || 'Income'}${r.amount ? ` — ${currency(r.amount)}/${r.frequency || 'annual'}` : ''}`,
  },
  {
    key: 'expenses', title: 'Expenses', icon: '🧾',
    endpoint: '/expenses', req: 'name', keyFields: ['name', 'amount'],
    enums: {
      category: {
        allowed: ['housing', 'utilities', 'living', 'transport', 'insurance', 'education', 'discretionary', 'other'],
        fallback: 'other',
        aliases: { rent: 'housing', mortgage: 'housing', rates: 'housing', home: 'housing',
          power: 'utilities', electricity: 'utilities', gas: 'utilities', water: 'utilities',
          phone: 'utilities', internet: 'utilities', food: 'living', groceries: 'living',
          medical: 'living', health: 'living', car: 'transport', fuel: 'transport',
          petrol: 'transport', travel: 'discretionary', entertainment: 'discretionary',
          holidays: 'discretionary', dining: 'discretionary', school: 'education',
          school_fees: 'education', childcare: 'education' },
      },
      frequency: FREQUENCY,
    },
    label: (r) => `${r.name || 'Expense'}${r.amount ? ` — ${currency(r.amount)}/${r.frequency || 'monthly'}` : ''}`,
  },
  {
    key: 'insurance', title: 'Insurance', icon: '🛡️',
    endpoint: '/insurance', req: 'policy_type', keyFields: ['policy_type', 'provider', 'cover_amount'],
    enums: {
      policy_type: {
        allowed: ['life', 'tpd', 'income_protection', 'trauma', 'health', 'home', 'auto', 'other'],
        fallback: 'other',
        aliases: { life_insurance: 'life', death_cover: 'life', term_life: 'life',
          total_and_permanent_disability: 'tpd', disability: 'tpd', permanent_disability: 'tpd',
          salary_continuance: 'income_protection', ip: 'income_protection',
          critical_illness: 'trauma', crisis_cover: 'trauma',
          private_health: 'health', medical: 'health', hospital: 'health',
          home_and_contents: 'home', contents: 'home', building: 'home', landlord: 'home',
          car: 'auto', motor: 'auto', vehicle: 'auto', comprehensive: 'auto' },
      },
      frequency: FREQUENCY,
    },
    label: (r) => `${titleCase(r.policy_type || 'policy')}${r.provider ? ` · ${r.provider}` : ''}${r.cover_amount ? ` — ${currency(r.cover_amount)} cover` : ''}`,
  },
  {
    key: 'goals', title: 'Goals', icon: '🎯',
    endpoint: '/goals', req: 'name', keyFields: ['name', 'target_amount'],
    enums: {
      priority: {
        allowed: ['low', 'medium', 'high'],
        fallback: 'medium',
        aliases: { critical: 'high', urgent: 'high', primary: 'high', moderate: 'medium', nice_to_have: 'low' },
      },
    },
    label: (r) => `${r.name || 'Goal'}${Number.isFinite(Number(r.target_amount)) && r.target_amount !== '' ? ` — ${currency(r.target_amount)}` : ''}`,
  },
  {
    key: 'family', title: 'Family & dependants', icon: '👨‍👩‍👧',
    endpoint: '/family', req: 'first_name', keyFields: ['first_name', 'relationship'],
    enums: {
      relationship: {
        allowed: ['child', 'stepchild', 'dependent', 'parent', 'sibling', 'grandchild', 'other'],
        fallback: 'child',
        aliases: { son: 'child', daughter: 'child', kid: 'child', children: 'child',
          stepson: 'stepchild', stepdaughter: 'stepchild', mother: 'parent', father: 'parent',
          mum: 'parent', dad: 'parent', brother: 'sibling', sister: 'sibling',
          grandson: 'grandchild', granddaughter: 'grandchild',
          spouse: 'other', partner: 'other', wife: 'other', husband: 'other' },
      },
    },
    label: (r) => `${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'Family member'}`
      + `${r.relationship ? ` · ${titleCase(r.relationship)}` : ''}`
      + `${r.date_of_birth ? ` — born ${String(r.date_of_birth).slice(0, 10)}` : ''}`,
  },
];

/** Identifying key so we never insert an item the client already has. */
export const keyOf = (row, fields) =>
  fields.map((f) => String(row[f] ?? '').trim().toLowerCase()).join('|');

/** Clean one extracted row into something the API will accept, or null to skip it. */
export function prepareItem(raw, cat, clientId) {
  const item = sanitize({ ...raw, client_id: clientId });
  for (const [field, spec] of Object.entries(cat.enums || {})) {
    const v = coerceEnum(item[field], spec.allowed, spec.fallback, spec.aliases);
    if (v == null) delete item[field]; else item[field] = v;
  }
  // The required field must survive sanitising, otherwise the row is meaningless.
  if (item[cat.req] == null || item[cat.req] === '') {
    if (cat.req !== 'policy_type') return null;
    item.policy_type = 'other';
  }
  return item;
}

/** Which client-level enum columns need coercing before a save. */
export function sanitizeClient(fields) {
  const out = sanitize(fields);
  for (const [k, spec] of [
    ['risk_profile', RISK_ENUM], ['partner_risk_profile', RISK_ENUM], ['status', STATUS_ENUM],
  ]) {
    if (out[k] != null) out[k] = coerceEnum(out[k], spec.allowed, spec.fallback, spec.aliases);
  }
  return out;
}

/**
 * Write every extracted list onto a client file.
 *
 * @param {string} clientId
 * @param {object} parsed     the scan payload ({investments, assets, …, estate})
 * @param {object} [opts]
 * @param {object} [opts.selection]  {catKey: boolean[]} — which rows to apply (default: all)
 * @param {boolean} [opts.dedupe]    check what's already on file first (default: true)
 * @param {boolean} [opts.estate]    also upsert parsed.estate (default: true)
 * @returns {Promise<{added: number, skipped: number}>}
 */
export async function applyScan(clientId, parsed, opts = {}) {
  const { selection = null, dedupe = true, estate: doEstate = true } = opts;
  const p = parsed || {};
  let added = 0;
  let skipped = 0;

  for (const cat of CATS) {
    const items = Array.isArray(p[cat.key]) ? p[cat.key] : [];
    const chosen = selection?.[cat.key]
      ? items.filter((_, i) => selection[cat.key][i])
      : items;
    if (!chosen.length) continue;

    let seen = new Set();
    if (dedupe) {
      try {
        const existing = await api.get(`${cat.endpoint}?client_id=${clientId}`);
        seen = new Set((existing || []).map((r) => keyOf(r, cat.keyFields)));
      } catch { /* no existing rows readable — just insert */ }
    }

    for (const raw of chosen) {
      if (!raw || typeof raw !== 'object') continue;
      const item = prepareItem(raw, cat, clientId);
      if (!item) continue;
      const k = keyOf(item, cat.keyFields);
      if (seen.has(k)) { skipped += 1; continue; }   // already on file
      seen.add(k);
      try { await api.post(cat.endpoint, item); added += 1; }
      catch { skipped += 1; }                        // skip rows the AI got wrong
    }
  }

  if (doEstate && hasEstate(p.estate)) {
    try { await api.put(`/clients/${clientId}/estate`, sanitize(p.estate)); added += 1; }
    catch { /* non-fatal — the rest of the file still saved */ }
  }

  return { added, skipped };
}

/** True when an estate block actually carries something worth saving. */
export function hasEstate(estate) {
  const e = estate || {};
  return Boolean(e.has_will || e.has_poa || e.has_testamentary_trust
    || e.executor || e.beneficiaries || e.will_location || e.trust_details);
}

/** Human summary of an estate block, for review lists. */
export function estateBits(estate) {
  const e = estate || {};
  const bits = [];
  if (e.has_will) bits.push('Will' + (e.executor ? ` (executor: ${e.executor})` : ''));
  if (e.has_poa) bits.push('POA' + (e.poa_type ? ` (${titleCase(e.poa_type)})` : ''));
  if (e.has_testamentary_trust) bits.push('Testamentary trust');
  if (e.beneficiaries) bits.push(`Beneficiaries: ${e.beneficiaries}`);
  return bits;
}

/** Total number of line items a scan will add (excluding personal details). */
export function countItems(parsed, selection = null) {
  const p = parsed || {};
  return CATS.reduce((n, cat) => {
    const items = Array.isArray(p[cat.key]) ? p[cat.key] : [];
    return n + (selection?.[cat.key] ? selection[cat.key].filter(Boolean).length : items.length);
  }, 0);
}
