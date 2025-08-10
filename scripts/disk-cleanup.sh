#!/usr/bin/env bash
set -euo pipefail

echo "[disk-cleanup] Starting RankPilot workspace disk reclamation"

DEEP=0
for arg in "$@"; do
  case "$arg" in
    --deep|--aggressive)
      DEEP=1
      ;;
  esac
done

bytes_before=$(df -k . | awk 'NR==2 {print $3}')

echo "[disk-cleanup] Removing Next.js and Firebase framework caches (safe – will be regenerated)."

if [ -d .next/cache ]; then
  echo "[disk-cleanup] Clearing .next/cache"
  rm -rf .next/cache/* || true
fi

if [ -d .firebase/rankpilot-h3jpc/functions/.next/cache ]; then
  echo "[disk-cleanup] Clearing Firebase functions embedded Next.js cache"
  rm -rf .firebase/rankpilot-h3jpc/functions/.next/cache/* || true
fi

find . -type f -name '*.pack.old' -delete 2>/dev/null || true

rm -f tsconfig.tsbuildinfo .eslintcache 2>/dev/null || true

if [ $DEEP -eq 1 ]; then
  echo "[disk-cleanup] Deep mode enabled: removing .firebase build cache & old .next artifacts"
  rm -rf .firebase || true
  # Only remove node_modules if an env var confirms (to avoid accidental wipe)
  if [ "${NUKE_NODE_MODULES:-0}" = "1" ]; then
    echo "[disk-cleanup] Removing node_modules (will require npm ci)"
    rm -rf node_modules || true
  fi
fi

echo "[disk-cleanup] npm cache verify (non-destructive)"
npm cache verify >/dev/null 2>&1 || true

bytes_after=$(df -k . | awk 'NR==2 {print $3}')
freed_kb=$((bytes_after-bytes_before))
if [ $freed_kb -lt 0 ]; then freed_kb=0; fi

echo "[disk-cleanup] Freed approximately $((freed_kb/1024)) MB (approx)."
echo "[disk-cleanup] Done. Use '--deep' and optionally NUKE_NODE_MODULES=1 for aggressive reclaim."
