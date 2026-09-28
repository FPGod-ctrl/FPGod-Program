import { Router } from 'express';
import { aiEnabled } from '../services/ai.js';
import { env } from '../config/env.js';
import dashboard from './dashboard.js';
import clients from './clients.js';
import clientGroups from './clientGroups.js';
import documents from './documents.js';
import investments from './investments.js';
import cfs from './cfs.js';
import plans from './plans.js';
import transcripts from './transcripts.js';
import trainingData from './trainingData.js';
import chat from './chat.js';
import financials from './financials.js';
import family from './family.js';
import tasks from './tasks.js';
import library from './library.js';
import crm from './crm.js';

const router = Router();

// Service metadata (used by the Settings page to show config status).
router.get('/meta', (req, res) => {
  res.json({
    name: 'FPGod API',
    version: '1.0.0',
    aiEnabled: aiEnabled(),
    model: env.anthropic.model,
    storageDriver: env.storage.driver,
    maxUploadMb: Math.round(env.storage.maxUploadBytes / (1024 * 1024)),
  });
});

router.use('/tasks', tasks);
router.use('/dashboard', dashboard);
router.use('/clients', clients);
router.use('/client-groups', clientGroups);
router.use('/documents', documents);
router.use('/investments', investments);
router.use('/cfs', cfs);
router.use('/plans', plans);
router.use('/transcripts', transcripts);
router.use('/training-data', trainingData);
router.use('/chat', chat);
router.use('/family', family);
// Client Library: ask a question, read the client's own files (read-only).
router.use('/library', library);
// CRM: contacts, logged communication, pipeline stage; tasks shared with /tasks.
router.use('/crm', crm);
// Financial breakdown: /api/assets, /liabilities, /income, /expenses, /insurance, /goals
router.use('/', financials);

export default router;
