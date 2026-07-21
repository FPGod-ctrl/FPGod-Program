// XPLAN site config. Set XPLAN_URL in a local .env (gitignored) or your shell.
// Example: https://yourfirm.xplan.iress.com.au
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// minimal .env loader (no dependency) so credentials/URLs stay out of code
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const ROOT = root;
export const SESSION_DIR = resolve(root, '.session');
export const STORAGE_STATE = resolve(SESSION_DIR, 'auth.json');
export const OUT_DIR = resolve(root, 'out');
export const XPLAN_URL = process.env.XPLAN_URL || '';

export function requireUrl() {
  if (!XPLAN_URL) {
    console.error('\n  ✗ XPLAN_URL is not set.');
    console.error('    Create automation/xplan/.env with:  XPLAN_URL=https://yourfirm.xplan.iress.com.au\n');
    process.exit(1);
  }
}
