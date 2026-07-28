/**
 * Match CFS account names onto existing client records.
 *
 * CFS writes names several ways in the same export — "Chapman, Bernadette",
 * "Mr Robert B Thomson", "BIRO TRISTAN", "John & Mary Smith", plus trust and
 * SMSF entities that are nobody's personal name. Rather than guess, every
 * account gets a confidence level and the UI reviews anything below `high`:
 * silently attaching an account to the wrong client file is far worse than
 * asking.
 */

const TITLES = /\b(mr|mrs|ms|miss|dr|prof|sir|dame|rev|hon|est(ate)?\s+of|the\s+late)\b\.?/gi;
const SUFFIXES = /\b(jr|sr|ii|iii|iv)\b\.?/gi;
const ENTITY = /\b(pty|ltd|limited|superannuation|super\s*fund|smsf|trust|trustee|fund|nominees|holdings|company|foundation|estate)\b/i;

/** Is this an entity (SMSF, trust, company) rather than a person? */
export const isEntity = (name) => ENTITY.test(String(name || ''));

const clean = (s) =>
  String(s || '')
    .replace(TITLES, ' ')
    .replace(SUFFIXES, ' ')
    .replace(/[.'`]/g, '')
    .replace(/[^A-Za-z\s,&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Split an account name into {first, last} candidates.
 * Handles "Last, First M", "First Last", "LAST FIRST" and couples joined by &.
 * Returns every plausible reading — a match on any of them counts.
 */
export function nameCandidates(raw) {
  const base = clean(raw);
  if (!base) return [];
  const out = [];

  // "John & Mary Smith" / "John and Mary Smith" → try each given name.
  const couple = base.split(/\s*(?:&|\band\b)\s*/i).filter(Boolean);
  const parts = couple.length > 1 ? couple : [base];

  // A trailing surname shared across a couple: "John & Mary Smith".
  let sharedLast = null;
  if (couple.length > 1) {
    const tail = couple[couple.length - 1].split(' ');
    if (tail.length > 1) sharedLast = tail[tail.length - 1];
  }

  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;

    if (p.includes(',')) {
      // "Chapman, Bernadette" — comma always means surname first.
      const [last, rest] = p.split(',').map((x) => x.trim());
      const first = (rest || '').split(' ')[0];
      if (last && first) out.push({ first, last });
      continue;
    }

    const words = p.split(' ').filter(Boolean);
    if (words.length === 1) {
      // In a couple ("John & Mary Smith") a lone word is a given name sharing
      // the trailing surname; on its own it can only be read as a surname,
      // which is a suggestion to review rather than a match.
      if (sharedLast) out.push({ first: words[0], last: sharedLast });
      else out.push({ first: '', last: words[0] });
      continue;
    }
    // "First [Middle] Last" and the reverse, since CFS also emits "SURNAME FIRST".
    out.push({ first: words[0], last: words[words.length - 1] });
    out.push({ first: words[words.length - 1], last: words[0] });
  }

  return out
    .map(({ first, last }) => ({ first: (first || '').toLowerCase(), last: (last || '').toLowerCase() }))
    .filter((c) => c.last);
}

/**
 * Build lookup indexes over the client list. Each client contributes both
 * their own name and their partner's, so a spouse's CFS account still lands
 * on the right household file.
 */
function indexClients(clients) {
  const full = new Map();      // "first|last"  → [clientId]
  const initial = new Map();   // "f|last"      → [clientId]
  const surname = new Map();   // "last"        → [clientId]

  const add = (map, key, id) => {
    if (!key) return;
    const list = map.get(key) || [];
    if (!list.includes(id)) list.push(id);
    map.set(key, list);
  };

  for (const c of clients) {
    const names = [
      [c.first_name, c.last_name],
      [c.partner_first_name, c.partner_last_name],
      // A partner recorded without their own surname takes the primary's.
      [c.partner_first_name, c.last_name],
    ];
    for (const [f, l] of names) {
      const first = String(f || '').trim().toLowerCase();
      const last = String(l || '').trim().toLowerCase();
      if (!first || !last) continue;
      add(full, `${first}|${last}`, c.id);
      add(initial, `${first[0]}|${last}`, c.id);
      add(surname, last, c.id);
    }
  }
  return { full, initial, surname };
}

/**
 * Attach a match to each account.
 *
 * @param {object[]} accounts  parsed accounts (mutated copies returned)
 * @param {object[]} clients   {id, first_name, last_name, partner_*}
 * @returns accounts with {client_id, match_status, match_confidence, match_label}
 */
export function matchAccounts(accounts, clients) {
  const idx = indexClients(clients || []);
  const byId = new Map((clients || []).map((c) => [c.id, c]));
  const label = (id) => {
    const c = byId.get(id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : null;
  };

  return (accounts || []).map((acc) => {
    const result = { ...acc, client_id: null, match_status: 'unmatched', match_confidence: null, match_label: null, match_options: [] };

    if (isEntity(acc.account_name)) {
      result.match_note = 'Entity (SMSF / trust / company) — link manually.';
      return result;
    }

    const candidates = nameCandidates(acc.account_name);
    if (!candidates.length) return result;

    // Exact first + last, unique across the book.
    for (const c of candidates) {
      if (!c.first) continue;
      const hit = idx.full.get(`${c.first}|${c.last}`);
      if (hit?.length === 1) {
        result.client_id = hit[0];
        result.match_status = 'matched';
        result.match_confidence = 'high';
        result.match_label = label(hit[0]);
        return result;
      }
      if (hit?.length > 1) result.match_options = hit.map((id) => ({ id, label: label(id) }));
    }

    // First initial + surname, unique.
    for (const c of candidates) {
      if (!c.first) continue;
      const hit = idx.initial.get(`${c.first[0]}|${c.last}`);
      if (hit?.length === 1) {
        result.client_id = hit[0];
        result.match_status = 'matched';
        result.match_confidence = 'medium';
        result.match_label = label(hit[0]);
        return result;
      }
    }

    // Surname only — never auto-linked, just offered as a suggestion.
    for (const c of candidates) {
      const hit = idx.surname.get(c.last);
      if (hit?.length) {
        result.match_confidence = 'low';
        result.match_options = hit.map((id) => ({ id, label: label(id) }));
        result.match_note = 'Surname match only — confirm before linking.';
        return result;
      }
    }

    return result;
  });
}

export default { matchAccounts, nameCandidates, isEntity };
