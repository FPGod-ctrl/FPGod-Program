import fs from 'node:fs/promises';
import path from 'node:path';
import { complete, aiEnabled } from '../ai.js';
import { env } from '../../config/env.js';
import { REPO_LEGACY, FILE_NOTES, SCRIPTS, fullNamesOf, firstNamesOf, isCouple, longDate } from './paths.js';

/**
 * Claude writes the data files; the existing builders turn them into the
 * firm's Word documents. The rules here are the same ones the /meeting-notes
 * skill follows (.claude/skills/meeting-notes/SKILL.md), so a case built in the
 * app reads like one Claude built in chat.
 */

const README = path.join(REPO_LEGACY, 'drop', 'initial-meeting-build', 'README.md');
// House-style exemplars: the SEP14 couple file is the current standard;
// the OCT09 file is the single-client shape.
const EXAMPLE_COUPLE = path.join(FILE_NOTES, 'brett-montgomery-sep14-cds.json');
const EXAMPLE_SINGLE = path.join(FILE_NOTES, 'sup-lwe-oct09-cds.json');

const LABELS_SINGLE = ['Name', 'Mobile', 'Sex', 'Referred from', 'About the client', 'What is important to you',
  'Reasons for seeking advice', 'Current Insurance', 'Financial circumstances', 'Family', 'Super',
  'Estate Planning', 'Health', 'Height', 'Hobbies', 'UNDERWRITING', 'Insurance needs', 'Goals',
  'About the client', 'Reasons for seeking advice', 'Existing cover', 'Estate Planning', 'Super',
  'Outcome of meeting'];
const LABELS_COUPLE = ['Name', 'Mobile', 'Sex', 'Spouse Details', 'Name', 'Mobile', 'Sex', ...LABELS_SINGLE.slice(3)];

const readOr = async (p, fallback = '') => {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return fallback;
  }
};

/** The JSON schema a builder documents in its own docstring. */
async function docstringOf(script) {
  const src = await readOr(path.join(SCRIPTS, script));
  const m = src.match(/"""([\s\S]*?)"""/);
  return m ? m[1].trim() : '';
}

const parse = (text, what) => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Claude's ${what} was not valid JSON. Try again.`);
  }
};

function requireAi() {
  if (!aiEnabled()) throw new Error('ANTHROPIC_API_KEY is not set, so the writers cannot run.');
}

function who(client) {
  const names = fullNamesOf(client);
  return isCouple(client)
    ? `a couple: ${names[0]} (client 1) and ${names[1]} (client 2)`
    : `a single client: ${names[0]}`;
}

const extras = (wb, known) =>
  (wb.statusLine ? `\n\n${wb.statusLine}` : '')
  + (wb.adviser_notes ? `\n\nADVISER NOTES (take precedence over the transcript):\n${wb.adviser_notes}` : '')
  + (known ? `\n\nKNOWN FACTS FROM THE CLIENT'S SHAREPOINT FOLDER (older documents; use to fill DOBs, addresses and existing cover, but the meeting wins where they differ):\n${known}` : '');

const GENERAL =
  `You work for ${env.firm.name}, an Australian risk insurance advice practice (life, TPD, trauma, income protection). `
  + `The adviser is ${env.adviser.name}. Australian spelling and AUD throughout. `
  + 'Never invent a fact: anything that should be known but was not said is TBC. '
  + 'Reply with the JSON document only: no prose, no code fence.';

/** Stage 1: Initial Meeting Notes (Client Details Summary) data. */
export async function writeMeetingNotes({ wb, client, notesName, known }) {
  requireAi();
  const couple = isCouple(client);
  const [rules, example] = await Promise.all([
    readOr(README),
    readOr(couple ? EXAMPLE_COUPLE : EXAMPLE_SINGLE),
  ]);
  const labels = couple ? LABELS_COUPLE : LABELS_SINGLE;
  const system = `${GENERAL}\n\nYou write the firm's Initial Meeting Notes (the Client Details Summary) from an initial meeting transcript. `
    + 'Follow every house rule below exactly; where rules disagree, the SEP14 rules win. '
    + 'Circumstances only: no strategy, sums insured or pricing.\n\n'
    + `===== HOUSE RULES =====\n${rules}\n\n`
    + 'OUTPUT SHAPE: {"clientName": string, "sections": [{"label": string, "value": string}, ...]}. '
    + 'The labels fill a Word template in document order, so use exactly these labels, in this order, each once '
    + `(a repeated label is the template's second occurrence):\n${JSON.stringify(labels)}\n`
    + 'Values: "\\n" splits paragraphs. A field with nothing known is "TBC". '
    + `Example of a finished file in the current house style (a different client; copy its form, never its facts):\n${example}`;
  const user = `Client: ${who(client)}. clientName must be "${notesName}". Meeting date: ${longDate(wb.meeting_date)}.`
    + `${extras(wb, known)}\n\nTRANSCRIPT:\n${wb.transcript}`;
  const text = await complete({
    messages: [{ role: 'system', content: system, cache: true }, { role: 'user', content: user }],
    json: true, maxTokens: 24000, effort: 'medium',
  });
  const data = parse(text, 'meeting notes');
  data.clientName = notesName;
  if (!Array.isArray(data.sections)) throw new Error('Meeting notes came back without sections');
  return data;
}

const FACT_FIND_RULES = `Rules, from the firm's Fact Find Process:
- "why", "story", goals and scope are written in the SECOND PERSON ("Jane and John, you wish to review...").
- Health status defaults to "Good" unless a condition was disclosed.
- A fact that should be known but wasn't said is "TBC" (it gets highlighted). A whole section the meeting never touched goes in not_disclosed, or "Not disclosed" in cells.
- Dates of birth are written "5 June 1982 (44)". Addresses are STREET on one line, then SUBURB STATE POSTCODE, uppercase.
- Money is "$270,000". Income, expense, asset and liability totals are added for you; do not add Total rows.
- For a single client give one name in "clients"; the partner column is dropped.
- Per-client tables are [label, client1, client2] for a couple and [label, client1] for a single client.`;

/** Stage 2: Fact Find data. */
export async function writeFactFind({ wb, client, known }) {
  requireAi();
  const schema = await docstringOf('generate_fact_find.py');
  const system = `${GENERAL}\n\nYou fill the firm's 2026 Fact Find from an initial meeting. `
    + `The document builder reads this JSON:\n${schema}\n\n${FACT_FIND_RULES}`;
  const user = `Client: ${who(client)}. Preferred names for the column headers: ${JSON.stringify(firstNamesOf(client))}. `
    + `full_names: ${JSON.stringify(fullNamesOf(client))}. date_completed: "${longDate(wb.meeting_date)}".`
    + (wb.cds_json ? `\n\nINITIAL MEETING NOTES ALREADY WRITTEN:\n${JSON.stringify(wb.cds_json)}` : '')
    + `${extras(wb, known)}\n\nTRANSCRIPT:\n${wb.transcript}`;
  const text = await complete({
    messages: [{ role: 'system', content: system, cache: true }, { role: 'user', content: user }],
    json: true, maxTokens: 32000, effort: 'medium',
  });
  return parse(text, 'fact find');
}

const SOA_NOTES_RULES = `The shape is the firm's own SOA Notes:
- brief: "Hey Howard," then what to quote (each cover, sum insured options, waiting and benefit periods, inside/outside super), as the adviser discussed in the meeting.
- to_obtain: existing policy schedules, super statements, quotes, Risk Researcher run, pre-assessments for any disclosed condition.
- outstanding: every TBC in the fact find, in plain words.
- circumstances: short shorthand list (incomes, property and debt, savings, super, estate).
- sections, in this order: Goals; Reasons for Seeking Advice; Insurance Review and Cover Discussion; Cover Funding; Health Disclosure; Advice and Recommendations. Write what the meeting actually established. Anything not yet decided is [ADVISER TO CONFIRM].`;

/** Stage 3: SOA Notes, the paraplanner brief. */
export async function writeSoaNotes({ wb, client }) {
  requireAi();
  const schema = await docstringOf('build_soa_notes.py');
  const system = `${GENERAL}\n\nYou write the draft SOA Notes: the adviser's brief to the paraplanner (Howard) and the notes the Statement of Advice is written from. `
    + `The document builder reads this JSON:\n${schema}\n\n${SOA_NOTES_RULES}`;
  const names = firstNamesOf(client).join(' and ');
  const user = `Client: ${who(client)}. title: "Statement of Advice Notes - ${names}".`
    + (wb.ff_json ? `\n\nFACT FIND:\n${JSON.stringify(wb.ff_json)}` : '')
    + (wb.cds_json ? `\n\nINITIAL MEETING NOTES:\n${JSON.stringify(wb.cds_json)}` : '')
    + `${extras(wb, '')}\n\nTRANSCRIPT:\n${wb.transcript || '(none)'}`;
  const text = await complete({
    messages: [{ role: 'system', content: system, cache: true }, { role: 'user', content: user }],
    json: true, maxTokens: 24000, effort: 'medium',
  });
  return parse(text, 'SOA Notes');
}

/** The adviser notes the risk SOA generator works from, built from the case. */
export function soaInstructions(wb, filed) {
  const parts = [];
  if (wb.soa_notes_json) parts.push(`SOA NOTES (the adviser's strategy and reasons):\n${JSON.stringify(wb.soa_notes_json)}`);
  if (wb.ff_json) parts.push(`FACT FIND:\n${JSON.stringify(wb.ff_json)}`);
  if (wb.adviser_notes) parts.push(`ADVISER NOTES:\n${wb.adviser_notes}`);
  if (filed) parts.push(`DOCUMENTS THE PARAPLANNER FILED (quotes, Risk Checklist, cover summary, research). Reconcile every premium against the quote; commission is disclosed per policy:\n${filed}`);
  return parts.join('\n\n');
}
