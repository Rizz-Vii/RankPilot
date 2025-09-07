# CI: SSE adapter and Lighthouse budgets

This repo enforces streaming stability and performance budgets in CI.

- SSE adapter unit tests (Node 20)
  - Workflow name: `ci-sse-adapter-node20`
  - Script: `npm run test:unit:sse:node20`
  - Recommendation: mark this workflow as a required status check on protected branches (Settings → Branches → Branch protection → Require status checks → add “SSE adapter (Node 20)”).

- Lighthouse CI budgets
  - Workflow: `.github/workflows/lighthouse-budget.yml`
  - Central gate also runs LHCI in `validation-gate.yml`.
  - To target a specific preview/staging host, set repo/org variable `PERFORMANCE_URL` (e.g. https://your-preview.web.app).
  - Local run: `PERFORMANCE_URL=http://localhost:3000 npm run lighthouse:audit`

References

- Config: `lighthouse.config.js` (uses PERFORMANCE_URL if set)
- SSE adapter: `src/lib/sse/adapter.ts`
- Streaming clients: insights/chat/NeuroSEO use the unified adapter
