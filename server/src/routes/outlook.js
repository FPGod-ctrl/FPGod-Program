import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { storage } from '../services/storage.js';
import { extractText } from '../services/documentExtractor.js';
import { scanDocument } from '../services/documentScan.js';
import {
  scanOutlook,
  outlookAvailable,
  getOutlookAttachments,
  mimeFromName,
} from '../services/outlookScan.js';

const router = Router();

// Whether the local Outlook connector can run on this host (Windows desktop).
router.get('/status', (req, res) => {
  res.json({ available: outlookAvailable(), platform: process.platform });
});

/**
 * GET /api/outlook/scan?days=7&from=aia.com&subject=&folder=Inbox&maxItems=200
 * Reads the locally signed-in Outlook desktop mailbox via COM and returns
 * message metadata (sender, subject, attachments, unread, entryId). Read-only.
 */
router.get(
  '/scan',
  asyncHandler(async (req, res) => {
    const { days, from, subject, folder, maxItems } = req.query;
    const messages = await scanOutlook({
      days: days !== undefined ? Number(days) : undefined,
      from: from ? String(from) : '',
      subject: subject ? String(subject) : '',
      folder: folder ? String(folder) : 'Inbox',
      maxItems: maxItems !== undefined ? Number(maxItems) : undefined,
    });
    res.json({ count: messages.length, messages });
  })
);

/**
 * POST /api/outlook/ingest
 * body: { entryId, clientId?, groupId?, docType?, autoScan? }
 * Saves the message's attachments and runs each through the same pipeline as a
 * manual upload (store → extract text → optional AI scan), creating documents.
 */
router.post(
  '/ingest',
  asyncHandler(async (req, res) => {
    const { entryId, clientId = null, groupId = null, docType = 'other', autoScan = true } = req.body || {};
    if (!entryId) throw badRequest('entryId is required');

    const { subject, senderName, senderEmail, attachments } = await getOutlookAttachments(entryId);

    // Only ingest document-like attachments — skip signature images (.jpg/.png),
    // inline blobs (.bin) and the like so they don't pollute the document list.
    const DOC_EXT = /\.(pdf|docx?|xlsx?|xlsm|csv|txt)$/i;
    const ingestable = attachments.filter((a) => DOC_EXT.test(a.name));
    const skipped = attachments.length - ingestable.length;

    if (!ingestable.length) {
      return res.json({
        subject, count: 0, skipped, documents: [],
        message: attachments.length
          ? `No document attachments (skipped ${skipped} image/other file(s))`
          : 'No file attachments on that email',
      });
    }

    const documents = [];
    for (const att of ingestable) {
      const mime = mimeFromName(att.name);
      const { key, size } = await storage.save(att.buffer, att.name, mime);

      let extracted = '';
      try {
        extracted = await extractText(att.buffer, mime, att.name);
      } catch (err) {
        console.warn('[outlook] text extraction failed:', att.name, err.message);
      }

      const { rows: [doc] } = await query(
        `INSERT INTO documents
          (client_id, group_id, original_name, storage_key, doc_type, mime_type,
           size_bytes, extracted_text, scan_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
         RETURNING id, original_name`,
        [clientId || null, groupId || null, att.name, key, docType, mime, size, extracted]
      );

      let scanned = false;
      if (autoScan && extracted.trim()) {
        try {
          const { result } = await scanDocument(extracted);
          await query(
            "UPDATE documents SET scan_status = 'done', scan_result = $1 WHERE id = $2",
            [result, doc.id]
          );
          scanned = true;
        } catch (err) {
          await query("UPDATE documents SET scan_status = 'failed' WHERE id = $1", [doc.id]);
          console.warn('[outlook] auto-scan failed:', att.name, err.message);
        }
      }

      documents.push({ id: doc.id, original_name: doc.original_name, chars: extracted.length, scanned });
    }

    res.status(201).json({ subject, senderName, senderEmail, count: documents.length, skipped, documents });
  })
);

export default router;
