/**
 * XPLAN Custom API endpoint paths.
 *
 * ⚠️ CONFIRM WITH IRESS: the OAuth plumbing in this connector is production-ready,
 * but the exact resource paths below are best-effort placeholders. When your
 * account exec confirms the Custom API spec (or you share the Swagger), drop the
 * real paths in here — nothing else needs to change.
 *
 * `{id}` style tokens are substituted by the tools at call time.
 */
export const endpoints = {
  // who am I / connectivity check
  me: '/resourceful/api/user',                       // CONFIRM

  // clients / entities
  searchClients: '/resourceful/api/entity?search={query}', // CONFIRM
  getClient: '/resourceful/api/entity/{entityId}',         // CONFIRM

  // in-force cover (IPS) — for current-cover auto-population
  clientPolicies: '/resourceful/api/entity/{entityId}/ips/policy', // CONFIRM

  // Risk Researcher — quoting & comparison
  riskQuotes: '/resourceful/api/entity/{entityId}/risk_researcher/quote',            // CONFIRM (list/read)
  runRiskQuote: '/resourceful/api/entity/{entityId}/risk_researcher/quote',          // CONFIRM (create/run)
  riskComparison: '/resourceful/api/entity/{entityId}/risk_researcher/comparison',   // CONFIRM
};

export function path(name, params = {}) {
  let p = endpoints[name];
  if (!p) throw new Error(`Unknown endpoint: ${name}`);
  for (const [k, v] of Object.entries(params)) p = p.replaceAll(`{${k}}`, encodeURIComponent(v));
  return p;
}
