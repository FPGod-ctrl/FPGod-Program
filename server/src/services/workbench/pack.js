import fs from 'node:fs/promises';
import { createReadStream, constants as FS } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '../../config/env.js';
import { absolutePathOf, walkFiles, listDir, rootAvailable } from '../library/fsGuard.js';
import { sharepointFiles, caseFiles } from './sources.js';
import { DOWNLOADS, assertWritable, packNameOf, fullNamesOf, firstNamesOf, adviceYearOf } from './paths.js';
import { exportPdfs } from './run.js';

/**
 * SOA pack builder — the build-pack skill's rules, as a screen.
 *
 * CRITICAL: the SOA, Fact Find, application summaries and FSG are firm
 * documents. They are copied byte-for-byte and proven with a SHA-256 match
 * against the source. Nothing here opens, converts or edits them. The one
 * exception (Tristan, 22 Oct 2026): a firm document that exists only in Word
 * also gets a PDF exported next to the copy, opened read-only, and the .docx
 * hash is re-checked afterwards.
 *
 * Order: SOA, FSG, Fact Find, application summaries, cancellation letters /
 * change of servicing rights, PDS, FINAL Insurance Summaries, Risk Checklist.
 * No quotes. Numbered 01, 02 ... and re-stamped so Explorer's date sort matches.
 *
 * A rebuild replaces only the files an earlier build wrote (listed with their
 * full SHA-256 at the end of the READ ME) and only while they are unchanged.
 * Anything else in the folder (letters, a CvC, a file edited by hand) is left
 * alone and listed in the review list.
 */

export const SLOTS = [
  { key: 'soa', label: 'Statement of Advice', order: 1 },
  { key: 'fsg', label: 'FSG', order: 2 },
  { key: 'fact_find', label: 'Fact Find', order: 3 },
  { key: 'application', label: 'Application Summary', order: 4 },
  { key: 'letter', label: 'Cancellation / servicing letter', order: 5 },
  { key: 'form', label: 'Insurer form (only if required)', order: 6 },
  { key: 'pds', label: 'PDS', order: 7 },
  { key: 'final_summary', label: 'FINAL Insurance Summary', order: 8 },
  { key: 'risk_checklist', label: 'Risk Checklist', order: 9 },
];
const SLOT = Object.fromEntries(SLOTS.map((s) => [s.key, s]));

const INSURERS = ['TAL', 'MetLife', 'Zurich', 'AIA', 'NEOS', 'OnePath', 'MLC', 'ClearView', 'Encompass',
  'Resolution Life', 'BT', 'MLC Life', 'Integrity'];

const README = '0 - READ ME.txt';
const MANIFEST_HEADER = 'WORKBENCH FILES';
const IGNORED = (n) => /^~\$/.test(n) || /^(desktop\.ini|thumbs\.db|\.ds_store)$/i.test(n);

function slotOf(name) {
  const s = name.toLowerCase();
  if (/\bquote|quotation/.test(s)) return null;
  if (/soa notes|record of advice|\broa\b/.test(s)) return null;
  if (/risk checklist/.test(s)) return 'risk_checklist';
  if (/checklist/.test(s)) return null;
  if (/statement of advice|\bsoa\b/.test(s)) return 'soa';
  if (/\bfsg\b|financial services guide/.test(s)) return 'fsg';
  if (/fact ?find/.test(s)) return 'fact_find';
  if (/application ?summary|pre-?fill|applicationsummary/.test(s)) return 'application';
  if (/cancel|servicing rights|alteration letter/.test(s)) return 'letter';
  if (/\bpds\b|product disclosure/.test(s)) return 'pds';
  if (/insurance cover summary|final.*summary|\bcvc\b/.test(s)) return 'final_summary';
  return null;
}

/**
 * The FINAL Insurance Summary is the one-block CvC made for the cover being
 * proceeded with. The firm's own "Insurance Cover Summary" sheets usually hold
 * several options, so they are listed under the slot but never pre-ticked.
 */
const isFinalSummaryName = (name) => /\bfinal\b.*summary|\bcvc\b/i.test(name);

const insurerOf = (name) => INSURERS.find((i) => new RegExp(`\\b${i}\\b`, 'i').test(name)) || 'Insurer';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word, case-insensitive: "Jo" does not match "John". */
const hasWord = (hay, word) => Boolean(word)
  && new RegExp(`(^|[^\\p{L}])${escapeRe(word)}([^\\p{L}]|$)`, 'iu').test(hay);

/**
 * Whose document is this? A couple's documents are matched on first names, so
 * a same-surname partner is not named after the first person. Surnames decide
 * only when the couple's surnames differ and no first name settles it.
 * @returns {{who:string|null, sure:boolean}}
 */
export function personOf(name, client) {
  const fulls = fullNamesOf(client);
  if (fulls.length < 2) return { who: fulls[0], sure: true };
  const firsts = firstNamesOf(client);
  const lasts = fulls.map((f, i) => f.slice(firsts[i].length).trim());
  const n = name.replace(/\.[^.]+$/, '');
  const pick = (words) => words.map((w, i) => (hasWord(n, w) ? i : -1)).filter((i) => i >= 0);
  if (firsts[0].toLowerCase() !== firsts[1].toLowerCase()) {
    const byFirst = pick(firsts);
    if (byFirst.length === 1) return { who: fulls[byFirst[0]], sure: true };
    if (byFirst.length === 2) return { who: null, sure: false };
  }
  if (lasts[0].toLowerCase() !== lasts[1].toLowerCase()) {
    const byLast = pick(lasts);
    if (byLast.length === 1) return { who: fulls[byLast[0]], sure: true };
  }
  return { who: null, sure: false };
}

/** Strip `ext` from the end of `s` only if it is really there ("v9.1" is not an extension). */
const stripExt = (s, ext) => (ext && s.toLowerCase().endsWith(ext.toLowerCase()) ? s.slice(0, -ext.length) : s);
const base = (n) => n.replace(/\.[^.]+$/, '');
const cleanName = (s) => String(s).replace(/[<>:"/\\|?*]/g, '').trim();

const isCombinedFsg = (n) => /\bfsg combined\b|\bcombined fsg\b/i.test(n);
const isFsgPart1 = (n) => !isCombinedFsg(n) && /\bpart\s*(1|one)\b/i.test(n);
const isFsgPart2 = (n) => !isCombinedFsg(n) && /\bpart\s*(2|two)\b/i.test(n);

function fsgPackName(name) {
  if (isFsgPart1(name)) return 'FSG Part 1';
  if (isFsgPart2(name)) return 'FSG Part Two';
  return 'FSG';
}

/** The pack file name, without its number. */
function packName(slot, file, client) {
  const ext = path.extname(file.name).toLowerCase();
  const who = packNameOf(client);
  const person = () => personOf(file.name, client).who;
  switch (slot) {
    case 'soa': return `Statement of Advice - ${who}${ext}`;
    case 'fsg': return `${fsgPackName(file.name)}${ext}`;
    case 'fact_find': return `Fact Find - ${who}${ext}`;
    // Not sure whose it is: keep the firm's own name and let Tristan rename it.
    case 'application': return person() ? `${insurerOf(file.name)} Application Summary - Pre-Fill - ${person()}${ext}` : file.name;
    case 'final_summary': return person() ? `FINAL Insurance Summary - ${person()}${ext}` : file.name;
    case 'risk_checklist': return `Risk Checklist - ${who}${ext}`;
    default: return file.name;
  }
}

const PACKABLE = new Set(['.pdf', '.docx', '.doc', '.xlsx']);

// ---------------------------------------------------------------------------
// FSG: the pack adviser's own, from legacy/advisers/<slug>/. Chosen by file
// name only; the PDFs are never opened here.
// ---------------------------------------------------------------------------

export const ADVISERS_DIR = 'advisers';
export const adviserSlugOf = (name) =>
  String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Every SOA from 23 Oct 2026 goes out under the configured adviser (Tristan). */
export const packAdviser = () => env.adviser.name;
const adviserRel = () => path.join(ADVISERS_DIR, adviserSlugOf(packAdviser()));

/** Is this repo path inside the pack adviser's own folder (and nobody else's)? */
export function isAdviserFile(relPath) {
  const slug = adviserSlugOf(packAdviser());
  if (!slug) return false;
  const norm = (s) => path.normalize(String(s || '')).toLowerCase();
  const p = norm(relPath);
  return !p.split(path.sep).includes('..') && p.startsWith(norm(adviserRel()) + path.sep);
}

/** Surnames of the other advisers with a folder in legacy/advisers/. */
async function otherAdviserSurnames() {
  const own = adviserSlugOf(packAdviser());
  const dirs = await listDir('repo', ADVISERS_DIR).catch(() => []);
  return dirs.filter((d) => d.isDir && d.name.toLowerCase() !== own)
    .map((d) => d.name.split('-').pop())
    .filter((s) => s && s.length > 2);
}

const yearIn = (n) => Math.max(0, ...[...String(n).matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])));
const newestFirst = (a, b) => yearIn(b.name) - yearIn(a.name) || new Date(b.modified) - new Date(a.modified);

async function adviserFsgs() {
  if (!adviserSlugOf(packAdviser())) return [];
  const rel = adviserRel();
  const files = await walkFiles('repo', rel, { maxDepth: 0, maxFiles: 200 }).catch(() => []);
  return files
    .filter((f) => /\bfsg\b|financial services guide/i.test(f.name) && /\.pdf$/i.test(f.name))
    .map((f) => ({
      source: 'repo', name: f.name, relPath: f.relPath, within: path.join('legacy', f.relPath),
      ext: '.pdf', size: f.size, modified: f.modified, adviserFile: true,
    }));
}

/** Default: the combined FSG; else Part 1 + Part Two; else the newest one. */
function chooseAdviserFsg(list) {
  const combined = list.filter((f) => isCombinedFsg(f.name)).sort(newestFirst);
  if (combined.length) return [combined[0]];
  const p1 = list.filter((f) => isFsgPart1(f.name)).sort(newestFirst)[0];
  const p2 = list.filter((f) => isFsgPart2(f.name)).sort(newestFirst)[0];
  if (p1 || p2) return [p1, p2].filter(Boolean);
  return list.length ? [[...list].sort(newestFirst)[0]] : [];
}

/** Newest FSGs in the firm's Compliance folder: a fallback only. */
async function fsgCandidates() {
  if (!(await rootAvailable('sharepoint'))) return [];
  const files = await walkFiles('sharepoint', 'Compliance', { maxDepth: 4, maxFiles: 800 }).catch(() => []);
  return files
    .filter((f) => /\bfsg\b|financial services guide/i.test(f.name) && /\.pdf$/i.test(f.name))
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 6)
    .map((f) => ({ source: 'sharepoint', name: f.name, relPath: f.relPath, within: f.relPath, ext: '.pdf', size: f.size, modified: f.modified }));
}

export const isDownloadsPdsName = (n) => /\bpds\b|product disclosure/i.test(n) && /\.pdf$/i.test(n);

/** PDS copies Tristan keeps in Downloads (the template library's are often superseded). */
async function downloadsPds() {
  try {
    const names = await fs.readdir(DOWNLOADS);
    const out = [];
    for (const n of names) {
      if (!isDownloadsPdsName(n)) continue;
      const st = await fs.stat(path.join(DOWNLOADS, n));
      if (st.isFile()) out.push({ source: 'downloads', name: n, relPath: n, within: `Downloads\\${n}`, ext: '.pdf', size: st.size, modified: st.mtime });
    }
    return out.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  } catch {
    return [];
  }
}

/**
 * Suggest a pack from what is in the client's folder: the current year's
 * advice folder first, newest version of each single document, every
 * application summary and FINAL summary. Everything is editable on screen.
 */
export async function packCandidates(wb, client) {
  const year = adviceYearOf(wb);
  const sp = await sharepointFiles(wb.sharepoint_folder);
  const repo = await caseFiles(wb);
  const own = await adviserFsgs();
  const others = await otherAdviserSurnames();
  const inYear = (f) => !f.year || f.year >= year - 1;
  const pool = [...sp.files.filter(inYear), ...repo, ...own, ...(await fsgCandidates()), ...(await downloadsPds())]
    .filter((f) => PACKABLE.has(f.ext));

  const items = pool.map((f) => {
    const slot = slotOf(f.name);
    const item = { ...f, slot, packName: slot ? packName(slot, f, client) : f.name, include: false, note: null };
    if (['application', 'final_summary'].includes(slot) && !personOf(f.name, client).sure) {
      item.note = `Could not tell whose this is (${fullNamesOf(client).join(' / ')}). Kept the original name; rename it.`;
    } else if (slot === 'final_summary' && !isFinalSummaryName(f.name)) {
      item.note = 'Firm summary sheet, which can hold several options. Not ticked: use it only if it is the FINAL one.';
    } else if (slot === 'fsg' && others.some((s) => hasWord(f.name, s))) {
      item.note = 'Names another adviser. It cannot go in this pack.';
    } else if (slot === 'fsg' && !f.adviserFile) {
      item.note = `Fallback: not from legacy\\${adviserRel()}.`;
    }
    return item;
  });

  // Pre-tick: one of each single document (newest .docx and/or .pdf of the
  // same base name) from the client's SharePoint folder.
  for (const slot of ['soa', 'fact_find', 'risk_checklist']) {
    const hits = items.filter((i) => i.slot === slot && i.source === 'sharepoint' && i.year >= year)
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
    if (!hits.length) continue;
    const pick = base(hits[0].name);
    hits.filter((h) => base(h.name) === pick).forEach((h) => { h.include = true; });
  }

  // FSG: the adviser's own, from legacy/advisers/<slug>/. Another adviser's FSG
  // must never go out. SharePoint FSGs are a fallback, ticked only when they
  // name this adviser and no other.
  const ownPicks = chooseAdviserFsg(items.filter((i) => i.slot === 'fsg' && i.adviserFile));
  if (ownPicks.length) {
    ownPicks.forEach((i) => { i.include = true; });
  } else {
    const surname = String(packAdviser() || '').split(/\s+/).pop();
    const fallback = items
      .filter((i) => i.slot === 'fsg' && !i.adviserFile && surname && hasWord(i.name, surname)
        && !others.some((s) => hasWord(i.name, s)))
      .sort((a, b) => (/v?9\.1/.test(b.name) ? 1 : 0) - (/v?9\.1/.test(a.name) ? 1 : 0)
        || new Date(b.modified) - new Date(a.modified));
    if (fallback[0]) fallback[0].include = true;
  }

  // Applications, letters and FINAL summaries: PDFs in this year's Compliance
  // docs folder, newest per pack name (older drafts sit in Research).
  const seen = new Set();
  items
    .filter((i) => ['application', 'letter', 'final_summary'].includes(i.slot) && i.source === 'sharepoint'
      && i.year >= year && i.ext === '.pdf' && /2\. compliance docs/i.test(i.relPath))
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .forEach((i) => {
      if (i.slot === 'application' && /^insurer /i.test(i.packName)) return; // unknown insurer: let Tristan decide
      if (['application', 'final_summary'].includes(i.slot) && !personOf(i.name, client).sure) return; // whose?
      if (i.slot === 'final_summary' && !isFinalSummaryName(i.name)) return; // multi-option sheet
      // Same document, re-dated: "2026.10.15 FINAL Insurance Summary - Citizen, Jane".
      const k = base(i.name).replace(/^[\d.\s-]+/, '').toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      i.include = true;
    });
  items.sort((a, b) => (SLOT[a.slot]?.order ?? 99) - (SLOT[b.slot]?.order ?? 99) || new Date(b.modified) - new Date(a.modified));

  return {
    slots: SLOTS,
    packFolder: `${packNameOf(client)} - SOA Pack`,
    downloads: DOWNLOADS,
    adviser: { name: packAdviser(), folder: path.join('legacy', adviserRel()), fsgs: own.length },
    sharepoint: { available: sp.available, linked: sp.linked, missing: sp.missing || false },
    items,
  };
}

function sourcePath(item) {
  if (item.source === 'sharepoint' || item.source === 'repo') return absolutePathOf(item.source, item.relPath);
  if (item.source === 'downloads') {
    const p = path.resolve(DOWNLOADS, item.relPath);
    if (path.dirname(p).toLowerCase() !== path.resolve(DOWNLOADS).toLowerCase()) throw new Error('Bad Downloads path');
    return p;
  }
  throw new Error(`Unknown source ${item.source}`);
}

const sha256 = (p) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    createReadStream(p).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex').toUpperCase())).on('error', reject);
  });

const FIRM_DOCS = new Set(['soa', 'fsg', 'fact_find', 'application', 'risk_checklist', 'final_summary']);

const exists = (p) => fs.stat(p).then((s) => s.isFile(), () => false);

/** Files the last build wrote, from the manifest at the end of its READ ME. */
async function previousBuild(outDir) {
  let text;
  try {
    text = await fs.readFile(path.join(outDir, README), 'utf8');
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith(MANIFEST_HEADER));
  if (at < 0) return [];
  const out = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^\s+([0-9A-F]{64})\s{2}(.+?)\s*$/.exec(l);
    if (!m) break;
    // Plain names in this folder only.
    if (path.basename(m[2]) === m[2] && m[2] !== README && !m[2].startsWith('.')) out.push({ sha256: m[1], name: m[2] });
  }
  return out;
}

/**
 * Build the pack into Downloads\<Name> - SOA Pack\.
 * @param {{items:{source,relPath,name,slot,packName}[], makePdfs:boolean}} opts
 */
export async function buildPack(wb, client, { items, makePdfs = true, onStep } = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Pick at least one document for the pack');
  const others = await otherAdviserSurnames();
  for (const it of items) {
    if (it.slot === 'fsg') {
      const hit = others.find((s) => hasWord(it.name, s));
      if (hit) throw new Error(`${it.name} looks like another adviser's FSG (${hit}). It cannot go out in this pack.`);
    }
  }

  const folder = `${packNameOf(client)} - SOA Pack`;
  const outDir = assertWritable(path.join(DOWNLOADS, folder));
  await fs.mkdir(outDir, { recursive: true });
  const review = [];

  // Clear out only what the last build wrote, and only while it is unchanged.
  // Letters, a CvC or anything else added or edited by hand stays put.
  for (const prev of await previousBuild(outDir)) {
    const p = path.join(outDir, prev.name);
    if (!(await exists(p))) continue;
    if ((await sha256(p)) === prev.sha256) await fs.unlink(assertWritable(p));
    else review.push(`${prev.name} was changed after the last build, so it was kept as it is.`);
  }

  // Number in pack order; the .docx and .pdf of one document share a number
  // wherever they sit in the list.
  const groupOf = (it) => `${it.slot}|${base(it.name).toLowerCase()}`;
  const indexed = items.map((it, idx) => ({ it, idx }))
    .sort((a, b) => (SLOT[a.it.slot]?.order ?? 50) - (SLOT[b.it.slot]?.order ?? 50) || a.idx - b.idx);
  const groupNum = new Map();
  for (const { it } of indexed) if (!groupNum.has(groupOf(it))) groupNum.set(groupOf(it), groupNum.size + 1);
  indexed.sort((a, b) => groupNum.get(groupOf(a.it)) - groupNum.get(groupOf(b.it)) || a.idx - b.idx);

  const copied = [];
  const groupBase = new Map();
  const usedBase = new Set();
  const usedFile = new Set();
  for (const { it } of indexed) {
    const g = groupOf(it);
    const ext = path.extname(it.name).toLowerCase();
    if (!groupBase.has(g)) {
      const want = cleanName(stripExt(it.packName || it.name, ext)) || cleanName(base(it.name));
      let b = want;
      // Two documents given the same pack name must not overwrite each other.
      for (let k = 2; usedBase.has(b.toLowerCase()); k++) b = `${want} (${k})`;
      usedBase.add(b.toLowerCase());
      groupBase.set(g, b);
    }
    let label = `${groupBase.get(g)}${ext}`;
    for (let k = 2; usedFile.has(label.toLowerCase()); k++) label = `${groupBase.get(g)} (${k})${ext}`;
    usedFile.add(label.toLowerCase());

    const num = String(groupNum.get(g)).padStart(2, '0');
    const name = `${num} - ${label}`;
    const src = sourcePath(it);
    const dst = assertWritable(path.join(outDir, name));
    const a = await sha256(src);
    if (await exists(dst)) {
      // Not ours (ours were cleared above). Same bytes: take it as the copy.
      // Different: someone put or edited it there. Leave it.
      if ((await sha256(dst)) !== a) {
        review.push(`Not written: ${name} is already in the pack folder and differs from ${it.within || it.relPath}. Your file was kept; delete it and rebuild for a fresh copy.`);
        continue;
      }
    } else {
      onStep?.(`Copying ${name}`);
      await fs.copyFile(src, dst, FS.COPYFILE_EXCL);
    }
    const b = await sha256(dst);
    if (a !== b) throw new Error(`Hash mismatch copying ${name}`);
    const st = await fs.stat(src);
    copied.push({ name, group: g, slot: it.slot, source: it.within || it.relPath, sha256: b, srcModified: st.mtime });

    // Review lines that hang off a single item.
    if (it.slot === 'fsg' && !(it.source === 'repo' && isAdviserFile(it.relPath))) {
      review.push(`${name} came from ${it.within || it.relPath}, not from legacy\\${adviserRel()} (fallback). Check it is ${packAdviser()}'s current FSG.`);
    }
    if (['application', 'final_summary'].includes(it.slot) && !personOf(it.name, client).sure
      && (it.packName || it.name) === it.name) {
      review.push(`${name}: could not tell whether it is for ${fullNamesOf(client).join(' or ')}, so it kept its original name. Rename it.`);
    }
    if (it.slot === 'final_summary' && !isFinalSummaryName(it.name)) {
      review.push(`${name} is the firm's Insurance Cover Summary, which can hold several options. Check it is the FINAL one.`);
    }
  }

  // Stale-PDF check: a PDF older than the .docx it was exported from.
  for (const c of copied.filter((x) => /\.pdf$/i.test(x.name))) {
    const docx = copied.find((x) => x.group === c.group && /\.docx$/i.test(x.name));
    if (docx && new Date(c.srcModified) < new Date(docx.srcModified)) {
      review.push(`${c.name} is older than its .docx in the client folder; it was copied as is. Check it matches.`);
    }
  }

  // PDF next to every Word-only firm document.
  const pdfs = [];
  if (makePdfs) {
    const wordOnly = [];
    for (const c of copied.filter((x) => /\.docx$/i.test(x.name) && !copied.some((y) => y.group === x.group && /\.pdf$/i.test(y.name)))) {
      const pdf = c.name.replace(/\.docx$/i, '.pdf');
      if (await exists(path.join(outDir, pdf))) {
        review.push(`No PDF exported for ${c.name}: ${pdf} is already in the pack folder and was kept.`);
      } else {
        wordOnly.push(c);
      }
    }
    if (wordOnly.length) {
      onStep?.('Exporting PDFs of Word-only documents');
      const { pdfs: made, warnings } = await exportPdfs(wordOnly.map((c) => path.join(outDir, c.name)));
      review.push(...warnings);
      for (const c of wordOnly) {
        if ((await sha256(path.join(outDir, c.name))) !== c.sha256) throw new Error(`${c.name} changed during PDF export`);
      }
      for (const p of made) {
        const n = path.basename(p);
        pdfs.push({ name: n, sha256: await sha256(path.join(outDir, n)) });
      }
    }
  }

  const slotsUsed = new Set(copied.map((c) => c.slot));
  if (!slotsUsed.has('soa')) review.push('No Statement of Advice in the pack.');
  if (!slotsUsed.has('fsg')) review.push(`No FSG in the pack. Use ${packAdviser()}'s from legacy\\${adviserRel()} (2026 FSG is v9.1).`);
  if (!slotsUsed.has('fact_find')) review.push('No Fact Find in the pack.');
  if (!slotsUsed.has('application')) review.push('No insurer application summaries in the pack.');

  // Everything else in the folder: kept, but Tristan should know it is there.
  const written = new Set([README, ...copied.map((c) => c.name), ...pdfs.map((p) => p.name)].map((n) => n.toLowerCase()));
  const extras = [];
  for (const e of await fs.readdir(outDir, { withFileTypes: true })) {
    if (e.isFile() && !IGNORED(e.name) && !written.has(e.name.toLowerCase())) extras.push(e.name);
  }
  extras.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  for (const x of extras) {
    review.push(`Extra file in the pack folder, not written by this build: ${x}. It was left as it is; check it belongs in the pack and that its number fits.`);
  }

  review.push('Generated items are not built here: cancellation / alteration letters, Change of Servicing Rights and the FINAL Insurance Summary / CvC. Add them if this advice needs them.');
  review.push('FINAL Insurance Summaries and the Risk Checklist stay OUT of the DocuSign envelope; send the summaries to the clients directly.');

  const people = fullNamesOf(client);
  const readme = [
    `${folder}`,
    `Built ${new Date().toLocaleString('en-AU')} by the FPGod workbench for ${env.firm.name}.`,
    '',
    'CONTENTS',
    ...copied.map((c) => `  ${c.name}`),
    ...pdfs.map((p) => `  ${p.name}  (PDF of the Word copy, exported read-only)`),
    ...extras.map((x) => `  ${x}  (already in the folder; not written by this build)`),
    '',
    'DOCUSIGN',
    `  Signers: ${people.join(', ')}.`,
    '  Envelope: the numbered documents up to and including the PDS. Leave out the FINAL Insurance Summaries and the Risk Checklist.',
    '  Signing: the SOA Authority to Proceed (includes commission consent) and each application summary for the life insured named on it.',
    '',
    'FIRM DOCUMENTS: PLAIN COPIES, SHA-256 MATCHED TO SOURCE',
    ...copied.filter((c) => FIRM_DOCS.has(c.slot)).map((c) => `  ${c.sha256.slice(0, 16)}  ${c.name}\r\n      from ${c.source}`),
    '',
    'REVIEW LIST',
    ...review.map((r) => `  - ${r}`),
    '',
    `${MANIFEST_HEADER} (full SHA-256; a rebuild replaces only these, and only while unchanged)`,
    ...[...copied, ...pdfs].map((c) => `  ${c.sha256}  ${c.name}`),
    '',
  ].join('\r\n');
  await fs.writeFile(assertWritable(path.join(outDir, README)), readme, 'utf8');

  // Stamp modified times so Explorer's date sort (newest first) gives READ ME,
  // 01, 02 ... Kept files are re-dated too (contents untouched) so they sit in
  // their place by name.
  const all = (await fs.readdir(outDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && !IGNORED(e.name)).map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const now = Date.now();
  for (const [i, f] of all.entries()) {
    const t = new Date(now - i * 10000);
    try {
      await fs.utimes(path.join(outDir, f), t, t);
    } catch {
      review.push(`Could not re-date ${f} (open in another program?).`);
    }
  }

  return { outDir, files: all, copied, pdfs: pdfs.map((p) => p.name), extras, review };
}
