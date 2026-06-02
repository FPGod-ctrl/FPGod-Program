#!/bin/bash
# SessionStart hook for FPGod — installs server + client dependencies so the
# app can build/run during Claude Code on the web sessions.
set -euo pipefail

# Only run in the remote (web) environment; local dev manages its own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "[session-start] installing server dependencies..."
npm --prefix "$ROOT/server" install --no-audit --no-fund

echo "[session-start] installing client dependencies..."
npm --prefix "$ROOT/client" install --no-audit --no-fund

echo "[session-start] dependencies ready."
