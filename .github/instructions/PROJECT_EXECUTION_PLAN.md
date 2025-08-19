# RankPilot Project Execution Plan (Phased to Completion)

Date: 2025-08-19

## Objective

Deliver a production-hardened AI-native SEO platform with multi-agent developer acceleration, full provenance governance, data integrity enforcement, and scalable observability.

## Phase Summary

| Phase                   | Goal                               | Key Deliverables                                                                            | Exit Criteria                                                           |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1 Hardening             | Close governance gaps              | Provenance middleware, rate limiting, forbidden field guard, logger coverage                | 100% provenance, zero forbidden field incidents, team limiter active    |
| 2 Foundation Expansion  | Multi-agent + BI + metrics breadth | Dev Supervisor loop, OpenAI adapter (gated), BI Hub, event bus, metrics expansion           | ≥80% patch acceptance, BI snapshot stable, events logged                |
| 3 Enhancement & Scaling | Adaptive & predictive automation   | Adaptive planner, KPI forecasting, reporting module, provenance reason codes, event retries | Predictive KPIs available, adaptive planner active, extended provenance |

## Detailed Workstreams

### 1. Provenance Governance (PROV)

- Middleware: inject `__provenance` if absent; set reason codes (Phase 3 extension).
- Scan Script: enumerate AI endpoints, diff fail if missing.
  Acceptance: Scan passes; test manipulates dummy endpoint -> fails.

### 2. Data Integrity (MKT)

- Guard util strips forbidden derived fields (`roi`, `ctr`, `conversion`, `winRate`, `ltv`).
- CI scan placeholder evolves into Firestore export analyzer.
  Acceptance: Insertion test confirms removal; counter increments.

### 3. Rate Limiting (PERF)

- Implement per-team rolling hour bucket.
- Add metrics: `rate_limit_rejections_total`.
  Acceptance: Test hitting threshold returns 429 + `retry-after`.

### 4. Logging & Metrics (LOG/OBS)

- Replace console.\* in P0 domains.
- Metrics registry includes new counters (Phase 2 expansions).
  Acceptance: Grep test; metrics test increments counters.

### 5. Developer Multi-Agent (DEV)

Components: Planner, Refactorer (adapter), Reviewer, Supervisor API.

- Planner chunk tasks, limit tasks per run.
- Refactorer uses OpenAI adapter (env gated) to produce patch objects (no FS writes).
- Reviewer filters by confidence & policy.
- Supervisor orchestrates & logs metrics.
  Acceptance: Endpoint returns tasks + patches + provenance; rejection logic test.

### 6. Business Intelligence Hub (BI)

- Aggregates cross-domain metrics + agent statuses.
- Provides snapshot endpoint.
  Acceptance: Snapshot test stable hash (excluding dynamic timestamps).

### 7. Event Bus (EVT)

- Event type enum + publish helper (FireStore / in-memory stub).
- Fan-out + retry (Phase 3).
  Acceptance: Unknown type rejected; retry logic test passes.

### 8. Adaptive & Predictive (ADP/KPI)

- Feedback store for patch acceptance history.
- Adaptive planner alters chunk size & priority ordering.
- Predictive module outputs advisory KPI forecasts (not persisted).
  Acceptance: Deterministic forecast test; planner adaptation test.

### 9. Reporting Module (RPT)

- AI summary generation (env gated) with size guard.
  Acceptance: Summary length & provenance test.

## Cross-Cutting Acceptance Criteria Template

| Criterion        | Requirement                               |
| ---------------- | ----------------------------------------- |
| Provenance       | All AI responses include `__provenance`   |
| Data Integrity   | No persisted forbidden fields             |
| Tenant Isolation | All queries scoped to userId/teamId       |
| Logging          | Structured logger for new logic           |
| Metrics          | Counters/histograms registered & tested   |
| Tests            | At least 1 happy + 1 edge per deliverable |
| Diff Size        | ≤200 LOC; explanation provided            |
| Rollback         | CHANGE_LOG updated with steps             |

## Diff Heuristics

- Middleware additions isolated; avoid touching unrelated imports.
- Feature scripts placed under `scripts/` with `scan:` or `validate:` prefix.
- New agents under `src/lib/agents/developer/` folder.
- Event bus under `src/lib/events/` minimal footprint.

## Execution Cadence

Daily Loop:

1. Select highest-risk uncompleted deliverable.
2. Generate Plan (diff & tests) -> Human review (optional).
3. Implement patch + tests.
4. Run lint + typecheck + targeted tests.
5. Update CHANGE_LOG.
6. Record feedback (accept/reject reason).

## Metrics Dashboard (Target KPIs)

| KPI                       | Baseline | Target       | Owner |
| ------------------------- | -------- | ------------ | ----- |
| p95 NeuroSEO Latency      | 15s      | <15s stable  | OBS   |
| Cache Hit Ratio           | 35%      | 45%+ warmed  | OBS   |
| Patch Acceptance Rate     | N/A      | ≥80% Phase 2 | DEV   |
| Provenance Coverage       | <100%    | 100% Phase 1 | PROV  |
| Rate Limit Rejection      | N/A      | <3% requests | PERF  |
| Forbidden Field Incidents | >0       | 0            | MKT   |

## Sample Implementation Sequence (First 10 Steps)

1. Add provenance middleware + test.
2. Add provenance scan script + CI hook.
3. Implement forbidden field guard util + test.
4. Add scan:forbidden script (stub) + CHANGE_LOG.
5. Extend rate limiter with team dimension + tests.
6. Replace console.\* in P0 with structured logger.
7. Introduce event-types enum & publish stub.
8. Add developer planner + tests.
9. Add refactorer (mock adapter) + supervisor endpoint + tests.
10. Add reviewer + rejection tests + metrics counters.

## Risk Register & Mitigations

| Risk                   | Impact     | Mitigation                        |
| ---------------------- | ---------- | --------------------------------- |
| Scope Creep            | Delays     | Enforce deliverable table gate    |
| Unbounded AI Costs     | Budget     | Env gate adapter; model tiering   |
| Data Leakage           | Compliance | Strip forbidden; scope queries    |
| Performance Regression | UX         | Add latency metric before rollout |

## Rollback Strategy

Maintain per-deliverable rollback entries; revert file additions & tests; confirm scans green.

## Completion Definition

All phases exit criteria satisfied; KPIs at or surpass target; zero critical failing tests; stable adaptive planner behavior for 2 consecutive weeks.

End of Execution Plan.
