import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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

router.use('/', crud);

export default router;
