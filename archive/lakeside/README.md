# Lakeside archive — reference only

Everything in this folder belongs to the **previous practice (Lakeside Financial)**.
It is kept deliberately, and deliberately kept **out of the running program**.

The new practice — **Legacy Risk Advice** — advises on risk insurance only
(life, TPD, trauma and income protection). Nothing here is loaded by the app at
runtime, and nothing here should be sent to a client as-is.

**It is fine to draw on this material as reference when generating new work.**
That is what it is for. What must not happen is Lakeside client data or
investment-plan structure leaking into a Legacy Risk Advice document unnoticed.

## What is here

| Folder | Contents |
|--------|----------|
| `reference-plans/` | 370 historical financial plans, 2004 onward (199 legacy `.doc`, 114 `.pdf`, 57 `.docx`) |
| `generated-plans/` | Lakeside output — SOAs, and 217 client outreach emails under `client-emails/` |
| `generated-profiles/` | Client profiles produced by the clone-and-fill generator (`.json` + `.docx`) |
| `intake/` | 505 CFS statement PDFs — the source of the CFS book data |
| `insurance-reviews/` | TAL TSO file note and one-pager — the only genuine *risk* work in the archive |
| `follow-ups/` | 41 meeting and phone-call follow-up emails in the adviser's own voice |
| `retired-app/` | App code removed from the program: CFS Book, CFS Campaign, Investments, Financial Plan generator |
| `db-snapshot/` | Full database snapshot taken before the Legacy reset — every table, as JSON |

## What was imported into the running app

`server/scripts/import-reference-material.mjs` copied a subset into
`training_data` as AI reference material:

- **255 email examples** (`kind='email'`) — 38 meeting/phone follow-ups plus 217 CFS
  outreach emails. These are selected by `emailGenerator.js` as style examples.
  The follow-ups are imported **last** on purpose: that service orders by
  `created_at DESC`, so the last import is what the model actually sees.
- **173 plan documents** (`kind='plan'`) — 171 historical financial plans plus the
  2 insurance reviews.

The 199 legacy binary `.doc` files were **skipped**. There is no `.doc` parser;
the extractor falls back to a raw byte decode that produces control-character
soup. Convert them to `.docx` if they are ever needed.

### Why the financial plans cannot contaminate a risk SOA

The historical plans are tagged `metadata.archived = true` and
`metadata.doc_type = 'financial_plan'`. `riskSoaGenerator.js` loads a master
template **only** where `metadata.doc_type = 'risk_soa'` AND
`metadata.is_template = 'true'`, so an investment-plan structure can never be
picked up by the risk SOA generator. This is intentional: a risk-only SOA that
inherited a comprehensive financial plan's section structure would be both wrong
and a compliance problem.

## Restoring something

**Code** — the retired pages are ordinary React components. Move one back under
`client/src/pages/`, re-add its `import` and `<Route>` in `client/src/App.jsx`,
and its entry in `NAV` in `client/src/components/Layout.jsx`. The server routes
for CFS and investments were never removed, so the API side still works.

**Data** — `db-snapshot/` holds every table as JSON, taken immediately before
the demo purge. `_manifest.json` records the row counts and the timestamp.

**CFS book** — the 250 accounts, 1,271 holdings and 1,251 allocations are still
live in the database. Only the user interface was removed; the data was not
deleted and `/api/cfs` still serves it.
