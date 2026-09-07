/**
 * Shared browser for the XPLAN read tools.
 *
 * Opens one Chromium instance using the session you saved with `npm run login`,
 * and keeps it alive for the life of the MCP server so navigation state (which
 * client you're on, which tab) survives between tool calls.
 *
 * Guards, because this drives real client files:
 *   - navigation is locked to your XPLAN origin; off-site URLs are refused
 *   - clicks on anything that looks like a write (save/delete/submit/…) are
 *     refused unless XPLAN_ALLOW_WRITE=1
 *   - every page read is appended to out/access-log.jsonl
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STORAGE_STATE, XPLAN_URL, OUT_DIR, requireUrl } from './config.mjs';

const HEADLESS = process.env.XPLAN_HEADLESS === '1';
const ALLOW_WRITE = process.env.XPLAN_ALLOW_WRITE === '1';
const WRITE_WORDS = /\b(save|submit|delete|remove|archive|send|approve|create|update|confirm|pay|merge|cancel)\b/i;

let browser;
let context;
let page;

export function hasSession() {
  return existsSync(STORAGE_STATE);
}

/** Same-origin check — keeps the driven browser inside your XPLAN site. */
export function resolveUrl(target) {
  requireUrl();
  const base = new URL(XPLAN_URL);
  const url = new URL(target, base);
  if (url.origin !== base.origin) {
    throw new Error(`Refused: ${url.origin} is outside your XPLAN site (${base.origin}).`);
  }
  return url.toString();
}

export async function getPage() {
  if (page && !page.isClosed()) return page;
  requireUrl();
  if (!hasSession()) {
    throw new Error('No saved XPLAN session. Run `npm run login` in automation/xplan, then try again.');
  }
  browser ??= await chromium.launch({ headless: HEADLESS });
  context ??= await browser.newContext({ storageState: STORAGE_STATE, viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  return page;
}

function logAccess(action, p, extra = {}) {
  try {
    mkdirSync(OUT_DIR, { recursive: true });
    appendFileSync(
      resolve(OUT_DIR, 'access-log.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), action, url: p?.url?.() ?? null, ...extra }) + '\n',
    );
  } catch { /* logging must never break a lookup */ }
}

/** Pull the visible text out of one frame. XPLAN nests a lot of its UI in iframes. */
async function frameText(frame) {
  return frame
    .evaluate(() => {
      const body = document.body;
      if (!body) return '';
      // innerText already renders tables as tab-separated rows, which suits
      // XPLAN's very table-heavy pages.
      return body.innerText || '';
    })
    .catch(() => '');
}

/**
 * Read the current page as text, plus the links and inputs available on it so
 * the next step (click / fill) has something concrete to aim at.
 */
export async function readPage(p, { maxChars = 20000 } = {}) {
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  await p.waitForTimeout(400); // let XPLAN's async panels settle

  const parts = [];
  for (const frame of p.frames()) {
    const text = (await frameText(frame)).trim();
    if (!text) continue;
    const label = frame === p.mainFrame() ? '' : `\n--- frame: ${frame.name() || frame.url()} ---\n`;
    parts.push(label + text);
  }

  let text = parts
    .join('\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const truncated = text.length > maxChars;
  if (truncated) text = text.slice(0, maxChars);

  const { links, inputs, needsLogin } = await p
    .evaluate(() => {
      const seen = new Set();
      const links = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const label = (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
        if (!label || seen.has(label)) continue;
        seen.add(label);
        links.push({ text: label.slice(0, 80), href: a.href });
        if (links.length >= 200) break;
      }
      const inputs = [];
      for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
        const label =
          el.getAttribute('aria-label') ||
          el.getAttribute('placeholder') ||
          el.getAttribute('name') ||
          el.id ||
          '';
        if (label) inputs.push({ label: label.slice(0, 60), type: el.type || el.tagName.toLowerCase() });
        if (inputs.length >= 40) break;
      }
      const needsLogin = !!document.querySelector('input[type=password]');
      return { links, inputs, needsLogin };
    })
    .catch(() => ({ links: [], inputs: [], needsLogin: false }));

  const title = await p.title().catch(() => '');
  logAccess('read', p, { title, chars: text.length });

  if (needsLogin) {
    return {
      url: p.url(),
      title,
      sessionExpired: true,
      text: 'Your XPLAN session has expired — this is the login page. Run `npm run login` in automation/xplan to sign in again.',
      links: [],
      inputs: [],
    };
  }

  return { url: p.url(), title, text, truncated, links, inputs };
}

export async function open(target, opts) {
  const p = await getPage();
  const url = resolveUrl(target);
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  return readPage(p, opts);
}

export async function click(text, opts) {
  const p = await getPage();
  if (!ALLOW_WRITE && WRITE_WORDS.test(text)) {
    throw new Error(
      `Refused: "${text}" looks like it changes data. These tools are read-only; ` +
        'set XPLAN_ALLOW_WRITE=1 only if you intend to write to the client file.',
    );
  }
  const candidates = [
    p.getByRole('link', { name: text }),
    p.getByRole('button', { name: text }),
    p.getByRole('tab', { name: text }),
    p.getByText(text, { exact: false }),
  ];
  let clicked = false;
  for (const locator of candidates) {
    const target = locator.first();
    if (await target.count().then((n) => n > 0).catch(() => false)) {
      await target.click({ timeout: 8000 }).catch(() => {});
      clicked = true;
      break;
    }
  }
  if (!clicked) throw new Error(`Nothing clickable matching "${text}" on this page.`);
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  logAccess('click', p, { text });
  return readPage(p, opts);
}

export async function fill(field, value) {
  const p = await getPage();
  const candidates = [
    p.getByLabel(field),
    p.getByPlaceholder(field),
    p.locator(`[name="${field}"]`),
    p.locator(`[aria-label="${field}"]`),
  ];
  for (const locator of candidates) {
    const target = locator.first();
    if (await target.count().then((n) => n > 0).catch(() => false)) {
      await target.fill(value, { timeout: 8000 });
      return { ok: true, field, value };
    }
  }
  throw new Error(`No input matching "${field}" on this page.`);
}

export async function press(key) {
  const p = await getPage();
  await p.keyboard.press(key);
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  return readPage(p);
}

export async function back(opts) {
  const p = await getPage();
  await p.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  return readPage(p, opts);
}

export async function screenshot({ fullPage = false } = {}) {
  const p = await getPage();
  mkdirSync(OUT_DIR, { recursive: true });
  const file = resolve(OUT_DIR, `shot-${Date.now()}.png`);
  await p.screenshot({ path: file, fullPage });
  logAccess('screenshot', p, { file });
  return { path: file };
}

export async function status() {
  return {
    site: XPLAN_URL || null,
    sessionSaved: hasSession(),
    browserOpen: !!(page && !page.isClosed()),
    currentUrl: page && !page.isClosed() ? page.url() : null,
    writeEnabled: ALLOW_WRITE,
  };
}
