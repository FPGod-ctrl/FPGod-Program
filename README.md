# FPGod — Legacy Risk Advice

An AI-assisted advice platform for **Legacy Risk Advice**, a risk-insurance-only
practice. It manages clients, ingests and scans documents, drafts risk
Statements of Advice, client profiles and insurance reports, and turns meeting
notes into follow-up emails — all refinable through a chat interface.

```
React (Vite) frontend  ──►  Express API  ──►  PostgreSQL
                                │
                                └──►  Anthropic Claude (SOA / email generation, chat)
                                └──►  Local file storage (PDF/DOCX) + text extraction
```

> **Scope.** This practice advises on risk insurance only — life, TPD, trauma
> and income protection. Superannuation appears only where it is the ownership
> vehicle for cover or the means of funding a premium. The previous practice's
> financial-planning tooling is archived under [`archive/lakeside/`](archive/lakeside/)
> and is reference material, not part of the running program.

## Features

- **Insurance & Risk Planning** — generates a risk-only Statement of Advice
  section by section from the client file, existing cover and your notes.
  Needs analysis, recommended cover, ownership and structure, replacement of
  existing cover, costs, risks and disclosures. Compliance guardrails are
  enforced in the prompt (see `server/src/services/riskSoaGenerator.js`).
- **Client Profile** — clone-and-fill of the firm's Word template.
  *Awaiting the Legacy template; the generator script already works.*
- **Insurance Report** — current / indicative cover summary.
  *Awaiting the Legacy template; the generator script already works.*
- **Follow-on & Phone Emails** — turns a transcript or pasted notes into a
  follow-up email, using 255 real emails as style examples.
- **Client management** — individual clients and client groups (couples, families).
- **Document upload & AI scanning** — drag in PDFs/Word docs; extract client,
  policy and financial details to auto-fill the file.
- **Advice Documents** — every generated SOA, with present/export to PDF or Word.
- **Chat refinement** — iterate on any document in real time.

## The risk SOA generator

`server/src/services/riskSoaGenerator.js` writes the SOA one section at a time
(five concurrent), so it reaches real depth rather than a single shallow pass.

Section structure comes from **the firm's own SOA template** when one has been
imported — `training_data` with `kind='plan'`, `metadata.doc_type='risk_soa'`
and `metadata.is_template='true'`. Until then it falls back to
`DEFAULT_SECTIONS`, the standard Australian risk-advice skeleton (14 sections).

`RISK_GUARDRAILS` is injected into every section prompt and overrides the
template. It enforces, among other things: never state an unquoted premium;
needs-analysis components must sum to the recommendation; trauma cover cannot be
held inside super; own-occupation TPD cannot be held inside super for policies
from 1 July 2014; the mandatory do-not-cancel warning on replacement of cover;
and the post-October-2021 *duty to take reasonable care not to make a
misrepresentation* rather than the superseded duty of disclosure.

**These thresholds and rules are date-sensitive — review them each financial year.**

## Project layout

```
server/          Express + PostgreSQL API, Anthropic integration, document extraction
client/          React + Vite single-page app
templates/       Firm Word templates driving the clone-and-fill generators
archive/lakeside/  Previous practice — reference only, not loaded at runtime
```

## Quick start

### 1. Database

```bash
createdb fpgod                       # or: docker-compose up -d db
cd server
cp .env.example .env                 # set DATABASE_URL + ANTHROPIC_API_KEY
npm install
npm run db:migrate                   # creates tables
```

### 2. Backend (port 4000)

```bash
cd server && npm run dev             # nodemon + hot reload
```

### 3. Frontend (port 5173)

```bash
cd client
cp .env.example .env                 # VITE_API_URL defaults to http://localhost:4000
npm install && npm run dev
```

Open http://localhost:5173.

## Maintenance scripts

| Script | Purpose |
|--------|---------|
| `server/scripts/reset-for-legacy.mjs` | Snapshots every table to `archive/lakeside/db-snapshot/`, then purges demo clients and synthetic training rows. Dry run by default; `--confirm` to execute. |
| `server/scripts/import-reference-material.mjs` | Imports archived emails and plans into `training_data` as AI reference. Dry run by default; `--confirm` to write, `--emails-only` to refresh just the style examples. |
| `server/scripts/generate-client-profile.mjs` | Clone-and-fill the client profile Word template. |
| `server/scripts/generate-insurance-report.mjs` | Clone-and-fill the insurance report Word template. |

## Environment variables

See `server/.env.example` and `client/.env.example`. Without an
`ANTHROPIC_API_KEY` the AI endpoints return clearly-labelled stub content so the
UI can be developed offline.

## Run as a single program (production)

```bash
npm run install:all
npm --prefix server run db:migrate
npm run build                # builds client/dist
npm start                    # NODE_ENV=production — API serves the SPA on :4000
```

Then open http://localhost:4000 — one process serves both the React app and the
`/api` endpoints.

## Deployment notes

- Storage is abstracted behind `server/src/services/storage.js`. The local
  driver writes to `server/uploads`; add an S3/GCS driver without touching routes.
- All configuration is environment-driven (`server/src/config/env.js`).
- `docker-compose.yml` brings up Postgres for local development.
