# RankPilot

A focused AI SEO/marketing SaaS built with Next.js + Firebase.

> NOTE: Project previously branded as "RankPilot Studio". Historical logs & session transcripts retain the legacy name for provenance.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Cloud_Functions_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)
![Playwright](https://img.shields.io/badge/Playwright-Tests-green?logo=playwright)

## Canonical quick links (AI + engineering)

- DevAgents – in‑app AI agents root guide: [docs/exMD/DevAgents.md](./docs/exMD/DevAgents.md)
- Brain & Agents Env Reference: [docs/BRAIN_AND_AGENTS_ENV.md](./docs/BRAIN_AND_AGENTS_ENV.md)
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

## Two-Agent Lint / Type Remediation (Supervisor + Reviewer Prototype)

Scripts:

```
npm run brain:two-agent:lint-cycle   # single planning + enqueue pass
npm run brain:two-agent:auto         # iterative autorun: plan + process queue
```

Autorun flow per iteration:

1. Regenerate ESLint + TypeScript diagnostics artifacts (unless `TWO_AGENT_SKIP_PREGEN=1`).
2. Plan prioritized remediation tasks (respecting churn guard + hash guard).
3. Enqueue new tasks into delegation queue.
4. Process queue (requires `OPENAI_API_KEY`).


Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TWO_AGENT_MAX_TASKS` | 5 | Max tasks per planning cycle (pre-adaptive). |
| `TWO_AGENT_AUTOSCALE` | enabled | If not `0`, may expand batch when mixed task types & low drift. |
| `TWO_AGENT_AUTOSCALE_CAP` | 10 | Upper cap after autoscale adjustments. |
| `TWO_AGENT_DRIFT_THRESHOLD` | 1.5 | Planner drift threshold to halve adaptive batch. |
| `TWO_AGENT_PLANNER` | unset | If `1`, attempts OpenAI planner ordering (needs `OPENAI_API_KEY`). |
| `TWO_AGENT_PLANNER_MODEL` | gpt-4o-mini | Model for ordering when planner enabled. |
| `TWO_AGENT_FILE_CHURN_MINUTES` | 10 | Skip files modified within this many minutes. |
| `TWO_AGENT_LINT_REPORT_PATH` | artifacts/eslint-report.json | Override ESLint report path. |
| `TWO_AGENT_TSC_DIAGNOSTICS_PATH` | artifacts/tsc-diagnostics.json | Override TypeScript diagnostics path. |
| `TWO_AGENT_TSC_BATCH` | unset | If `1`, enable diagnostic batching heuristics. |
| `TWO_AGENT_TSC_BATCH_MIN` | 4 | Min per-rule tasks to trigger batching. |
| `TWO_AGENT_TSC_BATCH_MAX_FILES` | 3 | Max files per batched TS task. |
| `TWO_AGENT_PLANNER_RETRIES` | 2 | Planner retry attempts. |
| `TWO_AGENT_PLANNER_BACKOFF_MS` | 300 | Base backoff (exponential) between planner retries. |
| `TWO_AGENT_AUTORUN_ITERS` | 3 | Max autorun iterations. |
| `TWO_AGENT_AUTORUN_MINUTES` | 10 | Time budget (minutes) for autorun loop. |
| `TWO_AGENT_FORCE_REPLAN_AFTER` | 2 | Consecutive zero-plan cycles before forcing replan. |
| `TWO_AGENT_FORCE_REPLAN_QUEUE_MIN` | 5 | Pending threshold to trigger forced replan. |
| `TWO_AGENT_FORCE_REPLAN` | enabled | Set to `0` to disable force-replan hash clearing entirely. |
| `TWO_AGENT_SKIP_PREGEN` | unset | If `1`, skip regenerating lint/ts diagnostics each cycle. |

Forced re-planning: When `planned=0` for `TWO_AGENT_FORCE_REPLAN_AFTER` consecutive iterations and the queue still has at least `TWO_AGENT_FORCE_REPLAN_QUEUE_MIN` pending tasks, the autorun loop deletes the previous hash ( `.codex/tmp/two-agent-last-hash.txt` ) so the next iteration can re-consider tasks. Disable this behavior entirely by setting `TWO_AGENT_FORCE_REPLAN=0`.

Prerequisites for queue processing: set `OPENAI_API_KEY` (or `OPENAI_GPT5_KEY`). Without it, autorun will skip the delegation processor execution stage.

Example:

```
OPENAI_API_KEY=sk-... TWO_AGENT_AUTORUN_ITERS=6 TWO_AGENT_MAX_TASKS=7 npm run brain:two-agent:auto
```




