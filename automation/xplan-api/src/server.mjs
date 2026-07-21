// MCP server exposing XPLAN Risk Researcher tools to Claude Code over stdio.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { isLoggedIn } from './oauth.mjs';
import * as tools from './tools.mjs';

const server = new McpServer({ name: 'xplan-api', version: '0.1.0' });

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: `XPLAN error: ${e.message}${e.body ? '\n' + JSON.stringify(e.body) : ''}` }] });
const guard = (fn) => async (args) => {
  if (!isLoggedIn()) return fail(new Error('Not logged in. Run `npm run login` in automation/xplan-api first.'));
  try { return ok(await fn(args)); } catch (e) { return fail(e); }
};

server.tool('xplan_whoami', 'Confirm the XPLAN connection and show the authenticated user.', {}, guard(() => tools.whoami()));

server.tool('xplan_search_clients', 'Search XPLAN clients/entities by name.',
  { query: z.string().describe('Name or partial name to search for') },
  guard(({ query }) => tools.searchClients({ query })));

server.tool('xplan_get_client', 'Get an XPLAN client/entity by id.',
  { entityId: z.string().describe('XPLAN entity id') },
  guard(({ entityId }) => tools.getClient({ entityId })));

server.tool('xplan_get_current_cover', 'Get a client\'s in-force insurance policies (IPS).',
  { entityId: z.string() },
  guard(({ entityId }) => tools.getCurrentCover({ entityId })));

server.tool('xplan_list_quotes', 'List existing Risk Researcher quotes for a client.',
  { entityId: z.string() },
  guard(({ entityId }) => tools.listQuotes({ entityId })));

server.tool('xplan_run_risk_quote', 'Run a Risk Researcher quote/comparison for a client.',
  {
    entityId: z.string().describe('XPLAN entity id to quote on'),
    payload: z.record(z.any()).describe('Risk Researcher quote request (covers, sums insured, insurers, options) per the API spec'),
  },
  guard(({ entityId, payload }) => tools.runRiskQuote({ entityId, payload })));

server.tool('xplan_get_comparison', 'Retrieve a Risk Researcher comparison result.',
  { entityId: z.string(), comparisonId: z.string().optional() },
  guard(({ entityId, comparisonId }) => tools.getComparison({ entityId, comparisonId })));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('xplan-api MCP server running (stdio).');
