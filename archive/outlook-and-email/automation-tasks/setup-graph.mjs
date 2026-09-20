/**
 * One-off Microsoft sign-in for the task scanner.
 *
 * Run this once. It stores a refresh token in state/graph-cache.json and every
 * scheduled run afterwards renews silently. Re-run it only if the scanner starts
 * reporting that it needs a sign-in — that means the token lapsed or was revoked.
 *
 * Usage: npm run setup   (from automation/tasks)
 */
import { graphConfig, signInWithDeviceCode, getTokenSilent, CACHE_FILE } from './graph-auth.mjs';

const REGISTRATION_STEPS = `
No GRAPH_CLIENT_ID found in server/.env.

The scanner signs in as you and reads only your own mailbox, but Microsoft still
needs an application to sign in to. Register one — it takes about two minutes and
costs nothing:

  1. Go to https://portal.azure.com  ->  Microsoft Entra ID  ->  App registrations
  2. "New registration"
       Name:                 FPGod Task Scanner
       Supported accounts:   Accounts in this organizational directory only
       Redirect URI:         leave blank
     Register.
  3. On the Overview page copy "Application (client) ID" and "Directory (tenant) ID".
  4. Authentication -> Advanced settings ->
     "Allow public client flows" = YES.        <- device-code sign-in needs this
  5. API permissions -> Add a permission -> Microsoft Graph -> DELEGATED
     -> Mail.Read -> Add.
     Delegated, not Application: it reads your mailbox only, and needs no
     admin consent in most tenants.

Then add both values to server/.env:

  GRAPH_CLIENT_ID=<Application (client) ID>
  GRAPH_TENANT_ID=<Directory (tenant) ID>

and run this again.
`;

/**
 * Show whose mailbox was actually authorised.
 *
 * Tristan moved firms, and both the old Lakeside and the new Legacy Risk Advice
 * accounts may be signed in on this machine. Registering or signing in against
 * the wrong tenant produces a scanner that works perfectly and reads the wrong
 * inbox — silently. So the account is confirmed out loud before anything else.
 */
async function verifyAccount(token) {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const me = await res.json();
    const address = me.mail || me.userPrincipalName || '';
    console.log('\nAuthorised mailbox:');
    console.log(`  Name    : ${me.displayName || '(unknown)'}`);
    console.log(`  Address : ${address}`);
    if (/lakeside/i.test(address)) {
      console.log('\n  *** WARNING: this is a LAKESIDE address — the previous firm. ***');
      console.log('  Re-run with --force and sign in with the Legacy Risk Advice account,');
      console.log('  and check GRAPH_TENANT_ID points at the Legacy directory.');
    }
  } catch { /* verification is a courtesy, never a failure */ }
}

async function main() {
  const { clientId, tenantId } = graphConfig();
  if (!clientId) {
    console.log(REGISTRATION_STEPS);
    process.exit(2);
  }

  const existing = await getTokenSilent();
  if (existing) {
    console.log('Already signed in — the scanner has a working token.');
    console.log(`Token cache: ${CACHE_FILE}`);
    await verifyAccount(existing);
    console.log('\nRe-run with --force to sign in as a different account.');
    if (!process.argv.includes('--force')) return;
  }

  console.log(`Signing in against tenant "${tenantId}".\n`);
  const res = await signInWithDeviceCode((info) => {
    // info.message is Microsoft's own wording, which stays correct if the flow
    // or the URL changes.
    console.log(info.message);
    console.log('\nWaiting for you to finish in the browser...');
  });

  console.log(`\nSigned in as ${res?.account?.username || 'unknown account'}.`);
  console.log(`Token cached at ${CACHE_FILE}`);
  if (res?.accessToken) await verifyAccount(res.accessToken);
  console.log('\nThe scheduled task will now run unattended. Test it with:');
  console.log('  powershell -ExecutionPolicy Bypass -File run-cycle.ps1 -ShowExcel');
}

main().catch((err) => {
  console.error(`setup-graph: ${err.message}`);
  process.exit(1);
});
