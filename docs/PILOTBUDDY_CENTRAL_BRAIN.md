# PilotBuddy Central Brain (PB-CB)

Baseline scaffolding for a modular orchestration layer that ingests tasks, classifies, plans, executes, validates, and documents with strict governance. This phase adds core types, limits guard, simple classifier, config, and a baseline runner shim.

## Run

```
npm run brain:baseline
npm run test:brain
npm run brain:plan-only
npm run brain:dry-run
npm run brain:execute
npm run brain:auto
```

### Config notes
- tools: enable/disable per-runner (typecheck, eslint, playwright, etc.).
- limits: maxLocAdded, maxFiles; governance: maxBatchTasks, splitThresholdLoc.
- tokens: plannerModel, temperature, maxTokens.

## Module Map

| Area | File(s) | Purpose |
|------|---------|---------|
| Config | `scripts/brain/config.ts` | Load + validate config, env overrides |
| Classification | `core/classification.ts` | Domain inference |
| Task Ingestion | `core/taskParsing.ts`, `core/taskSources.ts` | Aggregate tasks from checklist / logs |
| Context | `core/contextSampler.ts` | Deterministic sampling of repo + prior artifacts |
| Planning | `planning/planner.ts` | Heuristic planner (OpenAI stub) + plan artifact |
| Governance | `governance/guards.ts`, `governance/splitter.ts` | Limits + plan splitting |
| Execution | `execution/runBatch.ts`, `execution/toolRegistry.ts` | Runner dispatch & diff stats stub |
| Plugins | `plugins/*.plugin.ts` | Optional dynamic runners/validators |
| Validation | `validation/validators.ts` | Lint/type/tests (simulated) + plugin validators |
| Logging | `state/logWriter.ts` | Redacted run/remediation artifact writer |

## Tool Matrix (stubs vs active)

| Tool | Domain Coverage | Status |
|------|-----------------|--------|
| OpenAIPlanner | all | stub planner |
| CodexRunner | all | stub codegen |
| AiderRunner | frontend, docs | stub codegen |
| TypecheckRunner | all | shell tsc (skippable) |
| ESLintRunner | broad | shell eslint --version (presence check) |
| PlaywrightRunner | frontend | shell playwright --version (presence check) |
| ExampleEchoRunner (plugin) | all | plugin sample |

## Governance Rules (snapshot)

1. Hard limits: `limits.maxLocAdded`, `limits.maxFiles` -> guard before execution.
2. Batch splitting: `governance.splitThresholdLoc` heuristically groups plan steps.
3. Budgets: token + time; auto mode aborts when exceeded, persists remediation + followUps.
4. Redaction: run logs scrub sensitive key names (`apiKey`, `openaiKey`, `authToken`, `password`, `secret`).
5. Determinism: sorted domain classification inputs & stable artifact naming (timestamped).
6. Plugin safety: failing plugin load never aborts core run (soft error recorded in names list).

