import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { refine, getHistory } from '../services/chat.js';

const router = Router();

const isTarget = (t) => t === 'plan' || t === 'email';

// GET /api/chat/:targetType/:targetId — conversation history.
router.get(
  '/:targetType/:targetId',
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;
    if (!isTarget(targetType)) throw badRequest('targetType must be "plan" or "email"');
    const messages = await getHistory(targetType, targetId);
    res.json(messages);
  })
);

/**
 * POST /api/chat/:targetType/:targetId
 * Body: { message }
 * Applies the instruction, returns the assistant reply + updated content.
 */
router.post(
  '/:targetType/:targetId',
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;
    const { message } = req.body || {};
    if (!isTarget(targetType)) throw badRequest('targetType must be "plan" or "email"');
    if (!message || !message.trim()) throw badRequest('message is required');

    const result = await refine({ targetType, targetId, message: message.trim() });
    res.json(result);
  })
);

export default router;
