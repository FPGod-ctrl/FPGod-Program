import { normalise } from '../library/match.js';

/**
 * Names, three ways round.
 *
 * The Task Tracker files work under whatever name was typed ("David & Shira
 * Borsky", "Jeff", "Brett (Steve De Bono referral)"); the CRM holds a person and
 * an optional partner; SharePoint files them as "Surname, First". Everything here
 * closes the gap between those without an alias table.
 */

const words = (s) => String(s || '').split(' ').filter(Boolean);

/** "Shira Borsky" -> { first: 'Shira', last: 'Borsky' }; "Jeff" -> { first: 'Jeff', last: '' } */
function personOf(chunk) {
  const w = words(chunk);
  if (w.length <= 1) return { first: w[0] || '', last: '' };
  return { first: w.slice(0, -1).join(' '), last: w[w.length - 1] };
}

/**
 * Split a Task Tracker "who" into people plus any parenthetical note.
 *
 * "David & Shira Borsky"             -> David Borsky, Shira Borsky (shared surname)
 * "Arun Ilancheran & Cherry Keragala" -> two people, two surnames
 * "Brett (Steve De Bono referral)"   -> Brett, note "Steve De Bono referral"
 */
export function parseWho(who) {
  const raw = String(who || '').trim();
  const paren = raw.match(/\(([^)]*)\)/);
  const note = paren ? paren[1].trim() : '';
  const cleaned = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned
    .split(/\s+(?:&|and)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let people;
  if (parts.length === 2 && words(parts[0]).length === 1 && words(parts[1]).length >= 2) {
    // A lone first name before the joiner borrows the surname after it.
    const second = personOf(parts[1]);
    people = [{ first: parts[0], last: second.last }, second];
  } else {
    people = parts.map(personOf);
  }
  return { people: people.filter((p) => p.first || p.last), note, cleaned };
}

// Words that mark a practice, insurer or referrer rather than a household.
const ORG_WORDS =
  /\b(pty|ltd|advice|advisers?|referrals?|insurance|insurer|consulting|group|pharmacy|onepath|zurich|tal|aia|mlc|metlife|synchron|opex|legacy|allfin|pre-assessment|underwriting)\b/i;

/**
 * Is this "who" plausibly one client household? Used only to decide what the
 * import screen ticks by default — the adviser can always tick the rest.
 */
export function looksLikeHousehold(who) {
  const { people, cleaned } = parseWho(who);
  if (!people.length || people.length > 2) return false;
  if (/[\d/@]/.test(cleaned) || ORG_WORDS.test(cleaned)) return false;
  if (!people[0].last) return false;
  return people.every((p) => words(p.first).length <= 2);
}

/** Normalised "first|last" — the unit two names are compared on. */
export const personKey = (p) => `${normalise(p.first)}|${normalise(p.last)}`;

/** A CRM contact's people: the client and, when present, the partner. */
export function clientPeople(c) {
  const out = [{ first: c.first_name || '', last: c.last_name || '' }];
  if (c.preferred_name && c.preferred_name !== c.first_name) {
    out.push({ first: c.preferred_name, last: c.last_name || '' });
  }
  if (c.partner_first_name || c.partner_last_name) {
    out.push({ first: c.partner_first_name || '', last: c.partner_last_name || c.last_name || '' });
  }
  return out.filter((p) => p.first || p.last);
}

/**
 * How a household is spoken of: "David & Shira Borsky" when the surname is
 * shared, "Arun Ilancheran & Cherry Keragala" when it is not.
 */
export function displayName(c) {
  const primary = [c.first_name, c.last_name].filter(Boolean).join(' ');
  if (!c.partner_first_name && !c.partner_last_name) return primary;
  const sameSurname =
    !c.partner_last_name || normalise(c.partner_last_name) === normalise(c.last_name);
  if (sameSurname) {
    return [`${c.first_name} & ${c.partner_first_name || ''}`.trim(), c.last_name]
      .filter(Boolean)
      .join(' ');
  }
  return `${primary} & ${[c.partner_first_name, c.partner_last_name].filter(Boolean).join(' ')}`;
}

/**
 * Does a Task Tracker "who" name someone in this CRM contact?
 *
 * Needs a full first-and-last match on at least one person. A bare first name
 * ("Jeff") is not enough on its own — too many clients share one.
 */
export function whoMatchesClient(who, client) {
  const keys = new Set(
    clientPeople(client)
      .filter((p) => p.first && p.last)
      .map(personKey)
  );
  return parseWho(who).people.some((p) => p.first && p.last && keys.has(personKey(p)));
}

/**
 * Group Task Tracker names that are the same household.
 *
 * "Kirsty Oakey" and "Kirsty & Dean Oakey" share a person, so they merge; a bare
 * "Jeff" joins "Jeff Soo" only when exactly one household has a Jeff.
 *
 * @param {{who:string}[]} entries
 * @returns {number[][]} groups of indexes into `entries`
 */
export function groupWhos(entries) {
  const parent = entries.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };

  const parsed = entries.map((e) => parseWho(e.who));
  const byFullKey = new Map();
  parsed.forEach((p, i) => {
    for (const person of p.people) {
      if (!person.first || !person.last) continue;
      const k = personKey(person);
      if (byFullKey.has(k)) union(i, byFullKey.get(k));
      else byFullKey.set(k, i);
    }
  });

  // A who that is only a first name ("Jeff", "Jayesh").
  parsed.forEach((p, i) => {
    if (p.people.length !== 1 || p.people[0].last) return;
    const first = normalise(p.people[0].first);
    const owners = new Set();
    parsed.forEach((q, j) => {
      if (j === i) return;
      if (q.people.some((person) => person.last && normalise(person.first) === first)) {
        owners.add(find(j));
      }
    });
    if (owners.size === 1) union(i, [...owners][0]);
  });

  const groups = new Map();
  entries.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });
  return [...groups.values()];
}

/**
 * The fullest version of a household's name among its variants — the one with
 * the most people named, then the most surnames — turned into contact fields.
 */
export function suggestContact(whos) {
  const ranked = [...whos]
    .map((who) => ({ who, ...parseWho(who) }))
    .sort(
      (a, b) =>
        b.people.length - a.people.length ||
        b.people.filter((p) => p.last).length - a.people.filter((p) => p.last).length ||
        b.who.length - a.who.length
    );
  const best = ranked[0];
  const [primary = { first: '', last: '' }, partner] = best.people;
  const notes = ranked.map((r) => r.note).filter(Boolean);
  const referral = notes.find((n) => /referr/i.test(n));
  return {
    first_name: primary.first,
    last_name: primary.last,
    partner_first_name: partner?.first || '',
    partner_last_name: partner?.last || '',
    referral_source: referral ? referral.replace(/\s*referr(al|ed)(\s+by)?\s*/i, ' ').trim() : '',
    notes: notes.filter((n) => n !== referral).join('; '),
  };
}

/**
 * Match a search against SharePoint client folder names ("Borsky, David and
 * Shira"). Every word typed must start a word in the folder name, in any order.
 */
export function folderMatches(query, folderName) {
  const q = normalise(query).split(' ').filter(Boolean);
  if (!q.length) return false;
  const tokens = normalise(folderName).split(' ').filter(Boolean);
  return q.every((t) => tokens.some((f) => f.startsWith(t)));
}
