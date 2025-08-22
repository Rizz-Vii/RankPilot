# Brain & Agents: Scripts and Environment Variables

Central reference for Brain orchestration, watch loop, planner, delegation auto‑enqueue, and Two‑Agent lint/type remediation prototype.

## Core Scripts

| Category                    | Script                               | Purpose                                      |
| --------------------------- | ------------------------------------ | -------------------------------------------- |
| Brain Build & Baselines     | `npm run build:brain`                | Compile brain sources to `dist/brain`.       |
| Brain Baseline              | `npm run brain:baseline`             | Generate baseline artifacts.                 |
| Brain Plan Only             | `npm run brain:plan-only`            | Produce plan JSON (no execution).            |
| Brain Dry Run               | `npm run brain:dry-run`              | Plan + validators (no execution).            |
| Brain Execute               | `npm run brain:execute`              | Single batch execute + validators.           |
| Brain Auto                  | `npm run brain:auto`                 | Iterative plan/execute with budgets.         |
| Brain Watch Loop            | `npm run brain:watch`                | Continuous mission regeneration + telemetry. |
| Brain Maintenance           | `npm run brain:maintenance`          | Prune artifacts + compact memory.            |
| Two-Agent One Shot          | `npm run brain:two-agent:lint-cycle` | Single two-agent planning enqueue pass.      |
| Two-Agent Autorun           | `npm run brain:two-agent:auto`       | Iterative plan + queue process loop.         |
| Two-Agent Watch (legacy)    | `npm run brain:two-agent:watch`      | Interval-based two-agent planning watcher.   |
| Delegation Loop             | `npm run delegate:loop`              | Background task processor for queue.         |
| Delegation Process (manual) | `npm run delegate:process`           | One-off queue processing pass.               |
| Queue Hose                  | `npm run queue:hose`                 | Mark matching tasks done (non-destructive).  |
| Queue Purge                 | `npm run queue:purge`                | Remove matching tasks.                       |

### Brain Budget & Global Controls

| Variable                         | Default | Description                                           |
| -------------------------------- | ------- | ----------------------------------------------------- |
| `PB_BRAIN_BUDGET_TOKEN`          | unset   | Max tokens budget (heuristic) for auto mode.          |
| `PB_BRAIN_BUDGET_TIME`           | unset   | Time budget (minutes) for auto mode.                  |
| `PB_BRAIN_FORCE_VALIDATION_FAIL` | 0       | Force validator fail to test resilience.              |
| `PB_BRAIN_FORCE_SKIP_BIN`        | 0       | Skip certain binary/tool executions in tool registry. |

### Brain Watch Loop Environment

| Variable                         | Default     | Description                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| `BRAIN_INTERVAL_MS`              | 180000      | Interval between ticks (ms).                                        |
| `BRAIN_MODE`                     | plan-only   | `plan-only` or `ask` (interactive table).                           |
| `BRAIN_VERBOSE`                  | 0           | If `1` show verbose table (ask mode).                               |
| `BRAIN_FULL`                     | 0           | If `1` include full enhancement ordering.                           |
| `BRAIN_TICK_JSON`                | 0           | If `1` write JSONL tick telemetry.                                  |
| `BRAIN_REGENERATE_MISSION`       | 1           | Force mission recalculation each tick (default enabled).            |
| `BRAIN_AUTODELEGATE`             | 0           | If `1` auto-start delegation loop when urgent remediation surfaced. |
| `BRAIN_AUTODELEGATE_COOLDOWN_MS` | 600000      | Min ms between auto-start attempts.                                 |
| `BRAIN_ENQUEUE_TS`               | 0           | If `1` enqueue per-file TS fix tasks on urgent triggers.            |
| `BRAIN_ENQUEUE_TS_COOLDOWN_MS`   | 900000      | Cooldown between TS enqueue bursts.                                 |
| `BRAIN_AUTO_MAINTENANCE`         | 0           | If `1` run maintenance every N ticks.                               |
| `BRAIN_MAINTENANCE_EVERY_N`      | 30          | Ticks between maintenance runs.                                     |
| `BRAIN_AGENT_TRIAGE`             | 0           | If `1` enable agent triage actions.                                 |
| `BRAIN_AGENT_TRIAGE_COOLDOWN_MS` | 300000      | Cooldown for triage actions.                                        |
| `BRAIN_PLANNER_DEBUG`            | 0           | If `1` extra logging for planner decisions.                         |
| `BRAIN_USE_OPENAI`               | 0           | If `1` enable OpenAI planning path.                                 |
| `BRAIN_OPENAI_MODEL`             | gpt-4o-mini | Override planner model.                                             |
| `BRAIN_FORCE_OPENAI_STRATEGY`    | 0           | Force OpenAI planner even if heuristics pass.                       |
| `BRAIN_FORCE_CODEX`              | 0           | Force code generation via Codex-like path.                          |
| `BRAIN_SILENCE_RUNNERS`          | unset       | Silence runner logging when set.                                    |
| `BRAIN_COST_PROMPT_RATE`         | 0.0000015   | USD per prompt token (cost calc).                                   |
| `BRAIN_COST_COMPLETION_RATE`     | 0.0000020   | USD per completion token.                                           |
| `BRAIN_AUTOPULSE_INTERVAL_MS`    | 60000       | Interval for certain autopulse functions.                           |
| `BRAIN_ENQUEUE_FROM_PLAN`        | 0           | If `1` auto enqueue steps directly from plan output.                |
| `BRAIN_FILTER_NOFILE_STEPS`      | 0           | If `1` ignore plan steps without file context when enqueueing.      |
| `BRAIN_AUTOTRIGGER`              | 0           | Internal auto-trigger flag (rare manual use).                       |
| `BRAIN_AUTOTRIGGERED`            | internal    | Set by spawned processes (do not set manually).                     |

### Brain Planner & Execution Extras

| Variable                      | Default | Description                                                    |
| ----------------------------- | ------- | -------------------------------------------------------------- |
| `BRAIN_FORCE_OPENAI_STRATEGY` | 0       | Force OpenAI planner path (even fallback).                     |
| `BRAIN_FORCE_CODEX`           | 0       | Force code generation via Codex-like path.                     |
| `OPENAI_API_KEY`              | unset   | Needed for OpenAI planner integration and delegation AI fixes. |
| `OPENAI_GPT5_KEY`             | unset   | Optional alternative key (planner checks length).              |
| `OPENAI_ORGANIZATION`         | unset   | Org id for OpenAI usage (optional).                            |

### Two-Agent Lint / Type Remediation Variables

| Variable                           | Default                        | Description                                         |
| ---------------------------------- | ------------------------------ | --------------------------------------------------- |
| `TWO_AGENT_MAX_TASKS`              | 5                              | Max tasks before adaptive scaling.                  |
| `TWO_AGENT_AUTOSCALE`              | enabled                        | Set `0` to disable autoscale expansion.             |
| `TWO_AGENT_AUTOSCALE_CAP`          | 10                             | Max tasks after autoscale.                          |
| `TWO_AGENT_DRIFT_THRESHOLD`        | 1.5                            | Drift threshold to reduce batch.                    |
| `TWO_AGENT_PLANNER`                | 0                              | If `1` attempt OpenAI ordering of rules.            |
| `TWO_AGENT_PLANNER_MODEL`          | gpt-4o-mini                    | Model for planner rule ordering.                    |
| `TWO_AGENT_PLANNER_RETRIES`        | 2                              | Planner retry attempts.                             |
| `TWO_AGENT_PLANNER_BACKOFF_MS`     | 300                            | Base backoff ms (exponential).                      |
| `TWO_AGENT_LINT_REPORT_PATH`       | artifacts/eslint-report.json   | ESLint report path.                                 |
| `TWO_AGENT_TSC_DIAGNOSTICS_PATH`   | artifacts/tsc-diagnostics.json | TS diagnostics path.                                |
| `TWO_AGENT_TSC_BATCH`              | 0                              | If `1` enable TS diagnostics batching.              |
| `TWO_AGENT_TSC_BATCH_MIN`          | 4                              | Min per-rule tasks to batch.                        |
| `TWO_AGENT_TSC_BATCH_MAX_FILES`    | 3                              | Max files per TS batch task.                        |
| `TWO_AGENT_FILE_CHURN_MINUTES`     | 10                             | Skip files modified within this window.             |
| `TWO_AGENT_SKIP_PREGEN`            | 0                              | If `1` skip artifact regeneration pre-step.         |
| `TWO_AGENT_AUTORUN_ITERS`          | 3                              | Max autorun iterations.                             |
| `TWO_AGENT_AUTORUN_MINUTES`        | 10                             | Max autorun time budget (minutes).                  |
| `TWO_AGENT_FORCE_REPLAN_AFTER`     | 2                              | Consecutive zero-plan cycles before forcing replan. |
| `TWO_AGENT_FORCE_REPLAN_QUEUE_MIN` | 5                              | Pending threshold to trigger forced replan.         |
| `TWO_AGENT_FORCE_REPLAN`           | enabled                        | Set `0` to disable hash clearing forced replans.    |

Legacy watch-specific extras (if using `brain:two-agent:watch`):

| Variable                        | Default | Description                               |
| ------------------------------- | ------- | ----------------------------------------- |
| `TWO_AGENT_INTERVAL_MS`         | 120000  | Interval between watch iterations.        |
| `TWO_AGENT_DRAIN`               | 0       | If `1` drain until queue empty then exit. |
| `TWO_AGENT_ONCE`                | 0       | If `1` run a single iteration then exit.  |
| `TWO_AGENT_AUTOFIX_FIRST`       | 0       | If `1` run fixer before planning.         |
| `TWO_AGENT_SELF_PROCESS`        | 0       | If `1` watch script self-processes queue. |
| `TWO_AGENT_SELF_PROCESS_ROUNDS` | 3       | Max self-processing rounds per cycle.     |
| `TWO_AGENT_MAX_DRAIN_CYCLES`    | 20      | Safety cap on drain cycles.               |
| `TWO_AGENT_JSON_ONLY`           | 0       | Suppress concise human log if set.        |
| `TWO_AGENT_EMIT_JSON_LINE`      | 0       | Emit JSON line for each iteration result. |

### Example Invocations

Two-Agent autorun with autoscale and planner ordering:

```
OPENAI_API_KEY=sk-... TWO_AGENT_PLANNER=1 TWO_AGENT_AUTOSCALE_CAP=12 TWO_AGENT_AUTORUN_ITERS=6 npm run brain:two-agent:auto
```

Brain watch loop with TS enqueue & auto delegation:

```
BRAIN_MODE=ask BRAIN_VERBOSE=1 BRAIN_TICK_JSON=1 BRAIN_ENQUEUE_TS=1 BRAIN_AUTODELEGATE=1 BRAIN_AUTO_MAINTENANCE=1 npm run brain:watch
```

Disable forced replan in autorun:

```
TWO_AGENT_FORCE_REPLAN=0 npm run brain:two-agent:auto
```

### Notes

- Prefer enabling planner (`TWO_AGENT_PLANNER=1` or `BRAIN_USE_OPENAI=1`) only when an OpenAI key is configured to avoid needless retries.
- Cooldowns exist to prevent runaway background loops—tune via the `*_COOLDOWN_MS` variables instead of removing guards.
- Forced replan strategically clears the hash file when stagnation is detected; disable via `TWO_AGENT_FORCE_REPLAN=0` if stability analysis is required.

### Delegation / Aider & Codex Variables

Environment flags for the delegation queue processor (`delegate:process` / `delegate:loop`), mechanical task autorun, and lightweight orchestrators that emit Codex/Aider prompts.

| Variable                             | Default                                              | Description                                                                                            |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AIDER_AUTORUN`                      | 0                                                    | If `1` the queue processor spawns aider automatically per task (non-interactive).                      |
| `AIDER_MODEL`                        | first candidate                                      | Override selected aider model (falls back to first in candidates list).                                |
| `AIDER_MODEL_CANDIDATES`             | `gpt-5-mini,gpt-4.1-mini,gpt-4.1,gpt-4o-mini,gpt-4o` | Comma list; first available becomes default if `AIDER_MODEL` unset.                                    |
| `AIDER_ARGS`                         | unset                                                | Extra space‑separated aider CLI flags (inserted before file list).                                     |
| `AIDER_BIN`                          | `aider`                                              | Binary / path used by orchestrators for frontend/docs edits.                                           |
| `CODEx_BIN`                          | `codex`                                              | Binary for backend (Codex) runner (mixed casing preserved from source).                                |
| `DELEGATION_RUN_TESTS`               | 0                                                    | If `1` run post‑success test script for quality gate.                                                  |
| `DELEGATION_TEST_SCRIPT`             | `test:delegation-smoke`                              | NPM script executed when `DELEGATION_RUN_TESTS=1`.                                                     |
| `DRY_RUN`                            | 0                                                    | In delegation processor: validate & log but do not execute aider; leaves task pending or marks failed. |
| `MAX_TASKS`                          | 3                                                    | Orchestrator: cap number of tasks parsed/executed in a batch.                                          |
| `RUN`                                | 0                                                    | Orchestrator: set `1` to actually invoke Codex/Aider; otherwise only write prompt artifacts.           |
| `DRY_SAVE_ONLY`                      | 0                                                    | If `1` always write prompt files but skip tool execution even if `RUN=1`.                              |
| `TOKEN_LEDGER`                       | 0                                                    | If `1` append token usage snapshots to `.codex/token-ledger.jsonl`.                                    |
| `ACTIVE_PROFILE`                     | derived                                              | Set by profile router during delegation loop (do not set manually).                                    |
| `OPENAI_API_KEY` / `OPENAI_GPT5_KEY` | unset                                                | Aider / planner model access; `OPENAI_GPT5_KEY` auto-mapped if primary key missing.                    |

Supporting queue & analytics artifacts:

- Queue file: `sessions/aider-queue.jsonl`
- Log file: `sessions/aider-log.jsonl`
- Aider analytics: `.codex/tmp/aider-analytics.jsonl`

Example: fully automated mechanical lint fixes with tests & analytics logging:

```
OPENAI_API_KEY=sk-... AIDER_AUTORUN=1 DELEGATION_RUN_TESTS=1 AIDER_ARGS="--analytics --analytics-log .codex/tmp/aider-analytics.jsonl" npm run delegate:loop
```

Notes:

- Use `DRY_RUN=1` first to verify validation (file size caps, risk classification) before enabling `AIDER_AUTORUN`.
- Keep mechanical tasks ≤180 LOC (hard 220) as enforced by process policies; split large tasks into `-A / -B`.
- Pin a model via `AIDER_MODEL` for reproducibility during lengthy remediation phases.

### Parallel Aider & Codex Loops (New)

Additional environment variables enabling multi-backend execution and selective routing of tasks:

| Variable                        | Default                    | Description                                                                      |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `AIDER_MAX_PARALLEL`            | 2                          | Parallel aider processes (1-4 enforced).                                         |
| `AIDER_LOOP_INTERVAL`           | 10000                      | Interval ms between aider concurrent loop scans.                                 |
| `AIDER_STALE_MS`                | 300000                     | Recycle a running aider task if no process & older than this.                    |
| `CODEX_MAX_PARALLEL`            | 2                          | Parallel Codex executor processes.                                               |
| `CODEX_LOOP_INTERVAL`           | 12000                      | Interval ms between Codex loop scans.                                            |
| `CODEX_STALE_MS`                | 300000                     | Recycle stale Codex task (status=running, process missing).                      |
| `CODEX_SELECTIVE`               | 0                          | When set to 1 only tasks whose summary starts with `[CODEX]` are executed.       |
| `CODEX_EXEC_CMD`                | `npm run delegate:process` | Command invoked per Codex task (receives `TARGET_TASK`).                         |
| `CODEX_INSTANCE`                | unset                      | Optional instance id appended to log prefix (multi-loop).                        |
| `TWO_AGENT_CODEX_TS`            | 1                          | If 1, planner may tag TS/TS batch tasks with `[CODEX]` prefix. Set 0 to disable. |
| `TWO_AGENT_CODEX_MAX_PER_BATCH` | 2                          | Max tasks in a single planner cycle to tag for Codex execution.                  |

Operational Guidance:

1. Start planner-only loop (plan) and aider concurrent loop for baseline lint/style tasks.
2. Run Codex concurrent loop with `CODEX_SELECTIVE=1` to focus only on `[CODEX]` tagged TypeScript/batch fixes.
3. Tune combined parallelism: `AIDER_MAX_PARALLEL + CODEX_MAX_PARALLEL` should not exceed number of distinct targeted files to minimize idle contention.
4. For pure TS remediation surge: increase `TWO_AGENT_CODEX_MAX_PER_BATCH` temporarily and set `CODEX_SELECTIVE=1` while lowering aider parallelism.
5. Disable Codex tagging quickly by exporting `TWO_AGENT_CODEX_TS=0` (existing tagged tasks remain but no new ones added).

### Unified Two-Agent Remediation Suite (New)

The unified suite script consolidates startup of all cooperating loops (aider concurrent, codex concurrent, delegation loop, triggered runner) and then runs a foreground two‑agent planning cycle with optional drain.

Script: `scripts/run-two-agent-suite.sh`
VS Code Task: `two-agent:unified-suite`

Core actions performed:

1. (Optional) Regenerate ESLint & TS artifacts unless `TWO_AGENT_SKIP_PREGEN=1`.
2. Launch background loops:
   - `aider:concurrent-loop`
   - `codex:concurrent-loop` (selective mode if `CODEX_SELECTIVE=1`)
   - `delegate:loop` (queue processor)
   - `delegate:triggered-runner` (file-triggered fast processor)
3. Execute planner lint cycle (single pass) or autorun mode if `TWO_AGENT_AUTORUN_ITERS` > 1.
4. Gracefully terminate background processes on exit or signal.

Minimal usage (default parallelism):

```
bash scripts/run-two-agent-suite.sh
```

Selective Codex execution & bumped aider parallelism:

```
CODEX_SELECTIVE=1 AIDER_MAX_PARALLEL=3 CODEX_MAX_PARALLEL=1 bash scripts/run-two-agent-suite.sh
```

Skip artifact pre-generation (use cached report/diagnostics):

```
TWO_AGENT_SKIP_PREGEN=1 bash scripts/run-two-agent-suite.sh
```

Drain queue after planner pass (ensure loops finish outstanding tasks then exit):

```
TWO_AGENT_DRAIN=1 bash scripts/run-two-agent-suite.sh
```

Fast iteration (disable Codex tagging & reduce churn guard):

```
TWO_AGENT_CODEX_TS=0 TWO_AGENT_FILE_CHURN_MINUTES=2 bash scripts/run-two-agent-suite.sh
```

Key env interplay for suite tuning:

| Variable                       | Impact                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| `AIDER_MAX_PARALLEL`           | Number of parallel aider fixers.                             |
| `CODEX_MAX_PARALLEL`           | Number of parallel Codex fixers.                             |
| `CODEX_SELECTIVE`              | Restrict Codex to `[CODEX]` tagged tasks.                    |
| `TWO_AGENT_CODEX_TS`           | Planner tagging of TS tasks for Codex path.                  |
| `TWO_AGENT_SKIP_PREGEN`        | Skips ESLint / TSC artifact regeneration step.               |
| `TWO_AGENT_DRAIN`              | After planner pass, wait for queue to empty before teardown. |
| `TWO_AGENT_AUTORUN_ITERS`      | Multiple planner passes before teardown.                     |
| `TWO_AGENT_FORCE_REPLAN_AFTER` | Force hash clear if stagnation across passes.                |

Safety reminders:

- Keep combined parallelism modest on constrained dev containers (2-4 total) to avoid OOM.
- If artifact drift suspected mid-run (large external edits), terminate suite and restart to rebuild artifacts cleanly.
- Use `DRY_RUN=1` with delegation loop separately if validating a large influx of tasks before enabling automated fixes.
