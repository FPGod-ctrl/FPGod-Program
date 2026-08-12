# Moving FPGod to a new PC

Everything needed to rebuild this environment on another machine, and what to
watch out for on the way.

---

## What has to move

The repo alone is not enough. Four things live outside git and are lost if you
only clone:

| | Where | Why it's not in git |
|---|---|---|
| **PostgreSQL database** | `fpgod` on localhost:5432 | 5 clients, 250 CFS accounts, 1,271 holdings |
| **Uploaded documents** | `server/uploads/` | gitignored |
| **API keys and DB password** | `server/.env` | gitignored, and rightly so |
| **VS Code setup** | `%APPDATA%\Code\User` | not part of the project at all |

The `migration/` scripts handle all four.

Installed **programs** are a different matter — Windows software can't be moved by
copying files, it has to be reinstalled. What travels is an inventory of all 37
programs (`environment/installed-programs.csv`) plus a scripted winget reinstall
of the toolchain that matters.

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

Download the bundle folder from Drive, then two commands.

**1. Install the toolchain** — elevated PowerShell:

```powershell
.\environment\reinstall-programs.ps1
```

Node, Git, PostgreSQL and VS Code via winget, skipping anything already there.
**Write down the PostgreSQL superuser password you set** — the next step asks for
it. Doing it by hand instead is fine: [Node 20+](https://nodejs.org),
[Git](https://git-scm.com/download/win),
[PostgreSQL 16+](https://www.postgresql.org/download/windows/),
[VS Code](https://code.visualstudio.com).

**2. Restore everything** — normal PowerShell:

```powershell
.\setup-new-pc.ps1 -BundlePath "G:\My Drive\FPGod-Migration-2026-08-12"
```

Clones the repo (falling back to the offline bundle if GitHub is blocked —
corporate networks often are), restores the database, puts the uploads and `.env`
files back, installs dependencies, builds the client, reinstalls your VS Code
extensions and settings, and sets a global git identity. Ten to fifteen minutes,
most of it `npm install`.

Then:

```powershell
cd C:\FPGod-Program
npm run dev
```

http://localhost:5173.

The script is re-runnable. It skips anything already done and won't overwrite a
database that has rows in it unless you pass `-Force`.

---

## Six things that will bite you

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

### 4. Windows' 260-character path limit

`reference-plans/` contains filenames up to 144 characters, e.g.

```
2025 - 03 - 26 - Finlayson, Greg & Roth, Shira - Superannuation, Investment
Structures, Surplus Funds & Retirement Planning.docx
```

Clone somewhere deep and Windows refuses to create those files. The nasty part is
that **`git clone` still reports success** — it prints `Filename too long` errors
mid-progress and leaves you with a repo that looks fine but is quietly missing
dozens of client plans. This was reproduced during testing: a clone into a
129-character destination lost 40+ files.

Two defences are built in. Both clones pass `-c core.longpaths=true`, and after
checkout the script re-runs `git status` to confirm nothing came through as
deleted, retrying with long-path support if it did.

Cloning by hand? Include the flag:

```powershell
git clone -c core.longpaths=true --branch claude/financial-planning-app-8GWYC https://github.com/FPGod-ctrl/FPGod-Program.git C:\FPGod-Program
```

At `C:\FPGod-Program` the longest path lands at 162 of 260, so there's room to
spare — but a Drive-synced or deeply nested folder eats that fast. Keep it short.

### 5. This machine is ARM64

Your PC is Windows on ARM. If the new one is a normal Intel/AMD laptop — most are
— **every installer must be the x64 build**. ARM64 downloads simply won't run.
`reinstall-programs.ps1` handles this automatically because winget resolves the
right architecture; hand-downloading is where it goes wrong.

Node modules with native components must also be rebuilt for the new
architecture. Nothing to do — the setup script runs a fresh `npm install`, which
compiles against whatever CPU it finds. Just don't copy `node_modules/` across by
hand, because that will fail in confusing ways.

### 6. Your commit identity comes from the old firm

`HOMEDRIVE` is `H:`, a mapped work drive, so git looks for its global config at
`H:\.gitconfig` — which doesn't exist. With no config to read, git has been
deriving your identity from the domain account, which is why all 30 of your
commits are authored `Tristan.Biro@lakesidefinancial.com.au`.

`restore-environment.ps1` prompts you to set this properly. Your GitHub account is
`FPGod-ctrl` / `tristan.biro26@gmail.com`, so that's the sensible pairing:

```powershell
git config --global user.name  "Tristan Biro"
git config --global user.email "tristan.biro26@gmail.com"
```

---

## What's on H:\ and L:\

Two mapped network drives, roughly 642 GB each. They're the firm's file shares and
they vanish the day your account is disabled. This migration covers
`C:\FPGod-Program` only.

If anything you need lives on those drives, deal with it separately and before
your last day — subject to the same licensee sign-off as everything else below.

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
git status --porcelain      # must be empty - anything listed as D didn't check out
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
