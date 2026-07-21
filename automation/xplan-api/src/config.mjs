// Loads config from a local .env (gitignored). No external dependency.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');

const envPath = resolve(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const SESSION_DIR = resolve(ROOT, '.session');
export const TOKENS_PATH = resolve(SESSION_DIR, 'tokens.json');

export const cfg = {
  baseUrl: process.env.XPLAN_BASE_URL || '',
  clientId: process.env.XPLAN_CLIENT_ID || '',
  clientSecret: process.env.XPLAN_CLIENT_SECRET || '',
  authUrl: process.env.XPLAN_AUTH_URL || '',
  tokenUrl: process.env.XPLAN_TOKEN_URL || '',
  scopes: (process.env.XPLAN_SCOPES || '').trim(),
  redirectUri: process.env.XPLAN_REDIRECT_URI || 'http://localhost:8765/callback',
};

/** Throw a clear error listing whatever is still missing. */
export function assertConfigured(keys = ['baseUrl', 'clientId', 'clientSecret', 'authUrl', 'tokenUrl']) {
  const missing = keys.filter((k) => !cfg[k]);
  if (missing.length) {
    const map = { baseUrl: 'XPLAN_BASE_URL', clientId: 'XPLAN_CLIENT_ID', clientSecret: 'XPLAN_CLIENT_SECRET', authUrl: 'XPLAN_AUTH_URL', tokenUrl: 'XPLAN_TOKEN_URL', scopes: 'XPLAN_SCOPES', redirectUri: 'XPLAN_REDIRECT_URI' };
    throw new Error(`Missing config: ${missing.map((k) => map[k]).join(', ')}. Fill them in automation/xplan-api/.env (see .env.example).`);
  }
}
