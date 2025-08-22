#!/usr/bin/env bash
set -euo pipefail

LOG_ROOT=".codex/logs"
if [ ! -d "$LOG_ROOT" ]; then
  echo "No log directory $LOG_ROOT yet. Run the unified suite first." >&2
  exit 1
fi

LATEST=$(ls -1dt $LOG_ROOT/unified-* 2>/dev/null | head -n1 || true)
if [ -z "$LATEST" ] || [ ! -d "$LATEST" ]; then
  echo "No unified-* log folders found in $LOG_ROOT" >&2
  exit 1
fi

echo "Using log folder: $LATEST" >&2

FILES=(plan-loop.log delegation-loop.log aider-concurrent-loop.log codex-concurrent-loop.log triggered-runner.log)

for f in "${FILES[@]}"; do
  if [ ! -f "$LATEST/$f" ]; then
    echo "(pending) $f not created yet" >&2
  fi
  touch "$LATEST/$f"
done

echo "--- Streaming (Ctrl+C to stop) ---" >&2

if command -v multitail >/dev/null 2>&1; then
  exec multitail "${FILES[@]/#/$LATEST/}"
fi

for f in "${FILES[@]}"; do
  (
    tail -n0 -F "$LATEST/$f" | sed -u "s/^/[$f] /" &
  )
  sleep 0.2
done
wait
