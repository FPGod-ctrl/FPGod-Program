# Moving FPGod to a new laptop using Google Drive

Plain, click-by-click steps. You'll make one file on the old laptop, put it on
Google Drive, and pull it down on the new laptop.

---

## OLD LAPTOP

### 1. Make the one big file

Open a terminal **in your FPGod project folder** and run:

```bash
bash scripts/full-export.sh
```

When it finishes it prints a green-ish summary ending in
`SELF-CONTAINED EXPORT COMPLETE`. It created a file named like:

```
fpgod-FULL-20260729-153000.tar.gz
```

**Check the output before moving on.** If you see a big `WARNING: could not
dump the database`, your PostgreSQL wasn't running — start it and run the
command again. You want to see the line `saved migration-database.sql`. That
means your clients/plans are inside the file.

> Where is the file? It's saved **inside the FPGod project folder** (same place
> you ran the command). If you're not sure where that is, run `pwd` in the same
> terminal — it prints the folder path.

### 2. Upload it to Google Drive

1. Open **drive.google.com** in your browser (signed in to your Google account).
2. Click **+ New** (top-left) → **File upload**.
3. Select the `fpgod-FULL-...tar.gz` file from your project folder.
4. Wait for the upload to finish — you'll see it at the bottom-right, and a
   green tick when done. The file can be large (it holds all your documents),
   so give it time on a slow connection.

> 🔒 **Keep it private.** This file contains your OpenAI key and all client
> data. Do **not** share it or set it to "Anyone with the link." Leave it in
> your own private Drive (the default). You'll delete it after the move.

### 3. Make sure it's really uploaded

In Google Drive the file should show with a normal icon (not a spinning
"uploading" circle). Only once you see it listed in Drive is it safe to stop
using the old laptop.

---

## NEW LAPTOP

### 4. Install the basics (once)

- **Node.js 20+** — https://nodejs.org (click the big **LTS** button, install it)
- **PostgreSQL** — https://www.postgresql.org/download/ (install and make sure
  it's running after install)

### 5. Download the file from Google Drive

1. Open **drive.google.com** on the new laptop, signed in to the **same** Google
   account.
2. Find `fpgod-FULL-...tar.gz`, **right-click it → Download**.
3. It lands in your **Downloads** folder.

### 6. Unzip it

- **Mac:** double-click the file in Downloads. It expands into a folder named
  `fpgod`. (If double-click leaves a `.tar` file, double-click that once more.)
- **Windows:** the built-in unzipper doesn't handle `.tar.gz` well — install the
  free **7-Zip** (https://www.7-zip.org), then right-click the file →
  **7-Zip → Extract Here** (twice — once for `.gz`, once for `.tar`). You'll end
  up with a `fpgod` folder.

### 7. Start it

Open a terminal:

- **Mac:** open the **Terminal** app, type `cd ` (with a space), then drag the
  `fpgod` folder onto the window and press Enter.
- **Windows:** open the `fpgod` folder, click the address bar, type `cmd` and
  press Enter — a terminal opens in that folder.

Now run these four lines, one at a time:

```bash
bash scripts/full-restore.sh
npm run install:all
npm run build
npm start
```

Then open **http://localhost:4000** in your browser. It should look exactly like
the old laptop — same clients, plans, documents, and settings.

> On Windows, if `bash` isn't recognised, install **Git for Windows**
> (https://git-scm.com/download/win) and use the **"Git Bash"** terminal it
> provides for the `bash scripts/full-restore.sh` line.

---

## 8. Clean up (after it works)

Once the new laptop is working with all your data, **delete the
`fpgod-FULL-...tar.gz` file from Google Drive** (and empty Drive's Trash) so your
API key and client data aren't sitting in the cloud. Right-click the file →
**Remove**, then go to **Trash** (left sidebar) → **Empty trash**.

---

## Quick checklist

- [ ] Old laptop: `bash scripts/full-export.sh` → saw `saved migration-database.sql`
- [ ] Uploaded `fpgod-FULL-*.tar.gz` to Google Drive (private)
- [ ] Confirmed it's fully uploaded before leaving the old laptop
- [ ] New laptop: installed Node 20+ and PostgreSQL (running)
- [ ] Downloaded the file from the same Google account, unzipped it
- [ ] `bash scripts/full-restore.sh` → `npm run install:all` → `npm run build` → `npm start`
- [ ] http://localhost:4000 shows all my data
- [ ] Turned on VS Code Settings Sync (same account on both laptops)
- [ ] Deleted the file from Google Drive + emptied Trash

---

## If something's wrong on the new laptop

- **No clients/plans show up** → the database didn't load. Make sure PostgreSQL
  is running, then re-run `bash scripts/full-restore.sh`.
- **AI features show placeholder text** → the OpenAI key didn't come across.
  Open `server/.env` in the `fpgod` folder and check `OPENAI_API_KEY=` has your
  key after it.
- **"psql/pg_dump not found"** → PostgreSQL command-line tools aren't installed
  or aren't on your PATH. Reinstall PostgreSQL and make sure you allow its
  command-line tools during setup.

_(VS Code moves separately via its built-in Settings Sync — see the "Part B"
section of [MIGRATION.md](MIGRATION.md).)_
