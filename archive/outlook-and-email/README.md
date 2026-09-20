# Outlook and email — archived 16 September 2026

Retired at Tristan's instruction, for firm safety. **Nothing in here is to be run.**
The app no longer reads the mailbox or calendar, and no longer drafts email of any kind.

## What was archived

| Path here | Was | Did |
|---|---|---|
| `automation-outlook/` | `automation/outlook/` | PowerShell COM scripts: inbox, sent items and calendar scans, attachment saving, morning scan |
| `automation-tasks/` | `automation/tasks/` | Mail-driven task tracker: Graph scanner, task extraction, spreadsheet sync, scheduled-task installer |
| `server/src/routes/outlook.js` | same path | `/api/outlook/*` — scan, calendar, ingest |
| `server/src/routes/emails.js` | same path | `/api/emails/*` — list, generate, draft, edit, status |
| `server/src/services/outlookScan.js` | same path | The COM bridge behind the Outlook route |
| `server/src/services/emailGenerator.js` | same path | AI drafting of follow-up emails in the adviser's voice |
| `server/scripts/generate-cf-emails.mjs` | same path | Bulk email drafting for the CFS campaign |
| `client/src/pages/Calendar.jsx` | same path | Calendar page, read from Outlook desktop |
| `client/src/pages/generate/FollowUps.jsx` | same path | Follow-up email generator page |
| `client/src/components/OutlookScan.jsx` | same path | Outlook scan panel on the Documents page |

## What changed in the live code

- `server/src/routes/index.js` — `/emails` and `/outlook` no longer mounted.
- `client/src/App.jsx`, `components/Layout.jsx` — Calendar and Follow-up Emails routes and menu items removed.
- `client/src/pages/Documents.jsx` — Outlook scan panel removed.
- `client/src/pages/Meetings.jsx` — now transcripts only; email generation, the email list and editor are gone.
- `client/src/pages/Dashboard.jsx` — follow-up email tile and recent emails card removed.
- `server/src/routes/tasks.js` — the Task Tracker now reads `server/data/task-state/`, not the archived scanner folder.

## Data

Kept, not deleted. The `emails` table and its drafts are untouched in the database; nothing
reads them any more. The task tracker's `tasks.json` and `archive.jsonl` moved to
`server/data/task-state/` (gitignored) so the Task Tracker page still works — it is now a
manual list. The scanner's own artefacts (`seen.json`, `last-scan.json`,
`last-sent-scan.json`) stayed in `automation-tasks/state/` here.

Verified after the change: client build clean, 130 tests passing.
