#!/usr/bin/env node
/**
 * Generate a Lakeside-format Insurance Report (.docx) from structured data.
 *
 * Strategy: we DO NOT rebuild the document. We open the original firm template
 * (templates/Lakeside Insurance Report - 2026.docx), clone it, and fill the
 * table cells in-place. That keeps the logo, fonts (Playfair Display / Lato),
 * brand colours (#3F5147 banner, #EDEAE3 rows) and all layout byte-for-byte
 * identical to the firm's approved template.
 *
 * Usage:
 *   node scripts/generate-insurance-report.mjs <data.json> [output.docx]
 *
 * Data shape (see templates/insurance-report.sample.json):
 *   {
 *     "adviser": "Tristan Biro",
 *     "date": "30th of June 2026",
 *     "current":   [ <policy>, ... ],
 *     "indicative":[ <policy>, ... ],
 *     "totalPremium": "Total premium of $4,250 p.a."
 *   }
 *   <policy> = {
 *     "type": "Income Protection",        // becomes the bold first-column label
 *     "startDate": "01/07/2026",
 *     "product": "AIA Priority Protection",
 *     "lifeInsured": "John Smith",
 *     "sumInsured": "$8,000 monthly benefit\nIndemnity, 90-day wait, to age 65", // \n = new line in cell
 *     "owner": "SMSF",
 *     "premium": "$2,100 p.a.",
 *     "premiumType": "Stepped",
 *     "replace": "No"                      // CURRENT table only; ignored for indicative
 *   }
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, '../../templates/Lakeside Insurance Report - 2026.docx');

// ---- column order per table ----
const CURRENT_COLS    = ['type','startDate','product','lifeInsured','sumInsured','owner','premium','premiumType','replace'];
const INDICATIVE_COLS = ['type','startDate','product','lifeInsured','sumInsured','owner','premium','premiumType'];

const xmlEscape = (s) => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// run formatting matching the template's data cells (Lato 9pt, #2A2A22)
const RPR_DATA  = '<w:rPr><w:rFonts w:ascii="Lato" w:hAnsi="Lato" w:cs="Lato"/><w:color w:val="2A2A22"/><w:sz w:val="18"/></w:rPr>';
const RPR_LABEL = '<w:rPr><w:rFonts w:ascii="Lato" w:hAnsi="Lato" w:cs="Lato"/><w:b/><w:color w:val="2A2A22"/><w:sz w:val="18"/></w:rPr>';
const PPR = (rpr) => `<w:pPr><w:spacing w:line="260" w:lineRule="atLeast"/><w:jc w:val="center"/>${rpr}</w:pPr>`;

const run = (text, rpr) => text === ''
  ? ''
  : `<w:r>${rpr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;

/** Rebuild a single cell: keep its tcPr (width/border/shading), replace content with value. */
function setCell(cellXml, value, { bold = false } = {}) {
  const tcPr = (cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
  const rpr  = bold ? RPR_LABEL : RPR_DATA;
  const lines = String(value ?? '').split('\n');
  const paras = lines.map((line) => `<w:p>${PPR(rpr)}${run(line, rpr)}</w:p>`).join('');
  return `<w:tc>${tcPr}${paras}</w:tc>`;
}

const cellsOf = (rowXml) => rowXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
const rowsOf  = (tblXml) => tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];

/** Build a data row by cloning a template row and filling each column. */
function buildRow(templateRowXml, policy, cols) {
  const tmplCells = cellsOf(templateRowXml);
  const newCells = cols.map((key, i) => {
    const base = tmplCells[i] || tmplCells[tmplCells.length - 1];
    return setCell(base, policy[key] ?? '', { bold: i === 0 });
  });
  // preserve the row's <w:trPr> and wrapper attributes; swap only the cells
  const head = templateRowXml.slice(0, templateRowXml.indexOf('<w:tc>'));
  return head + newCells.join('') + '</w:tr>';
}

/** Replace all data rows of a cover table (keep header row[0]). */
function fillCoverTable(tblXml, policies, cols) {
  const rows = rowsOf(tblXml);
  const header = rows[0];
  const templateDataRow = rows[1]; // first data row = clone base
  const dataRows = policies.map((p) => buildRow(templateDataRow, p, cols)).join('');
  const head = tblXml.slice(0, tblXml.indexOf('<w:tr'));
  return head + header + dataRows + '</w:tbl>';
}

function textOf(xml) {
  return (xml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
    .map((m) => m.replace(/<[^>]+>/g, '')).join('');
}

export async function generateInsuranceReport(data, outPath) {
  const buf = readFileSync(TEMPLATE);
  const zip = await JSZip.loadAsync(buf);
  let doc = await zip.file('word/document.xml').async('string');

  const tables = doc.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  let adviserTbl, currentTbl, indicativeTbl, totalTbl;
  let sawIndicativeMarker = false;
  for (const t of tables) {
    const txt = textOf(t);
    if (/Adviser Name/.test(txt)) adviserTbl = t;
    else if (/INDICATIVE INSURANCE COVER/i.test(txt)) sawIndicativeMarker = true;
    else if (/Total premium/i.test(txt)) totalTbl = t;
    else if (/Policy Type/.test(txt)) {
      if (/To Be Replaced/i.test(txt)) currentTbl = t;
      else if (sawIndicativeMarker) indicativeTbl = t;
    }
  }

  // 1) Adviser / Date row
  if (adviserTbl && (data.adviser || data.date)) {
    const cells = cellsOf(rowsOf(adviserTbl)[0]);
    let newRow = rowsOf(adviserTbl)[0];
    if (data.adviser) newRow = newRow.replace(cells[1], setCell(cells[1], data.adviser));
    const cells2 = cellsOf(newRow);
    if (data.date) newRow = newRow.replace(cells2[3], setCell(cells2[3], data.date));
    const newTbl = adviserTbl.replace(rowsOf(adviserTbl)[0], newRow);
    doc = doc.replace(adviserTbl, newTbl);
  }

  // 2) Current cover
  if (currentTbl && data.current) {
    doc = doc.replace(currentTbl, fillCoverTable(currentTbl, data.current, CURRENT_COLS));
  }

  // 3) Indicative cover
  if (indicativeTbl && data.indicative) {
    doc = doc.replace(indicativeTbl, fillCoverTable(indicativeTbl, data.indicative, INDICATIVE_COLS));
  }

  // 4) Total premium
  if (totalTbl && data.totalPremium) {
    const cell = cellsOf(rowsOf(totalTbl)[0])[0];
    const newTbl = totalTbl.replace(cell, setCell(cell, data.totalPremium, { bold: true }));
    doc = doc.replace(totalTbl, newTbl);
  }

  zip.file('word/document.xml', doc);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(outPath, out);
  return outPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-insurance-report.mjs')) {
  const [, , dataPath, outArg] = process.argv;
  if (!dataPath) {
    console.error('Usage: node scripts/generate-insurance-report.mjs <data.json> [output.docx]');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(resolve(process.cwd(), dataPath), 'utf8'));
  const out = resolve(process.cwd(), outArg || 'Insurance Report.docx');
  generateInsuranceReport(data, out)
    .then((p) => console.log('Generated:', p))
    .catch((e) => { console.error(e); process.exit(1); });
}
