# PilotBuddy Central Brain (PB-CB)

Baseline scaffolding for a modular orchestration layer that ingests tasks, classifies, plans, executes, validates, and documents with strict governance. This phase adds core types, limits guard, simple classifier, config, and a baseline runner shim.

## Run

```bash
npm run brain:baseline      # Run baseline scaffold assessment
npm run test:brain          # Run brain module tests
npm run brain:plan-only     # Generate execution plan without execution
npm run brain:dry-run       # Simulate execution with validation
npm run brain:execute       # Execute planned tasks with full validation
npm run brain:auto          # Auto mode with batch processing and timeouts
```

### Config Notes

- **tools**: enable/disable per-runner (typecheck, eslint, playwright, etc.).
- **limits**: maxLocAdded, maxFiles; governance: maxBatchTasks, splitThresholdLoc.
- **tokens**: plannerModel, temperature, maxTokens.

## Comprehensive Module Map

| Area | File(s) | Purpose | Dependencies |
|------|---------|---------|--------------|
| **Core Entry** | `scripts/brain/index.ts` | Main module exports and baseline runner | types/brain.ts |
| **CLI Interface** | `scripts/brain/cli.ts` | Command-line interface and argument parsing | config.ts, planning/, execution/ |
| **Configuration** | `scripts/brain/config.ts` | Load + validate config, env overrides | brain.config.json |
| **Domain Classification** | `core/classification.ts` | Domain inference (backend, frontend, docs, infra, ops, data) | none |
| **Task Ingestion** | `core/taskParsing.ts` | Parse tasks from checkList.txt and session logs | fs, path |
| **Task Sources** | `core/taskSources.ts` | Aggregate tasks from checklist / logs | taskParsing.ts |
| **Context Sampling** | `core/contextSampler.ts` | Deterministic sampling of repo + prior artifacts | fs, path |
| **Planning Engine** | `planning/planner.ts` | Heuristic planner (OpenAI stub) + plan artifact | config.ts, core/classification.ts |
| **Governance Guards** | `governance/guards.ts` | Hard limits enforcement (LOC, files, budgets) | types/brain.ts |
| **Plan Splitting** | `governance/splitter.ts` | Batch splitting for large plans | guards.ts |
| **Execution Engine** | `execution/runBatch.ts` | Runner dispatch & diff stats generation | toolRegistry.ts |
| **Tool Registry** | `execution/toolRegistry.ts` | Tool discovery and execution wrappers | fs, child_process |
| **Plugin System** | `plugins/index.ts` | Dynamic plugin loader for custom runners/validators | fs, path |
| **Example Plugin** | `plugins/example.plugin.ts` | Sample plugin implementation | types/brain.ts |
| **Validation Engine** | `validation/validators.ts` | Lint/type/tests (simulated) + plugin validators | toolRegistry.ts |
| **Logging & State** | `state/logWriter.ts` | Redacted run/remediation artifact writer with secrets redaction | fs, path |

## Tool Matrix (Current Implementation Status)

| Tool | Domain Coverage | Status | Execution Mode | Redaction |
|------|-----------------|--------|----------------|-----------|
| **OpenAIPlanner** | all | stub planner | API call simulation | API keys redacted |
| **CodexRunner** | all | stub codegen | File generation simulation | N/A |
| **AiderRunner** | frontend, docs | stub codegen | CLI invocation stub | Command args redacted |
| **TypecheckRunner** | all | shell tsc (skippable) | `tsc --noEmit` | N/A |
| **ESLintRunner** | broad | shell eslint --version (presence check) | Version check only | N/A |
| **PlaywrightRunner** | frontend | shell playwright --version (presence check) | Version check only | N/A |
| **FirecrawlRunner** | backend | API integration stub | HTTP simulation | API keys redacted |
| **SequentialRunner** | all | Batch coordinator | Task sequencing | N/A |
| **TerminalRunner** | ops, infra | Shell command execution | Direct shell access | Commands redacted |
| **ExampleEchoRunner** | all | Plugin sample | Echo test output | N/A |

### Tool Toggle Configuration by Domain

```json
{
  "tools": {
    "codex": true,           // Enable Codex integration for code generation
    "aider": true,           // Enable Aider for multi-file refactoring
    "openaiPlanner": true,   // Enable OpenAI-based planning
    "firecrawl": true,       // Enable Firecrawl for web scraping
    "sequential": true,      // Enable sequential task execution
    "github": false,         // Disable GitHub API integration
    "zapier": false,         // Disable Zapier automation
    "terminal": true         // Enable terminal command execution
  }
}
```

## Configuration Reference

### Complete Brain Configuration Schema

```json
{
  "$schema": "./schemas/brain-config.schema.json",
  "limits": { 
    "maxLocAdded": 450,      // Maximum lines of code that can be added per run
    "maxFiles": 15           // Maximum number of files that can be modified per run
  },
  "domains": [               // Supported domain classifications
    "backend", "frontend", "docs", "infra", "ops", "data"
  ],
  "tools": {                 // Tool enablement flags
    "codex": true,
    "aider": true,
    "openaiPlanner": true,
    "firecrawl": true,
    "sequential": true,
    "github": false,
    "zapier": false,
    "terminal": true
  },
  "retry": {                 // Retry configuration for tools
    "planner": { 
      "retries": 2, 
      "backoffMs": [250, 750] 
    }
  },
  "modes": { 
    "default": "execute+verify"  // Default execution mode
  },
  "budget": { 
    "token": 60000,          // Maximum tokens for AI operations
    "timeSeconds": 360       // Maximum execution time in seconds
  },
  "auto": { 
    "enabled": true,         // Enable auto mode
    "defaultTarget": "phase-1",
    "maxBatches": 6,         // Maximum number of batches to process
    "maxMinutes": 8,         // Maximum minutes for auto execution
    "maxConsecFails": 2      // Maximum consecutive failures before abort
  },
  "governance": { 
    "maxBatchTasks": 10,     // Maximum tasks per batch
    "splitThresholdLoc": 300, // LOC threshold for plan splitting
    "budgetStrategy": "conservative"  // Budget allocation strategy
  },
  "tokens": { 
    "plannerModel": "gpt-4o-mini",  // Model for planning operations
    "temperature": 0.2,      // Temperature for AI operations
    "maxTokens": 2000        // Maximum tokens per AI request
  }
}
```

### Environment Variable Overrides

| Variable | Override | Example |
|----------|----------|---------|
| `PB_BRAIN_BUDGET_TOKEN` | `budget.token` | `80000` |
| `PB_BRAIN_BUDGET_TIME` | `budget.timeSeconds` | `600` |
| `PB_BRAIN_FORCE_VALIDATION_FAIL` | Force validation failure | `1` |
| `PB_BRAIN_FORCE_SKIP_BIN` | Skip binary tool checks | `1` |
| `OPENAI_API_KEY` | Enable OpenAI planner | `sk-...` |

## Comprehensive Governance Rules

### 1. Hard Limits Enforcement
- **LOC Limits**: `limits.maxLocAdded` enforced before execution begins
- **File Limits**: `limits.maxFiles` checked during plan validation
- **Rejection**: Plans exceeding limits are rejected with remediation suggestions

### 2. Batch Splitting Strategy
- **Threshold**: Plans with LOC estimate > `governance.splitThresholdLoc` are automatically split
- **Grouping**: Related tasks are kept together when possible
- **Sequencing**: Dependencies preserved across batch boundaries

### 3. Budget Management
- **Token Tracking**: AI operation token usage tracked against `budget.token`
- **Time Limits**: Execution time monitored against `budget.timeSeconds`
- **Auto Mode**: Budget exhaustion triggers graceful shutdown with progress persistence

### 4. Secrets Redaction Policy
- **Sensitive Patterns**: All logs scrub patterns matching:
  - `apiKey`, `openaiKey`, `authToken`, `password`, `secret`
  - API URLs with embedded tokens
  - Environment variable values containing credentials
- **Preservation**: Redacted logs maintain structure for debugging
- **Fallback**: Non-redactable sensitive data causes task failure

### 5. Deterministic Operation
- **Input Sorting**: Domain classification inputs sorted alphabetically
- **Artifact Naming**: Timestamped artifacts use ISO format with deterministic precision
- **Hash Stability**: Task and plan hashes stable across identical inputs

### 6. Plugin Safety
- **Load Failures**: Plugin load failures logged but never abort core runs
- **Isolation**: Plugin errors contained within plugin boundary
- **Registration**: Failed plugins recorded in execution summary

### 7. Execution Modes

| Mode | Validation | Execution | Artifacts | Use Case |
|------|------------|-----------|-----------|----------|
| `plan-only` | Full | None | Plan JSON | Review planned changes |
| `dry-run` | Full | Simulated | Plan + validation results | Testing governance rules |
| `execute` | Full | Real | All artifacts + diffs | Production runs |
| `auto` | Incremental | Real | Batched artifacts | Automated processing |

### 8. Error Handling & Recovery
- **Graceful Degradation**: Tool failures don't abort entire runs
- **Remediation Artifacts**: Failed runs generate recovery instructions
- **Followup Tasks**: Incomplete work queued for next execution cycle
- **State Persistence**: Progress saved for manual review and continuation

### 9. Validation Pipeline
- **Pre-execution**: Plan validation, limit checking, tool availability
- **During execution**: Incremental validation after each task
- **Post-execution**: Comprehensive validation of all changes
- **Plugin validators**: Custom validation logic via plugin system

### 10. Logging & Observability
- **Structured Logging**: JSON-formatted logs with consistent schema
- **Secrets Redaction**: Automatic removal of sensitive information
- **Execution Tracing**: Detailed timing and resource usage tracking
- **Artifact Generation**: Complete audit trail for all operations

## Usage Examples

### Basic Planning
```bash
npm run brain:plan-only
# Generates plan without execution, outputs to artifacts/brain/
```

### Dry Run Validation
```bash
npm run brain:dry-run
# Validates plan and simulates execution without making changes
```

### Production Execution
```bash
npm run brain:execute
# Full execution with validation and artifact generation
```

### Auto Mode with Custom Limits
```bash
PB_BRAIN_BUDGET_TIME=600 npm run brain:auto
# Auto mode with 10-minute time limit override
```

## Integration Points

### Documentation Updates
- **CHANGE_LOG.md**: Automatic single-line entries for each execute run
- **EVENT_BACKBONE_REFERENCE.md**: Automatic logging when event-related files are modified
- **Artifacts**: All execution artifacts stored in `artifacts/brain/` with timestamps

### Security Features
- **Secrets Redaction**: Comprehensive removal of sensitive data from all logs
- **Safe Execution**: Governance rules prevent unauthorized or excessive changes
- **Audit Trail**: Complete traceability of all operations and decisions

### Testing Integration
- **Validation**: Built-in tests for documentation updates and secrets redaction
- **Plugin Testing**: Framework for testing custom plugins
- **Integration Tests**: End-to-end testing of complete workflows

