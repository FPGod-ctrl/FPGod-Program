#!/usr/bin/env bash
#
# backup.sh — bundle EVERYTHING that isn't in git into one file, so you can
# move FPGod to a new laptop with nothing different.
#
# What it saves:
#   1. The PostgreSQL database (all clients, plans, training data, emails…)
#   2. Uploaded documents  (server/uploads/)
#   3. Your secrets        (server/.env and client/.env — OpenAI key, DB password)
#
# Run this on your OLD laptop, from the project root:
#     bash scripts/backup.sh
#
# It produces a file called  fpgod-backup-<date>.tar.gz  in the project root.
# Copy that one file to the new laptop (AirDrop / USB stick / cloud drive),
# then run scripts/restore.sh over there.

set -euo pipefail

# --- locate the project root (this script lives in <root>/scripts) ----------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
OUT="$ROOT/fpgod-backup-$STAMP.tar.gz"

echo "==> Staging backup in $STAGE"

# --- 1. database ------------------------------------------------------------
# Prefer DATABASE_URL from server/.env if present, else fall back to the
# project default (postgres://fpgod:fpgod@localhost:5432/fpgod).
DB_URL="postgres://fpgod:fpgod@localhost:5432/fpgod"
if [ -f server/.env ]; then
  FROM_ENV="$(grep -E '^DATABASE_URL=' server/.env | head -1 | cut -d= -f2- || true)"
  [ -n "${FROM_ENV:-}" ] && DB_URL="$FROM_ENV"
fi

echo "==> Dumping database ($DB_URL)"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DB_URL" > "$STAGE/database.sql"
  echo "    saved database.sql ($(wc -l < "$STAGE/database.sql") lines)"
else
  echo "    !! pg_dump not found — install PostgreSQL client tools and re-run."
  echo "       (macOS: brew install postgresql   |   Ubuntu: sudo apt install postgresql-client)"
  exit 1
fi

# --- 2. uploaded documents --------------------------------------------------
echo "==> Copying uploaded documents"
mkdir -p "$STAGE/uploads"
if [ -d server/uploads ]; then
  # copy everything except the .gitkeep placeholder
  cp -R server/uploads/. "$STAGE/uploads/" 2>/dev/null || true
  find "$STAGE/uploads" -name .gitkeep -delete 2>/dev/null || true
fi
echo "    $(find "$STAGE/uploads" -type f | wc -l | tr -d ' ') file(s)"

# --- 3. secrets (.env) ------------------------------------------------------
echo "==> Copying .env secrets"
mkdir -p "$STAGE/env"
[ -f server/.env ] && cp server/.env "$STAGE/env/server.env" && echo "    server/.env"
[ -f client/.env ] && cp client/.env "$STAGE/env/client.env" && echo "    client/.env"

# --- bundle -----------------------------------------------------------------
tar -czf "$OUT" -C "$STAGE" .
rm -rf "$STAGE"

echo ""
echo "============================================================"
echo " Backup complete:"
echo "   $OUT"
echo ""
echo " Next: copy that one file to your new laptop, put it in the"
echo " project folder, and run:   bash scripts/restore.sh"
echo "============================================================"
