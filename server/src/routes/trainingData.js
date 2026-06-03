import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { upload } from '../middleware/upload.js';
import { extractText } from '../services/documentExtractor.js';
import { crudRouter } from './crudFactory.js';

const crud = crudRouter({
  table: 'training_data',
  columns: ['kind', 'title', 'content', 'tags', 'metadata'],
  required: ['content'],
  orderBy: 'created_at DESC',
  filters: ['kind'],
});

const router = Router();

// Counts by kind — surfaced in Settings. Registered before the factory so it
// is not swallowed by the generic GET /:id route.
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT kind, COUNT(*)::int AS count FROM training_data GROUP BY kind`
    );
    const stats = { plan: 0, email: 0, total: 0 };
    for (const r of rows) {
      stats[r.kind] = r.count;
      stats.total += r.count;
    }
    res.json(stats);
  })
);

/**
 * POST /api/training-data/import
 * multipart/form-data: files=<binary>[], kind?=plan|email
 * Extracts text from each uploaded Word/PDF/TXT file and stores it as a
 * training example titled by filename. Designed to be called in batches so
 * large libraries (hundreds of plans) import smoothly. Files that yield no
 * text are reported in `failed` rather than aborting the whole batch.
 */
router.post(
  '/import',
  upload.array('files', 200),
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw badRequest('No files uploaded (field name must be "files")');

    const kind = req.body?.kind === 'email' ? 'email' : 'plan';
    const imported = [];
    const failed = [];

    for (const file of files) {
      try {
        const text = await extractText(file.buffer, file.mimetype, file.originalname);
        if (!text || !text.trim()) {
          failed.push({ name: file.originalname, error: 'No readable text extracted' });
          continue;
        }
        const title = file.originalname.replace(/\.[^.]+$/, '');
        const { rows: [row] } = await query(
          `INSERT INTO training_data (kind, title, content)
           VALUES ($1, $2, $3) RETURNING id, title`,
          [kind, title, text]
        );
        imported.push({ id: row.id, title: row.title, name: file.originalname, chars: text.length });
      } catch (err) {
        failed.push({ name: file.originalname, error: err.message });
      }
    }

    res.status(201).json({
      importedCount: imported.length,
      failedCount: failed.length,
      imported,
      failed,
    });
  })
);

router.use('/', crud);

export default router;
