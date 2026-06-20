#!/usr/bin/env bash
# ThinkSync Models — Production startup script
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="${APP_DIR}/venv"
LOG_DIR="${APP_DIR}/logs"
NUM_WORKERS="${WORKERS:-4}"

# ── Create directories ─────────────────────────────────────
mkdir -p "${LOG_DIR}"

# ── Activate virtualenv ────────────────────────────────────
if [ -d "${VENV_DIR}" ]; then
    source "${VENV_DIR}/bin/activate"
fi

# ── Load .env if present ──────────────────────────────────
if [ -f "${APP_DIR}/.env" ]; then
    set -a
    source "${APP_DIR}/.env"
    set +a
fi

# ── Run with uvicorn ──────────────────────────────────────
exec uvicorn app.main:app \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-8000}" \
    --workers "${NUM_WORKERS}" \
    --loop uvloop \
    --http httptools \
    --log-level "${LOG_LEVEL:-info}" \
    --no-access-log \
    2>&1 | tee -a "${LOG_DIR}/uvicorn.log"