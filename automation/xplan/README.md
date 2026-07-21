# XPLAN assisted automation (Risk Researcher quoting)

You-in-the-loop browser automation: **you** handle login + 2FA, the script drives
Risk Researcher form-fill and runs the quote.

> ⚠️ **Before using on real client data:** confirm this is within your XPLAN/Iress
> terms of use and get your licensee's (Pareto Group, AFSL 418700) sign-off.
> This drives the XPLAN UI; the sanctioned long-term path is the XPLAN Custom API.

## One-time setup
1. Create `automation/xplan/.env` (gitignored) with your site URL:
   ```
   XPLAN_URL=https://yourfirm.xplan.iress.com.au
   ```
   (Playwright + Chromium are already installed.)

## Each session
```bash
cd automation/xplan

# STEP 1 — log in yourself (incl. 2FA). Saves the session locally.
npm run login

# STEP 2 — record ONE Risk Researcher quote (first time only).
#   Click through a full quote; copy the generated code and send it to Claude.
npm run record

# STEP 3 — run a quote from client data (after the flow is recorded).
npm run quote -- ./clients/yourclient.json
```

## Security
- Your authenticated session lives in `.session/` (gitignored) — **never committed**.
- No credentials are stored in code or sent anywhere; login happens in your browser.
- If the session expires, just re-run `npm run login`.

## Status
- ✅ Scaffold, login + session capture, codegen recorder ready.
- ⏳ `src/quote.mjs` is a placeholder until you record the flow (Step 2) and we
  parameterise the real Risk Researcher steps.
