#!/usr/bin/env bash
git add src/app/api/mcp/route.ts && git commit -m "chore(mcp): bulk lint remediation for route.ts"
pnpm run lint
