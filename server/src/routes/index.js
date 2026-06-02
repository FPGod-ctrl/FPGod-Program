import { Router } from 'express';
import { aiEnabled } from '../services/openai.js';
import { env } from '../config/env.js';
import dashboard from './dashboard.js';
import clients from './clients.js';
import clientGroups from './clientGroups.js';
import documents from './documents.js';
import investments from './investments.js';
import plans from './plans.js';
import transcripts from './transcripts.js';
import emails from './emails.js';
import trainingData from './trainingData.js';
import chat from './chat.js';

const router = Router();

// Service metadata (used by the Settings page to show config status).
router.get('/meta', (req, res) => {
  res.json({
    name: 'FPGod API',
    version: '1.0.0',
    aiEnabled: aiEnabled(),
    model: env.openai.model,
    storageDriver: env.storage.driver,
    maxUploadMb: Math.round(env.storage.maxUploadBytes / (1024 * 1024)),
  });
});

router.use('/dashboard', dashboard);
router.use('/clients', clients);
router.use('/client-groups', clientGroups);
router.use('/documents', documents);
router.use('/investments', investments);
router.use('/plans', plans);
router.use('/transcripts', transcripts);
router.use('/emails', emails);
router.use('/training-data', trainingData);
router.use('/chat', chat);

export default router;
