# Phase 1 – Hardening & Governance Completion

Objective: Close foundational gaps (provenance, rate limiting, forbidden-field guard, structured logging coverage) to reach audit-ready baseline.

## Scope

- Universal provenance middleware + scan task (PROV-01)
- Forbidden derived field guard + CI scan script (MKT-01)
- Team-scoped rate limiting & metrics (PERF-01 extension)
- Structured logger coverage in P0 domains (LOG-01 completion)
- CHANGE_LOG discipline + rollback sections

## Exclusions

- No new feature surfaces beyond required endpoints.
- No schema expansion except enumerated guard collections (if needed) with full CHANGE_LOG update.

## Deliverables

| ID       | Deliverable           | Description                                        | Acceptance            |
| -------- | --------------------- | -------------------------------------------------- | --------------------- | ---------- | --------------------------- |
| PROV-01  | Universal Middleware  | Injects `__provenance` (live                       | cache                 | synthetic) | 100% AI endpoints pass scan |
| PROV-01b | Scan Script           | Enumerates API routes; fails if missing provenance | CI job green          |
| MKT-01   | Forbidden Field Guard | Runtime strip + counter increment                  | Test proves removal   |
| MKT-01b  | Scan Script           | Firestore dump scan (stub -> extend)               | CI placeholder passes |
| PERF-01  | Team Rate Limiter     | Per-team counters + 429 with retry-after           | Test exceed threshold |
| LOG-01   | Coverage Audit        | No raw console.\* in P0 paths                      | grep test passes      |

## Implementation Order

1. Universal provenance middleware (low risk / unlocks tests)
2. Scan script + test harness
3. Team rate limiter adaptation
4. Forbidden field guard util + tests
5. Structured logger coverage patch (remove console.\*)
6. CI integration (scripts & package.json) + CHANGE_LOG update

## Testing Strategy

- Unit tests for middleware injection (mock response w/out provenance -> adds live)
- Negative test for endpoint missing provenance (simulate removal -> scan fails)
- Rate limit test increments until threshold → 429 status + retry-after header
- Forbidden field persistence test: attempt to insert roi/ctr -> absent in stored doc mock
- Logger coverage: snapshot grep ensures no console in specified directories

## Metrics & Logging

- Add counters: `provenance_injected_total`, `forbidden_field_strips_total`, `rate_limit_rejections_total`
- Structured log fields: `component`, `action`, `teamId`, `userId`, `durationMs`, `degraded?`

## Risks & Mitigations

| Risk                          | Mitigation                                   |
| ----------------------------- | -------------------------------------------- |
| Middleware JSON clone failure | Try/catch + return original response         |
| Overhead in hot paths         | Minimal processing; bail early if header set |
| False positives in scan       | Explicit ignore list for non-AI routes       |

## Exit Criteria

- All acceptance checks GREEN
- CHANGE_LOG includes rollback steps
- CI pipeline integrates new scans

## Rollback Guidance

Remove middleware import from routes, delete scripts, revert CHANGE_LOG entry. No persistent data impact.
