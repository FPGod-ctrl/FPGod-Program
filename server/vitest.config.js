import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // API tests touch a real database and share a connection pool, so run them
    // serially in a single process to avoid cross-test interference.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
