#!/usr/bin/env node
/**
 * Build Adam James insurance-only SOA by cloning the firm template and filling
 * client data + the MetLife->Acenda Life recommendation. Clone-and-fill keeps
 * the firm's exact formatting/branding/boilerplate intact.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, '../../templates/insurance-soa/template/Tristan Biro - SOA Template 2025.docx');
const OUT = resolve(__dirname, '../../generated-plans/Adam James - Statement of Advice.docx');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Set a cell's text: replace first <w:t> (keep formatting), blank extra <w:t>s; inject a run if none. */
function setCellText(cell, value) {
  const hasT = /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/.test(cell);
  if (hasT) {
    let first = true;
    return cell.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
      if (first) { first = false; return `<w:t xml:space="preserve">${esc(value)}</w:t>`; }
      return '<w:t xml:space="preserve"></w:t>';
    });
  }
  // no run: inject one into the first paragraph
  return cell.replace(/(<w:p\b[^>]*>[\s\S]*?)(<\/w:p>)/, (m, a, b) =>
    `${a}<w:r><w:t xml:space="preserve">${esc(value)}</w:t></w:r>${b}`);
}

function editTable(tbl, fills) {
  const rows = tbl.match(/<w:tr\b[\s\S]*?<\/w:tr>/g);
  for (const f of fills) {
    const row = rows[f.r];
    if (!row) continue;
    const cells = row.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
    if (!cells || !cells[f.c]) continue;
    cells[f.c] = setCellText(cells[f.c], f.v);
    const head = row.slice(0, row.indexOf('<w:tc>'));
    rows[f.r] = head + cells.join('') + '</w:tr>';
  }
  const head = tbl.slice(0, tbl.indexOf('<w:tr'));
  return head + rows.join('') + '</w:tbl>';
}

// ---- table fills (indices match the template's table order) ----
const TABLE_FILLS = {
  // 0 = Scope
  0: [
    { r: 0, c: 1, v: 'Adam James' }, { r: 0, c: 2, v: '' },
    { r: 1, c: 1, v: 'IN' }, { r: 1, c: 2, v: '' },   // Life
    { r: 2, c: 1, v: 'OUT' }, { r: 2, c: 2, v: '' },  // TPD
    { r: 3, c: 1, v: 'OUT' }, { r: 3, c: 2, v: '' },  // Critical Illness
    { r: 4, c: 1, v: 'OUT' }, { r: 4, c: 2, v: '' },  // Income Protection
  ],
  // 1 = Personal details
  1: [
    { r: 1, c: 1, v: 'Adam James' },
    { r: 2, c: 1, v: '14 Kiri Court, Buderim QLD 4556' },
    { r: 3, c: 1, v: '0477 977 997' },
    { r: 4, c: 1, v: 'adam@mylifescool.com.au' },
    { r: 5, c: 1, v: '09/04/1970' },
    { r: 6, c: 1, v: '' },
    { r: 7, c: 1, v: 'Health Product Sales Business' },
    { r: 8, c: 1, v: 'Full-Time' },
    { r: 9, c: 1, v: 'Self-employed' },
    { r: 10, c: 1, v: '$300,000 pa' },
    { r: 11, c: 1, v: 'Not disclosed' },
    { r: 12, c: 1, v: 'Not disclosed' },
    { r: 13, c: 1, v: 'Non-smoker' },
    { r: 14, c: 1, v: 'Hunter (17), Teisha (20)' },
  ],
  // 2 = Estate planning
  2: [
    { r: 1, c: 1, v: 'Yes' },
    { r: 2, c: 1, v: 'Yes' },
    { r: 3, c: 1, v: 'Yes' },
  ],
  // 3 = Goals
  3: [
    { r: 1, c: 1, v: 'Continue work and pay down debt' },
    { r: 2, c: 1, v: 'Not disclosed' },
  ],
  // 4 = Assets/Debts
  4: [
    { r: 2, c: 0, v: 'Queensland' }, { r: 2, c: 1, v: '$1,000,000' }, { r: 2, c: 2, v: 'Adam James' }, { r: 2, c: 4, v: '$350,000' },
    { r: 15, c: 0, v: 'SMSF' }, { r: 15, c: 1, v: '$400,000' },
    { r: 17, c: 1, v: '$1,400,000' }, { r: 17, c: 3, v: '$350,000' },
    { r: 18, c: 1, v: '$1,050,000' },
  ],
  // 6 = Existing insurance
  6: [
    { r: 1, c: 0, v: 'Life' }, { r: 1, c: 1, v: 'MetLife  PN20000044680' }, { r: 1, c: 2, v: 'Adam James' }, { r: 1, c: 3, v: '$1,106,700' }, { r: 1, c: 4, v: 'Adam James' }, { r: 1, c: 5, v: '$203.56 p.m. ($2,442.72 p.a.)' }, { r: 1, c: 6, v: 'Stepped' }, { r: 1, c: 7, v: 'YES' },
    { r: 2, c: 0, v: 'TPD (Any)' }, { r: 2, c: 1, v: 'MetLife  PN20000044680' }, { r: 2, c: 2, v: 'Adam James' }, { r: 2, c: 3, v: '$830,025' }, { r: 2, c: 4, v: 'Adam James' }, { r: 2, c: 5, v: '$175.69 p.m. ($2,108.28 p.a.)' }, { r: 2, c: 6, v: 'Stepped' }, { r: 2, c: 7, v: 'YES' },
  ],
  // 7 = Objectives
  7: [
    { r: 1, c: 1, v: 'Adam James' }, { r: 1, c: 2, v: '' },
    { r: 2, c: 1, v: 'Not in scope of this advice.' }, { r: 2, c: 2, v: '' },
    { r: 3, c: 1, v: 'To maintain adequate Life Cover to protect Adam’s family and estate in the event of his premature death – sufficient to clear his home debt and provide a lump sum for his children.' }, { r: 3, c: 2, v: '' },
    { r: 4, c: 1, v: 'Not in scope – existing TPD cover to be cancelled at Adam’s direction (see Section 5).' }, { r: 4, c: 2, v: '' },
    { r: 5, c: 1, v: 'Not in scope of this advice.' }, { r: 5, c: 2, v: '' },
  ],
  // 8 = Strategy steps
  8: [
    { r: 1, c: 1, v: 'Establish a new Acenda (Nippon Life) Life Cover policy of $1,000,000, owned personally by Adam James, on a stepped premium.' },
    { r: 2, c: 1, v: 'Once the new Acenda cover is accepted and in force, cancel the existing MetLife Life Cover ($1,106,700) and MetLife TPD Cover ($830,025) under policy PN20000044680. Do not cancel the existing cover until the new policy is confirmed as in force.' },
  ],
  // 9 = Recommended cover
  9: [
    { r: 1, c: 0, v: 'Life' }, { r: 1, c: 1, v: 'Acenda (Nippon Life) – NEW POLICY' }, { r: 1, c: 2, v: 'Adam James' }, { r: 1, c: 3, v: '$1,000,000' }, { r: 1, c: 4, v: 'Adam James' }, { r: 1, c: 5, v: '$170.18 p.m. ($2,042.16 p.a.)' }, { r: 1, c: 6, v: 'Stepped' },
  ],
  // 10 = Super impact projection -> N/A (cover funded personally)
  10: [
    { r: 3, c: 1, v: 'N/A – cover held personally (not funded via super)' },
    { r: 4, c: 1, v: '' }, { r: 4, c: 3, v: '' }, { r: 4, c: 4, v: '' },
    { r: 5, c: 1, v: '' }, { r: 7, c: 1, v: '' }, { r: 8, c: 1, v: '' },
    { r: 9, c: 3, v: '' }, { r: 9, c: 4, v: '' }, { r: 10, c: 1, v: '' },
  ],
  // 11 = Replacement comparison
  11: [
    { r: 1, c: 1, v: 'MetLife Protect' }, { r: 1, c: 2, v: 'Acenda Insurance' },
    { r: 2, c: 1, v: 'Life & TPD' }, { r: 2, c: 2, v: 'Life' },
    { r: 3, c: 1, v: 'Adam James' }, { r: 3, c: 2, v: 'Adam James' },
    { r: 4, c: 1, v: 'Adam James' }, { r: 4, c: 2, v: 'Adam James' },
    { r: 5, c: 1, v: 'Life $1,106,700 + TPD (Any) $830,025' }, { r: 5, c: 2, v: 'Life $1,000,000' },
    { r: 6, c: 1, v: 'TPD – Any Occupation' }, { r: 6, c: 2, v: 'Life Cover (no TPD)' },
    { r: 7, c: 1, v: 'PN20000044680' }, { r: 7, c: 2, v: 'New policy (TBA)' },
    { r: 8, c: 1, v: '$4,551.00 p.a.' }, { r: 8, c: 2, v: '$2,042.16 p.a.' },
    { r: 9, c: 1, v: 'GAINED (Acenda): Premium Freeze / Economiser; Terminal Illness Support booster; premium waiver after 3 months’ disablement (vs 6); Vivo Virtual Care. LOST: MetLife Grief Counselling & Involuntary Unemployment benefit; and TPD cover ceases entirely (Adam-directed).' },
    { r: 10, c: 1, v: 'Both products score 100% on core Life cover (Risk Researcher). Acenda provides equivalent Life Cover at a materially lower premium – a total saving of $2,508.84 p.a. across the cancelled MetLife Life and TPD. Adam has directed that TPD cover is no longer required.' },
  ],
  // 12 = Commission (66% upfront / 22% ongoing on $2,042.16 p.a., GST incl.)
  12: [
    { r: 3, c: 0, v: 'Acenda Insurance' }, { r: 3, c: 1, v: '$2,042.16' },
    { r: 3, c: 3, v: '66' }, { r: 3, c: 4, v: '$1,347.83' }, { r: 3, c: 6, v: '$1,347.83' },
    { r: 4, c: 3, v: '22' }, { r: 4, c: 4, v: '$449.28' }, { r: 4, c: 6, v: '$449.28' },
  ],
  // 13 = Duty of disclosure signature
  13: [
    { r: 0, c: 1, v: 'Adam James' }, { r: 0, c: 2, v: '' },
  ],
  // 16 = Signature block 1
  16: [{ r: 1, c: 0, v: 'Adam James' }],
  // 17 = Signature block 2 (no partner)
  17: [{ r: 1, c: 0, v: 'N/A – single applicant' }],
};

// ---- whole-document text replacements (unique cover-page / narrative strings) ----
const TEXT_REPLACEMENTS = [
  ['Mark Snehotta', 'Adam James'],
  ['PO Box 181 MOUNT MARTHA VIC 3934', '14 Kiri Court, Buderim QLD 4556'],
  ['0435 792 866', '0477 977 997'],
  ['mark@sparx.net.au', 'adam@mylifescool.com.au'],
  // cover date + adviser-signature date are split by superscript ordinals:
  ['December 2025', 'July 2026'],           // cover month/year
  ['<w:t>24</w:t>', '<w:t></w:t>'],          // blank adviser sig day
  ['<w:t>th</w:t>', '<w:t></w:t>'],          // blank adviser sig ordinal
  [' of February 2024', ' '],                // blank adviser sig month/year
  ['Stepped/Level', 'Stepped'],
  ['(Client Name)', 'Adam James'],
  // strip template reminder placeholders
  ['INCLUDE TOTAL PREMIUMS OF ANY COVER MAINTAINING AS WELL AS NEW COVER', ''],
  ['INSERT SIDE BY SIDE PRODUCT COMPARISON – USE COMPARE DIFFERENCES TOOL', ''],
  ['REMINDER TO REMOVE ABOVE', ''],
];

// cover-page ordinal: the day "3" precedes the unique superscript "rd" -> make it "2nd"
const fixCoverOrdinal = (s) =>
  s.replace(/(<w:t[^>]*>)3(<\/w:t>)([\s\S]{0,400}?<w:t[^>]*>)rd(<\/w:t>)/, '$12$2$3nd$4');

const buf = readFileSync(TEMPLATE);
const zip = await JSZip.loadAsync(buf);
let doc = await zip.file('word/document.xml').async('string');

// 1) text replacements (report which hit / missed)
const report = [];
for (const [from, to] of TEXT_REPLACEMENTS) {
  const before = doc;
  doc = doc.split(from).join(to);
  report.push(`${before === doc ? 'MISS' : 'ok  '}  "${from}" -> "${to}"`);
}

// 1b) cover-page ordinal fix (3rd -> 2nd)
{ const before = doc; doc = fixCoverOrdinal(doc); report.push(`${before === doc ? 'MISS' : 'ok  '}  cover ordinal 3rd -> 2nd`); }

// 2) table fills
const tables = doc.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
for (const [idx, fills] of Object.entries(TABLE_FILLS)) {
  const t = tables[Number(idx)];
  if (!t) { report.push(`MISS table ${idx} (not found)`); continue; }
  const edited = editTable(t, fills);
  doc = doc.replace(t, edited);
  report.push(`ok    table ${idx}: ${fills.length} cells`);
}

// ---- 3) narrative surgery: Section 5 rationale, TPD cancellation, §6, §7 highlights ----
const pStartOf = (s) => { const i = doc.indexOf(s); return i < 0 ? -1 : doc.lastIndexOf('<w:p ', i); };
const pEndOf = (start) => doc.indexOf('</w:p>', start) + 6;

const ipStart = pStartOf('INCOME PROTECTION');
const lifeStart = pStartOf('LIFE INSURANCE');
const lifeEnd = pEndOf(lifeStart);
const notesStart = pStartOf('OTHER IMPORTANT NOTES');
const para158Start = pStartOf('part of the total insurance premiums recommended');
const para158End = pEndOf(para158Start);
const superStart = pStartOf('recommended to be paid via your Superannuation');
const firstS7 = doc.indexOf('How the recommended products');
const s7Start = firstS7 < 0 ? -1 : doc.lastIndexOf('<w:p ', firstS7);
const s7HeadEnd = firstS7 < 0 ? -1 : doc.indexOf('</w:p>', firstS7) + 6;
const secondS7 = firstS7 < 0 ? -1 : doc.indexOf('How the recommended products', firstS7 + 1);
const s8Start = secondS7 < 0 ? -1 : doc.lastIndexOf('<w:p ', secondS7);

const anchors = { ipStart, lifeStart, notesStart, para158Start, superStart, s7Start, s7HeadEnd, s8Start };
const bad = Object.entries(anchors).filter(([, v]) => v < 0);
if (bad.length) {
  report.push('SKIP narrative surgery — missing anchors: ' + bad.map(([k]) => k).join(', '));
} else {
  // clone paragraph styling from the LIFE heading + its following body paragraph
  const lifeHeadingXML = doc.slice(lifeStart, lifeEnd);
  const headingPPr = (lifeHeadingXML.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || ['<w:pPr/>'])[0];
  const headingRPr = (lifeHeadingXML.match(/<w:r>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/) || [, '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:b/><w:sz w:val="20"/><w:u w:val="single"/></w:rPr>'])[1];
  const bodyParaXML = doc.slice(lifeEnd, pEndOf(lifeEnd));
  const bodyPPr = (bodyParaXML.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || ['<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'])[0];
  const bodyRPr = (bodyParaXML.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || ['<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/></w:rPr>'])[0];
  const bodyP = (t) => `<w:p>${bodyPPr}<w:r>${bodyRPr}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
  const headP = (t) => `<w:p>${headingPPr}<w:r>${headingRPr}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;

  const LIFE = [
    'The level of Life Cover recommended is $1,000,000. This reflects the amount required to protect your family and estate in the event of your premature death, based on your capital needs less the resources currently available to you:',
    '•  Clearing your outstanding home loan of approximately $350,000, so that the family home can be retained debt-free; and',
    '•  Providing a lump sum of approximately $650,000 for your estate and to provide for your children, Hunter and Teisha, in the event of your death.',
    'Together these total the $1,000,000 sum insured recommended.',
    'I have recommended a Stepped premium. A stepped premium increases each year as you get older but is more affordable initially. Given your stage of life and your stated goal to continue working and pay down debt, a stepped premium keeps the initial cost affordable while your cover is maintained.',
    'I recommend that this cover be held personally (outside superannuation) and owned by you. Holding the cover in your personal name means the benefit can be paid directly to your estate and beneficiaries without needing to satisfy a superannuation condition of release, which supports your estate plan (you hold a current Will incorporating a testamentary trust, and Powers of Attorney).',
    'I am recommending the Acenda (Nippon Life) Life Cover policy in place of your existing MetLife Protect Life Cover. Both products achieve a 100% core score for Life Cover under our research (Risk Researcher); however, Acenda provides equivalent cover at a materially lower premium — an overall saving of $2,508.84 p.a. across the MetLife Life and TPD cover being cancelled. Acenda also offers a Premium Freeze / Economiser feature, a Terminal Illness Support booster, a premium waiver after three months’ disablement (compared with six months under MetLife) and access to Vivo Virtual Care. In moving insurers you will no longer have access to MetLife’s Grief Counselling and Involuntary Unemployment benefits, which I have discussed with you.',
  ].map(bodyP).join('');

  const TPD_CANCEL = headP('CANCELLATION OF YOUR TPD COVER') + [
    'You have advised that you no longer require Total & Permanent Disability (TPD) cover. Accordingly, I recommend cancelling your existing MetLife TPD Cover of $830,025, and I have not recommended any replacement TPD cover.',
    'It is important you understand that, once this cover is cancelled, you will not receive a benefit if you become totally and permanently disabled. Should you wish to take out TPD cover again in the future, you would need to apply and be underwritten again, which may result in a higher premium, exclusions, or the cover being declined based on your health at that time. You have confirmed that you understand and accept this and wish to proceed.',
    'Your existing MetLife cover (both Life and TPD) should only be cancelled once your new Acenda Life Cover has been accepted and is in force.',
  ].map(bodyP).join('');

  const PARA158 = bodyP('Adam, the total insurance premium recommended is $170.18 per month ($2,042.16 per annum). This premium is to be held in your personal name and funded from your surplus cash flow. This represents an overall saving of $2,508.84 per annum compared with your existing MetLife premiums.');

  const S7 = [
    'The Acenda (Nippon Life) Life Cover policy recommended for you rates strongly on our research, achieving a 100% core score for Life Cover — equivalent to your existing MetLife cover — while providing the following features that are relevant to your circumstances:',
    '•  Premium Freeze (Economiser) — allows you to cap future premium increases by gradually reducing the sum insured, helping keep the cover affordable as you get older;',
    '•  A Terminal Illness Support booster and a full Terminal Illness advance of the Life Cover benefit;',
    '•  A premium waiver after three months of continuous disablement (compared with six months under your existing MetLife policy);',
    '•  Access to Vivo Virtual Care, providing confidential access to medical, mental-health and wellbeing support services; and',
    '•  Indexation, guaranteed renewability and a Business Safeguard / Future Insurability option, allowing cover to keep pace with inflation and your business circumstances.',
    'On balance, Acenda provides cover equivalent to your existing policy on the features most relevant to you, at a materially lower cost.',
  ].map(bodyP).join('');

  // execute descending by start index so earlier offsets stay valid
  doc = doc.slice(0, s7HeadEnd) + S7 + doc.slice(s8Start);                 // §7 body -> Acenda highlights
  doc = doc.slice(0, superStart) + doc.slice(s7Start);                     // remove super-funding block + super table
  doc = doc.slice(0, para158Start) + PARA158 + doc.slice(para158End);      // §6 personal-funding paragraph
  doc = doc.slice(0, ipStart) + lifeHeadingXML + LIFE + TPD_CANCEL + doc.slice(notesStart); // §5 rationale
  report.push('ok    narrative surgery (Life rationale, TPD cancellation, IP/TPD/Trauma removed, §6, §7 highlights)');
}

zip.file('word/document.xml', doc);
const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(OUT, out);
console.log(report.join('\n'));
console.log('\nGenerated:', OUT);
