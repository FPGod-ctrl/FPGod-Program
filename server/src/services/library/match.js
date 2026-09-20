/**
 * Turning what the adviser typed into a client in the index.
 *
 * The library files clients as "Surname, First" — and often as a household:
 * "Callan, Jeremy and Laura", "McCormack, Lauren and Seneviratna, Tom",
 * "Peach, Elizabeth (Liz) & Scott, Gavin". The adviser types "tell me about
 * Gavin Lau". Everything here exists to close that gap without a database of
 * aliases.
 */

/** Strip accents, punctuation and case; collapse whitespace. */
export function normalise(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const JOINERS = new Set(['and', '&']);

/**
 * Split a folder name into people.
 *
 * "McCormack, Lauren and Seneviratna, Tom" -> two people with their own
 * surnames; "Callan, Jeremy and Laura" -> two people sharing Callan, because
 * the second chunk carries no comma of its own.
 *
 * @returns {{first:string, last:string}[]}
 */
export function peopleOf(folderName) {
  // A parenthetical is a nickname or a marker like "(AI Test)" — keep it out of
  // the name parts but let the caller keep it in the display name.
  const cleaned = String(folderName || '').replace(/\([^)]*\)/g, ' ');
  const chunks = cleaned
    .split(/\s+(?:and|&)\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const people = [];
  let lastSurname = '';
  for (const chunk of chunks) {
    if (chunk.includes(',')) {
      const [surname, ...rest] = chunk.split(',');
      lastSurname = surname.trim();
      const firsts = rest.join(',').trim();
      // "Smith, John & Jane" can also arrive as "Smith, John and Jane".
      for (const f of firsts.split(/\s+(?:and|&)\s+/i).map((s) => s.trim()).filter(Boolean)) {
        people.push({ first: f, last: lastSurname });
      }
      if (!firsts) people.push({ first: '', last: lastSurname });
    } else {
      // A bare "Laura" inherits the surname from the chunk before it.
      people.push({ first: chunk, last: lastSurname });
    }
  }
  return people.filter((p) => p.first || p.last);
}

const titleCase = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    // Mc/Mac and O' names: "mccormack" -> "McCormack", "o'brien" -> "O'Brien".
    .replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`)
    .replace(/\bO'([a-z])/g, (_, c) => `O'${c.toUpperCase()}`);

/**
 * "Lau, Pauline" -> "Pauline Lau";
 * "McCormack, Lauren and Seneviratna, Tom" -> "Lauren McCormack and Tom Seneviratna".
 * Folder names are shouted often enough (STANISLAUS) to be worth title-casing.
 */
export function displayNameOf(folderName) {
  const people = peopleOf(folderName);
  if (!people.length) return String(folderName || '').trim();
  const names = people.map((p) => titleCase([p.first, p.last].filter(Boolean).join(' ')));
  const note = String(folderName || '').match(/\(([^)]*)\)/);
  const joined =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return note ? `${joined} (${note[1].trim()})` : joined;
}

/** Order-independent token key: "Lau, Pauline" and "Pauline Lau" both -> "lau pauline". */
export function searchKeyOf(folderName) {
  const tokens = normalise(folderName)
    .split(' ')
    .filter((t) => t && !JOINERS.has(t));
  return [...new Set(tokens)].sort().join(' ');
}

// Words that turn up in questions rather than in names. A surname that collides
// with one of these (an adviser with a client called "Last") still matches on
// its other tokens.
const FILLER = new Set([
  'tell', 'me', 'about', 'what', 'whats', 'who', 'whos', 'is', 'are', 'the', 'a', 'an', 'for',
  'of', 'on', 'in', 'to', 'do', 'does', 'did', 'we', 'i', 'you', 'can', 'could', 'please',
  'client', 'clients', 'summary', 'summarise', 'summarize', 'give', 'show', 'pull', 'up',
  'look', 'at', 'into', 'find', 'search', 'anything', 'everything', 'info', 'information',
  'file', 'files', 'folder', 'note', 'notes', 'detail', 'details', 'record', 'records',
  'cover', 'insurance', 'policy', 'policies', 'premium', 'premiums', 'held', 'hold', 'holds',
  'have', 'has', 'had', 'why', 'when', 'how', 'much', 'many', 'last', 'latest', 'current',
  'status', 'update', 'review', 'advice', 'soa', 'and', 'or', 'with', 'their', 'his', 'her',
  'them', 'they', 'this', 'that', 'it', 'he', 'she', 'new', 'old', 'again', 'now',
]);

/**
 * Rank indexed clients against a free-form question.
 *
 * @param {string} question
 * @param {{id:string, folder_name:string, display_name:string, search_key:string}[]} clients
 * @param {{limit?:number}} [opts]
 * @returns {{client:object, score:number}[]} best first
 */
export function rankClients(question, clients, { limit = 8 } = {}) {
  const qTokens = normalise(question).split(' ').filter(Boolean);
  const qSet = new Set(qTokens);
  const contentTokens = qTokens.filter((t) => !FILLER.has(t) && t.length > 1);
  if (!contentTokens.length) return [];

  const scored = [];
  for (const c of clients) {
    const nameTokens = [...new Set((c.search_key || '').split(' ').filter(Boolean))];
    if (!nameTokens.length) continue;

    const matched = nameTokens.filter((t) => qSet.has(t));
    if (!matched.length) continue;

    // A single common first name ("Tom", "Lauren") is not enough on its own —
    // dozens of clients share one. Two tokens, or one distinctive token, is.
    const longest = Math.max(...matched.map((t) => t.length));
    if (matched.length === 1 && longest < 4) continue;

    let score = matched.length / nameTokens.length;
    if (matched.length >= 2) score += 0.3;
    if (longest >= 6) score += 0.1;

    // Adjacency: "gavin lau" beats a Gavin in one sentence and a Lau in another.
    for (let i = 0; i < qTokens.length - 1; i++) {
      if (matched.includes(qTokens[i]) && matched.includes(qTokens[i + 1])) {
        score += 0.25;
        break;
      }
    }
    // Every part of the filed name accounted for.
    if (matched.length === nameTokens.length) score += 0.2;

    scored.push({ client: c, score: Number(score.toFixed(3)), matched });
  }

  scored.sort((a, b) => b.score - a.score || a.client.display_name.localeCompare(b.client.display_name));
  return scored.slice(0, limit);
}

/**
 * Pick one client, or report that the question was ambiguous.
 * A clear winner needs a decent score and daylight over the runner-up —
 * otherwise the UI asks which one rather than summarising the wrong household.
 */
export function resolveClient(question, clients) {
  const ranked = rankClients(question, clients);
  if (!ranked.length) return { client: null, candidates: [], reason: 'no-match' };
  const [top, second] = ranked;
  const confident = top.score >= 0.8 && (!second || top.score - second.score >= 0.2);
  return {
    client: confident ? top.client : null,
    candidates: ranked.map((r) => ({ ...r.client, score: r.score })),
    reason: confident ? 'matched' : 'ambiguous',
  };
}

export default { normalise, peopleOf, displayNameOf, searchKeyOf, rankClients, resolveClient };
