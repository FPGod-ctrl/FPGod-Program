import { query } from '../config/db.js';
import { storage } from './storage.js';

/**
 * Files a generated artefact (financial plan, SOA, follow-up email, …) into the
 * client's Documents: the text is written to storage as a Markdown file and a
 * `documents` row is recorded with the text already in `extracted_text` (so it's
 * searchable/scannable without re-extraction). This is what makes every
 * generation retained inside the client file alongside their uploads.
 *
 * Returns the created document row, or null when there's no client to file it
 * under or nothing to save — callers can safely ignore a null.
 */
export async function saveGeneratedDocument({ clientId, groupId = null, title, docType = 'other', text }) {
  if (!clientId || !text || !String(text).trim()) return null;

  const safeTitle = String(title || docType || 'document').trim() || 'document';
  const slug =
    safeTitle.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'document';
  const buffer = Buffer.from(String(text), 'utf8');
  const { key, size } = await storage.save(buffer, `${slug}.md`, 'text/markdown');

  const { rows: [doc] } = await query(
    `INSERT INTO documents
       (client_id, group_id, original_name, storage_key, doc_type, mime_type,
        size_bytes, extracted_text, scan_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'done')
     RETURNING id, client_id, group_id, original_name, doc_type, size_bytes, created_at`,
    [clientId, groupId, `${safeTitle}.md`, key, docType, 'text/markdown', size, String(text)]
  );
  return doc;
}

export default saveGeneratedDocument;
