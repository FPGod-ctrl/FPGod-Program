#!/usr/bin/env bash
#
# full-restore.sh — load the database from a full-export archive on the NEW
# laptop. The code, .env secrets, and uploaded documents are already in this
# folder (the archive contained them), so this only rebuilds the database.
#
# On the NEW laptop:
#   1. Download fpgod-FULL-<date>.tar.gz from Google Drive / USB.
#   2. Unzip it   (double-click on macOS, or:  tar -xzf fpgod-FULL-*.tar.gz )
#   3. Open a terminal inside the resulting  fpgod  folder.
#   4. Run:  bash scripts/full-restore.sh
#
# Prerequisites: Node.js 20+ and a RUNNING PostgreSQL.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DUMP="$ROOT/migration-database.sql"
if [ ! -f "$DUMP" ]; then
  echo "!! migration-database.sql not found next to this project."
  echo "   Make sure you unzipped the fpgod-FULL-*.tar.gz archive and are"
  echo "   running this from inside the extracted 'fpgod' folder."
  exit 1
fi

# Confirm the secrets and uploads came across (they should already be here).
[ -f server/.env ] && echo "==> server/.env present" || echo "!! server/.env missing — AI features may be in stub mode."
touch server/uploads/.gitkeep 2>/dev/null || true
echo "==> $(find server/uploads -type f ! -name .gitkeep 2>/dev/null | wc -l | tr -d ' ') uploaded document(s) present"

# --- database ---------------------------------------------------------------
DB_URL="postgres://fpgod:fpgod@localhost:5432/fpgod"
if [ -f server/.env ]; then
  FROM_ENV="$(grep -E '^DATABASE_URL=' server/.env | head -1 | cut -d= -f2- || true)"
  [ -n "${FROM_ENV:-}" ] && DB_URL="$FROM_ENV"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "!! psql not found — install PostgreSQL and re-run."
  echo "   (macOS: brew install postgresql | Ubuntu: sudo apt install postgresql-client)"
  exit 1
fi

DB_NAME="$(basename "${DB_URL%%\?*}")"
echo "==> Ensuring database '$DB_NAME' exists"
createdb "$DB_NAME" 2>/dev/null && echo "    created $DB_NAME" || echo "    $DB_NAME already exists (reusing)"

echo "==> Loading your data into the database"
psql "$DB_URL" < "$DUMP" >/dev/null
echo "    database restored"

echo ""
echo "============================================================"
echo " Data restored. Finish with:"
echo ""
echo "   npm run install:all"
echo "   npm run build"
echo "   npm start          # then open http://localhost:4000"
echo "============================================================"
