# Moving FPGod to a new PC

Everything needed to rebuild this environment on another machine, and what to
watch out for on the way.

---

## What has to move

The repo alone is not enough. Three things live outside git and are lost if you
only clone:

| | Where | Why it's not in git |
|---|---|---|
| **PostgreSQL database** | `fpgod` on localhost:5432 | 5 clients, 250 CFS accounts, 1,271 holdings |
| **Uploaded documents** | `server/uploads/` | gitignored |
| **API keys and DB password** | `server/.env` | gitignored, and rightly so |

The `migration/` scripts handle all three.

---

## Two paths, one destination

**GitHub** carries the code and the committed client files. **The bundle** carries
those *plus* the database, uploads and secrets. You want both: GitHub so the new
PC can pull future changes, the bundle because it's the only copy of the database.

---

## On the old PC

```powershell
cd C:\FPGod-Program
git add -A
git commit -m "Final snapshot before move"
git push origin claude/financial-planning-app-8GWYC

.\migration\make-bundle.ps1
```

That writes `Downloads\FPGod-Migration-<date>\` — roughly 158 MB. Upload the whole
folder to Google Drive.

> **Re-run `make-bundle.ps1` on your last day.** The database and follow-ups will
> have moved on since any earlier snapshot, and the bundle is the only place the
> database exists.

---

## On the new PC

Install first — none of these are optional:

1. [Node.js 20+](https://nodejs.org) (the old PC ran v24.16)
2. [Git for Windows](https://git-scm.com/download/win)
3. [PostgreSQL 16+](https://www.postgresql.org/download/windows/) — **write down the
   superuser password you set during install**, the script asks for it

Then download the bundle folder from Drive and run:

```powershell
.\setup-new-pc.ps1 -BundlePath "G:\My Drive\FPGod-Migration-2026-08-12"
```

It will clone the repo (falling back to the offline bundle if GitHub is blocked —
corporate networks often block it), restore the database, put the uploads and
`.env` files back, install dependencies and build the client. Ten to fifteen
minutes, most of it `npm install`.

Then:

```powershell
cd C:\FPGod-Program
npm run dev
```

http://localhost:5173.

The script is re-runnable. It skips anything already done and won't overwrite a
database that has rows in it unless you pass `-Force`.

---

## Three things that will bite you

### 1. `main` is not the branch you want

The working branch is **`claude/financial-planning-app-8GWYC`**. It is 31 commits
ahead of `main`, and the two have diverged structurally — the branch migrated the
AI layer from OpenAI to Anthropic (`server/src/services/ai.js`), while `main` still
has `openai.js`. A plain `git clone` gives you `main`, which will not run correctly.

`setup-new-pc.ps1` checks out the right branch. If you clone by hand, do it
explicitly:

```powershell
git clone --branch claude/financial-planning-app-8GWYC https://github.com/FPGod-ctrl/FPGod-Program.git
```

Worth setting that branch as the repo default in GitHub → Settings → Branches, so
the trap disappears. Merging `main`'s one extra commit is a separate job — do it
deliberately, not during a move.

### 2. The Anthropic API key belongs to the old firm

`server/.env` carries a key that bills to your current employer. It travels in the
bundle so the app starts, but **replace it with your own** at the new firm. Without
any key the AI features run in clearly-labelled stub mode rather than crashing.

### 3. The database password won't match

The new PC's PostgreSQL superuser password is whatever you set at install. The
setup script prompts for it and rewrites `DATABASE_URL`, `PGUSER` and `PGPASSWORD`
in `server/.env` to match. Nothing to do by hand.

---

## Client data

This repo contains real client personal information — 509 CFS statements with
names, dates of birth, TFN status, account numbers, contact details and balances,
plus statements of advice, generated plans, call transcripts, and a database of
250 client accounts.

Two consequences:

- **The GitHub repo must be private.** Check it at
  https://github.com/FPGod-ctrl/FPGod-Program/settings — if it is public, that is a
  reportable breach and fixing it is more urgent than the move.
- **This data belongs to the licensee it was collected under** (Pareto Group,
  AFSL 418700), not to you personally. Moving it to a new firm is a matter for the
  two licensees and your Privacy Act obligations. That is a question for your
  compliance people, and it should be settled before the bundle goes anywhere.

Never put the bundle in a shared Drive folder or a public repo.

---

## Verifying it worked

```powershell
cd C:\FPGod-Program
npm test
```

And spot-check the data — this is what the old PC held on 12 Aug 2026:

| Table | Rows |
|---|---|
| `clients` | 5 |
| `cfs_accounts` | 250 |
| `cfs_holdings` | 1,271 |
| `documents` | 3 |
| `server/uploads/` | 21 files |

If the CFS Book page lists 250 accounts and the follow-ups are in
`follow-ups/phone-call/`, the move worked.
