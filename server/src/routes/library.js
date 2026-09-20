import { Router } from 'express';
import path from 'node:path';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { indexClients, indexClientFiles, listClients, getClient, indexStatus } from '../services/library/indexer.js';
import { ask, history, clearHistory } from '../services/library/ask.js';
import { readFileBuffer, absolutePathOf } from '../services/library/fsGuard.js';

/**
 * Client Library API.
 *
 * Every route here is a read. There is deliberately no endpoint that writes to
 * the document roots — see services/library/fsGuard.js. The only writes this
 * router performs are to this app's own database (the index and its text cache).
 */
const router = Router();

// Where the library is, whether it's reachable, and how much is indexed.
router.get('/status', asyncHandler(async (req, res) => res.json(await indexStatus())));

// Rebuild the client index. Streams progress — the SharePoint pass walks ~1,278
// folders, which takes a few seconds even though it only reads names.
router.post(
  '/reindex',
  asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    const send = (o) => res.write(`${JSON.stringify(o)}\n`);
    try {
      const result = await indexClients((p) => send({ type: 'progress', ...p }));
      send({ type: 'done', ...result, ...(await indexStatus()) });
    } catch (err) {
      send({ type: 'error', message: err.message });
    }
    res.end();
  })
);

// Search the index. `?q=` ranks by name match; without it, the first page A-Z.
router.get(
  '/clients',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(await listClients({ q: String(req.query.q || '').trim(), limit }));
  })
);

router.get(
  '/clients/:id/files',
  asyncHandler(async (req, res) => {
    const client = await getClient(req.params.id);
    if (!client) throw notFound('Client not in the library index');
    if (!client.files_indexed_at) await indexClientFiles(client);
    const { rows } = await query(
      `SELECT f.id, f.name, f.rel_path, f.ext, f.category, f.advice_year, f.size_bytes, f.modified_at,
              (t.file_id IS NOT NULL) AS text_cached
         FROM library_files f
         LEFT JOIN library_file_text t ON t.file_id = f.id
        WHERE f.client_id = $1
        ORDER BY f.advice_year DESC NULLS LAST, f.category, f.name`,
      [client.id]
    );
    res.json({ client, files: rows });
  })
);

router.get('/clients/:id/history', asyncHandler(async (req, res) => res.json(await history(req.params.id))));

router.delete(
  '/clients/:id/history',
  asyncHandler(async (req, res) => {
    await clearHistory(req.params.id);
    res.status(204).end();
  })
);

/**
 * The question box. Streams progress because the first question about a client
 * downloads their files from OneDrive, which can take a minute.
 */
router.post(
  '/ask',
  asyncHandler(async (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) throw badRequest('Ask a question first');

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    const send = (o) => res.write(`${JSON.stringify(o)}\n`);
    try {
      const result = await ask({
        question,
        clientId: req.body?.clientId || null,
        onProgress: (p) => send({ type: 'progress', ...p }),
      });
      send({ type: 'done', ...result });
    } catch (err) {
      console.error('[library] ask failed:', err);
      send({ type: 'error', message: err.message });
    }
    res.end();
  })
);

const MIME = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const fileWithClient = async (id) => {
  const { rows } = await query(
    `SELECT f.*, c.source, c.display_name
       FROM library_files f JOIN library_clients c ON c.id = f.client_id
      WHERE f.id = $1`,
    [id]
  );
  return rows[0] || null;
};

// Open a source document. Reads the file and streams a copy to the browser;
// the original is never touched.
router.get(
  '/files/:id/download',
  asyncHandler(async (req, res) => {
    const file = await fileWithClient(req.params.id);
    if (!file) throw notFound('File not in the index');
    const buf = await readFileBuffer(file.source, file.rel_path);
    res.setHeader('Content-Type', MIME[(file.ext || '').toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.send(buf);
  })
);

// The file's real location, so the adviser can open it in Word or Explorer.
router.get(
  '/files/:id/path',
  asyncHandler(async (req, res) => {
    const file = await fileWithClient(req.params.id);
    if (!file) throw notFound('File not in the index');
    const abs = absolutePathOf(file.source, file.rel_path);
    res.json({ path: abs, folder: path.dirname(abs), name: file.name, readOnly: true });
  })
);

export default router;
