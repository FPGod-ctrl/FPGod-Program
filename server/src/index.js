import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[fpgod] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  // eslint-disable-next-line no-console
  console.log(`[fpgod] OpenAI: ${env.openai.enabled ? `enabled (${env.openai.model})` : 'disabled — stub mode'}`);
});

// Graceful shutdown.
const shutdown = (signal) => {
  // eslint-disable-next-line no-console
  console.log(`\n[fpgod] ${signal} received, shutting down...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
