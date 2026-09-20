# Live task list from your mailbox

Scans the mailbox every 30 minutes, works out what actually needs doing, and keeps
an Excel workbook up to date with the result. Client requests and internal jobs
land on the same list, sorted so the next thing to do is at the top.

Reads Microsoft 365 through the Graph API, signed in as you with delegated
`Mail.Read` — it sees your mailbox and nothing else in the tenant. Nothing has
to be running locally: Outlook can be closed, or never installed here.

## Setup

```bash
# 1. One-off — authorise the mailbox (prints the app-registration steps if needed)
cd automation/tasks && npm install && npm run setup
```

```powershell
# 2. Register the scheduled task (every 30 minutes, while you are logged on)
powershell -ExecutionPolicy Bypass -File install-task.ps1

# 3. Run one cycle right now and open the sheet
powershell -ExecutionPolicy Bypass -File run-cycle.ps1 -ShowExcel
```

`npm run setup` signs in once with a device code and caches a refresh token in
`state/graph-cache.json`. Every later run renews it silently. You only repeat it
if the scanner reports `NOT SIGNED IN` — which it does loudly, with a non-zero
exit code, never as a quiet skip.

The workbook defaults to `Task List.xlsx` on the Desktop. Point it anywhere —
OneDrive, a shared drive — with `-Workbook`:

```powershell
powershell -File install-task.ps1 -Workbook "C:\Users\you\OneDrive\Task List.xlsx"
```

## Two views of the same list

The task state file (`state/tasks.json`) is the single source of truth. Three
things read and write it, and none of them keeps its own copy:

| View | How to open | Good for |
|---|---|---|
| **Task Tracker** in the app | `npm run dev`, then **Task Tracker** in the sidebar | Working the list — grouped by who is waiting, filters for overdue / client / internal |
| **Excel workbook** | `Task List.xlsx` on the Desktop | Scanning everything at once, filtering, printing |
| `state/tasks.json` | — | What the scanner writes |

Change a status in either view and the other picks it up. The app writes the
state file directly; the spreadsheet's Status and Notes columns are read back into
it at the start of every cycle.

## Sent mail closes tasks automatically

A second Power Automate flow watches **Sent Items** and drops to `FPGod/sent-drop`.
Each cycle those sent emails are checked against the open tasks, and anything the
reply actually delivered is marked **Done** with the reason recorded in Notes:

```
2026-09-07: closed automatically - Attached the updated IP quote with 90 day waiting period
```

The prompt is deliberately conservative. An email that only acknowledges ("leave
it with me"), chases someone else, or is merely on the same topic does **not**
close anything — it adds a note instead. A task wrongly closed disappears and the
client is left waiting, which is worse than one left open a day too long.

Set the second flow up exactly like the first, with two changes: the trigger's
**Folder** is `Sent Items`, and the Create file **Folder Path** is
`/FPGod/sent-drop`. Add `"to": "@{triggerOutputs()?['body/toRecipients']}"` to the
file content so the notes can say who it went to.

## Where mail comes from

`run-cycle.ps1 -Source Auto|Graph|Outlook`, and `install-task.ps1` passes it through.

| Source | Needs | Status |
|---|---|---|
| `Graph` | Tenant admin consent for delegated `Mail.Read` | **Blocked** — Legacy Risk Advice has user consent disabled, so the app registration alone is not enough |
| `Outlook` | Outlook desktop set up and **running** | **In use** — needs no admin, because it reads the mailbox already signed in locally |
| `Auto` | — | Tries Graph, falls back to Outlook when Graph has no sign-in |

The scheduled task is pinned to `-Source Outlook` so it does not attempt Graph
every 30 minutes while consent is outstanding. The Graph path is built and tested;
if an admin ever approves it, switch over with:

```powershell
powershell -File install-task.ps1 -Source Auto
```

and mail stops depending on Outlook being open at all.

**The catch with the Outlook source:** a cycle that finds Outlook closed reads
nothing. It exits 4 and says so rather than reporting success, and the next cycle
catches up because the scan window overlaps by two days — but if Outlook stays
shut all day, nothing lands on the list.

## The one rule worth knowing

**Status and Notes are yours. Everything else is rewritten each cycle.**

Set a row to `Done`, type a note, and the next scan reads those two columns back
into `state/tasks.json` before it redraws the sheet. Nothing you type there is
lost. The other columns — task text, who, priority, due date, source email — are
regenerated from the mail each time, so editing them is pointless; they will be
overwritten.

The sheet can be open in Excel while this runs. Rows update in place.

| Status | Meaning |
|---|---|
| `Open` | Not started (the default for anything new) |
| `In Progress` | Being worked on — sorts to the very top |
| `Waiting` | Blocked on someone else; drops below the active work |
| `Done` / `Cancelled` | Struck through, sorted to the bottom, never resurrected |

## How a cycle works

1. **`run-cycle.ps1`** calls `scan-graph.mjs`, which pulls the last 2 days of
   Inbox from Graph with bodies as plain text. The window overlaps on purpose so
   nothing falls between runs.
2. **`extract-tasks.mjs`** filters the scan down to messages it has never seen
   before — keyed by the Graph message id — and sends only those to Claude, along
   with the list of currently open tasks. Re-running costs almost nothing.
3. **`write-sheet.ps1`** pulls your Status/Notes edits out of the sheet, merges
   them into the state file, and redraws the workbook.

Everything is keyed on the message id, so a re-run never duplicates a task. A chaser
about something already on the list updates that row and stamps a note on it
rather than creating a second copy.

## What becomes a task

Client requests, insurer and underwriting requirements, licensee and compliance
deadlines, anything someone is waiting on you for, meeting prep and follow-ups.

Newsletters, marketing, receipts, out-of-office replies, and pure FYI mail are
deliberately dropped. The prompt in `extract-tasks.mjs` is tuned to be strict —
a cluttered list is worse than a short one. If it is missing things you care
about, or catching things you don't, edit the `SYSTEM` prompt there; that is the
one knob that decides what lands on the list.

## Requirements and limits

- **A one-off Microsoft sign-in**, delegated `Mail.Read` against your own
  mailbox. No admin consent in most tenants, and no application-wide permission —
  it cannot read anyone else's mail.
- **You must be logged on.** The scheduled task runs with an interactive logon
  type, in your own desktop session, because driving Excel needs one. A task set
  to "run whether user is logged on or not" runs in session 0, where there is no
  Excel to write to.
- **Reading mail no longer needs Outlook open.** The original COM design did, and
  it failed quietly — eight consecutive cycles logged "Outlook is not running"
  and exited 0, so the scheduled task looked healthy while reading nothing for
  four days. Setup problems now exit non-zero so they surface in Task Scheduler.
- **Inbox only**, last 2 days per scan. Change with `-Days` / `-Folder`.
- Each cycle is one Claude call per 12 new emails, and zero calls when nothing
  new arrived. A quiet afternoon costs nothing.

## Commands

```powershell
Start-ScheduledTask -TaskName "FPGod Live Task List"   # run a cycle now
Get-ScheduledTask   -TaskName "FPGod Live Task List"   # check it is registered
powershell -File install-task.ps1 -Minutes 15          # change the interval
powershell -File install-task.ps1 -Uninstall           # remove it
Get-Content logs\cycle.log -Tail 20                    # what happened lately
```

To re-read mail already processed — after changing the prompt, say — delete
`state/tasks.json` and run a cycle. Everything in the window is treated as new,
and any Done/Notes you had typed are gone with it.

## Privacy

`state/` holds task text, sender names and email subjects; `logs/` holds counts
and timestamps. Both are git-ignored, as is the workbook. Message bodies are sent
to the Anthropic API for extraction but never stored on disk. Keep this within
the licensee's data-handling policy.

Values written to the sheet are escaped so Excel cannot evaluate them as
formulas — a subject line beginning with `=` is text, not code.
