# Phase 2 – Foundational Expansion & Multi-Agent Enablement

Objective: Introduce developer multi-agent loop (Planner / Refactor / Reviewer), Business Intelligence aggregation, and metrics breadth while keeping diffs minimal.

## Scope

- Developer Supervisor (planner + refactorer + reviewer abstraction)
- OpenAI Agents adapter (env gated) – propose patches only
- Business Intelligence Hub (aggregate metrics & agent snapshots)
- Metrics expansion (billing, guard, workflow, cache) unified export
- Event bus scaffold (event-types enum + publish helper)

## Exclusions

- No autonomous code writes (only patch suggestions)
- No production schema changes beyond event log collection (if introduced)

## Deliverables

| ID     | Deliverable          | Description                             | Acceptance                               |
| ------ | -------------------- | --------------------------------------- | ---------------------------------------- |
| DEV-01 | Planner Agent        | Generates task graph per goal           | Unit test: tasks <= limit                |
| DEV-02 | Refactor Agent       | Produces ProposedPatch[] (mock adapter) | Test: maps mock response                 |
| DEV-03 | Reviewer             | Scores patches; may request revision    | Test: rejects low confidence             |
| DEV-04 | Supervisor API       | /api/dev/plan-refactor endpoint         | Returns tasks + patches + \_\_provenance |
| DEV-05 | OpenAI Adapter       | Thin wrapper; env flag gating           | Disabled when flag false                 |
| BI-01  | BI Hub               | Aggregates metrics & agent statuses     | Snapshot test stable                     |
| EVT-01 | Event Types Registry | Enum + type guard                       | Test: adding type requires test update   |
| MET-02 | Metrics Expansion    | Additional counters & histograms        | Metrics route updated                    |

## Order

1. Event types registry + publish stub
2. OpenAI adapter scaffold (no network in tests)
3. Planner + Refactor + Supervisor (mock adapter)
4. Reviewer + confidence filter
5. API route + provenance enforcement
6. BI Hub aggregator
7. Metrics expansion instrumentation

## Testing Strategy

- Mock adapter returns deterministic patch JSON
- Snapshot test for BI Hub output shape
- Event type guard test rejects unknown event
- Metrics test increments new counters

## Metrics Additions

`developer_tasks_planned_total`, `developer_patches_proposed_total`, `developer_patches_rejected_total`, `bi_snapshot_requests_total`

## Risks & Mitigation

| Risk                     | Mitigation                                   |
| ------------------------ | -------------------------------------------- |
| Patch diff hallucination | Strict prompt: minimal unified diff only     |
| Adapter leaking secrets  | Enforce allow-list headers; exclude env dump |
| Event type sprawl        | Central enum + CI guard                      |

## Exit Criteria

All new APIs return \_\_provenance; tests passing; metrics observable; CHANGE_LOG updated.

## Rollback

Remove developer agent files, adapter, BI hub, and associated scripts; revert CHANGE_LOG.
