#!/usr/bin/env node
/**
 * Generate a Lakeside Client Profile (.docx) from a filled profile JSON.
 *
 * Strategy (same as generate-insurance-report.mjs): we DO NOT rebuild the
 * document. We open the firm's approved Word template
 * (templates/Lakeside Client Profile Summary 2026.docx), clone it, and fill the
 * empty table cells in place — preserving the logo, fonts, brand colours and
 * layout byte-for-byte. This is the firm's "Client Profile — Client Information
 * & Consent Form", kept SEPARATE from the financial-plan generators.
 *
 * It is filled segment-by-segment (one function per section of the form):
 *   adviser → yourDetails → estatePlanning → goals → assets → debts →
 *   netWealth → familyProtection → consent → signature
 *
 * Data shape: templates/client-profile.template.json (blank). Copy it, fill the
 * values, and run this. Empty values are left as blank cells — nothing is ever
 * guessed. Asset/debt/net-wealth TOTALS are computed here from the row values so
 * the arithmetic is always internally consistent.
 *
 * Usage (from server/):
 *   node scripts/generate-client-profile.mjs <filled.json> ["<output.docx>"]
 *   node scripts/generate-client-profile.mjs ../templates/client-profile.template.json  # blank form
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, '../../templates/Lakeside Client Profile Summary 2026.docx');
const OUT_DIR = resolve(__dirname, '../../generated-profiles'); // NOT generated-plans

// ---- xml / table helpers ----------------------------------------------------
const xmlEscape = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rowsOf = (tblXml) => tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
const cellsOf = (rowXml) => rowXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
const cellText = (c) => (c.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
  .map((m) => m.replace(/<[^>]+>/g, '')).join('');
const tableText = (t) => cellText(t);

/** Rewrite a cell's text, preserving its tcPr (width/shading) and run styling. */
function setCellText(cellXml, value) {
  const tcPr = (cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
  const rpr = (cellXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  const pPr = (cellXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const paras = String(value ?? '').split('\n').map((line) =>
    `<w:p>${pPr}<w:r>${rpr}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`).join('');
  return `<w:tc>${tcPr}${paras}</w:tc>`;
}

/** Rebuild a row from a (possibly edited) cells array, preserving trPr. */
const rebuildRow = (rowXml, cells) =>
  rowXml.slice(0, rowXml.indexOf('<w:tc>')) + cells.join('') + '</w:tr>';

/** Rebuild a table from rows, preserving tblPr/tblGrid. */
const rebuildTable = (tblXml, rows) =>
  tblXml.slice(0, tblXml.indexOf('<w:tr')) + rows.join('') + '</w:tbl>';

// ---- number helpers (totals) ------------------------------------------------
function num(s) {
  if (typeof s === 'number') return s;
  const m = String(s ?? '').replace(/[^0-9.\-]/g, '');
  if (m === '' || m === '-' || m === '.') return null;
  const v = parseFloat(m);
  return Number.isNaN(v) ? null : v;
}
function money(n) {
  if (n == null) return '';
  const neg = n < 0;
  const p = Math.abs(n).toFixed(2).split('.');
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-$' : '$') + (p[1] === '00' ? p[0] : p.join('.'));
}
const norm = (s) => String(s ?? '').toLowerCase().replace(/\/s\b/g, '').replace(/[^a-z0-9]/g, '');

// ============================================================================
// SEGMENT FILLERS — each takes the current document XML + data, returns new XML.
// Each finds its table by a text marker (resilient to table reordering).
// ============================================================================
function findTable(doc, pred) {
  const tables = doc.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  return tables.find((t) => pred(tableText(t), t));
}
function withTable(doc, pred, transform) {
  const t = findTable(doc, pred);
  if (!t) return doc;
  const next = transform(t);
  return next ? doc.replace(t, next) : doc;
}

/** Adviser Name / Date row. */
function fillAdviser(doc, d) {
  const m = d.meta || {};
  return withTable(doc, (txt, t) => /Adviser Name/.test(txt) && rowsOf(t).length <= 2, (tbl) => {
    const rows = rowsOf(tbl);
    const ri = rows.findIndex((r) => /Adviser Name/.test(cellText(r)));
    const cells = cellsOf(rows[ri]);
    if (m.adviser && cells[1]) cells[1] = setCellText(cells[1], m.adviser);
    if (m.date && cells[3]) cells[3] = setCellText(cells[3], m.date);
    rows[ri] = rebuildRow(rows[ri], cells);
    return rebuildTable(tbl, rows);
  });
}

/** Your Details / Spouse (3-col: label, client, spouse) + children (spanning). */
const DETAIL_LABELS = {
  'full name': 'fullName',
  'residential address': 'residentialAddress',
  'mobile number': 'mobileNumber',
  'email address': 'emailAddress',
  'date of birth': 'dateOfBirth',
  'marital status': 'maritalStatus',
  'previous occupation': 'previousOccupation',
  occupation: 'occupation',
  'employment basis': 'employmentBasis',
  employer: 'employer',
  'annual income (inc. bonus)': 'annualIncomeIncBonus',
  'est. monthly expenditure / cash surplus': 'estMonthlyExpenditureSurplus',
  'private health insurance': 'privateHealthInsurance',
  'super contributions (%)': 'superContributionsPct',
  smoker: 'smoker',
};
function fillYourDetails(doc, d) {
  const yd = d.yourDetails || {};
  return withTable(doc, (txt) => /Your Details/.test(txt) && /Full Name/.test(txt), (tbl) => {
    const rows = rowsOf(tbl).map((row) => {
      const cells = cellsOf(row);
      const label = cellText(cells[0]).trim().toLowerCase();
      if (DETAIL_LABELS[label]) {
        const pair = yd[DETAIL_LABELS[label]] || {};
        if (pair.client && cells[1]) cells[1] = setCellText(cells[1], pair.client);
        if (pair.spouse && cells[2]) cells[2] = setCellText(cells[2], pair.spouse);
        return rebuildRow(row, cells);
      }
      if (/children\s*\/\s*dependent/.test(label) && yd.childrenDependents && cells[1]) {
        cells[1] = setCellText(cells[1], yd.childrenDependents);
        return rebuildRow(row, cells);
      }
      return row;
    });
    return rebuildTable(tbl, rows);
  });
}

/** Estate planning (answers in col 1; review date appended to header). */
const ESTATE_LABELS = {
  'do you have a will?': 'hasWill',
  'does it allow for a testamentary trust?': 'willAllowsTestamentaryTrust',
  'do you have powers of attorney?': 'hasPowersOfAttorney',
};
function fillEstate(doc, d) {
  const e = d.estatePlanning || {};
  return withTable(doc, (txt) => /Do you have a Will\?/.test(txt), (tbl) => {
    const rows = rowsOf(tbl).map((row) => {
      const cells = cellsOf(row);
      const label = cellText(cells[0]).trim().toLowerCase();
      if (ESTATE_LABELS[label] && e[ESTATE_LABELS[label]] && cells[1]) {
        cells[1] = setCellText(cells[1], e[ESTATE_LABELS[label]]);
        return rebuildRow(row, cells);
      }
      if (/date last reviewed/i.test(cellText(cells[1] || '')) && e.dateLastReviewed) {
        cells[1] = setCellText(cells[1], `Date Last Reviewed: ${e.dateLastReviewed}`);
        return rebuildRow(row, cells);
      }
      return row;
    });
    return rebuildTable(tbl, rows);
  });
}

/** Planned expenditure & goals (short / long term). */
function fillGoals(doc, d) {
  const g = d.goals || {};
  return withTable(doc, (txt) => /Time Frame/.test(txt), (tbl) => {
    const rows = rowsOf(tbl).map((row) => {
      const cells = cellsOf(row);
      const label = cellText(cells[0]).trim().toLowerCase();
      if (label.startsWith('short-term') && g.shortTerm && cells[1]) cells[1] = setCellText(cells[1], g.shortTerm);
      else if (label.startsWith('long-term') && g.longTerm && cells[1]) cells[1] = setCellText(cells[1], g.longTerm);
      else return row;
      return rebuildRow(row, cells);
    });
    return rebuildTable(tbl, rows);
  });
}

/**
 * Fill a fixed-row asset/debt table by matching labels, spilling extra entries
 * into the template's blank rows, and computing the total in the last row.
 * cols = ordered data keys for value columns (label is col 0).
 */
function fillLedger(doc, d, { marker, items, labelKey, valueKey, cols, totalLabel }) {
  const data = (d[items] || []).map((x) => ({ ...x }));
  const used = new Array(data.length).fill(false);
  const total = data.reduce((s, x) => s + (num(x[valueKey]) || 0), 0);
  const hasNumeric = data.some((x) => num(x[valueKey]) != null);

  return withTable(doc, (txt) => new RegExp(totalLabel).test(txt) && new RegExp(marker).test(txt), (tbl) => {
    const rows = rowsOf(tbl);
    const blankRowIdx = [];
    // First pass: labelled rows.
    for (let ri = 0; ri < rows.length; ri++) {
      const cells = cellsOf(rows[ri]);
      const label = cellText(cells[0]).trim();
      if (ri === 0) continue; // header
      if (new RegExp(`^${totalLabel}`, 'i').test(label)) {
        // Total row is a merged [label, value] row — put the total in its last cell.
        const last = cells.length - 1;
        if (hasNumeric && last >= 1 && cells[last]) {
          cells[last] = setCellText(cells[last], money(total));
          rows[ri] = rebuildRow(rows[ri], cells);
        }
        continue;
      }
      if (!label) { blankRowIdx.push(ri); continue; }
      const di = data.findIndex((x, k) => !used[k] && norm(x[labelKey]) === norm(label));
      if (di !== -1) {
        used[di] = true;
        rows[ri] = rebuildRow(rows[ri], fillValueCells(cells, data[di], cols, labelKey));
      }
    }
    // Second pass: spill any unused entries into blank rows (e.g. extra properties).
    let b = 0;
    for (let k = 0; k < data.length && b < blankRowIdx.length; k++) {
      if (used[k]) continue;
      const ri = blankRowIdx[b++];
      const cells = cellsOf(rows[ri]);
      if (cells[0]) cells[0] = setCellText(cells[0], data[k][labelKey] || '');
      rows[ri] = rebuildRow(rows[ri], fillValueCells(cells, data[k], cols, labelKey));
      used[k] = true;
    }
    return rebuildTable(tbl, rows);
  });
}
/** Fill value columns of a ledger row (cols maps column index -> data key). */
function fillValueCells(cells, entry, cols, labelKey, totalRow = false) {
  for (const [idx, key] of Object.entries(cols)) {
    const i = Number(idx);
    if (!cells[i]) continue;
    let v = entry[key];
    if ((key === 'value' || key === 'balance') && !totalRow && num(v) != null) v = money(num(v));
    if (v) cells[i] = setCellText(cells[i], v);
  }
  return cells;
}

/** Total Net Wealth = assets - debts. */
function fillNetWealth(doc, d) {
  const ta = (d.assets || []).reduce((s, a) => s + (num(a.value) || 0), 0);
  const td = (d.debts || []).reduce((s, x) => s + (num(x.balance) || 0), 0);
  const anyNumeric = (d.assets || []).some((a) => num(a.value) != null) || (d.debts || []).some((x) => num(x.balance) != null);
  if (!anyNumeric) return doc;
  return withTable(doc, (txt) => /TOTAL NET WEALTH/.test(txt), (tbl) => {
    const rows = rowsOf(tbl);
    const cells = cellsOf(rows[0]);
    if (cells[1]) cells[1] = setCellText(cells[1], money(ta - td));
    rows[0] = rebuildRow(rows[0], cells);
    return rebuildTable(tbl, rows);
  });
}

/** Family protection — answers sit in the blank row after each question. */
function fillFamilyProtection(doc, d) {
  const f = d.familyProtection || {};
  const answers = [f.desiredOngoingIncome, f.clearInvestmentDebt, f.privateSchooling];
  return withTable(doc, (txt) => /ongoing income to be/.test(txt), (tbl) => {
    const rows = rowsOf(tbl);
    let qi = -1;
    for (let ri = 0; ri < rows.length; ri++) {
      const label = cellText(cellsOf(rows[ri])[0]).trim();
      if (label) { qi++; continue; } // question row
      if (qi >= 0 && qi < answers.length && answers[qi]) { // blank answer row under question qi
        const cells = cellsOf(rows[ri]);
        cells[0] = setCellText(cells[0], answers[qi]);
        rows[ri] = rebuildRow(rows[ri], cells);
      }
    }
    return rebuildTable(tbl, rows);
  });
}

/** Consent — tick (☐ → ☑) each item the client has agreed to. */
const CONSENT_MARKERS = [
  ['fsg', /Financial Services Guide \(FSG\)/],
  ['privacy', /Protecting your privacy/],
  ['electronicCommunications', /Electronic communications/],
  ['tfn', /^TFN\b|\bTFN —/],
  ['disclosureInformation', /Disclosure Information/],
  ['disclosureToSpouse', /Disclosure to Spouse/],
  ['authorisationToRenew', /Authorisation to renew/],
];
function fillConsent(doc, d) {
  const c = d.consent || {};
  return withTable(doc, (txt) => /Financial Services Guide \(FSG\)/.test(txt) && /Authorisation to renew/.test(txt), (tbl) => {
    const rows = rowsOf(tbl).map((row) => {
      const text = cellText(row);
      const hit = CONSENT_MARKERS.find(([, re]) => re.test(text));
      if (hit && c[hit[0]] && /☐/.test(row)) return row.replace(/☐/, '☑');
      return row;
    });
    return rebuildTable(tbl, rows);
  });
}

/** Signature block — Client Name / Signature / Date. */
function fillSignature(doc, d) {
  const c = d.consent || {};
  const map = { 'client name:': c.clientName, 'signature:': c.signature, 'date:': c.date };
  return withTable(doc, (txt) => /Client Name:/.test(txt) && /Signature:/.test(txt), (tbl) => {
    const rows = rowsOf(tbl).map((row) => {
      const cells = cellsOf(row);
      const label = cellText(cells[0]).trim().toLowerCase();
      if (map[label] && cells[1]) {
        cells[1] = setCellText(cells[1], map[label]);
        return rebuildRow(row, cells);
      }
      return row;
    });
    return rebuildTable(tbl, rows);
  });
}

// ============================================================================
export async function generateClientProfile(data, outPath) {
  const zip = await JSZip.loadAsync(readFileSync(TEMPLATE));
  let doc = await zip.file('word/document.xml').async('string');

  doc = fillAdviser(doc, data);
  doc = fillYourDetails(doc, data);
  doc = fillEstate(doc, data);
  doc = fillGoals(doc, data);
  doc = fillLedger(doc, data, {
    marker: 'Residential Home', items: 'assets', labelKey: 'asset', valueKey: 'value',
    cols: { 1: 'location', 2: 'value', 3: 'owner' }, totalLabel: 'TOTAL ASSETS',
  });
  doc = fillLedger(doc, data, {
    marker: 'Home Loan', items: 'debts', labelKey: 'debt', valueKey: 'balance',
    cols: { 1: 'location', 2: 'balance', 3: 'bank', 4: 'fixedOrVariable', 5: 'ratePct', 6: 'monthlyPayment' },
    totalLabel: 'TOTAL DEBTS',
  });
  doc = fillNetWealth(doc, data);
  doc = fillFamilyProtection(doc, data);
  doc = fillConsent(doc, data);
  doc = fillSignature(doc, data);

  zip.file('word/document.xml', doc);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out);
  return outPath;
}

// ---- CLI --------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('generate-client-profile.mjs')) {
  const [, , dataPath, outArg] = process.argv;
  if (!dataPath) {
    console.error('Usage: node scripts/generate-client-profile.mjs <filled.json> ["<output.docx>"]');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(resolve(process.cwd(), dataPath), 'utf8'));
  const name = data?.yourDetails?.fullName?.client
    ? `${data.yourDetails.fullName.client} - Client Profile.docx`
    : 'Client Profile.docx';
  const out = outArg ? resolve(process.cwd(), outArg) : resolve(OUT_DIR, name);
  generateClientProfile(data, out)
    .then((p) => console.log('Generated:', p))
    .catch((e) => { console.error(e); process.exit(1); });
}

export default { generateClientProfile };
