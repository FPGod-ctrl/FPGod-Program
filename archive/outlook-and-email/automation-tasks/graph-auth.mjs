/**
 * Microsoft Graph auth for the task scanner.
 *
 * Delegated access to the adviser's own mailbox — the app acts AS him, reading
 * only what he can already read. No application-wide Mail.Read, which would grant
 * access to every mailbox in the tenant and needs an admin to approve it.
 *
 * He signs in once with a device code. MSAL keeps the refresh token in
 * state/graph-cache.json and every later run renews silently, so the scheduled
 * task never prompts. Microsoft rolls that refresh token forward on each use;
 * it only dies after ~90 days of the scanner not running at all.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from '../../server/node_modules/dotenv/lib/main.js';
import { PublicClientApplication, LogLevel } from '@azure/msal-node';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(HERE, 'state', 'graph-cache.json');

// One env file for the whole project, same as the server reads.
dotenv.config({ path: path.resolve(HERE, '../../server/.env') });

export const SCOPES = ['Mail.Read'];

export function graphConfig() {
  const clientId = process.env.GRAPH_CLIENT_ID || '';
  // "organizations" keeps this to work accounts and avoids the personal-Microsoft
  // -account path, which cannot see a business mailbox anyway.
  const tenantId = process.env.GRAPH_TENANT_ID || 'organizations';
  return { clientId, tenantId };
}

/**
 * Persist the MSAL cache to disk. Without this the refresh token lives only in
 * memory and every scheduled run would need a fresh device-code sign-in.
 */
const cachePlugin = {
  async beforeCacheAccess(ctx) {
    if (fs.existsSync(CACHE_FILE)) {
      ctx.tokenCache.deserialize(await fs.promises.readFile(CACHE_FILE, 'utf8'));
    }
  },
  async afterCacheAccess(ctx) {
    if (!ctx.cacheHasChanged) return;
    await fs.promises.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.promises.writeFile(CACHE_FILE, ctx.tokenCache.serialize(), 'utf8');
    // The cache holds a live refresh token — keep it off the group/other ACLs
    // as far as the platform allows.
    try { await fs.promises.chmod(CACHE_FILE, 0o600); } catch { /* windows */ }
  },
};

export function buildClient() {
  const { clientId, tenantId } = graphConfig();
  if (!clientId) {
    throw new Error(
      'GRAPH_CLIENT_ID is not set in server/.env — run `npm run setup` in automation/tasks for the registration steps.'
    );
  }
  return new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: { cachePlugin },
    system: {
      loggerOptions: {
        loggerCallback: () => {},
        logLevel: LogLevel.Error,
        piiLoggingEnabled: false,
      },
    },
  });
}

/**
 * Get an access token without any user interaction.
 * Returns null when there is no usable cached account — the caller decides
 * whether that is a setup prompt or a clean skip.
 */
export async function getTokenSilent(app = buildClient()) {
  const accounts = await app.getTokenCache().getAllAccounts();
  if (!accounts.length) return null;
  try {
    const res = await app.acquireTokenSilent({ account: accounts[0], scopes: SCOPES });
    return res?.accessToken || null;
  } catch {
    // Refresh token expired or revoked — needs a fresh device-code sign-in.
    return null;
  }
}

/** Interactive device-code sign-in. Used by setup-graph.mjs only. */
export async function signInWithDeviceCode(onPrompt) {
  const app = buildClient();
  const res = await app.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (info) => onPrompt(info),
  });
  return res;
}

export { CACHE_FILE };
