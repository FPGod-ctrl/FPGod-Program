// Thin XPLAN API client: attaches the bearer token, refreshes on 401, returns JSON.
import { cfg, assertConfigured } from './config.mjs';
import { getAccessToken, refresh } from './oauth.mjs';
import { path } from './endpoints.mjs';

async function call(method, url, { body, _retried } = {}) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_retried) {
    await refresh();
    return call(method, url, { body, _retried: true });
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`XPLAN API ${method} ${url} → ${res.status}`);
    err.status = res.status; err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  /** GET by endpoint name + params, e.g. api.get('getClient', {entityId}) */
  get: (name, params) => { assertConfigured(); return call('GET', cfg.baseUrl + path(name, params)); },
  /** POST by endpoint name, e.g. api.post('runRiskQuote', {entityId}, payload) */
  post: (name, params, body) => { assertConfigured(); return call('POST', cfg.baseUrl + path(name, params), { body }); },
  /** raw GET against an absolute or base-relative URL */
  raw: (urlOrPath) => { assertConfigured(); return call('GET', urlOrPath.startsWith('http') ? urlOrPath : cfg.baseUrl + urlOrPath); },
};
