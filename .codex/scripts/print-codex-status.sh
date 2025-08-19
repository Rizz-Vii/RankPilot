#!/usr/bin/env bash
set -euo pipefail
root_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root_dir/.codex"

echo "== Codex Project Status =="
 echo "Repo Root: $root_dir"

if [ -f README.md ]; then
  echo "README present"
else
  echo "README MISSING"; fi

for d in prompts policies queues scripts; do
  if [ -d "$d" ]; then
    count=$(find "$d" -type f | wc -l | tr -d ' ')
    echo "Dir $d: $count files"
  else
    echo "Dir $d: MISSING"; fi
done

if ls sessions/*.jsonl >/dev/null 2>&1; then
  echo "Session JSONL files present (not committed if ignored)"; else echo "No session logs"; fi

echo "Suggested Next: link root README to .codex."
