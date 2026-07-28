import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // API tests touch a real database and share a connection pool, so run them
    // serially in a single process to avoid cross-test interference.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    // The suite asserts stub-mode behaviour (`ai: false`) and must not depend on
    // whoever runs it having — or not having — a key in server/.env. A real key
    // turns plan generation into a live API call that blows testTimeout. Blank
    // it here; `dotenv.config()` leaves already-defined keys alone, so this wins.
    env: { ANTHROPIC_API_KEY: '' },
  },
});
