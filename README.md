# FPGod — Financial Planning Application

An AI-powered financial planning platform for advisors. It manages clients and
client groups, ingests and scans documents, generates near-complete financial
plans, compares current vs. recommended investments, processes meeting
transcripts, and drafts follow-up emails — all refinable through a real-time
chat interface.

```
React (Vite) frontend  ──►  Express API  ──►  PostgreSQL
                                │
                                └──►  OpenAI (plan/email generation, chat)
                                └──►  Local file storage (PDF/DOCX) + text extraction
```

## Features

- **Client management** — individual clients and client groups (couples, families).
- **Document upload & storage** — drag-and-drop PDFs/Word docs to the local
  filesystem (swap to cloud later by changing one storage driver).
- **AI document scanning** — extract client info, investment data, and financial
  details from uploaded documents.
- **Training data** — store up to hundreds of historical plans the AI uses as
  few-shot strategy examples.
- **Plan generation** — produces ~95% complete plans from client data, then
  refine in the editor + chat.
- **Investment tables** — current holdings (fund, balance, allocation, risk,
  fees) and recommended managed-fund suggestions, side by side.
- **Meetings & emails** — upload transcripts, generate follow-up emails from
  transcripts + historical email examples.
- **Chat refinement** — iterate on any plan or email in real time.
- **Client-ready output** — present any plan in a polished, branded template
  (selectable styles + accent colour + firm name) and export to **PDF**
  (print / save) or **Word (.docx)**. Configure under Settings → Plan Template
  Style, then use "Present / Export" on a plan.
- **Bulk training import** — drag in a whole library of historical plans
  (Word/PDF/TXT) at once under Settings → Bulk Import.

## Project layout

```
server/   Express + PostgreSQL API, OpenAI integration, document extraction
client/   React + Vite single-page app
```

## Quick start

### 1. Database

```bash
createdb fpgod                       # or use docker-compose up -d db
cd server
cp .env.example .env                 # set DATABASE_URL + OPENAI_API_KEY
npm install
npm run db:migrate                   # creates tables
npm run db:seed                      # optional sample data
```

### 2. Backend (port 4000)

```bash
cd server
npm run dev                          # nodemon + hot reload
```

### 3. Frontend (port 5173)

```bash
cd client
cp .env.example .env                 # VITE_API_URL defaults to http://localhost:4000
npm install
npm run dev
```

Open http://localhost:5173.

## Environment variables

See `server/.env.example` and `client/.env.example`. The app runs in a
**degraded but functional mode without an OpenAI key** — AI endpoints return
clearly-labelled stub content so you can develop the UI offline.

## Run as a single program (production)

In development you run two servers (API on 4000, Vite on 5173). For a single
deployable program, build the frontend and let the API serve it:

```bash
npm run install:all          # install both workspaces
npm --prefix server run db:migrate
npm run build                # builds client/dist
npm start                    # NODE_ENV=production — API serves the SPA on :4000
```

Then open http://localhost:4000 — one process serves both the React app and the
`/api` endpoints (same origin, so no CORS or proxy needed). The API auto-detects
`client/dist`: if it's present it serves the SPA with a deep-link fallback;
if not, it runs as a pure JSON API.

## Deployment notes

- Storage is abstracted behind `server/src/services/storage.js`. The local
  driver writes to `server/uploads`; add an S3/GCS driver later without touching
  routes.
- All configuration is environment-driven (`server/src/config/env.js`) so the
  same image runs locally and in the cloud.
- `docker-compose.yml` brings up Postgres for local development.
