/**
 * STEP 3 — Replay the recorded Risk Researcher flow with real client data.
 *
 *   npm run quote -- ./clients/example.json
 *
 * PLACEHOLDER: the actual click-by-click steps get filled in here AFTER you run
 * `npm run record` and send me the generated code. Right now this just:
 *   - loads your saved session,
 *   - opens XPLAN authenticated,
 *   - loads the client JSON,
 *   - and pauses so you can confirm we're in the right place.
 *
 * Once we have the recording, the `runQuote()` body becomes the parameterised
 * Risk Researcher steps (fill name/DOB/cover amounts from `data`, click Quote,
 * then scrape the premium table back out to JSON / hand to the report generator).
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { STORAGE_STATE, XPLAN_URL, OUT_DIR, requireUrl } from './config.mjs';

requireUrl();
if (!existsSync(STORAGE_STATE)) {
  console.error('\n  ✗ No saved session. Run  npm run login  first.\n');
  process.exit(1);
}

const dataArg = process.argv[2];
if (!dataArg) {
  console.error('\n  Usage: npm run quote -- ./clients/yourclient.json\n');
  process.exit(1);
}
const data = JSON.parse(readFileSync(resolve(process.cwd(), dataArg), 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: STORAGE_STATE });
const page = await context.newPage();
await page.goto(XPLAN_URL, { waitUntil: 'domcontentloaded' });

await runQuote(page, data);

await browser.close();

/** Filled in once we have the recorded flow. */
async function runQuote(page, data) {
  console.log('\n  Loaded client:', data.name || '(unnamed)');
  console.log('  ⚠ Quote steps not recorded yet — run `npm run record` and send me the output.');
  console.log('  Pausing so you can verify you are logged in. Close the window when done.\n');
  await page.pause(); // opens the Inspector; lets you confirm session works
}
