/**
 * MCP server — lets Claude drive your logged-in XPLAN session read-only.
 *
 * You log in once per session (`npm run login`, incl. 2FA); this server reuses
 * that saved session to navigate the site, read client pages, notes and policy
 * screens, and hand the text back so questions can be answered in chat.
 *
 * Deliberately generic: navigate / read / click / fill rather than hardcoded
 * XPLAN URLs, because site layouts differ between practices. Once the real
 * paths are known from live use, they can be promoted to direct tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as browser from './browser.mjs';

const server = new McpServer({ name: 'xplan-browse', version: '0.1.0' });

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: `XPLAN: ${e.message}` }] });
const run = (fn) => async (args) => {
  try {
    return ok(await fn(args ?? {}));
  } catch (e) {
    return fail(e);
  }
};

server.tool(
  'xplan_status',
  'Check the XPLAN connection: site URL, whether a login session is saved, and the page currently open.',
  {},
  run(() => browser.status()),
);

server.tool(
  'xplan_open',
  'Open a page in XPLAN. Accepts a path ("/factfind/list") or a full URL on your XPLAN site. Returns the page text plus its links and inputs.',
  {
    target: z.string().describe('Path or full URL on the XPLAN site'),
    maxChars: z.number().optional().describe('Cap on returned text (default 20000)'),
  },
  run(({ target, maxChars }) => browser.open(target, { maxChars })),
);

server.tool(
  'xplan_read',
  'Re-read the page currently open, without navigating. Use a larger maxChars to pull the full text of a long file note.',
  { maxChars: z.number().optional() },
  run(async ({ maxChars }) => browser.readPage(await browser.getPage(), { maxChars })),
);

server.tool(
  'xplan_click',
  'Click a link, button or tab by its visible text, then return the resulting page. Read-only: anything that looks like a write is refused.',
  {
    text: z.string().describe('Visible text of the link/button/tab, e.g. "Notes" or a client name'),
    maxChars: z.number().optional(),
  },
  run(({ text, maxChars }) => browser.click(text, { maxChars })),
);

server.tool(
  'xplan_fill',
  'Type into an input, identified by its label, placeholder, name or aria-label. Use with xplan_press("Enter") to search.',
  { field: z.string(), value: z.string() },
  run(({ field, value }) => browser.fill(field, value)),
);

server.tool(
  'xplan_press',
  'Press a key on the current page (e.g. "Enter" to submit a search), then return the resulting page.',
  { key: z.string() },
  run(({ key }) => browser.press(key)),
);

server.tool('xplan_back', 'Go back to the previous page.', { maxChars: z.number().optional() }, run(({ maxChars }) => browser.back({ maxChars })));

server.tool(
  'xplan_screenshot',
  'Screenshot the current page to a local file. Use when the text extraction is not enough to understand the layout.',
  { fullPage: z.boolean().optional() },
  run(({ fullPage }) => browser.screenshot({ fullPage })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('xplan-browse MCP server running (stdio).');
