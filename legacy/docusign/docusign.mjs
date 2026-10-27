// Creates DocuSign *draft* envelopes from an SOA pack manifest. Nothing is ever sent:
// the envelope is saved with status "created" and Tristan reviews and sends it in DocuSign.
//
// Auth is JWT grant (service integration). Credentials live outside the repo in
//   C:\Users\TristanBiro\.docusign\config.json   and the RSA private key next to it.
//
//   node legacy/docusign/docusign.mjs consent             print the one-time consent link
//   node legacy/docusign/docusign.mjs check               get a token and list the accounts it can use
//   node legacy/docusign/docusign.mjs draft <manifest>    create a draft envelope
//   node legacy/docusign/docusign.mjs draft <manifest> --dry-run   validate and print, no API call
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const CONFIG_DIR = path.join(os.homedir(), '.docusign');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// config.json:
// { "env": "demo" | "prod", "integrationKey": "...", "userId": "...", "accountId": "...",
//   "privateKeyFile": "private.key", "redirectUri": "https://www.docusign.com",
//   "adviser": { "name": "Joshua Davidson", "email": "..." } }
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) throw new Error(`No config at ${CONFIG_FILE}. See legacy/docusign/README.md.`);
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  for (const k of ['env', 'integrationKey', 'userId']) if (!cfg[k]) throw new Error(`config.json is missing "${k}"`);
  cfg.authHost = cfg.env === 'prod' ? 'account.docusign.com' : 'account-d.docusign.com';
  return cfg;
}

const b64url = buf => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function jwtAssertion(cfg) {
  const keyPath = path.resolve(CONFIG_DIR, cfg.privateKeyFile || 'private.key');
  const key = fs.readFileSync(keyPath, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    iss: cfg.integrationKey, sub: cfg.userId, aud: cfg.authHost,
    iat: now, exp: now + 3600, scope: 'signature impersonation',
  }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key);
  return `${head}.${body}.${b64url(sig)}`;
}

async function getToken(cfg) {
  const res = await fetch(`https://${cfg.authHost}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion(cfg),
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json.error === 'consent_required') throw new Error('Consent not given yet. Run "consent" and open the link.');
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function getAccount(cfg, token) {
  const res = await fetch(`https://${cfg.authHost}/oauth/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
  const info = await res.json();
  if (!res.ok) throw new Error(`userinfo failed: ${res.status} ${JSON.stringify(info)}`);
  const acct = cfg.accountId
    ? info.accounts.find(a => a.account_id === cfg.accountId)
    : info.accounts.find(a => a.is_default);
  if (!acct) throw new Error(`Account ${cfg.accountId} is not available to this user. Run "check".`);
  return { info, acct };
}

// --- manifest -> envelope definition ------------------------------------------------------
// Manifest (JSON):
// { "folder": "C:/Users/.../Downloads/<Pack>", "emailSubject": "...", "emailBlurb": "...",
//   "signers": { "<id>": { "name": "...", "email": "...", "routingOrder": 1 } , "adviser": "config" },
//   "documents": [ { "file": "1 - ....pdf", "name": "Statement of Advice",
//                    "tabs": { "<signer id>": [ { "type": "signHere", "page": 36, "x": 80, "y": 555 } ] } } ] }
// x/y are PDF points from the top-left of the page (DocuSign uses the same units).
// For a .docx (page layout unknown until DocuSign converts it) use { "anchor": "text", "dx": .., "dy": .. }
// instead of page/x/y; the anchor text must be unique across the whole envelope.
// "adviser": "config" pulls the adviser's name and email from config.json.
const TAB_LISTS = { signHere: 'signHereTabs', dateSigned: 'dateSignedTabs', checkbox: 'checkboxTabs',
                    initialHere: 'initialHereTabs', fullName: 'fullNameTabs', text: 'textTabs' };

function buildEnvelope(manifest, cfg, { withFiles }) {
  const signerIds = Object.keys(manifest.signers);
  const signers = signerIds.map((id, i) => {
    let s = manifest.signers[id];
    if (s === 'config') {
      if (!cfg.adviser?.email) throw new Error('Manifest wants the adviser from config, but config.json has no adviser.email');
      s = { ...cfg.adviser, routingOrder: 2 };
    }
    if (!s.email || !s.name) throw new Error(`Signer "${id}" needs a name and email`);
    // demo envelopes must never reach clients: every signer is redirected to the test inbox
    let email = s.email;
    if (cfg.env !== 'prod') {
      if (!cfg.testEmail) throw new Error('config.json needs "testEmail" while env is "demo"');
      email = cfg.testEmail;
    }
    return { id, recipientId: String(i + 1), name: s.name, email, routingOrder: String(s.routingOrder || 1), tabs: {} };
  });

  const documents = manifest.documents.map((d, i) => {
    const file = path.join(manifest.folder, d.file);
    if (!fs.existsSync(file)) throw new Error(`Missing document: ${file}`);
    const ext = path.extname(file).slice(1).toLowerCase();
    const documentId = String(i + 1);
    for (const [sid, tabs] of Object.entries(d.tabs || {})) {
      const signer = signers.find(s => s.id === sid);
      if (!signer) throw new Error(`${d.file}: tab for unknown signer "${sid}"`);
      for (const t of tabs) {
        const list = TAB_LISTS[t.type];
        if (!list) throw new Error(`${d.file}: unknown tab type "${t.type}"`);
        // anchor tabs search the whole envelope, so the anchor text must appear in this document only
        const where = t.anchor
          ? { anchorString: t.anchor, anchorXOffset: String(t.dx || 0), anchorYOffset: String(t.dy || 0),
              anchorUnits: 'pixels', anchorIgnoreIfNotPresent: 'false' }
          : { documentId, pageNumber: String(t.page), xPosition: String(t.x), yPosition: String(t.y) };
        (signer.tabs[list] ||= []).push({
          ...where,
          ...(t.label ? { tabLabel: t.label } : {}), ...(t.required === false ? { required: 'false' } : {}),
        });
      }
    }
    return {
      documentId, name: d.name || path.basename(d.file, path.extname(d.file)), fileExtension: ext,
      documentBase64: withFiles ? fs.readFileSync(file).toString('base64') : `<${fs.statSync(file).size} bytes>`,
    };
  });

  return {
    emailSubject: manifest.emailSubject,
    emailBlurb: manifest.emailBlurb || '',
    status: 'created', // draft only, never "sent"
    documents,
    recipients: { signers: signers.map(({ id, ...s }) => s) },
  };
}

// --- commands -----------------------------------------------------------------------------
const [cmd, arg, flag] = process.argv.slice(2);

if (cmd === 'consent') {
  const cfg = loadConfig();
  const url = new URL(`https://${cfg.authHost}/oauth/auth`);
  url.search = new URLSearchParams({
    response_type: 'code', scope: 'signature impersonation',
    client_id: cfg.integrationKey, redirect_uri: cfg.redirectUri || 'https://www.docusign.com',
  });
  console.log('Open this link while logged in to DocuSign and click Accept:\n\n' + url.href + '\n');
  console.log('After accepting you are sent to the redirect page. It is fine if that page shows nothing useful.');
} else if (cmd === 'check') {
  const cfg = loadConfig();
  const token = await getToken(cfg);
  const { info, acct } = await getAccount(cfg, token);
  console.log(`Token OK for ${info.name} <${info.email}> (${cfg.env})`);
  for (const a of info.accounts) console.log(`  ${a.account_id === acct.account_id ? '*' : ' '} ${a.account_name}  id=${a.account_id}  ${a.base_uri}`);
  if (!cfg.adviser?.email) console.log('\nNote: config.json has no adviser.email yet (needed for the countersignature).');
} else if (cmd === 'draft' && arg) {
  const cfg = loadConfig();
  const manifest = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const dry = flag === '--dry-run';
  const env = buildEnvelope(manifest, cfg, { withFiles: !dry });
  if (dry) {
    console.log(JSON.stringify(env, null, 2));
    console.log('\nDry run: nothing was sent to DocuSign.');
  } else {
    const token = await getToken(cfg);
    const { acct } = await getAccount(cfg, token);
    const res = await fetch(`${acct.base_uri}/restapi/v2.1/accounts/${acct.account_id}/envelopes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Envelope create failed: ${res.status} ${JSON.stringify(json)}`);
    console.log(`Draft envelope created: ${json.envelopeId} (status ${json.status})`);
    console.log('Open DocuSign > Agreements > Drafts to review the fields and send it.');
  }
} else {
  console.log('Usage: docusign.mjs consent | check | draft <manifest.json> [--dry-run]');
  process.exit(1);
}
