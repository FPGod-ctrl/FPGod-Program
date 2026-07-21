/**
 * STEP 1 — Log in to XPLAN yourself (incl. 2FA), then we save the authenticated
 * session so later steps can reuse it without you re-doing 2FA every time.
 *
 *   npm run login
 *
 * A real Chrome window opens at your XPLAN login page. Log in + complete 2FA as
 * normal. When you've reached the XPLAN home/dashboard, come back to this
 * terminal and press ENTER. We then save the session to .session/auth.json
 * (gitignored). Nothing is sent anywhere — it stays on this machine.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import readline from 'node:readline';
import { SESSION_DIR, STORAGE_STATE, XPLAN_URL, requireUrl } from './config.mjs';

requireUrl();
mkdirSync(SESSION_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log(`\n  Opening ${XPLAN_URL}`);
console.log('  → Log in and complete 2FA in the browser window.');
console.log('  → When you reach the XPLAN dashboard, return here and press ENTER.\n');
await page.goto(XPLAN_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

await new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('  Press ENTER once you are logged in… ', () => { rl.close(); res(); });
});

await context.storageState({ path: STORAGE_STATE });
console.log(`\n  ✓ Session saved to ${STORAGE_STATE}`);
console.log('    Next: record the Risk Researcher flow →  npm run record\n');
await browser.close();
