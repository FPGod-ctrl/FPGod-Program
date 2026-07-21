// CLI smoke test: confirm the token works by calling the "me" endpoint.
import { whoami } from './tools.mjs';

whoami()
  .then((u) => { console.log('\n  ✓ Connected to XPLAN as:\n'); console.dir(u, { depth: 4 }); })
  .catch((e) => { console.error('\n  ✗', e.message); if (e.body) console.error('   ', JSON.stringify(e.body)); process.exit(1); });
