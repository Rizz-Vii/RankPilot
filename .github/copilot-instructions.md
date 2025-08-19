# Copilot Instructions (RankPilot)

Concise operational context for AI coding agents to be instantly productive. Focus on THIS repo's architecture, workflows, conventions, and guardrails.

## 1. Architecture Snapshot

- Framework: Next.js (App Router) in `src/app`, React + TypeScript.
- Domains:
  - NeuroSEO engine & analyses: `src/lib/neuroseo/`
  - Observability/APM: `src/lib/monitoring/`
  - Finance metrics (currently gated/mocked): `src/lib/finance/`
  - Scheduling (deterministic subset cron): `src/lib/scheduler/`
  - Feature / access / entitlement logic: `src/lib/access*`, related scripts.
  - Brain (automation planner + validators): source -> build with `build:brain` into `dist/brain`.
  - Firebase Functions code: `functions/src` (keep server/runtime concerns isolated there).
- Shared utilities: `src/lib/*`, UI components under `src/components/`, tests under `testing/` (Playwright + Mocha) and `tests/brain`.
- Data layer: Firestore (queries should be centralized—prefer existing query builders / shared utilities rather than ad‑hoc `where` chains in React components).

## 2. Critical Workflows

| Goal                       | Command(s) / Notes                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------- | ------- | -------------------------- |
| Dev server                 | `npm run dev-no-turbopack` (stable) or `npm run dev` (turbopack)                            |
| Type safety                | `npm run typecheck` (no emit)                                                               |
| Lint (flat + next)         | `npm run lint:flat:all` (avoid wide `--fix` unless mechanical)                              |
| Autofix sweep + report     | VS Code task `refactor:lint-sweep` (sequence: autofix -> JSON report -> quality:fast)       |
| Unit tests (domain)        | e.g. `npm run test:unit:ai-adapter`, `test:unit:semantic-map-kpi`                           |
| E2E lean / perf            | `npm run test:lean`, `test:performance`                                                     |
| Provenance audit           | `npm run test:provenance-audit` (+ negative)                                                |
| Finance contracts          | `npm run test:revenue-metrics` / `test:revenue-kpi-contract` / `test:revenue-derive-events` |
| Brain operations           | `npm run brain:plan-only                                                                    | dry-run | execute | auto` (always build:brain) |
| Delegation loop            | VS Code task `delegation:loop` (autonomous mechanical queue)                                |
| Generate lint any baseline | `npm run lint:any-baseline` then guard via `npm run lint:any-guard`                         |

## 3. Project-Specific Conventions

- Keep diffs minimal; never refactor broadly inside a functional change.
- Replace `any` only when locally obvious (avoid cross-file cascade); safe pattern: use `unknown` + narrow.
- Memory limits are explicit on scripts (`--max-old-space-size`); preserve them in new scripts.
- Cron / scheduling: only `@daily`, `@hourly`, or `m h * * *` with the rest `*`; compute next run within 48h (`computeNextRun`). Do not introduce richer cron parsing.
- Finance metrics: mock vs live gating honored—do not hardcode; maintain header flags (`X-Finance-Metrics-*`).
- Rate limiting: extend centralized limiter (search `rate-limit`); do NOT duplicate per-route throttles.
- Provenance: API JSON responses should already use middleware / enforce helpers—when adding new route ensure provenance wrapper not duplicated.
- Design tokens: avoid raw hex colors; use existing CSS vars (lint rule enforces). Replace only targeted violations.

## 4. Delegation & Automation (Mechanical Tasks)

- Use queue file `sessions/aider-queue.jsonl` lines with fields `{ taskId, summary, files, status }`.
- Mechanical edit threshold: ≤180 LOC (hard 220). Split into `-A/-B` if bigger.
- Background processor: task `delegation:loop` promotes first `pending` to `running` and invokes `delegate:process`.
- After delegated change: run lint + targeted tests referenced in summary; if failing, enqueue FIX follow-up.

## 5. Safe Edit Patterns

| Scenario                                | Pattern                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Error handling w/out any                | `const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as any).message==='string') ? (e as Error).message : String(e)` then avoid broad casts elsewhere |
| Performance / navigator optional fields | Narrow via `as unknown as { connection?: { effectiveType?: string } }` then fallback `'unknown'`                                                                         |
| System resource memory                  | `(performance as unknown as { memory?: { usedJSHeapSize: number } }).memory` guard before use                                                                            |
| Aggregation metrics                     | Keep tag structure stable (`tags: { aggregation, groupKey }`) to avoid breaking dashboards                                                                               |
| Export formats                          | Preserve existing shape of JSON/CSV/Prometheus outputs; additive fields need tests                                                                                       |

## 6. Tests & Validation Strategy

- Add / adjust smallest focused test under existing family (organized Playwright for user flows; Mocha for logic units). Avoid introducing a new framework.
- Scheduler acceptance: ensure no change breaks emulator tests (search `Scheduler Emulator`).
- Finance modifications: always run the three finance contract scripts.
- Observability / AI adapter changes: run `test:unit:ai-adapter` & observability specs.

## 7. Introducing New Scripts

- Prefix logically: `scan:`, `report:`, `test:`, `brain:`, `delegate:`, `lint:`, `codemod:`.
- Include memory flag if performing heavy build or analysis.
- Avoid overlapping semantics with existing scripts; reuse patterns.

## 8. Anti-Patterns (Do NOT)

- Broad import reorder or formatting sweeps in feature PRs.
- Embedding Firestore query chains directly in components (factor to existing helpers or add a builder util first if missing).
- Parallel delegation processes (single loop only).
- Editing security/auth, payment, or Firestore schema logic via delegation.

## 9. Key Files (Jump Points)

| Purpose                   | Path                                                  |
| ------------------------- | ----------------------------------------------------- |
| APM / performance metrics | `src/lib/monitoring/enterprise-apm.ts`                |
| NeuroSEO orchestrator     | `src/lib/neuroseo/enhanced-orchestrator.ts`           |
| Scheduler core            | `src/lib/scheduler/next-run.ts` & `types.ts`          |
| Finance metrics source    | `src/lib/finance/metrics.ts`                          |
| AI memory / provider      | `functions/src/lib/ai-memory-manager.ts`              |
| Delegation scripts        | `scripts/delegation/*.ts`                             |
| Brain planner build       | `brain.config.json`, `dist/brain/**` (generated)      |
| Lint flat config          | `eslint.flat.mjs` (plus `eslint.config.mjs` for next) |

## 10. Quick Operational Checklist (Agent Turn Start)

1. Sync context: scan queue + open tasks; read only impacted files.
2. Derive explicit checklist from user request.
3. If mechanical multi-file >5 but simple: prepare delegation block.
4. Implement minimal diff; run typecheck + lint + targeted tests.
5. Summarize changes (deltas only) referencing deliverables (D1–D8) if applicable.

### Brain + Delegation Loop (Lint Remediation Acceleration)

Use the Brain watch loop + delegation loop to systematically eliminate remaining ESLint errors (~2.4k baseline).

Phased approach (aligns with `docs/LINT_REMEDIATION_STRATEGY.md`):

1. Phase 1 focus: unused vars, floating/misused promises, core `any` hotspots in `src/lib/neuroseo`, `src/lib/ai`, orchestration scripts.
2. Enqueue mechanical batches (≤160 LOC) via delegation loop using task IDs `LINT-P1-*`.
3. After each batch: run `npm run lint:report:json` and append snapshot delta (future automation hook) — for now, Brain mission delta captures error count drift.
4. Brain Loop: set env `BRAIN_TICK_JSON=1 BRAIN_ENQUEUE_TS=0 BRAIN_AUTODELEGATE=1` to auto-spawn delegation when urgent remediation step appears.

Standard cycle:

```
BRAIN_MODE=ask BRAIN_VERBOSE=1 BRAIN_TICK_JSON=1 BRAIN_AUTODELEGATE=1 npm run brain:watch &
task start: delegation:loop
```

When Brain surfaces a lint remediation file cluster, manually enqueue if not auto-delegated:

```
npm run delegate:enqueue -- --taskId=LINT-P1-unused-vars-A --files=path1.ts,path2.ts --summary="Remove unused vars in core engines"
```

Then process (if loop not already active):

```
npm run delegate:process
```

Stop criteria per phase: see Exit Criteria in strategy doc.

Safety: If error count increases in a tick (`missionDelta.lintErrors > 0`), pause delegation, review diff, and revert if necessary before resuming.

## 11. Rollback & Safety

- If unintended side effects or failing unrelated tests: revert last commit (manual) or isolate fix in ≤50 LOC patch.
- Never downgrade TypeScript or library versions in automation.
- Use `lint:any-guard` to detect any regressions after type changes.

Feedback welcome: clarify unclear domain areas (finance live integration plan, deeper NeuroSEO engine contracts, scheduler expansion) before large edits.

## 12. Concurrency & Task Orchestration

Goal: Safely maximize parallel progress (editor + background automation) without race conditions or duplicate processors.

Baseline Always-On (background):

- `dev-server` (hot reload UI) OPTIONAL if working on pure library code.
- `delegation:loop` (exactly one) — promotes pending mechanical tasks; DO NOT also run `delegation:auto` concurrently (loop internally spawns `delegate:process`).

Interactive Foreground Tasks (run on-demand, can overlap with loop):

- `typecheck` / `lint` / focused test scripts.
- `refactor:lint-sweep` (ensure queue idle first to avoid interleaved formatting diffs).
- Brain tasks (`codex:brain:*`) – keep isolated; they do not modify same files as delegation by design. If a brain task will emit code, pause delegation to prevent merge conflicts.

Concurrency Rules:

1. Single Writer Principle: Only one automated writer at a time (delegation loop OR a manual `delegate:process`). If you must run a one-off `delegate:process`, temporarily stop the loop task.
2. Human + Loop Safe: Manual edits + loop are fine; loop only touches queued file list. Re-run typecheck after both if touching same domain.
3. Sweep Isolation: Before running `eslint:autofix-all` or `refactor:lint-sweep`, ensure no pending/running queue items (otherwise queue patch context may drift). If busy, mark future tasks hold or wait for idle snapshot.
4. High-Risk Domains (finance, auth, Firestore rules): NEVER queued mechanically; edit manually with loop still allowed (loop ignores them) but prefer stopping loop if large refactor.
5. Queue Backpressure: If >3 failed tasks accumulate, pause loop and triage (avoid churn). Fix root cause then resume.
6. LOC Guard: Delegation tasks exceeding ~160 LOC estimated should be pre-split (avoid runtime rejection & rollback costs).

Quick Operational Pattern:

- Open: Start `dev-server` + `delegation:loop`.
- Implement feature slice manually; meanwhile loop clears mechanical backlog.
- Before broad formatting / lint sweep: stop loop, run sweep, restart loop.
- After adding new scripts impacting automation: restart loop to reload environment.

Detection & Recovery:

- Duplicate Loop: If two snapshots print overlapping times, stop the newer one (only first needed).
- Stalled Task: Status `running` > 5m -> mark failed manually (edit JSON line to `failed`) then resume; enqueue a `DEL-<TASK>-FIX` follow-up.
- Conflict (merge error in delegation): Remove task line, create a narrower replacement block.

Minimal Commands Cheat Sheet (sequential safe use):

1. Start loop: VS Code Task `delegation:loop`.
2. Pause loop: Stop task (Task Panel) before mass edits.
3. One-off process (while loop stopped): run `delegation:process` task.
4. Resume loop: restart task; confirm snapshot line prints.

Safety Heuristic: If uncertain whether an automated edit may touch the same region you're modifying, pause loop (cost ≤15s) and resume after commit.

## 13. Chatmodes & Phase Index

Chatmodes:
- PilotBuddy (`.github/chatmodes/pilotBuddy.chatmode.md`): Mechanical edits, delegation orchestration, broad contract enforcement.
- Developer Acceleration (`.github/chatmodes/rankPilotDeveloper.chatmode.md`): Multi-agent planner/refactor/reviewer loop, structured diff planning.

Phase Documents:
- Phase 1 Hardening: `.github/instructions/phase-1-hardening.instructions.md`
- Phase 2 Foundation Expansion: `.github/instructions/phase-2-foundation-expansion.instructions.md`
- Phase 3 Enhancement & Scaling: `.github/instructions/phase-3-enhancement-scaling.instructions.md`
- Execution Plan (canonical source of goals / acceptance): `.github/instructions/PROJECT_EXECUTION_PLAN.md`

Quick Phase Snapshot:
| Phase | Focus | Key Artifacts |
|-------|-------|---------------|
| 1 | Provenance, rate limiting, forbidden-field guard, logger coverage | middleware, scan scripts |
| 2 | Dev multi-agent loop, BI Hub, metrics breadth, event bus scaffold | supervisor, adapter, events enum |
| 3 | Adaptive planning, predictive KPIs, reporting, provenance reason codes | feedback store, forecast module |

Mode Switch Guidance:
- Use Developer mode when reasoning about multi-step refactors or generating patch proposals.
- Stay in PilotBuddy for lint sweeps, delegation queue ops, and quick contract validation.

Canonical Source Rule: Update execution plan first; then adjust phase instruction & chatmode files referencing the change (prevents drift).
