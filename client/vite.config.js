import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api to the backend so the frontend can use same-origin relative URLs
    // in dev. In production, set VITE_API_URL to the deployed API base instead.
    proxy: {
      // Long generations (section-by-section plans) can run several minutes —
      // allow up to 10 min so the proxy doesn't cut the request off.
      '/api': { target: 'http://localhost:4000', changeOrigin: true, timeout: 600000, proxyTimeout: 600000 },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
