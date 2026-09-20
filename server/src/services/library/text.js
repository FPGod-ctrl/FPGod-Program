import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { readFileBuffer } from './fsGuard.js';
import { extractText } from '../documentExtractor.js';

/**
 * Getting the words out of a client's files.
 *
 * This is the only place that opens a library file, and every read is cached in
 * `library_file_text`. That matters more than usual here: the SharePoint files
 * are OneDrive placeholders, so a first read downloads the file. Re-reading an
 * unchanged file would mean downloading a client's whole history again on every
 * follow-up question.
 */

/**
 * Which files answer questions about a client, best first.
 *
 * The order is the adviser's, not alphabetical: SOA Notes carry the reasoning,
 * the Risk Checklist carries the final products and premiums, the Cover Summary
 * carries what they hold. A PDS or FSG is product literature that says nothing
 * about this client, so it is never read.
 */
const PRIORITY = [
  'soa-notes',
  'risk-checklist',
  'cover-summary',
  'meeting-notes',
  'fact-find',
  'schedule',
  'premium',
  'soa',
  'application',
  'research',
  'policy-doc',
  'authority',
  'other',
];

const NEVER_READ = new Set(['product']);
const READABLE_EXT = new Set(['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.xlsm', '.csv', '.txt', '.md', '.json']);

const rank = (cat) => {
  const i = PRIORITY.indexOf(cat);
  return i === -1 ? PRIORITY.length : i;
};

/**
 * Pick the files worth reading for this client.
 * Newest advice year first, then by what the file is.
 */
export async function selectFiles(clientId, { max = env.library.maxFilesPerAsk } = {}) {
  const { rows } = await query('SELECT * FROM library_files WHERE client_id = $1', [clientId]);
  const usable = rows.filter(
    (f) =>
      !NEVER_READ.has(f.category) &&
      READABLE_EXT.has((f.ext || '').toLowerCase()) &&
      Number(f.size_bytes) > 0 &&
      Number(f.size_bytes) <= env.library.maxFileBytes
  );
  usable.sort((a, b) => {
    const ay = b.advice_year || 0, by = a.advice_year || 0;
    if (ay !== by) return ay - by;
    const ar = rank(a.category) - rank(b.category);
    if (ar !== 0) return ar;
    return new Date(b.modified_at || 0) - new Date(a.modified_at || 0);
  });
  return usable.slice(0, max);
}

/** Cached text for one file, extracting (and downloading) only if it changed. */
async function textFor(source, file) {
  const { rows } = await query('SELECT * FROM library_file_text WHERE file_id = $1', [file.id]);
  const cached = rows[0];
  const unchanged =
    cached &&
    Number(cached.src_size) === Number(file.size_bytes) &&
    new Date(cached.src_modified).getTime() === new Date(file.modified_at).getTime();
  if (unchanged) return { text: cached.text || '', error: cached.error, cached: true };

  let text = '';
  let error = null;
  try {
    const buf = await readFileBuffer(source, file.rel_path);
    text = await extractText(buf, '', file.name);
  } catch (err) {
    error = err.message;
  }

  await query(
    `INSERT INTO library_file_text (file_id, text, chars, src_size, src_modified, error, extracted_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (file_id) DO UPDATE
       SET text = EXCLUDED.text, chars = EXCLUDED.chars, src_size = EXCLUDED.src_size,
           src_modified = EXCLUDED.src_modified, error = EXCLUDED.error, extracted_at = now()`,
    [file.id, text, text.length, file.size_bytes, file.modified_at, error]
  );
  return { text, error, cached: false };
}

const PER_FILE_CHARS = 30000;

/**
 * Read the selected files into one context bundle, within a character budget.
 * @param {{source:string}} client
 * @param {object[]} files
 * @param {(p:object)=>void} [onProgress]
 */
export async function gatherContext(client, files, onProgress) {
  const parts = [];
  const used = [];
  let budget = env.library.maxContextChars;

  for (const [i, file] of files.entries()) {
    if (budget <= 0) break;
    onProgress?.({ step: 'reading', done: i, total: files.length, file: file.name });
    const { text, error, cached } = await textFor(client.source, file);
    if (error || !text.trim()) {
      used.push({ ...file, chars: 0, skipped: error || 'no text' });
      continue;
    }
    const slice = text.length > PER_FILE_CHARS ? `${text.slice(0, PER_FILE_CHARS)}\n…[truncated]` : text;
    const body = slice.slice(0, budget);
    budget -= body.length;
    parts.push(
      `### ${file.name}\n(${file.category}${file.advice_year ? `, ${file.advice_year}` : ''} — ${file.rel_path})\n\n${body}`
    );
    used.push({ ...file, chars: body.length, cached });
  }
  onProgress?.({ step: 'reading', done: files.length, total: files.length });
  return { text: parts.join('\n\n---\n\n'), files: used };
}

export default { selectFiles, gatherContext, PRIORITY };
