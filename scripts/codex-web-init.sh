#!/usr/bin/env bash
set -euo pipefail

echo "[codex-web-init] Starting setup"

# Safer defaults for cloud builder
export NODE_OPTIONS="--max-old-space-size=3072"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export HUSKY=0
export CI=1
export NEXT_TELEMETRY_DISABLED=1

# Optional speed toggles
export DISABLE_ESLINT_PLUGIN=${DISABLE_ESLINT_PLUGIN:-true}
export SKIP_ENV_VALIDATION=${SKIP_ENV_VALIDATION:-true}
export RANKPILOT_AGENTS_ENABLED=${RANKPILOT_AGENTS_ENABLED:-false}

node -v || true
npm -v || true

echo "[codex-web-init] Validating environment hygiene"
node scripts/validate-codex-env.mjs || true

echo "[codex-web-init] Installing root deps"
# Avoid lifecycle scripts (husky prepare) in Codex Web
export NPM_CONFIG_IGNORE_SCRIPTS=1
npm ci --omit=optional --no-audit --no-fund --progress=false --ignore-scripts \
  || npm i --omit=optional --no-audit --no-fund --progress=false --ignore-scripts

if [ -d functions ]; then
  echo "[codex-web-init] Installing functions deps"
  (cd functions && npm ci --omit=optional --no-audit --no-fund --progress=false --ignore-scripts \
    || npm i --omit=optional --no-audit --no-fund --progress=false --ignore-scripts)
fi

echo "[codex-web-init] Building"
npm run build

echo "[codex-web-init] Done"
