#!/usr/bin/env bash
# ThinkSync Models — Run tests
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="${APP_DIR}/venv"

if [ -d "${VENV_DIR}" ]; then
    source "${VENV_DIR}/bin/activate"
fi

cd "${APP_DIR}"

# Install test dependencies
pip install -q -r requirements.txt pytest pytest-asyncio pytest-cov httpx asgi-lifespan aiosqlite

# Run with coverage
exec python -m pytest \
    "${@:-tests/}" \
    -v \
    --tb=short \
    --cov=app \
    --cov-report=term-missing \
    --cov-report=html:coverage_report \
    -x