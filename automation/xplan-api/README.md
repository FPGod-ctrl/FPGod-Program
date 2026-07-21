# XPLAN API connector (MCP) — Risk Researcher quoting

An MCP server that lets Claude Code call the **XPLAN Custom API** directly:
OAuth 2.0 login, automatic token refresh, and tools for clients, in-force cover,
and Risk Researcher quotes/comparisons. Quote results feed the insurance-report
generator in `server/scripts/generate-insurance-report.mjs`.

> ⚠️ Needs an Iress **API Agreement** + a **Custom Integration app key** (issued by
> Iress) under Pareto Group Pty Ltd (AFSL 418700). See `IRESS-API-REQUEST-email.md`.

## Setup (once credentials arrive)
1. `cp .env.example .env` and fill in the values from Iress
   (`XPLAN_BASE_URL`, `XPLAN_CLIENT_ID`, `XPLAN_CLIENT_SECRET`, `XPLAN_AUTH_URL`,
   `XPLAN_TOKEN_URL`, `XPLAN_SCOPES`). Keep `XPLAN_REDIRECT_URI=http://localhost:8765/callback`.
2. `npm install` (already done).
3. `npm run login` — opens your browser; log in + 2FA. Tokens save to `.session/` (gitignored).
4. `npm run whoami` — confirms the connection works.

## Connect to Claude Code
Add to `.mcp.json` at the repo root (see the snippet I provide), then the tools
appear in Claude:

- `xplan_whoami` — connection check
- `xplan_search_clients` / `xplan_get_client`
- `xplan_get_current_cover` — in-force policies (IPS)
- `xplan_list_quotes`
- `xplan_run_risk_quote` — run a Risk Researcher quote/comparison
- `xplan_get_comparison`

## What's production-ready vs pending
- ✅ OAuth2 (PKCE) + refresh, API client, MCP server, tool surface.
- ⏳ Exact Risk Researcher **endpoint paths** in `src/endpoints.mjs` are placeholders
  marked `CONFIRM` — drop in the real paths from the Iress Custom API spec/Swagger
  and everything else works unchanged.

## Security
- Secrets live only in `.env`; tokens only in `.session/` — both gitignored.
- Nothing is sent anywhere except your XPLAN site over HTTPS.
- 401s trigger a single silent token refresh; if refresh fails, re-run `npm run login`.
