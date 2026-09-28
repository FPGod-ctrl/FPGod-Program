import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalise } from '../library/match.js';

/**
 * How Legacy runs its book — team, premium tiers and their contact protocol,
 * referral partners, insurers and XPLAN thread names — read from
 * data/legacy-practice.json so the firm's details live in one editable file
 * rather than in the screens.
 */
const FILE = fileURLToPath(new URL('../../data/legacy-practice.json', import.meta.url));

const EMPTY = {
  team: [], tiers: [], renewalWindowDays: 14, referralPartners: [],
  otherReferralSources: [], insurers: [], threads: [],
};

function load() {
  try {
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch (err) {
    console.warn(`[crm] ${FILE} unreadable, running without practice detail: ${err.message}`);
    return EMPTY;
  }
}

export const practice = load();

export const TIER_KEYS = practice.tiers.map((t) => t.key);
export const THREADS = practice.threads;
export const RENEWAL_WINDOW_DAYS = practice.renewalWindowDays;

/** People who hold the Adviser role — the choices for a contact's servicing adviser. */
export const advisers = () => practice.team.filter((m) => m.roles.includes('Adviser')).map((m) => m.name);

/**
 * The referral partner a contact's referral source names, if any. Their fee has
 * to be disclosed in the SOA, so the record flags it.
 */
export function referralPartnerFor(source) {
  const s = normalise(source);
  if (!s) return null;
  return practice.referralPartners.find((p) =>
    [p.name, p.legalName].filter(Boolean).some((n) => {
      const k = normalise(n);
      // Partial matches ("PPA", "Performance Property") need a real word, not a letter.
      return k === s || (s.length >= 3 && (k.includes(s) || s.includes(k)));
    })
  ) || null;
}

/**
 * The tier a total annual premium falls in, per Legacy's client classification
 * (tiers are listed highest first, each with its floor).
 */
export function tierForPremium(annualPremium) {
  if (annualPremium == null || !(annualPremium > 0)) return null;
  return practice.tiers.find((t) => annualPremium >= t.minPremium)?.key || null;
}
