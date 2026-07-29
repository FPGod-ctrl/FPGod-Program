# Moving FPGod to a new laptop

This guide moves **everything** so the app on the new laptop is identical to the
old one — same code, same secrets, same uploaded documents, same database of
clients/plans, and the same VS Code setup.

> **The one thing to understand:** cloning from GitHub only copies the *code*.
> Your OpenAI key, your uploaded files, and your entire database of clients and
> plans are **not** in GitHub (on purpose — they're private). The scripts below
> move those for you.

---

## Recommended: one self-contained file (safe even if you lose the old laptop)

If you're about to hand back / wipe the old laptop, use this. It packs
**everything** — the code, your secrets, your uploaded documents, and the whole
database — into a single file you upload to Google Drive or copy to a USB stick.
It does **not** need GitHub afterwards.

**On the OLD laptop** (from the project folder):

```bash
bash scripts/full-export.sh
```

This produces `fpgod-FULL-<date>.tar.gz`. **Upload that one file to Google Drive
or copy it to a USB stick.** Watch the output — if it warns that the database
wasn't included, start PostgreSQL and run it again *before* you lose the laptop.

> ⚠️ That file contains your OpenAI key and all client data. Keep it private, and
> delete it from Google Drive once the move is done.

**On the NEW laptop** (after installing Node 20+ and a running PostgreSQL — see
Step 2 below):

1. Download the file from Google Drive / USB.
2. Unzip it (double-click on macOS, or `tar -xzf fpgod-FULL-*.tar.gz`).
3. Open a terminal inside the resulting `fpgod` folder and run:

```bash
bash scripts/full-restore.sh
npm run install:all
npm run build
npm start                # then open http://localhost:4000
```

That's the whole move. **Part A below is an alternative** for when you'll still
have GitHub access on the new laptop and prefer a smaller backup file. Then do
**Part B** for VS Code either way.

---

## Part A — Alternative: clone from GitHub + a smaller data-only backup

Use this only if the old laptop's code is already pushed to GitHub and you're
happy to `git clone` on the new machine. It backs up just the data (not the code).

### Step 1 — On the OLD laptop: make a backup

Open a terminal in the project folder and run:

```bash
bash scripts/backup.sh
```

This creates one file, `fpgod-backup-<date>.tar.gz`, containing your database,
uploaded documents, and `.env` secrets. **Copy that one file to the new
laptop** — AirDrop, a USB stick, or a cloud drive (Dropbox/Google Drive) all work.

> Keep this file private — it contains your OpenAI key and all client data.
> Delete it from any cloud drive once the move is done.

### Step 2 — On the NEW laptop: install the prerequisites

Install these first (once):

- **Node.js 20 or newer** — https://nodejs.org (pick the "LTS" download)
- **Git** — https://git-scm.com
- **PostgreSQL** — either install the app from https://www.postgresql.org/download/
  and make sure it's running, **or** if you use Docker, the project's
  `docker compose up -d db` will start one for you.
- **VS Code** — https://code.visualstudio.com

### Step 3 — On the NEW laptop: get the code

```bash
git clone <your-repo-url> FPGod-Program
cd FPGod-Program
```

Now drop the `fpgod-backup-<date>.tar.gz` file from Step 1 into this
`FPGod-Program` folder.

### Step 4 — On the NEW laptop: restore your data

```bash
bash scripts/restore.sh
```

This puts back your secrets, your uploaded documents, and your whole database.

### Step 5 — On the NEW laptop: install and run

```bash
npm run install:all     # download the code libraries (a few minutes)
npm run build           # build the app
npm start               # start it
```

Then open **http://localhost:4000** — everything should look exactly like the old
laptop.

> Prefer the two-window dev setup instead? Run `npm run dev:server` in one
> terminal and `npm run dev:client` in another, then open http://localhost:5173.

---

## Part B — VS Code (settings, extensions, keybindings)

The cleanest way to make VS Code identical is its built-in **Settings Sync** —
no files to copy.

**On the OLD laptop:**
1. Click the ⚙️ (gear) at the bottom-left → **Settings Sync is On…** (or open the
   Command Palette with `Cmd/Ctrl+Shift+P` and search "Turn On Settings Sync").
2. Sign in with your **GitHub** or **Microsoft** account.
3. Leave everything ticked (Settings, Keybindings, Extensions, Snippets, UI State).

**On the NEW laptop:**
1. Install VS Code, open it.
2. Turn on Settings Sync and sign in with the **same** account.
3. Wait a minute — your extensions, settings, theme, and keybindings download
   automatically.

That's it — VS Code will match.

---

## Quick checklist

- [ ] `bash scripts/backup.sh` on the old laptop
- [ ] Copied `fpgod-backup-*.tar.gz` to the new laptop
- [ ] Installed Node 20+, Git, PostgreSQL, VS Code on the new laptop
- [ ] `git clone` the repo, dropped the backup file inside
- [ ] `bash scripts/restore.sh`
- [ ] `npm run install:all && npm run build && npm start` → http://localhost:4000
- [ ] Turned on VS Code Settings Sync with the same account on both laptops

---

## Troubleshooting

- **"pg_dump / psql not found"** — install the PostgreSQL command-line tools.
  macOS: `brew install postgresql`. Ubuntu: `sudo apt install postgresql-client`.
- **"connection refused" to the database** — PostgreSQL isn't running. Start the
  Postgres app, or run `docker compose up -d db` from the project folder.
- **AI features show placeholder text** — the `OPENAI_API_KEY` didn't come across.
  Check that `server/.env` on the new laptop has your key (the restore script
  copies it; if you skipped the backup, paste the key into `server/.env`).
- **Login/website works but no clients show up** — the database wasn't restored.
  Re-run `bash scripts/restore.sh` and watch for the "database restored" line.
