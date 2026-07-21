import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Import the library file directly. pdf-parse's index.js runs a debug/test
// block when it thinks it's the entry module (no module.parent), which under
// ESM would try to read a bundled sample PDF and throw. The lib file is the
// pure function with no such side effect.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extract plain text from an uploaded document buffer.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} originalName
 * @returns {Promise<string>}
 */
export async function extractText(buffer, mimeType, originalName = '') {
  const name = originalName.toLowerCase();

  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return (value || '').trim();
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')
  ) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parts = [];
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false });
      if (csv && csv.trim()) parts.push(`# Sheet: ${sheetName}\n${csv.trim()}`);
    }
    return parts.join('\n\n').trim();
  }

  if (mimeType === 'text/csv' || name.endsWith('.csv')) {
    return buffer.toString('utf8').trim();
  }

  if (mimeType === 'text/plain' || name.endsWith('.txt')) {
    return buffer.toString('utf8').trim();
  }

  // Legacy .doc and unknown types: best-effort UTF-8 decode, stripping control
  // bytes while preserving tab/newline/carriage-return and printable ASCII.
  // eslint-disable-next-line no-control-regex
  return buffer.toString('utf8').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').trim();
}

export default extractText;
