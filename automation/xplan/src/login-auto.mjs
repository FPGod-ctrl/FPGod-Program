/**
 * Log in to XPLAN — no terminal interaction required.
 *
 * Opens a real Chrome window at your XPLAN site. You sign in and complete 2FA.
 * The script watches the page and saves the session by itself once you're
 * through, so it can be launched by Claude rather than typed by you.
 *
 *   npm run login:auto
 *
 * Gives up after LOGIN_TIMEOUT_MS so a forgotten window doesn't hang forever.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { SESSION_DIR, STORAGE_STATE, XPLAN_URL, requireUrl } from './config.mjs';

const TIMEOUT_MS = Number(process.env.LOGIN_TIMEOUT_MS || 10 * 60 * 1000);
const POLL_MS = 2000;
const STABLE_CHECKS = 2; // consecutive clean polls before we trust it

// Iress SSO bounces through auth.id.iress.com (Auth0), which asks for your
// email before it ever shows a password field — so "no password box" is NOT
// proof of being logged in. We require the browser to be back on the XPLAN
// host AND showing something only an authenticated page has.
const XPLAN_HOST = new URL(XPLAN_URL).host;

requireUrl();
mkdirSync(SESSION_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

console.log(`\n  Opening ${XPLAN_URL}`);
console.log('  → Sign in and complete 2FA in the browser window.');
console.log('  → Nothing to press here; the session saves itself once you are in.\n');
await page.goto(XPLAN_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

const deadline = Date.now() + TIMEOUT_MS;
let clean = 0;
let saved = false;

while (Date.now() < deadline) {
  // A plain timer, not page.waitForTimeout — the poll must not depend on the
  // page still being alive, or closing the window throws instead of reporting.
  await new Promise((r) => setTimeout(r, POLL_MS));

  if (page.isClosed()) {
    console.error('\n  ✗ Browser window was closed before the login finished — nothing saved.');
    console.error('    Re-run and leave the window open until your XPLAN dashboard loads.\n');
    break;
  }

  let host = '';
  try {
    host = new URL(page.url()).host;
  } catch { /* about:blank between redirects */ }
  const onXplanHost = host === XPLAN_HOST;

  // Proof of an authenticated page: XPLAN always offers a way out.
  const looksLoggedIn = onXplanHost
    ? await page
        .evaluate(() => {
          if (document.querySelector('input[type=password]')) return false;
          const hasLogout = [...document.querySelectorAll('a[href], button')].some((el) => {
            const href = (el.getAttribute('href') || '').toLowerCase();
            const label = (el.innerText || '').trim().toLowerCase();
            return href.includes('logout') || href.includes('signout') || /^(log|sign) ?out$/.test(label);
          });
          const substantial = (document.body?.innerText || '').trim().length > 400;
          return hasLogout && substantial;
        })
        .catch(() => false)
    : false;

  if (looksLoggedIn) {
    clean += 1;
    if (clean >= STABLE_CHECKS) {
      await context.storageState({ path: STORAGE_STATE });
      saved = true;
      console.log(`\n  ✓ Session saved to ${STORAGE_STATE}`);
      console.log(`    Landed on: ${page.url()}\n`);
      break;
    }
  } else {
    clean = 0;
  }
}

if (!saved && !page.isClosed()) {
  console.error(`\n  ✗ Timed out after ${Math.round(TIMEOUT_MS / 1000)}s without a completed login.\n`);
}

await browser.close().catch(() => {});
process.exit(saved ? 0 : 1);
