#!/usr/bin/env bash
#
# full-export.sh — make ONE completely self-contained archive of FPGod that you
# can drop on Google Drive or a USB stick. It does NOT depend on GitHub, so it
# is safe even if you lose the old laptop afterwards.
#
# The archive contains EVERYTHING:
#   - all the code (and its full git history + any un-pushed changes)
#   - your .env secrets           (OpenAI key, database password)
#   - your uploaded documents     (server/uploads/)
#   - a full dump of the database (all clients, plans, training data, emails…)
#   - a plain HOW-TO-RESTORE.txt
#
# Run this on your OLD laptop, from the project root:
#     bash scripts/full-export.sh
#
# It produces  fpgod-FULL-<date>.tar.gz  in the project root. Upload that single
# file to Google Drive (or copy to a USB stick). That's your whole program.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
DEST="$STAGE/fpgod"
OUT="$ROOT/fpgod-FULL-$STAMP.tar.gz"
mkdir -p "$DEST"

echo "==> Copying the whole project (this includes .env and uploads)"
# Copy the working tree — including .git, .env, and server/uploads — but skip the
# huge, re-installable folders and any previous export archives.
tar -c \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.vite' \
  --exclude='.cache' \
  --exclude='coverage' \
  --exclude='*.log' \
  --exclude='fpgod-FULL-*.tar.gz' \
  --exclude='fpgod-backup-*.tar.gz' \
  -C "$ROOT" . | tar -x -C "$DEST"

# --- database dump (the one thing that is NOT a file in the folder) ----------
DB_URL="postgres://fpgod:fpgod@localhost:5432/fpgod"
if [ -f server/.env ]; then
  FROM_ENV="$(grep -E '^DATABASE_URL=' server/.env | head -1 | cut -d= -f2- || true)"
  [ -n "${FROM_ENV:-}" ] && DB_URL="$FROM_ENV"
fi

echo "==> Dumping the database ($DB_URL)"
DB_OK="no"
if command -v pg_dump >/dev/null 2>&1; then
  if pg_dump "$DB_URL" > "$DEST/migration-database.sql" 2>/tmp/fpgod_pgdump_err; then
    DB_OK="yes"
    echo "    saved migration-database.sql ($(wc -l < "$DEST/migration-database.sql" | tr -d ' ') lines)"
  else
    echo ""
    echo "    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    echo "    !! WARNING: could not dump the database. Reason:"
    sed 's/^/    !!   /' /tmp/fpgod_pgdump_err
    echo "    !! Make sure PostgreSQL is RUNNING, then run this script again."
    echo "    !! The code/secrets/uploads were still saved, but your CLIENT"
    echo "    !! DATA is NOT in this archive yet."
    echo "    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  fi
else
  echo ""
  echo "    !! WARNING: pg_dump not found, so the DATABASE was NOT saved."
  echo "    !! Install the PostgreSQL command-line tools and run this again"
  echo "    !! BEFORE you lose the old laptop:"
  echo "    !!   macOS:  brew install postgresql"
  echo "    !!   Ubuntu: sudo apt install postgresql-client"
fi

# --- plain-language restore note --------------------------------------------
cat > "$DEST/HOW-TO-RESTORE.txt" <<'TXT'
HOW TO RESTORE FPGOD ON A NEW LAPTOP
====================================

You are looking at the full FPGod program. Everything is here: the code, your
secrets (.env), your uploaded documents (server/uploads), and a database dump
(migration-database.sql).

On the NEW laptop, first install:
  - Node.js 20+     https://nodejs.org        (the "LTS" download)
  - PostgreSQL      https://www.postgresql.org/download/  (and make sure it runs)

Then open a terminal in THIS folder and run:

  bash scripts/full-restore.sh
  npm run install:all
  npm run build
  npm start

Open http://localhost:4000 — it should look exactly like the old laptop.

If you do not see your clients/plans, the database did not load — make sure
PostgreSQL is running and run  bash scripts/full-restore.sh  again.
TXT

# --- bundle it up ------------------------------------------------------------
echo "==> Compressing into one file (may take a minute if you have many uploads)"
tar -czf "$OUT" -C "$STAGE" fpgod
rm -rf "$STAGE"

SIZE="$(du -h "$OUT" | cut -f1)"
echo ""
echo "============================================================"
echo " SELF-CONTAINED EXPORT COMPLETE  ($SIZE)"
echo "   $OUT"
echo ""
echo " Upload THIS ONE FILE to Google Drive or copy it to a USB stick."
echo " It contains your whole program and does not need GitHub."
if [ "$DB_OK" != "yes" ]; then
echo ""
echo " *** BUT: the database was NOT included (see the warning above). ***"
echo " *** Fix that and re-run before you lose the old laptop.        ***"
fi
echo ""
echo " KEEP IT PRIVATE — it contains your OpenAI key and all client data."
echo " Delete it from Google Drive once the move is finished."
echo "============================================================"
