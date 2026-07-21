/**
 * STEP 2 — Record the Risk Researcher quote flow ONCE.
 *
 *   npm run record
 *
 * This opens Playwright's codegen using your saved login session, so you land in
 * XPLAN already authenticated. Then YOU click through a single Risk Researcher
 * quote end-to-end (new quote → enter a client → pick covers → run quote).
 *
 * As you click, codegen writes the exact steps + selectors into the Inspector
 * window. When done, copy ALL the generated code and paste it back to me — I'll
 * turn it into a data-driven quote runner (src/quote.mjs) that replays the flow
 * with any client's details from a JSON file.
 *
 * Why record instead of guess? Risk Researcher's screens/field names are only
 * visible once you're inside your site — recording captures them precisely.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { STORAGE_STATE, XPLAN_URL, requireUrl } from './config.mjs';

requireUrl();
if (!existsSync(STORAGE_STATE)) {
  console.error('\n  ✗ No saved session found. Run  npm run login  first.\n');
  process.exit(1);
}

console.log('\n  Launching codegen with your saved session…');
console.log('  → Click through ONE full Risk Researcher quote.');
console.log('  → Then copy the generated code from the Inspector and send it to me.\n');

const args = ['playwright', 'codegen', `--load-storage=${STORAGE_STATE}`, '--target=javascript', XPLAN_URL];
const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
