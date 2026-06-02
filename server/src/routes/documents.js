import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { upload } from '../middleware/upload.js';
import { storage } from '../services/storage.js';
import { extractText } from '../services/documentExtractor.js';
import { scanDocument } from '../services/documentScan.js';

const router = Router();

// LIST documents (optionally ?client_id= / ?group_id=). Excludes the heavy
// extracted_text column from the list payload.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = [];
    const params = [];
    for (const f of ['client_id', 'group_id', 'doc_type']) {
      if (req.query[f]) {
        params.push(req.query[f]);
        where.push(`${f} = $${params.length}`);
      }
    }
    const sql =
      `SELECT id, client_id, group_id, original_name, doc_type, mime_type,
              size_bytes, scan_status, scan_result, created_at
       FROM documents` +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY created_at DESC LIMIT 500';
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

// GET one document (with extracted text + scan result).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('Document not found');
    res.json(rows[0]);
  })
);

/**
 * POST /api/documents
 * multipart/form-data: file=<binary>, client_id?, group_id?, doc_type?
 * Stores the file, extracts text, and records a row.
 */
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded (field name must be "file")');
    const { client_id = null, group_id = null, doc_type = 'other' } = req.body || {};

    const { key, size } = await storage.save(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    let extracted = '';
    try {
      extracted = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[documents] text extraction failed:', err.message);
    }

    const { rows: [doc] } = await query(
      `INSERT INTO documents
        (client_id, group_id, original_name, storage_key, doc_type, mime_type,
         size_bytes, extracted_text, scan_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [
        client_id || null,
        group_id || null,
        req.file.originalname,
        key,
        doc_type,
        req.file.mimetype,
        size,
        extracted,
      ]
    );
    res.status(201).json(doc);
  })
);

/**
 * POST /api/documents/:id/scan
 * Runs AI extraction on the stored text and saves structured fields.
 */
router.post(
  '/:id/scan',
  asyncHandler(async (req, res) => {
    const { rows: [doc] } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc) throw notFound('Document not found');
    if (!doc.extracted_text) throw badRequest('No extracted text to scan for this document');

    await query("UPDATE documents SET scan_status = 'processing' WHERE id = $1", [doc.id]);
    try {
      const { result, ai } = await scanDocument(doc.extracted_text);
      const { rows: [updated] } = await query(
        "UPDATE documents SET scan_status = 'done', scan_result = $1 WHERE id = $2 RETURNING *",
        [result, doc.id]
      );
      res.json({ ...updated, ai });
    } catch (err) {
      await query("UPDATE documents SET scan_status = 'failed' WHERE id = $1", [doc.id]);
      throw err;
    }
  })
);

// GET /api/documents/:id/download — stream the original file.
router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const { rows: [doc] } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc) throw notFound('Document not found');
    const buffer = await storage.read(doc.storage_key);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.send(buffer);
  })
);

// DELETE — remove the row and the stored file.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows: [doc] } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc) throw notFound('Document not found');
    await storage.remove(doc.storage_key).catch(() => {});
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);

export default router;
