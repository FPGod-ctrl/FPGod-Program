#!/usr/bin/env bash
#
# restore.sh — rebuild FPGod on a NEW laptop from a backup.sh bundle, so
# nothing is different from the old machine.
#
# What it restores:
#   1. Your secrets        (server/.env, client/.env)
#   2. Uploaded documents  (server/uploads/)
#   3. The PostgreSQL database (all clients, plans, training data, emails…)
#
# Before running, on the new laptop you need:
#   - Node.js 20+            (https://nodejs.org)
#   - PostgreSQL running     (or:  docker compose up -d db)
#   - This repo cloned, and the fpgod-backup-*.tar.gz file copied into it.
#
# Then, from the project root:
#     bash scripts/restore.sh                 # auto-finds newest backup
#     bash scripts/restore.sh my-backup.tar.gz   # or name one explicitly

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- find the backup file ---------------------------------------------------
BUNDLE="${1:-}"
if [ -z "$BUNDLE" ]; then
  BUNDLE="$(ls -t fpgod-backup-*.tar.gz 2>/dev/null | head -1 || true)"
fi
if [ -z "$BUNDLE" ] || [ ! -f "$BUNDLE" ]; then
  echo "!! No backup file found."
  echo "   Put your fpgod-backup-*.tar.gz in this folder, or pass its path:"
  echo "   bash scripts/restore.sh path/to/fpgod-backup-XXXX.tar.gz"
  exit 1
fi
echo "==> Using backup: $BUNDLE"

STAGE="$(mktemp -d)"
tar -xzf "$BUNDLE" -C "$STAGE"

# --- 1. secrets -------------------------------------------------------------
echo "==> Restoring .env secrets"
[ -f "$STAGE/env/server.env" ] && cp "$STAGE/env/server.env" server/.env && echo "    server/.env"
[ -f "$STAGE/env/client.env" ] && cp "$STAGE/env/client.env" client/.env && echo "    client/.env"

# --- 2. uploaded documents --------------------------------------------------
echo "==> Restoring uploaded documents"
mkdir -p server/uploads
if [ -d "$STAGE/uploads" ]; then
  cp -R "$STAGE/uploads/." server/uploads/ 2>/dev/null || true
fi
touch server/uploads/.gitkeep
echo "    $(find server/uploads -type f ! -name .gitkeep | wc -l | tr -d ' ') file(s)"

# --- 3. database ------------------------------------------------------------
DB_URL="postgres://fpgod:fpgod@localhost:5432/fpgod"
if [ -f server/.env ]; then
  FROM_ENV="$(grep -E '^DATABASE_URL=' server/.env | head -1 | cut -d= -f2- || true)"
  [ -n "${FROM_ENV:-}" ] && DB_URL="$FROM_ENV"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "!! psql not found — install PostgreSQL client tools and re-run."
  echo "   (macOS: brew install postgresql | Ubuntu: sudo apt install postgresql-client)"
  exit 1
fi

# Create the database if it isn't there yet (ignore error if it already exists).
DB_NAME="$(basename "${DB_URL%%\?*}")"
echo "==> Ensuring database '$DB_NAME' exists"
createdb "$DB_NAME" 2>/dev/null && echo "    created $DB_NAME" || echo "    $DB_NAME already exists (reusing)"

echo "==> Restoring database from backup"
psql "$DB_URL" < "$STAGE/database.sql" >/dev/null
echo "    database restored"

rm -rf "$STAGE"

echo ""
echo "============================================================"
echo " Restore complete. Now install and start:"
echo ""
echo "   npm run install:all"
echo "   npm run build"
echo "   npm start          # then open http://localhost:4000"
echo ""
echo " (or run the two dev servers: npm run dev:server + npm run dev:client)"
echo "============================================================"
