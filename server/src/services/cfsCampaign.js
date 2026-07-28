import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameCandidates, isEntity } from './cfsMatch.js';

/**
 * Turns the CFS book into a re-engagement call list.
 *
 * The book stores one row per ACCOUNT, but a campaign targets a PERSON — and a
 * member with a super account plus two pensions is one phone call, not three.
 * So everything here groups by person first, then ranks by what the
 * relationship is actually worth.
 *
 * It also reports which people already have a draft in
 * generated-plans/client-emails, so a second campaign run doesn't re-draft
 * people who were covered by the first.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.resolve(__dirname, '../../../generated-plans/client-emails');

/** Age bands the campaign is planned around: strategy changes at each edge. */
export const AGE_BANDS = [
  { key: 'under_40', label: 'Under 40', min: 0, max: 39 },
  { key: '40_54', label: '40 – 54', min: 40, max: 54 },
  { key: '55_59', label: '55 – 59 (preservation age)', min: 55, max: 59 },
  { key: '60_64', label: '60 – 64 (tax-free pension)', min: 60, max: 64 },
  { key: '65_69', label: '65 – 69', min: 65, max: 69 },
  { key: '70_plus', label: '70 and over', min: 70, max: 200 },
  { key: 'unknown', label: 'Age unknown', min: null, max: null },
];

export const bandFor = (age) => {
  if (age == null) return 'unknown';
  return AGE_BANDS.find((b) => b.min != null && age >= b.min && age <= b.max)?.key || 'unknown';
};

/** Whole years between a date of birth and `asAt`. */
export function ageAt(dateOfBirth, asAt = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${String(dateOfBirth).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = asAt.getFullYear() - dob.getFullYear();
  const beforeBirthday = asAt.getMonth() < dob.getMonth()
    || (asAt.getMonth() === dob.getMonth() && asAt.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/** "bernadette|chapman" for a person — the stable key accounts group on. */
export function personKey(name) {
  if (!name) return null;
  if (isEntity(name)) return `entity:${String(name).trim().toLowerCase()}`;
  const [first] = nameCandidates(name);
  return first ? `${first.first}|${first.last}` : String(name).trim().toLowerCase();
}

/**
 * Every key a name could reasonably be found under, used only for matching a
 * person to an existing draft. Statements abbreviate given names on joint
 * accounts ("Mrs R Jing & Mr C Poon") while the draft is filed under the full
 * name ("Jing_Rongsheng"), so initial-only keys are included too.
 */
export function personKeys(name) {
  if (!name) return [];
  if (isEntity(name)) return [`entity:${String(name).trim().toLowerCase()}`];
  const keys = new Set();
  for (const c of nameCandidates(name)) {
    keys.add(`${c.first}|${c.last}`);
    if (c.first) keys.add(`${c.first[0]}|${c.last}`);
  }
  return [...keys];
}

/**
 * Existing drafts, keyed by person. Files are named "Surname_Given Names.md"
 * (entities as "Name_Fund.md"), matching the generator's output convention.
 */
export async function readDrafts(dir = DRAFTS_DIR) {
  const drafts = new Map();
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return drafts;   // no campaign has been run yet
  }

  for (const file of entries) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const base = file.replace(/\.md$/i, '');
    const [surname, ...rest] = base.split('_');
    const given = rest.join(' ').trim();
    // The generator files SMSFs and companies as "<Entity Name>_Fund.md",
    // where "Fund" is a marker rather than a given name.
    const display = !given || given.toLowerCase() === 'fund' ? surname : `${given} ${surname}`;
    const entry = { file, name: display };
    for (const key of personKeys(display)) {
      if (!drafts.has(key)) drafts.set(key, entry);
    }
  }
  return drafts;
}

/**
 * Collapse account rows into one entry per person.
 *
 * @param {object[]} rows     cfs_accounts rows (optionally joined to clients)
 * @param {object} [opts]
 * @param {Date}   [opts.asAt]    date ages are calculated at
 * @param {Map}    [opts.drafts]  output of readDrafts()
 */
export function groupByPerson(rows, opts = {}) {
  const { asAt = new Date(), drafts = new Map() } = opts;
  const people = new Map();

  for (const r of rows || []) {
    const name = r.account_name || r.account_number || 'Unknown';
    const key = personKey(name) || name.toLowerCase();

    let p = people.get(key);
    if (!p) {
      p = {
        key,
        name,
        client_id: r.client_id || null,
        client_name: r.first_name ? `${r.first_name} ${r.last_name}` : null,
        is_entity: isEntity(name),
        email: null,
        date_of_birth: null,
        age: null,
        balance: 0,
        accounts: 0,
        products: [],
        account_ids: [],
        fee_status: 'not_paying',
        adviser_fees: 0,
        growth_pct: null,
        as_at_date: null,
      };
      people.set(key, p);
    }

    p.accounts += 1;
    p.balance += Number(r.balance || 0);
    p.adviser_fees += Number(r.adviser_fee_amount || 0);
    p.account_ids.push(r.id);
    if (r.product && !p.products.includes(r.product)) p.products.push(r.product);
    if (!p.email && r.email) p.email = r.email;
    if (!p.date_of_birth && r.date_of_birth) p.date_of_birth = r.date_of_birth;
    if (!p.client_id && r.client_id) {
      p.client_id = r.client_id;
      p.client_name = r.first_name ? `${r.first_name} ${r.last_name}` : null;
    }
    if (!p.as_at_date || (r.as_at_date && r.as_at_date > p.as_at_date)) p.as_at_date = r.as_at_date;
    // Paying on ANY account means the relationship is not unpaid.
    if (r.fee_status === 'paying') p.fee_status = 'paying';
    else if (r.fee_status === 'unknown' && p.fee_status !== 'paying') p.fee_status = 'unknown';
    // Weight the growth split by balance so the household figure is meaningful.
    if (r.growth_pct != null) {
      const w = Number(r.balance || 0);
      p._growthWeighted = (p._growthWeighted || 0) + Number(r.growth_pct) * w;
      p._growthWeight = (p._growthWeight || 0) + w;
    }
  }

  return [...people.values()].map((p) => {
    const age = ageAt(p.date_of_birth, asAt);
    // Check every spelling of the name, not just the grouping key.
    const draft = personKeys(p.name).map((k) => drafts.get(k)).find(Boolean) || null;
    const growth = p._growthWeight > 0 ? p._growthWeighted / p._growthWeight : null;
    delete p._growthWeighted;
    delete p._growthWeight;
    return {
      ...p,
      age,
      age_band: bandFor(age),
      growth_pct: growth == null ? null : Number(growth.toFixed(2)),
      balance: Number(p.balance.toFixed(2)),
      adviser_fees: Number(p.adviser_fees.toFixed(2)),
      drafted: Boolean(draft),
      draft_file: draft?.file || null,
    };
  });
}

/**
 * Apply campaign filters and rank the result.
 *
 * People whose age is unknown are KEPT when an age filter is set, and flagged,
 * rather than silently dropped — an unreadable date of birth shouldn't quietly
 * remove someone with a large balance from the call list.
 */
export function selectTargets(people, filters = {}) {
  const { minAge, maxAge, minBalance, includeDrafted = true, includeEntities = true } = filters;
  const excluded = { age: 0, balance: 0, drafted: 0, entity: 0 };

  const targets = people.filter((p) => {
    if (!includeEntities && p.is_entity) { excluded.entity += 1; return false; }
    if (!includeDrafted && p.drafted) { excluded.drafted += 1; return false; }
    if (minBalance != null && p.balance < minBalance) { excluded.balance += 1; return false; }
    if (p.age != null) {
      if (minAge != null && p.age < minAge) { excluded.age += 1; return false; }
      if (maxAge != null && p.age > maxAge) { excluded.age += 1; return false; }
    }
    return true;
  });

  // Biggest relationships first — that's the order to work the list in.
  targets.sort((a, b) => b.balance - a.balance);
  return { targets, excluded };
}

/** Counts and FUM per age band, for sizing a campaign before running it. */
export function segmentByAge(people) {
  return AGE_BANDS.map((band) => {
    const inBand = people.filter((p) => p.age_band === band.key);
    return {
      key: band.key,
      label: band.label,
      people: inBand.length,
      balance: Number(inBand.reduce((s, p) => s + p.balance, 0).toFixed(2)),
      drafted: inBand.filter((p) => p.drafted).length,
    };
  }).filter((b) => b.people > 0);
}

export default { groupByPerson, selectTargets, segmentByAge, readDrafts, ageAt, personKey, bandFor, AGE_BANDS };
