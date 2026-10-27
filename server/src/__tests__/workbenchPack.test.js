import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Everything lives in a temp folder: a fake repo legacy/ root, a fake
// SharePoint library and a fake Downloads. Fictional people only. PDF export
// is always off (makePdfs: false) so Word is never started.
// Long-form path: fsGuard re-checks containment after realpath, and Windows'
// temp dir can come back in 8.3 short form (C:\Users\ABCDEF~1\...).
const TMP = path.join(realpathSync.native(os.tmpdir()), `fpgod-pack-test-${process.pid}-${Date.now()}`);
const LEGACY = path.join(TMP, 'legacy');
const SP = path.join(TMP, 'sharepoint');
const DL = path.join(TMP, 'downloads');
process.env.LEGACY_REPO_ROOT = LEGACY;
process.env.LEGACY_LIBRARY_ROOT = SP;
process.env.LEGACY_LIBRARY_CLIENTS_DIR = 'Clients';
process.env.WORKBENCH_DOWNLOADS = DL;
process.env.ADVISER_NAME = 'Alex Example';

let pack;
const couple = { first_name: 'Jane', last_name: 'Citizen', partner_first_name: 'John', partner_last_name: 'Citizen' };
const mixed = { first_name: 'Jane', last_name: 'Citizen', partner_first_name: 'Sam', partner_last_name: 'Sample' };
const wb = { case_name: 'Citizen, Jane & John', sharepoint_folder: 'Citizen, Jane & John', meeting_date: '2026-10-01' };
const ADV = path.join(LEGACY, 'advisers', 'alex-example');
const OTHER = path.join(LEGACY, 'advisers', 'pat-otheradviser');
const CASE = path.join(LEGACY, 'soa', wb.case_name, '1. Advice', '2026 Advice & Service', '2. Compliance docs (SOA, ROA, EO & Fact Find)');
const SPC = path.join(SP, 'Clients', wb.sharepoint_folder, '1. Advice', '2026 Advice & Service', '2. Compliance docs (SOA, ROA, EO & Fact Find)');
const OUT = path.join(DL, 'Citizen, J & J - SOA Pack');

const write = async (p, body, mtime) => {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  if (mtime) await fs.utimes(p, mtime, mtime);
};
const hash = async (p) => crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex').toUpperCase();
const rel = (abs) => path.relative(LEGACY, abs);
const repoItem = (abs, slot, packName) => ({ source: 'repo', relPath: rel(abs), name: path.basename(abs), slot, packName, within: rel(abs) });

beforeAll(async () => {
  await write(path.join(ADV, 'FSG Part 1 - Example Licensee v9.1.pdf'), 'fsg part 1');
  await write(path.join(ADV, 'Example, Alex - FSG Part Two v8.0.pdf'), 'fsg part 2');
  await write(path.join(ADV, 'Example, Alex - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf'), 'fsg combined');
  await write(path.join(OTHER, 'Otheradviser, Pat - FSG Combined 2026.pdf'), 'other adviser fsg');

  await write(path.join(CASE, 'Statement of Advice - Citizen.docx'), 'soa docx', new Date('2026-10-20'));
  await write(path.join(CASE, 'Statement of Advice - Citizen.pdf'), 'soa pdf', new Date('2026-10-10'));
  await write(path.join(CASE, 'Statement of Advice - Citizen DRAFT.pdf'), 'soa draft', new Date('2026-10-15'));
  await write(path.join(CASE, 'TAL Application Summary - John Citizen.pdf'), 'app john');
  await write(path.join(CASE, 'TAL Application Summary - Jane Citizen.pdf'), 'app jane');
  await write(path.join(CASE, 'TAL Application Summary - Citizen.pdf'), 'app whose');

  await write(path.join(SPC, '2026.10.15 Insurance Cover Summary - Citizen, Jane.pdf'), 'multi option sheet');
  await write(path.join(SPC, 'FINAL Insurance Summary - John Citizen.pdf'), 'final john');
  await write(path.join(SPC, 'Zurich Application Summary - Pre-Fill - Citizen, John.pdf'), 'sp app john');
  await write(path.join(SP, 'Compliance', 'FSG', 'Otheradviser, Pat - FSG Part Two.pdf'), 'compliance other fsg');
  await write(path.join(DL, 'Example Insurer PDS.pdf'), 'pds');

  pack = await import('../services/workbench/pack.js');
});

afterAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('personOf', () => {
  it('names a same-surname couple from first names', () => {
    expect(pack.personOf('TAL Application Summary - John Citizen.pdf', couple)).toEqual({ who: 'John Citizen', sure: true });
    expect(pack.personOf('Citizen, Jane - Zurich prefill.pdf', couple)).toEqual({ who: 'Jane Citizen', sure: true });
  });

  it('does not guess when only the shared surname is there', () => {
    expect(pack.personOf('TAL Application Summary - Citizen.pdf', couple)).toEqual({ who: null, sure: false });
    expect(pack.personOf('Jane & John Citizen - TAL.pdf', couple).sure).toBe(false);
  });

  it('matches whole words only', () => {
    const c = { first_name: 'Jo', last_name: 'Citizen', partner_first_name: 'John', partner_last_name: 'Citizen' };
    expect(pack.personOf('TAL Application - John Citizen.pdf', c).who).toBe('John Citizen');
  });

  it('falls back to surnames when they differ', () => {
    expect(pack.personOf('AIA Application Summary - Sample.pdf', mixed).who).toBe('Sam Sample');
  });

  it('a single client is always that client', () => {
    expect(pack.personOf('anything.pdf', { first_name: 'Jane', last_name: 'Citizen' }).who).toBe('Jane Citizen');
  });
});

describe('packCandidates', () => {
  let cand;
  beforeAll(async () => { cand = await pack.packCandidates(wb, couple); });
  const byName = (n) => cand.items.find((i) => i.name === n);

  it('ticks the adviser\'s combined FSG and never lists another adviser\'s folder', () => {
    const fsgs = cand.items.filter((i) => i.slot === 'fsg');
    expect(fsgs.filter((i) => i.include).map((i) => i.name))
      .toEqual(['Example, Alex - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf']);
    expect(byName('Example, Alex - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf').packName).toBe('FSG.pdf');
    expect(cand.items.some((i) => i.relPath.includes('pat-otheradviser'))).toBe(false);
    const sp = byName('Otheradviser, Pat - FSG Part Two.pdf');
    expect(sp.include).toBe(false);
    expect(sp.note).toMatch(/another adviser/);
  });

  it('names applications after the right partner, or keeps the name when unsure', () => {
    expect(byName('TAL Application Summary - John Citizen.pdf').packName).toBe('TAL Application Summary - Pre-Fill - John Citizen.pdf');
    expect(byName('TAL Application Summary - Jane Citizen.pdf').packName).toBe('TAL Application Summary - Pre-Fill - Jane Citizen.pdf');
    const whose = byName('TAL Application Summary - Citizen.pdf');
    expect(whose.packName).toBe('TAL Application Summary - Citizen.pdf');
    expect(whose.note).toMatch(/Could not tell/);
    expect(byName('Zurich Application Summary - Pre-Fill - Citizen, John.pdf')).toMatchObject({
      packName: 'Zurich Application Summary - Pre-Fill - John Citizen.pdf', include: true,
    });
  });

  it('does not pre-tick the multi-option Insurance Cover Summary, but does tick the FINAL one', () => {
    expect(byName('2026.10.15 Insurance Cover Summary - Citizen, Jane.pdf')).toMatchObject({ slot: 'final_summary', include: false });
    expect(byName('FINAL Insurance Summary - John Citizen.pdf').include).toBe(true);
  });
});

describe('FSG choice without a combined file', () => {
  it('takes Part 1 + Part Two', async () => {
    const combined = path.join(ADV, 'Example, Alex - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf');
    const keep = path.join(TMP, 'combined.bak');
    await fs.rename(combined, keep);
    try {
      const cand = await pack.packCandidates(wb, couple);
      const ticked = cand.items.filter((i) => i.slot === 'fsg' && i.include).map((i) => i.packName).sort();
      expect(ticked).toEqual(['FSG Part 1.pdf', 'FSG Part Two.pdf']);
    } finally {
      await fs.rename(keep, combined);
    }
  });
});

describe('buildPack', () => {
  const soaDocx = path.join(CASE, 'Statement of Advice - Citizen.docx');
  const soaPdf = path.join(CASE, 'Statement of Advice - Citizen.pdf');
  const draft = path.join(CASE, 'Statement of Advice - Citizen DRAFT.pdf');
  const fsg = path.join(ADV, 'Example, Alex - FSG Combined 2026 (Part 1 v9.1 + Adviser Profile v8.0).pdf');
  const appJohn = path.join(CASE, 'TAL Application Summary - John Citizen.pdf');
  const appWhose = path.join(CASE, 'TAL Application Summary - Citizen.pdf');

  // The .docx and .pdf of the SOA are not next to each other in the list.
  const items = () => [
    repoItem(soaDocx, 'soa', 'Statement of Advice - Citizen, J & J.docx'),
    repoItem(draft, 'soa', 'Statement of Advice DRAFT.pdf'),
    repoItem(soaPdf, 'soa', 'Statement of Advice - Citizen, J & J.pdf'),
    repoItem(fsg, 'fsg', 'FSG.pdf'),
    repoItem(appJohn, 'application', 'TAL Application Summary - Pre-Fill - John Citizen.pdf'),
    repoItem(appWhose, 'application', 'TAL Application Summary - Citizen.pdf'),
  ];

  it('copies byte-for-byte, pairs .docx/.pdf by name, and writes a manifest', async () => {
    const r = await pack.buildPack(wb, couple, { items: items(), makePdfs: false });
    const names = r.copied.map((c) => c.name);
    expect(names).toContain('01 - Statement of Advice - Citizen, J & J.docx');
    expect(names).toContain('01 - Statement of Advice - Citizen, J & J.pdf');
    expect(names).toContain('02 - Statement of Advice DRAFT.pdf');
    expect(names).toContain('03 - FSG.pdf');
    for (const c of r.copied) {
      const src = items().find((i) => c.source === i.within);
      expect(await hash(path.join(OUT, c.name))).toBe(await hash(path.join(LEGACY, src.relPath)));
      expect(c.sha256).toBe(await hash(path.join(OUT, c.name)));
    }
    expect(r.review.join('\n')).toMatch(/could not tell whether it is for Jane Citizen or John Citizen/);
    expect(r.review.join('\n')).not.toMatch(/fallback/);
    const readme = await fs.readFile(path.join(OUT, '0 - READ ME.txt'), 'utf8');
    expect(readme).toMatch(/WORKBENCH FILES/);
    expect(readme).toContain(`${r.copied[0].sha256}  ${r.copied[0].name}`);
  });

  it('a rebuild keeps hand-added and hand-edited files, and replaces only its own', async () => {
    await write(path.join(OUT, '05 - TAL Cancellation Letter - Jane Citizen.docx'), 'hand made letter');
    await write(path.join(OUT, 'CvC - Citizen.xlsx'), 'hand cvc');
    // Edit one of the builder's own copies by hand.
    await write(path.join(OUT, '03 - FSG.pdf'), 'edited by hand');

    // Drop the draft; everything after it renumbers.
    const r = await pack.buildPack(wb, couple, { items: items().filter((i) => !i.name.includes('DRAFT')), makePdfs: false });
    const files = await fs.readdir(OUT);
    expect(files).toContain('05 - TAL Cancellation Letter - Jane Citizen.docx');
    expect(files).toContain('CvC - Citizen.xlsx');
    expect(await fs.readFile(path.join(OUT, '05 - TAL Cancellation Letter - Jane Citizen.docx'), 'utf8')).toBe('hand made letter');
    // The unchanged old draft copy is gone; the hand-edited FSG copy is kept as it is.
    expect(files).not.toContain('02 - Statement of Advice DRAFT.pdf');
    expect(await fs.readFile(path.join(OUT, '03 - FSG.pdf'), 'utf8')).toBe('edited by hand');
    expect(r.copied.map((c) => c.name)).toContain('02 - FSG.pdf');
    expect(r.extras).toEqual(expect.arrayContaining(['03 - FSG.pdf', '05 - TAL Cancellation Letter - Jane Citizen.docx', 'CvC - Citizen.xlsx']));
    const review = r.review.join('\n');
    expect(review).toMatch(/03 - FSG\.pdf was changed after the last build/);
    expect(review).toMatch(/Extra file in the pack folder, not written by this build: CvC - Citizen\.xlsx/);
  });

  it('never overwrites a file it did not write', async () => {
    await fs.rm(OUT, { recursive: true, force: true });
    await write(path.join(OUT, '01 - Statement of Advice - Citizen, J & J.pdf'), 'someone else\'s file');
    const r = await pack.buildPack(wb, couple, { items: items(), makePdfs: false });
    expect(await fs.readFile(path.join(OUT, '01 - Statement of Advice - Citizen, J & J.pdf'), 'utf8')).toBe('someone else\'s file');
    expect(r.review.join('\n')).toMatch(/Not written: 01 - Statement of Advice - Citizen, J & J\.pdf/);
  });

  it('refuses another adviser\'s FSG and flags a SharePoint fallback FSG', async () => {
    const other = { source: 'sharepoint', relPath: path.join('Compliance', 'FSG', 'Otheradviser, Pat - FSG Part Two.pdf'), name: 'Otheradviser, Pat - FSG Part Two.pdf', slot: 'fsg', packName: 'FSG.pdf' };
    await expect(pack.buildPack(wb, couple, { items: [other], makePdfs: false })).rejects.toThrow(/another adviser/);

    await write(path.join(SP, 'Compliance', 'FSG', 'FSG Part 1 - Example Licensee v9.1.pdf'), 'compliance part 1');
    const fallback = { source: 'sharepoint', relPath: path.join('Compliance', 'FSG', 'FSG Part 1 - Example Licensee v9.1.pdf'), name: 'FSG Part 1 - Example Licensee v9.1.pdf', slot: 'fsg', packName: 'FSG Part 1.pdf' };
    const r = await pack.buildPack(wb, couple, { items: [fallback], makePdfs: false });
    expect(r.review.join('\n')).toMatch(/not from legacy.advisers.alex-example \(fallback\)/);
  });

  it('isAdviserFile accepts only the pack adviser\'s folder', () => {
    expect(pack.isAdviserFile(path.join('advisers', 'alex-example', 'x.pdf'))).toBe(true);
    expect(pack.isAdviserFile(path.join('advisers', 'pat-otheradviser', 'x.pdf'))).toBe(false);
    expect(pack.isAdviserFile(path.join('advisers', 'alex-example', '..', 'pat-otheradviser', 'x.pdf'))).toBe(false);
  });
});
