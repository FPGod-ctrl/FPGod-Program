// OAuth 2.0 Authorization Code flow with PKCE, a local callback listener,
// token persistence, and automatic refresh. Works with Iress Xplan API OAuth2.
import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cfg, SESSION_DIR, TOKENS_PATH, assertConfigured } from './config.mjs';

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function pkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function loadTokens() {
  if (!existsSync(TOKENS_PATH)) return null;
  try { return JSON.parse(readFileSync(TOKENS_PATH, 'utf8')); } catch { return null; }
}

function saveTokens(tok) {
  mkdirSync(SESSION_DIR, { recursive: true });
  // expires_at = absolute ms; refresh 60s early
  const expires_at = tok.expires_in ? Date.now() + (tok.expires_in - 60) * 1000 : 0;
  writeFileSync(TOKENS_PATH, JSON.stringify({ ...tok, expires_at }, null, 2));
  return { ...tok, expires_at };
}

/** Full interactive login: opens the auth URL, captures the code, exchanges for tokens. */
export async function login({ open = true } = {}) {
  assertConfigured();
  const { verifier, challenge } = pkce();
  const state = b64url(crypto.randomBytes(16));
  const redirect = new URL(cfg.redirectUri);
  const port = Number(redirect.port) || 8765;

  const authUrl = new URL(cfg.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
  if (cfg.scopes) authUrl.searchParams.set('scope', cfg.scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const codePromise = new Promise((resolveCode, rejectCode) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://localhost:${port}`);
      if (u.pathname !== redirect.pathname) { res.writeHead(404); res.end(); return; }
      const code = u.searchParams.get('code');
      const retState = u.searchParams.get('state');
      const err = u.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px"><h2>${err ? 'Login failed' : 'XPLAN connected ✓'}</h2><p>${err ? err : 'You can close this tab and return to the terminal.'}</p></body></html>`);
      server.close();
      if (err) return rejectCode(new Error(`OAuth error: ${err}`));
      if (retState !== state) return rejectCode(new Error('State mismatch — aborting.'));
      resolveCode(code);
    });
    server.listen(port, () => {
      console.log(`\n  Listening for the OAuth redirect on ${cfg.redirectUri}`);
      console.log('\n  Open this URL in your browser to authorise (log in + 2FA):\n');
      console.log('   ', authUrl.toString(), '\n');
      if (open) openInBrowser(authUrl.toString());
    });
  });

  const code = await codePromise;
  const tok = await exchange({ code, verifier });
  console.log('\n  ✓ Tokens saved. The MCP connector can now call the XPLAN API.\n');
  return tok;
}

async function exchange({ code, verifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: verifier,
  });
  return tokenRequest(body);
}

export async function refresh() {
  const cur = loadTokens();
  if (!cur?.refresh_token) throw new Error('No refresh token — run `npm run login`.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: cur.refresh_token,
    client_id: cfg.clientId,
  });
  const tok = await tokenRequest(body, cur.refresh_token);
  return tok;
}

async function tokenRequest(body, fallbackRefresh) {
  // Iress supports client_secret_post; also send Basic auth for compatibility.
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret);
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token endpoint ${res.status}: ${text}`);
  const tok = JSON.parse(text);
  // refresh responses sometimes omit the refresh_token — keep the old one
  if (!tok.refresh_token && fallbackRefresh) tok.refresh_token = fallbackRefresh;
  return saveTokens(tok);
}

/** Returns a valid access token, refreshing if expired. */
export async function getAccessToken() {
  let tok = loadTokens();
  if (!tok) throw new Error('Not logged in — run `npm run login`.');
  if (!tok.expires_at || Date.now() >= tok.expires_at) tok = await refresh();
  return tok.access_token;
}

export function isLoggedIn() {
  return !!loadTokens()?.access_token;
}

function openInBrowser(url) {
  const cmds = { win32: ['cmd', ['/c', 'start', '""', url]], darwin: ['open', [url]], linux: ['xdg-open', [url]] };
  const [bin, args] = cmds[process.platform] || cmds.linux;
  import('node:child_process').then(({ spawn }) => { try { spawn(bin, args, { stdio: 'ignore', detached: true }).unref(); } catch {} });
}
