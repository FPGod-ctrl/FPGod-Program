# XPLAN assisted automation

You-in-the-loop browser automation: **you** handle login + 2FA, then scripts —
or Claude, over MCP — reuse that session to work inside XPLAN.

Two things live here:
- **Client/note lookups (read-only)** — ask Claude a question in chat, it drives
  your logged-in XPLAN session to find the answer. This is `npm run mcp`.
- **Risk Researcher quoting** — form-fill and run a quote. Still a placeholder
  pending a recorded flow (`npm run record`).

> ⚠️ **Before using on real client data:** confirm this is within your XPLAN/Iress
> terms of use and get your licensee's (Pareto Group, AFSL 418700) sign-off.
> This drives the XPLAN UI; the sanctioned long-term path is the XPLAN Custom API
> (see `../xplan-api`).

## One-time setup
1. Create `automation/xplan/.env` (gitignored) with your site URL:
   ```
   XPLAN_URL=https://yourfirm.xplan.iress.com.au
   ```
   (Playwright + Chromium are already installed.)
2. `.mcp.json` at the repo root already registers the `xplan` MCP server.

## Asking questions about clients
```bash
cd automation/xplan
npm run login      # once per session — log in + 2FA yourself
```
Then just ask in Claude Code: *"What insurance does Michelle Casper hold?"* or
*"We changed Andrew's cover but not hers — find the file note explaining why."*
Claude navigates the site and reads the pages back.

Tools exposed: `xplan_status`, `xplan_open`, `xplan_read`, `xplan_click`,
`xplan_fill`, `xplan_press`, `xplan_back`, `xplan_screenshot`.

They're deliberately generic (navigate/read/click) rather than hardcoded XPLAN
URLs, because site layouts differ between practices. Once the real paths are
known from live use, promote them to direct tools like `xplan_get_notes`.

### Read-only by default
- Navigation is locked to your XPLAN origin — off-site URLs are refused.
- Clicks whose text matches save/submit/delete/archive/send/… are refused.
  Set `XPLAN_ALLOW_WRITE=1` only if you intend to write to a client file.
- Every page read is appended to `out/access-log.jsonl` — a record of which
  client files were opened and when.
- `XPLAN_HEADLESS=1` hides the browser window; by default you can watch it work.

## Risk Researcher quoting
```bash
npm run record                        # record ONE quote, send the code to Claude
npm run quote -- ./clients/xyz.json   # after the flow is parameterised
```

## Security
- Your authenticated session lives in `.session/` (gitignored) — **never committed**.
- No credentials are stored in code or sent anywhere; login happens in your browser.
- If the session expires, the tools say so — just re-run `npm run login`.

## Status
- ✅ Login + session capture, read-only MCP browse tools, access logging.
- ⏳ `src/quote.mjs` is a placeholder until you record the flow and we
  parameterise the real Risk Researcher steps.
