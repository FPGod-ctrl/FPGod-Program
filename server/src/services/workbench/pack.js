import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '../../config/env.js';
import { absolutePathOf, walkFiles, rootAvailable } from '../library/fsGuard.js';
import { sharepointFiles, caseFiles } from './sources.js';
import { DOWNLOADS, assertWritable, packNameOf, fullNamesOf, adviceYearOf } from './paths.js';
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
  if (/risk checklist/.test(s)) return 'risk_checklist';
  return null;
}

const insurerOf = (name) => INSURERS.find((i) => new RegExp(`\\b${i}\\b`, 'i').test(name)) || 'Insurer';

function personOf(name, client) {
  const n = name.toLowerCase();
  return fullNamesOf(client).find((full) => full.split(' ').some((part) => part.length > 2 && n.includes(part.toLowerCase())))
    || fullNamesOf(client)[0];
}

const base = (n) => n.replace(/\.[^.]+$/, '');

/** The pack file name, without its number. */
function packName(slot, file, client) {
  const ext = path.extname(file.name).toLowerCase();
  const who = packNameOf(client);
  switch (slot) {
    case 'soa': return `Statement of Advice - ${who}${ext}`;
    case 'fsg': return `FSG${ext}`;
    case 'fact_find': return `Fact Find - ${who}${ext}`;
    case 'application': return `${insurerOf(file.name)} Application Summary - Pre-Fill - ${personOf(file.name, client)}${ext}`;
    case 'final_summary': return `FINAL Insurance Summary - ${personOf(file.name, client)}${ext}`;
    case 'risk_checklist': return `Risk Checklist - ${who}${ext}`;
    default: return file.name;
  }
}

const PACKABLE = new Set(['.pdf', '.docx', '.doc', '.xlsx']);

/** Newest FSG in the firm's Compliance folder (the 2026 FSG is v9.1). */
async function fsgCandidates() {
  if (!(await rootAvailable('sharepoint'))) return [];
  const files = await walkFiles('sharepoint', 'Compliance', { maxDepth: 4, maxFiles: 800 }).catch(() => []);
  return files
    .filter((f) => /\bfsg\b|financial services guide/i.test(f.name) && /\.pdf$/i.test(f.name))
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 6)
    .map((f) => ({ source: 'sharepoint', name: f.name, relPath: f.relPath, within: f.relPath, ext: '.pdf', size: f.size, modified: f.modified }));
}

/** PDS copies Tristan keeps in Downloads (the template library's are often superseded). */
async function downloadsPds() {
  try {
    const names = await fs.readdir(DOWNLOADS);
    const out = [];
    for (const n of names) {
      if (!/\bpds\b|product disclosure/i.test(n) || !/\.pdf$/i.test(n)) continue;
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
  const inYear = (f) => !f.year || f.year >= year - 1;
  const pool = [...sp.files.filter(inYear), ...repo, ...(await fsgCandidates()), ...(await downloadsPds())]
    .filter((f) => PACKABLE.has(f.ext));

  const items = pool.map((f) => {
    const slot = slotOf(f.name);
    return { ...f, slot, packName: slot ? packName(slot, f, client) : f.name, include: false };
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
  // FSG: the adviser's own, current one. Another adviser's FSG must never go out.
  const adviser = String(wb.adviser || env.adviser.name || '').split(/\s+/).pop().toLowerCase();
  const fsgScore = (f) => (f.source === 'sharepoint' && !/^compliance[\\/]/i.test(f.relPath) && /\b20\d\d fsg\b/i.test(f.name) ? 4 : 0)
    + (adviser && f.name.toLowerCase().includes(adviser) ? 2 : 0)
    + (/v?9\.1/.test(f.name) ? 1 : 0);
  const fsgs = items.filter((i) => i.slot === 'fsg').sort((a, b) => fsgScore(b) - fsgScore(a) || new Date(b.modified) - new Date(a.modified));
  if (fsgs[0] && fsgScore(fsgs[0]) >= 2) fsgs[0].include = true;
  // Applications, letters and FINAL summaries: PDFs in this year's Compliance
  // docs folder, newest per pack name (older drafts sit in Research).
  const seen = new Set();
  items
    .filter((i) => ['application', 'letter', 'final_summary'].includes(i.slot) && i.source === 'sharepoint'
      && i.year >= year && i.ext === '.pdf' && /2\. compliance docs/i.test(i.relPath))
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .forEach((i) => {
      // Same document, re-dated: "2026.10.15 Insurance Cover Summary - Citizen, Jane".
      const k = base(i.name).replace(/^[\d.\s-]+/, '').toLowerCase();
      if (i.slot === 'application' && /^insurer /i.test(i.packName)) return; // unknown insurer: let Tristan decide
      if (seen.has(k)) return;
      seen.add(k);
      i.include = true;
    });
  items.sort((a, b) => (SLOT[a.slot]?.order ?? 99) - (SLOT[b.slot]?.order ?? 99) || new Date(b.modified) - new Date(a.modified));

  return {
    slots: SLOTS,
    packFolder: `${packNameOf(client)} - SOA Pack`,
    downloads: DOWNLOADS,
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

/**
 * Build the pack into Downloads\<Name> - SOA Pack\.
 * @param {{items:{source,relPath,name,slot,packName}[], makePdfs:boolean}} opts
 */
export async function buildPack(wb, client, { items, makePdfs = true, onStep } = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Pick at least one document for the pack');
  const folder = `${packNameOf(client)} - SOA Pack`;
  const outDir = assertWritable(path.join(DOWNLOADS, folder));
  await fs.mkdir(outDir, { recursive: true });
  // Start clean: this folder is the workbench's own output.
  for (const n of await fs.readdir(outDir)) {
    const p = path.join(outDir, n);
    if ((await fs.stat(p)).isFile()) await fs.unlink(assertWritable(p));
  }

  // Number in pack order; a .docx and .pdf of the same document share a number.
  const ordered = [...items].sort((a, b) => (SLOT[a.slot]?.order ?? 50) - (SLOT[b.slot]?.order ?? 50));
  let n = 0;
  let lastKey = null;
  const copied = [];
  const review = [];
  const used = new Set();
  for (const it of ordered) {
    // The .docx and .pdf of one source document share a number.
    const key = `${it.slot}|${base(it.name)}`;
    if (key !== lastKey) n += 1;
    lastKey = key;
    const num = String(n).padStart(2, '0');
    const src = sourcePath(it);
    let label = (it.packName || it.name).replace(/[<>:"/\\|?*]/g, '');
    // Two documents given the same pack name must not overwrite each other.
    for (let k = 2; used.has(label.toLowerCase()); k++) {
      label = `${base(it.packName || it.name)} (${k})${path.extname(it.name)}`.replace(/[<>:"/\\|?*]/g, '');
    }
    used.add(label.toLowerCase());
    const name = `${num} - ${label}`;
    const dst = assertWritable(path.join(outDir, name));
    onStep?.(`Copying ${name}`);
    await fs.copyFile(src, dst);
    const [a, b] = await Promise.all([sha256(src), sha256(dst)]);
    if (a !== b) throw new Error(`Hash mismatch copying ${name}`);
    const st = await fs.stat(src);
    copied.push({ name, slot: it.slot, source: it.within || it.relPath, sha256: b, srcModified: st.mtime });
  }

  // Stale-PDF check: a PDF older than the .docx it was exported from.
  for (const c of copied.filter((x) => x.name.endsWith('.pdf'))) {
    const docx = copied.find((x) => x.name === c.name.replace(/\.pdf$/, '.docx'));
    if (docx && new Date(c.srcModified) < new Date(docx.srcModified)) {
      review.push(`${c.name} is older than its .docx in the client folder; it was copied as is. Check it matches.`);
    }
  }

  // PDF next to every Word-only firm document.
  const pdfs = [];
  if (makePdfs) {
    const wordOnly = copied.filter((c) => /\.docx$/i.test(c.name)
      && !copied.some((x) => x.name === c.name.replace(/\.docx$/i, '.pdf')));
    if (wordOnly.length) {
      onStep?.('Exporting PDFs of Word-only documents');
      const { pdfs: made, warnings } = await exportPdfs(wordOnly.map((c) => path.join(outDir, c.name)));
      review.push(...warnings);
      for (const c of wordOnly) {
        if ((await sha256(path.join(outDir, c.name))) !== c.sha256) throw new Error(`${c.name} changed during PDF export`);
      }
      pdfs.push(...made.map((p) => path.basename(p)));
    }
  }

  const slotsUsed = new Set(copied.map((c) => c.slot));
  if (!slotsUsed.has('soa')) review.push('No Statement of Advice in the pack.');
  if (!slotsUsed.has('fsg')) review.push('No FSG in the pack (2026 FSG is v9.1).');
  if (!slotsUsed.has('fact_find')) review.push('No Fact Find in the pack.');
  if (!slotsUsed.has('application')) review.push('No insurer application summaries in the pack.');
  review.push('Generated items are not built here: cancellation / alteration letters, Change of Servicing Rights and the FINAL Insurance Summary / CvC. Add them if this advice needs them.');
  review.push('FINAL Insurance Summaries and the Risk Checklist stay OUT of the DocuSign envelope; send the summaries to the clients directly.');

  const people = fullNamesOf(client);
  const readme = [
    `${folder}`,
    `Built ${new Date().toLocaleString('en-AU')} by the FPGod workbench for ${env.firm.name}.`,
    '',
    'CONTENTS',
    ...copied.map((c) => `  ${c.name}`),
    ...pdfs.map((p) => `  ${p}  (PDF of the Word copy, exported read-only)`),
    '',
    'DOCUSIGN',
    `  Signers: ${people.join(', ')}.`,
    '  Envelope: the numbered documents up to and including the PDS. Leave out the FINAL Insurance Summaries and the Risk Checklist.',
    '  Signing: the SOA Authority to Proceed (includes commission consent) and each application summary for the life insured named on it.',
    '',
    'FIRM DOCUMENTS: PLAIN COPIES, SHA-256 MATCHED TO SOURCE',
    ...copied.filter((c) => FIRM_DOCS.has(c.slot)).map((c) => `  ${c.sha256.slice(0, 16)}  ${c.name}\n      from ${c.source}`),
    '',
    'REVIEW LIST',
    ...review.map((r) => `  - ${r}`),
    '',
  ].join('\r\n');
  await fs.writeFile(assertWritable(path.join(outDir, '0 - READ ME.txt')), readme, 'utf8');

  // Stamp modified times so Explorer's date sort (newest first) gives READ ME, 01, 02 ...
  const all = (await fs.readdir(outDir)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const now = Date.now();
  for (const [i, f] of all.entries()) {
    const t = new Date(now - i * 10000);
    await fs.utimes(path.join(outDir, f), t, t);
  }

  return { outDir, files: all, copied, pdfs, review };
}
