import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { listDir, rootAvailable } from '../library/fsGuard.js';
import { normalise, peopleOf } from '../library/match.js';
import { displayName, whoMatchesClient } from '../crm/names.js';

/**
 * Is this a client we already know?
 *
 * Two independent questions, both answered from names alone:
 *
 *  1. In the program: a `clients` row (workbench, CRM or the older client
 *     records) with the same first name and surname for at least one person.
 *  2. In SharePoint: a client folder ("Surname, First [& Second]") naming them.
 *     Only folder NAMES are listed. No file in the library is opened, so this
 *     never downloads anything and never reads client information.
 *
 * A SharePoint folder is the firm's own record, so it is the stronger signal of
 * an existing client.
 */

const FOLDER_TTL_MS = 10 * 60 * 1000;
let folderCache = { at: 0, names: null };

async function clientFolders() {
  if (folderCache.names && Date.now() - folderCache.at < FOLDER_TTL_MS) return folderCache.names;
  if (!(await rootAvailable('sharepoint'))) return null;
  const entries = await listDir('sharepoint', env.library.clientsDir);
  const names = entries.filter((e) => e.isDir).map((e) => e.name);
  folderCache = { at: Date.now(), names };
  return names;
}

const peopleTyped = (p) =>
  [
    { first: p.first_name, last: p.last_name },
    { first: p.partner_first_name, last: p.partner_last_name || p.last_name },
  ]
    .map((x) => ({ first: normalise(x.first), last: normalise(x.last) }))
    .filter((x) => x.last);

// "Liz" typed, "Elizabeth (Liz)" filed: the nickname sits in the parenthetical.
const nicknamesOf = (folder) =>
  [...String(folder).matchAll(/\(([^)]*)\)/g)].map((m) => normalise(m[1])).filter(Boolean);

const sameFirst = (a, b) => a && b && (a === b || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && a.startsWith(b)));

/** Rank SharePoint client folders against the people typed. */
function rankFolders(typed, folders) {
  const hits = [];
  for (const folder of folders) {
    const filed = peopleOf(folder).map((x) => ({ first: normalise(x.first), last: normalise(x.last) }));
    const nicks = nicknamesOf(folder);
    let exact = 0;
    let surname = 0;
    for (const t of typed) {
      const sameLast = filed.filter((f) => f.last === t.last);
      if (!sameLast.length) continue;
      if (t.first && (sameLast.some((f) => sameFirst(t.first, f.first)) || nicks.includes(t.first))) exact += 1;
      else surname += 1;
    }
    if (exact || surname) hits.push({ folder, exact, surname, people: filed.length });
  }
  // Every typed person matched beats one; a first-name match beats a surname-only one.
  return hits
    .sort((a, b) => b.exact - a.exact || b.surname - a.surname || a.people - b.people || a.folder.localeCompare(b.folder))
    .map((h) => ({
      folder: h.folder,
      match: h.exact ? 'name' : 'surname',
      allPeople: h.exact >= typed.length,
    }));
}

/**
 * @param {{first_name, last_name, partner_first_name?, partner_last_name?}} p
 * @param {{excludeClientId?: string}} [opts]
 */
export async function lookupClient(p, { excludeClientId } = {}) {
  const typed = peopleTyped(p);
  if (!typed.length) return { existing: false, program: [], sharepoint: { available: true, folders: [] } };

  // 1. The program.
  const { rows } = await query(
    `SELECT c.id, c.first_name, c.last_name, c.preferred_name, c.partner_first_name, c.partner_last_name,
            c.status, c.crm_stage, c.sharepoint_folder, c.created_at, w.id AS case_id, w.stage AS case_stage
       FROM clients c LEFT JOIN workbench_cases w ON w.client_id = c.id
      WHERE c.status IS DISTINCT FROM 'archived'`
  );
  const names = typed.filter((t) => t.first).map((t) => `${t.first} ${t.last}`);
  const program = rows
    .filter((c) => c.id !== excludeClientId && names.some((n) => whoMatchesClient(n, c)))
    .map((c) => ({
      id: c.id,
      display_name: displayName(c),
      case_id: c.case_id,
      case_stage: c.case_stage,
      status: c.status,
      sharepoint_folder: c.sharepoint_folder,
      created_at: c.created_at,
    }));

  // 2. SharePoint (folder names only).
  const folders = await clientFolders().catch(() => null);
  const ranked = folders ? rankFolders(typed, folders) : [];
  const nameHits = ranked.filter((h) => h.match === 'name');
  const sharepoint = {
    available: Boolean(folders),
    folders: [...nameHits, ...ranked.filter((h) => h.match === 'surname')].slice(0, 8),
    // One folder naming the client by first name and surname: safe to suggest.
    suggested: nameHits.length === 1 ? nameHits[0].folder : null,
  };

  return {
    existing: program.length > 0 || nameHits.length > 0,
    inProgram: program.length > 0,
    inSharePoint: nameHits.length > 0,
    program,
    sharepoint,
  };
}

/** One line for the writers: what kind of client this meeting is with. */
export function clientStatusLine(wb, look) {
  if (wb.sharepoint_folder) {
    return `EXISTING CLIENT of ${env.firm.name}: they already have a client file in SharePoint ("${wb.sharepoint_folder}"). Write the reasons for advice as a review of an existing client where the transcript supports it.`;
  }
  if (look?.inSharePoint || look?.inProgram) {
    return `POSSIBLY AN EXISTING CLIENT: a record with the same name exists${look.inSharePoint ? ' in SharePoint' : ''}${look.inProgram ? ' in the program' : ''}, not yet confirmed. Do not assume it; go by the transcript.`;
  }
  return `NEW CLIENT: no existing client file was found for them at ${env.firm.name}.`;
}
