#!/usr/bin/env bash
set -euo pipefail

# Simple exponential-backoff retry wrapper for firebase deploy commands.
# Usage: ./scripts/firebase-deploy-retry.sh "firebase deploy --only functions --project <project>"

CMD=${1:-}
if [[ -z "$CMD" ]]; then
  echo "Usage: $0 \"firebase deploy ...\""
  exit 2
fi

MAX_ATTEMPTS=${MAX_ATTEMPTS:-8}
SLEEP_BASE=${SLEEP_BASE:-5}

echo "[deploy-retry] Command: $CMD"
echo "[deploy-retry] Max attempts: $MAX_ATTEMPTS, base backoff: ${SLEEP_BASE}s"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "[deploy-retry] Attempt $attempt/$MAX_ATTEMPTS..."
  # Capture both stdout and stderr
  set +e
  OUTPUT=$(eval "$CMD" 2>&1)
  STATUS=$?
  set -e

  echo "$OUTPUT"

  if [[ $STATUS -eq 0 ]]; then
    echo "[deploy-retry] Success on attempt $attempt"
    exit 0
  fi

  # Transient/error fingerprints to retry on
  if echo "$OUTPUT" | grep -qiE "Cloud Runtime Config is currently experiencing issues|Error generating the service identity for pubsub.googleapis.com|quota|unavailable|internal|deadline exceeded|ETIMEDOUT|ECONNRESET"; then
    SLEEP=$(( SLEEP_BASE * (2 ** (attempt - 1)) ))
    # Cap sleep to 120s
    if [[ $SLEEP -gt 120 ]]; then SLEEP=120; fi
    echo "[deploy-retry] Transient error detected; backing off for ${SLEEP}s before retry..."
    sleep "$SLEEP"
    continue
  fi

  echo "[deploy-retry] Non-retryable failure detected. Exiting."
  exit $STATUS
done

echo "[deploy-retry] Exhausted retries. Final failure."
exit 1
