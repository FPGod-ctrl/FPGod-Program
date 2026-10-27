import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { env } from '../../config/env.js';

/**
 * Names and folders for a workbench case, in the firm's own conventions.
 *
 *   case name   "Citizen, Jane & John"   /  "Citizen, Jane & Doe, John"
 *   short name  "Citizen J&J"            /  "Citizen J & Doe J"
 *   notes name  "Jane Citizen SEP03"
 *   pack name   "Citizen, J & J"         /  "Citizen J & Doe J"
 *
 * Generated documents go to legacy/soa/<case name>/1. Advice/<Year> Advice &
 * Service/..., laid out like the SharePoint client folder so Tristan or the
 * paraplanner can move it across. Nothing here ever writes into SharePoint:
 * every write path is checked by assertWritable().
 */

export const REPO_LEGACY = env.library.repoRoot;
export const FILE_NOTES = path.join(REPO_LEGACY, 'file-notes');
export const SOA_ROOT = path.join(REPO_LEGACY, 'soa');
export const DOWNLOADS = process.env.WORKBENCH_DOWNLOADS || path.join(os.homedir(), 'Downloads');
export const SCRIPTS = path.resolve(REPO_LEGACY, '..', 'server', 'scripts');

export const COMPLIANCE_DIR = '2. Compliance docs (SOA, ROA, EO & Fact Find)';
export const RESEARCH_DIR = '1. Research, Financials, Medicals, Schedules';
export const SIGNED_DIR = '3. Signed documents - Implemented Audit';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');
const initial = (s) => clean(s).charAt(0).toUpperCase();

/** Strip characters Windows will not allow in a file or folder name. */
// eslint-disable-next-line no-control-regex
export const safeName = (s) => clean(s).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/[. ]+$/, '');

function people(c) {
  const a = { first: clean(c.first_name), last: clean(c.last_name) };
  const hasPartner = clean(c.partner_first_name) || clean(c.partner_last_name);
  if (!hasPartner) return [a];
  return [a, { first: clean(c.partner_first_name), last: clean(c.partner_last_name) || a.last }];
}

const sameSurname = (ps) => ps.length < 2 || ps[0].last.toLowerCase() === ps[1].last.toLowerCase();

export function caseNameOf(c) {
  const ps = people(c);
  if (ps.length === 1) return safeName(`${ps[0].last}, ${ps[0].first}`);
  if (sameSurname(ps)) return safeName(`${ps[0].last}, ${ps[0].first} & ${ps[1].first}`);
  return safeName(`${ps[0].last}, ${ps[0].first} & ${ps[1].last}, ${ps[1].first}`);
}

export function shortNameOf(c) {
  const ps = people(c);
  if (ps.length === 1) return safeName(`${ps[0].last} ${initial(ps[0].first)}`);
  if (sameSurname(ps)) return safeName(`${ps[0].last} ${initial(ps[0].first)}&${initial(ps[1].first)}`);
  return safeName(`${ps[0].last} ${initial(ps[0].first)} & ${ps[1].last} ${initial(ps[1].first)}`);
}

export function packNameOf(c) {
  const ps = people(c);
  if (ps.length === 1) return safeName(`${ps[0].last}, ${initial(ps[0].first)}`);
  if (sameSurname(ps)) return safeName(`${ps[0].last}, ${initial(ps[0].first)} & ${initial(ps[1].first)}`);
  return shortNameOf(c);
}

export const fullNamesOf = (c) => people(c).map((p) => `${p.first} ${p.last}`.trim());
export const firstNamesOf = (c) => people(c).map((p) => p.first);
export const isCouple = (c) => people(c).length > 1;

const asDate = (d) => (d ? new Date(d) : new Date());

/** "SEP03" */
export const monDay = (d) => {
  const x = asDate(d);
  return `${MONTHS[x.getMonth()]}${String(x.getDate()).padStart(2, '0')}`;
};

/** "2026.10.22" */
export const stampOf = (d) => {
  const x = asDate(d);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
};

/** "22 October 2026" */
export const longDate = (d) => asDate(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export const notesNameOf = (c, d) => safeName(`${fullNamesOf(c)[0]} ${monDay(d)}`);

export const slugOf = (c, d) =>
  `${fullNamesOf(c)[0]}-${monDay(d)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const adviceYearOf = (wb) => asDate(wb.meeting_date || wb.created_at).getFullYear();

/** The case's advice folder in the repo, plus its three sub-folders. */
export function caseDirs(wb) {
  const advice = path.join(SOA_ROOT, wb.case_name, '1. Advice', `${adviceYearOf(wb)} Advice & Service`);
  return {
    caseRoot: path.join(SOA_ROOT, wb.case_name),
    advice,
    research: path.join(advice, RESEARCH_DIR),
    compliance: path.join(advice, COMPLIANCE_DIR),
    signed: path.join(advice, SIGNED_DIR),
  };
}

const lower = (s) => (process.platform === 'win32' ? s.toLowerCase() : s);
const inside = (root, p) => {
  const r = lower(path.resolve(root));
  const t = lower(path.resolve(p));
  return t === r || t.startsWith(r + path.sep);
};

/**
 * Every write the workbench makes goes through here. Writes are allowed only in
 * the repo's legacy/ folder and in Downloads, and never inside the SharePoint
 * library, whatever the configured roots happen to overlap with.
 */
export function assertWritable(p) {
  if (inside(env.library.sharepointRoot, p)) {
    throw new Error('Refusing to write inside the SharePoint library (read only)');
  }
  if (!inside(REPO_LEGACY, p) && !inside(DOWNLOADS, p)) {
    throw new Error(`Refusing to write outside legacy/ and Downloads: ${p}`);
  }
  return p;
}

export async function ensureCaseDirs(wb) {
  const d = caseDirs(wb);
  for (const dir of [d.research, d.compliance, d.signed]) {
    await fs.mkdir(assertWritable(dir), { recursive: true });
  }
  return d;
}
