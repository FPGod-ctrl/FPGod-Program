import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Tests render components to static markup, so no DOM environment is needed.
    environment: 'node',
  },
});
