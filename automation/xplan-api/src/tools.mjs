// Tool implementations shared by the MCP server and CLI. Each returns plain data.
import { api } from './client.mjs';

export async function whoami() {
  return api.get('me');
}

export async function searchClients({ query }) {
  return api.get('searchClients', { query });
}

export async function getClient({ entityId }) {
  return api.get('getClient', { entityId });
}

export async function getCurrentCover({ entityId }) {
  // In-force policies (IPS). Returned shape is normalised lightly for the report.
  const policies = await api.get('clientPolicies', { entityId });
  return { entityId, policies };
}

export async function listQuotes({ entityId }) {
  return api.get('riskQuotes', { entityId });
}

/**
 * Run a Risk Researcher quote/comparison.
 * `payload` is passed through to the API — its exact shape comes from the
 * Risk Researcher API spec (covers, sums insured, insurers, options).
 */
export async function runRiskQuote({ entityId, payload }) {
  return api.post('runRiskQuote', { entityId }, payload);
}

export async function getComparison({ entityId, comparisonId }) {
  const p = comparisonId
    ? `risk_researcher/comparison/${encodeURIComponent(comparisonId)}`
    : null;
  return p ? api.raw(`/resourceful/api/entity/${encodeURIComponent(entityId)}/${p}`)
           : api.get('riskComparison', { entityId });
}
