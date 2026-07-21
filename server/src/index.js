import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[fpgod] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[fpgod] Anthropic: ${env.anthropic.enabled ? `enabled (${env.anthropic.model})` : 'disabled — stub mode'}`);
});

// Section-by-section plan generation can run several minutes — disable the
// default request timeouts so long generations aren't cut off.
server.requestTimeout = 0;       // no per-request timeout (default 5 min in Node 18+)
server.headersTimeout = 620000;  // generous headers timeout
server.timeout = 0;

// Graceful shutdown.
const shutdown = (signal) => {
  console.log(`\n[fpgod] ${signal} received, shutting down...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
