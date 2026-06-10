#!/usr/bin/env bash
set -euo pipefail

PID_FILE="/tmp/mantlelens_demo_server.pid"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if ps -p "$PID" >/dev/null 2>&1; then
    kill "$PID"
    echo "Stopped MantleLens demo server PID $PID"
  fi
  rm -f "$PID_FILE"
fi

if lsof -tiTCP:8765 -sTCP:LISTEN >/tmp/mantlelens_existing_pids 2>/dev/null; then
  xargs kill </tmp/mantlelens_existing_pids
  echo "Stopped remaining listeners on port 8765"
fi
