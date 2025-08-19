# Agent Execution Strategy – RankPilot

Goal: Maximize safe autonomous velocity integrating multi-agent development, provenance governance, metrics expansion, and phased delivery.

## Core Principles

1. Minimal Diff Increments – Cap LOC & file count; prefer additive over invasive refactors.
2. Deterministic Safety – Every AI output path tagged with `__provenance`; forbidden fields stripped.
3. Observability First – Add metrics/logging before or with new behavior.
4. Reversible Steps – Each change documented with rollback in `CHANGE_LOG.md`.
5. Scope Isolation – One concern per patch (e.g., provenance vs rate limit) to reduce review complexity.

## Agent Roles

- Planner: task graph generation (phase-aware, risk scoring)
- Refactorer: patch proposal (diff-only, no FS write)
- Reviewer: confidence scoring & policy enforcement
- Supervisor: orchestration + metrics + feedback capture
- BI Hub: cross-agent aggregator & insight surface

## Execution Loop (Per Batch)

1. Intake: Identify highest-priority open deliverable (Phase order).
2. Context Load: Read relevant files, run lint/typecheck delta.
3. Plan: Produce Diff Plan (files, est LOC, tests) + Acceptance Criteria.
4. Propose: Generate patches (diff objects) meeting plan boundaries.
5. Review: Enforce constraints; reject patches violating size/safety.
6. Validate: Run tests + scans (provenance, forbidden fields, console usage).
7. Emit: Structured log + metrics + CHANGE_LOG entry.
8. Feedback: Store patch acceptance outcome for adaptive planner (Phase 3).

## Tooling Integration

| Tool                 | Purpose                | Invocation Guard         |
| -------------------- | ---------------------- | ------------------------ |
| Lint & Typecheck     | Pre-change diagnostics | Always before patch      |
| Provenance Scan      | Coverage enforcement   | Post-change required     |
| Forbidden Field Scan | Data integrity         | Post-change required     |
| Metrics Snapshot     | Regression awareness   | Optional (feature flags) |

## Metrics Schema (Key Fields)

`component`, `action`, `durationMs`, `teamId`, `userId`, `result`, `errorCode?`, `degraded?`

## Failure Handling

- Patch Rejection: Reviewer emits reason codes (size_over_limit | missing_tests | provenance_gap | unsafe_query).
- Test Failure: Generate remediation plan; cap at 3 retries before escalation.
- Scan Failure: Highest priority; block further batches until resolved.

## Security & Data Integrity

- Firestore queries must include tenant qualifiers.
- No storing derived ratios; compute on read.
- Sensitive env variables never logged.

## Phase Transition Criteria

- Phase 1 → 2: 100% provenance, rate limiting active, zero forbidden field incidents for 3 consecutive runs.
- Phase 2 → 3: Developer loop stable (≥80% patch acceptance), BI Hub metrics complete, event bus emitting.

## Escalation Conditions

- Lint error count increases net positive.
- Rate limit rejection > target threshold.
- Provenance coverage < 100%.

## Rollback Procedure

1. Identify latest CHANGE_LOG block for feature.
2. Revert associated files.
3. Remove metrics counters (if any) and event types.
4. Confirm scans/tests green.

End.
