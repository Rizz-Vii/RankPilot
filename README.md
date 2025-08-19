# RankPilot

A focused AI SEO/marketing SaaS built with Next.js + Firebase.

> NOTE: Project previously branded as "RankPilot Studio". Historical logs & session transcripts retain the legacy name for provenance.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Cloud_Functions_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)
![Playwright](https://img.shields.io/badge/Playwright-Tests-green?logo=playwright)

## Canonical quick links (AI + engineering)

- DevAgents – in‑app AI agents root guide: [docs/exMD/DevAgents.md](./docs/exMD/DevAgents.md)
- Copilot Chatmode (deterministic profile): [.github/chatmodes/pilotBuddy.chatmode.md](./.github/chatmodes/pilotBuddy.chatmode.md)
- Copilot Instructions (deterministic execution): [.github/chatmodes/copilot-instructions.md](./.github/chatmodes/copilot-instructions.md)
- Production Addendum (2025‑08‑12): [archey/ADDENDUM_2025-08-12.md](./archey/ADDENDUM_2025-08-12.md)
- Docs hub: [docs/README.md](./docs/README.md)

More references:

- PilotBuddy Intelligence: [docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md](./docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md)
- System Architecture: [docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md](./docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md)
- Security Protocols: [docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md](./docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md)
- Development Workflow: [docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md](./docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md)
- Testing Infrastructure: [docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md](./docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md)
- Mobile Performance: [docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md](./docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md)
- Firestore Schemas: [docs/FIRESTORE_SCHEMAS.md](./docs/FIRESTORE_SCHEMAS.md)
- Incomplete Code Audit: [docs/INCOMPLETE_CODE_AUDIT.md](./docs/INCOMPLETE_CODE_AUDIT.md)
- Change Log: [docs/CHANGE_LOG.md](./docs/CHANGE_LOG.md)

## Quickstart

Requirements: Node.js 20+, npm

1. Install dependencies

 ```bash
 npm install
 ```

2. Start the web app (stable dev server)

 ```bash
 npm run dev-no-turbopack
 ```

Optional:

- Lint/format: `npm run lint`
- Run tests (see docs for variants): `npm test`
- Validate delegation log (non-blocking governance check): `npm run validate:aider-log`

## Automation Recipes – Cron support (subset)

The scheduler supports a minimal, deterministic subset of cron for recipe schedules:

- Aliases: `@daily` (00:00 UTC next day), `@hourly` (top of next hour)
- Pattern: `m h * * *` where:
  - `m` = minute (0–59 or `*`), `h` = hour (0–23 or `*`)
  - Day-of-month, month, and day-of-week must be `*` (not supported yet)
- Evaluation is in UTC. Next run is computed by scanning forward up to 48h.

Examples:

- `@daily` → every day at 00:00 UTC
- `@hourly` → every hour at minute 0
- `30 11 * * *` → 11:30 UTC daily
- `0 * * * *` → every hour at minute 0

Notes:

- Don’t set both `intervalMinutes` and `cron` at the same time; creation/update will reject that combination.
- When neither `cron` nor `intervalMinutes` is set, `atHourUTC` (0–23) can be used for daily runs.

## Finance Mock Mode

Finance dashboards (Finance Dashboard, Billing Overview, Invoices) can surface mock metrics for local development or demo states. Behavior is controlled by the helper `allowFinanceMocks()` which resolves in this priority order:

1. Browser override: `localStorage.setItem('allowFinanceMocks','true'|'false')` (immediate toggle without rebuild).
2. Environment variable: `NEXT_PUBLIC_ALLOW_FINANCE_MOCKS=true|false` (at build/runtime).
3. Default: Enabled in non-production (`NODE_ENV !== 'production'`), disabled in production when unspecified.

When mocks are active and no live metrics have loaded, a yellow banner appears stating that finance metrics are mock-sourced (FINANCE_MOCK_MODE). The banner disappears once live data loads or mocks are disabled.

## Brain Commands (PilotBuddy Central Brain)

Core development / orchestration helpers:

```
npm run brain:baseline   # minimal baseline generation run
npm run brain:plan-only  # produce a plan JSON summary only
npm run brain:dry-run    # plan + validators (no execution)
npm run brain:execute    # plan + single batch execute + validators
npm run brain:auto       # heuristic splitting + iterative execute (early abort on budget)
npm run test:brain       # fast brain test harness
npm run brain:verify     # baseline verification wrapper
```

Environment overrides (budget):

```
PB_BRAIN_BUDGET_TOKEN=5000 PB_BRAIN_BUDGET_TIME=30 npm run brain:auto
```

Artifacts written under `artifacts/brain/` (run-*.json, remediation-*.json, plan-*.txt). Sensitive fields redacted.

### Watch Loop Telemetry & Maintenance (Aug 2025 update)

New capabilities:

- Per‑tick mission regeneration with delta computation (TS / Lint error changes).
- Optional JSONL tick stream: `watch-ticks.jsonl` (enable with `BRAIN_TICK_JSON=1`). Each line: `{ ts, tick, durationMs, mode, mission{...}, missionDelta{...} }`.
- Automatic per‑file TypeScript fix task enqueue (enable `BRAIN_ENQUEUE_TS=1`). Honors cooldown `BRAIN_ENQUEUE_TS_COOLDOWN_MS` (default 900000 ms).
- Auto start delegation loop if urgent remediation is top (`BRAIN_AUTODELEGATE=1`) with cooldown `BRAIN_AUTODELEGATE_COOLDOWN_MS` (default 600000 ms).
- Periodic maintenance (artifact pruning + memory compaction) when `BRAIN_AUTO_MAINTENANCE=1`; frequency via `BRAIN_MAINTENANCE_EVERY_N` (default 30 ticks).
- Force mission regeneration toggle: `BRAIN_REGENERATE_MISSION=1` (default on after integration).

Maintenance scripts:

```
npm run brain:prune-artifacts   # Trim old plan/run/remediation artifacts
npm run brain:compact-memory    # Truncate memory.jsonl & gzip archive overflow
npm run brain:maintenance       # Runs both sequentially
```

Recommended watch invocation (verbose ask mode with telemetry & maintenance):

```
BRAIN_MODE=ask BRAIN_VERBOSE=1 BRAIN_TICK_JSON=1 BRAIN_ENQUEUE_TS=1 BRAIN_AUTODELEGATE=1 BRAIN_AUTO_MAINTENANCE=1 npm run brain:watch
```

Safety: Cooldowns prevent runaway task enqueue or loop spawning. Adjust via env vars rather than code edits.



