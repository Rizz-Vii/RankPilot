# AI Agents & Remediation Architecture

High-level map of cooperating automation components ("agents") used for lint/type remediation and broader codebase maintenance.

> Focus Mode: This architecture currently operates in a convergence window. Only reliability, governance, and minimal metrics improvements are in-scope. Adaptive heuristics, predictive forecasting, additional loop variants, and cosmetic refactors are explicitly deferred until Phase 1 + minimal Phase 2 exit criteria are GREEN.

## Overview Diagram (Conceptual)

```
            ┌────────────────────┐
            │  ESLint / TSC Art  │
            │  (reports JSON)    │
            └─────────┬──────────┘
                      │
              ingest / plan
                      │
            ┌─────────▼──────────┐
            │ Two-Agent Planner  │
            │ (prioritize rules, │
            │ batching, tagging) │
            └─────────┬──────────┘
                      │ enqueue tasks (JSONL)
                      ▼
            ┌────────────────────┐       file-event triggers       ┌────────────────────┐
            │  Delegation Queue  │◄───────────────────────────────┤ Triggered Runner   │
            │ sessions/*.jsonl   │                                │ watches & fast run │
            └───────┬─┬──────────┘                                └────────┬───────────┘
                    │ │                                                drain │
        pull tasks  │ │ pull `[CODEX]` tasks                             │ status
                    │ │                                                  │
        ┌───────────▼─▼──────────┐                           ┌───────────▼──────────┐
        │ Aider Concurrent Loop  │                           │ Codex Concurrent Loop│
        │ (frontend/docs/general)│                           │ (TS-focused selective)│
        └───────────┬────────────┘                           └──────────┬───────────┘
                    │ write patches                                   │ write patches
                    └──────────┬───────────────────────────────────────┘
                               │
                          repo changes
                               │
                         ┌─────▼─────┐
                         │   Git     │
                         └───────────┘
```

## Components

### Two-Agent Planner

Single-pass (lint cycle) or iterative (autorun) planner that:

- Parses ESLint + TSC diagnostics.
- Computes drift & autoscale (# of tasks) based on previous cycles.
- Batches TS diagnostics when enabled (TWO_AGENT_TSC_BATCH=1).
- Tags specific TS tasks with `[CODEX]` for Codex loop when `TWO_AGENT_CODEX_TS=1`.
- Enqueues tasks into queue JSONL (append-only).

Key safeguards:

- File churn filter (skip very recent edits) with `TWO_AGENT_FILE_CHURN_MINUTES`.
- Forced replan after stagnation (`TWO_AGENT_FORCE_REPLAN_AFTER`).
- Hash-based change detection to avoid redundant planning.

### Delegation Queue & Processor

Central task ledger (`sessions/aider-queue.jsonl`). Status transitions: `pending -> running -> done/failed`.
Processor (`delegate:process` / loop) applies LOC limits and optional post-test step.

Triggered Runner listens for a file touch/signal to accelerate processing between planner passes.

### Aider Concurrent Loop

Scans queue periodically to run allowed number of aider processes (`AIDER_MAX_PARALLEL`).
Focus: general lint refactors, documentation tweaks, multi-file mechanical changes respecting file count & LOC policies.

### Codex Concurrent Loop

Selective processor for high-signal TypeScript or batch TS rule tasks. Activated when `CODEX_SELECTIVE=1`; only executes tasks whose summary starts with `[CODEX]`.

### Unified Suite Script

`scripts/run-two-agent-suite.sh` coordinates starting all loops + a planner cycle for a cohesive remediation pass. Handles cleanup (signals) and optional drain.

### Artifact Generation

ESLint report (`artifacts/eslint-report.json`) & TSC diagnostics (`artifacts/tsc-diagnostics.json`) pre-generated unless skipped. These feed planner parsing.

## Execution Modes

| Mode                | Command                                                  | Description                                            |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Single Planner Pass | `npm run brain:two-agent:lint-cycle`                     | One shot enqueue of prioritized tasks.                 |
| Autorun N Passes    | `TWO_AGENT_AUTORUN_ITERS=5 npm run brain:two-agent:auto` | Iterative planning until budget/time reached.          |
| Full Watch Brain    | `npm run brain:watch`                                    | Mission-level regeneration & optional auto-delegation. |
| Unified Suite       | `bash scripts/run-two-agent-suite.sh`                    | Background loops + planner orchestrated.               |

## Environment Variable Clusters

- Planner Scaling: `TWO_AGENT_MAX_TASKS`, `TWO_AGENT_AUTOSCALE`, `TWO_AGENT_AUTOSCALE_CAP`.
- Diagnostics Batching: `TWO_AGENT_TSC_BATCH*`.
- Codex Tagging: `TWO_AGENT_CODEX_TS`, `TWO_AGENT_CODEX_MAX_PER_BATCH`, `CODEX_SELECTIVE`.
- Parallelism: `AIDER_MAX_PARALLEL`, `CODEX_MAX_PARALLEL`.
- Stability / Replan: `TWO_AGENT_FORCE_REPLAN*`, `TWO_AGENT_FILE_CHURN_MINUTES`.
- Queue Processing: `AIDER_AUTORUN`, `DELEGATION_RUN_TESTS`, `DRY_RUN`.

## Safety & Recovery

1. If queue error count spikes (consecutive failures >3) pause loops, inspect failing task patches before resuming.
2. For malformed patches or unintended broad changes revert via git and lower parallelism temporarily.
3. Use `DRY_RUN=1` with delegation to validate large new planner batches.
4. Keep unified suite runs short (one or few planner passes) when experimenting with new tagging heuristics.

## Future Enhancements (Ideas)

- Adaptive parallelism (increase/decrease based on average task duration & success rate).
- Cross-loop coordination channel to avoid two agents editing same file concurrently.
- Policy-based risk scoring integrating git blame age + test coverage heuristics.
- Metrics export (Prometheus) for queue depth, success rate, drift, planner latency.

### Deferred (Do Not Implement Now)

- Predictive KPI forecasting
- New agent loop archetypes beyond Aider/Codex
- Risk scoring beyond simple age + severity ordering
- Prometheus exporters (keep in-memory counters only)
- Extensive documentation rewrites beyond factual updates

### Immediate Hardening Targets

1. Queue metrics: depth, tasks_processed_total, tasks_failed_total, success_ratio
2. Per-file edit lock to prevent collision across concurrent loops
3. Provenance coverage assertion (automated scan) integrated with planner gating
4. Minimal BI snapshot composition (planner status, queue metrics, provenance coverage)

### Coding Guardrails Recap

- Keep diffs minimal (<200 LOC net) and tied to a hardening objective.
- No new `any` types; prefer `unknown` with local narrowing.
- Eliminate unused vars on sight (mechanical delegation allowed).
- All automated patches must pass lint & typecheck before merge.

---

Maintained alongside `BRAIN_AND_AGENTS_ENV.md`. Update both when introducing new loops or environment flags.
