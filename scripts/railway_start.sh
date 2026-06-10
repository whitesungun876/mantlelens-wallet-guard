#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8765}"

exec python -m backend.mantlelens.server --host "$HOST" --port "$PORT" --quiet
