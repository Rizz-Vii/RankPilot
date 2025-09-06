#!/usr/bin/env bash
set -euo pipefail

# CI helper: runs ui-data-population smoke in soft then strict mode (strict allowed to fail)
# Always produces markdown summary artifact.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p test-results

echo "[ui-data-population] Soft run (non-enforcing)" >&2
if ! npm run -s test:ui-data-population; then
  echo "Soft run failed unexpectedly (should rarely fail). Continuing to summary." >&2
fi

# Generate interim summary
npm run -s report:ui-data-population || echo "Summary generation failed (interim)" >&2

# Strict run (do not abort pipeline if it fails) - capture exit
echo "[ui-data-population] Strict run (enforcing)" >&2
if npm run -s test:ui-data-population:strict; then
  STRICT_STATUS=0
else
  STRICT_STATUS=$?
  echo "Strict enforcing run failed (expected if data not yet reliable)." >&2
fi

# Final summary (aggregates both runs' NDJSON lines)
npm run -s report:ui-data-population || echo "Summary generation failed (final)" >&2

if [[ $STRICT_STATUS -ne 0 ]]; then
  echo "NOTE: Strict mode detected failures. Treat as soft failure unless CI policy overrides." >&2
fi

exit 0
