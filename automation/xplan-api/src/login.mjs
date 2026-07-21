// CLI: run the OAuth2 login once. Opens your browser; you log in + 2FA.
import { login } from './oauth.mjs';

login().catch((e) => { console.error('\n  ✗', e.message, '\n'); process.exit(1); });
