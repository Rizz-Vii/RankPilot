# AI Development Agent Instruction Set

Context

Date: 2025-08-11
Repo: RankPilot Studio (SEO/Marketing AI SaaS)
Current State: Core scaffolding + data integrity guards + template/workflow persistence + deterministic synthetic fallbacks. Live NeuroSEO streaming + cache + compact persistence, unified metrics + KPIs + extended health alerts (incl. invite maintenance). RBAC invites flow (positive + negative tests) + global invite index + cleanup job. Remaining: team billing aggregation, universal provenance middleware, theming hex sweep completion, percentile-driven SLO tuning, tenant scope linter escalation.
Additionally: Table widget server API now Firestore-backed (dashboardTables/{widgetId}/rows) with CSV export and sorting/pagination preserved; mock fallback retained for demo continuity.
\n+Status Snapshot Aug 11 2025 (post-latest implementation wave)
Core NeuroSEO live + streaming + compact persistence + cache + partial rate limiting & metrics are implemented (NEU-01/02/03, PERF-01 partial, OBS-01 partial). Teams schema & rules + membership subcollection scaffolding exist (TEAM-01 partial); structured logger present (LOG-01 baseline + expansion). Provenance tests & guards partial (PROV-01 partial). Billing UI & webhook idempotency largely implemented (FIN-01 complete, FIN-02 substantial – team billing scope pending). Security negative tests broad (SEC-01). Remaining emphasis: full provenance middleware coverage, finalize team role RBAC & team-scoped rate limits, unify metrics registry (beyond NeuroSEO), forbidden-field scan automation, KPI instrumentation & dashboards, theming token enforcement completion.
Prime Directives:
Never persist derived ratios (ROI, CTR, conversion, winRate, etc.). Compute only at read time.
Tag every AI/synthetic output with \_\_provenance.
Minimize synthetic payloads (store aggregates only).
Enforce tenant isolation (userId + teamId scoping + Firestore rules).
No raw hex colors (enforce design tokens).
Deterministic synthetic paths must use seeded RNG utility (no bare Math.random).
Every new collection/index/change has schema doc + rollback plan in CHANGE_LOG.md.

-----

## Current Functional Status (Consolidated)

| Domain | Status | Notes / Gaps |
|--------|--------|--------------|
| NeuroSEO Core (exec, stream, persistence, cache) | High (≈80%) | Live & streaming paths, compact docs, deterministic hash, cache metrics. Need: richer timeout/fallback classification metrics, team-scoped rate limits, detailed latency histogram. |
| Teams / Membership (TEAM-01) | Medium (≈65%) | Collections & rules + membership subcollection + invite index + positive/negative invite tests + cleanup job. Need: role transition tests, ownership transfer test, effectiveTier util integration. |
| Provenance Enforcement (PROV-01) | Medium (≈60%) | Present in key analysis + marketing guard tests. Need universal middleware enumerating all AI endpoints + automated scan. |
| Billing (FIN-01/02) | Medium (≈60%) | Webhook idempotency + billing UI live data + pagination & security tests. Need: team billing aggregation, proration edge tests, failure replay script. |
| Security Negative Tests (SEC-01) | Medium-High (≈75%) | Broad rule denial tests included. Need continuous snapshot drift detector + tenant scope linter for queries. |
| Structured Logging (LOG-01) | High (≈80%) | app-logger integrated in NeuroSEO + webhooks. Need: coverage audit ensuring no console.* in P0 domains; add audit/degraded usage guidelines doc. |
| Metrics / Observability (OBS-01) | High (≈80%) | Unified registry (AI routes) + latency buckets + p90/p95/p99 + KPI layer + /health alerts (added invite maintenance). Remaining: non-AI counters (billing, guards, workflows), configurable thresholds, dashboard UI. |
| Rate Limiting (PERF-01) | Partial (≈40%) | Live execution per-hour counter via collection; not yet team/burst adaptive. Need: token bucket or leaky bucket in-memory + fallback durable counter; test for team scope & reset logic. |
| Derived Field Guards (MKT-01) | Medium (≈60%) | Sanitizer + tests. Need: repository-wide forbidden-fields scan script + CI gate. |
| Period Normalization (MKT-02) | Medium (≈60%) | Utility + tests exist. Need: inclusion in all marketing write paths audit. |
| Theming / Token Enforcement (THEME-01) | Medium-Low (≈45%) | Several components tokenized; residual raw hex remain in legacy pages. Need: automated lint escalation & scan report. |
| Health & Runbook (OPS-01/02) | Medium-Low (≈45%) | Health endpoint with extended alerts + runbook includes invite maintenance section. Need: build/git metadata enrichment & incident drill checklist. |
| Tables (DASH-01) | Medium (≈72%) | Firestore-backed `/api/table-data` delivering real rows; CSV export with cap; UI wired. Seed utility, contract test, and edge-case tests added. CI runs both contract and edge suites (best-effort seeding). Need: finalize index recommendations for scoped queries and expand dataset fixtures. |
| Governance Automation (GOV-01) | Medium-Low (≈40%) | CHANGE_LOG discipline present. Need: validate-changelog + feature-key audit already partly covered; add forbidden-fields + schema drift validators. |

Functional completeness (Phase 1) revised estimate: 64–67%.

-----

## Updated Phase 1 Execution Order (Focused Remainder)

1. Complete Provenance Middleware & Scan (PROV-01 full) – enumerate all AI/LLM endpoints, enforce __provenance.
2. Team-Scoped Rate Limiting & RBAC Hardening (TEAM-01 final + PERF-01) – role transition tests, ownership transfer test, finalize team-aware limiter.
3. Forbidden Field & Tenant Scope Automation (MKT-01 + GOV-01 sec) – hard fail tenant scope after refinement.
4. Metrics Expansion (OBS-01 remaining) – add billing, guard, workflow counters + alert config surfacing (calibrate invite maintenance thresholds).
5. Billing Enhancements (FIN-02 remaining) – team aggregation, proration tests, replay tooling.
6. Health Endpoint & Incident KPIs (OPS-01/02) – composite /health and runbook finalization.
7. Theming Token Completion (THEME-01) – remove residual hex, escalate lint rule.
8. KPI Instrumentation & Dashboard (cross) – latency p95, fallback rate, cache hit %, doc size, rate limit utilization.
9. Table Data Hardening (DASH-01) – add user/team scoping to `/api/table-data` as needed; integrate seed script and contract test into CI; extend tests for edge cases (empty dataset, string-only values).

-----

## KPI Baseline Targets

| KPI | Target Initial | Source | Notes |
|-----|----------------|--------|-------|
| p95 NeuroSEO Live Latency | < 15s | unified metrics + logger | Separate synthetic fallback latency bucket |
| p99 NeuroSEO Live Latency | < 22s | unified metrics | Early watch; refine after more traffic |
| Cache Hit Ratio | ≥ 45% warmed | metrics | Exclude first-run cold period |
| Synthetic Fallback Rate | < 18% | provenance scan | Track reason codes: timeout, backend_error, rate_limited |
| Avg Compact Doc Size | < 4.2KB | size test + metrics | Alert at 4.5KB (80% of 5KB cap) |
| Rate Limit Rejections | < 3% of requests | limiter counters | Per team rolling hour |
| Provenance Coverage | 100% | provenance audit | Fails build if <100% |
| Derived Field Persistence Incidents | 0 | forbidden-fields scan | Red: non-zero |
| Billing Webhook Duplicates Processed | 0 | idempotency log | duplicates short-circuit |

-----

## Risk Register (Live)

| Risk | Impact | Mitigation | Trigger Escalation |
|------|--------|-----------|--------------------|
| Missing universal provenance middleware | Trust erosion | Implement PROV middleware & scan | Any AI route missing provenance in audit |
| Non-team-aware rate limiting | Cost spike / unfair throttling | Add team scope + adaptive bucket | >5% fallback due to limit OR uneven usage anomalies |
| Metrics fragmentation | Blind spots | Central registry unify + docs | New feature adds bespoke counters |
| Residual raw hex colors | Inconsistent theme / branding drift | Lint escalate + token sweep | Lint report shows >0 violations |
| Derived field creep | Data integrity risk | CI scan + sanitizer enforcement | Scan finds >0 forbidden keys |

-----

## Enforcement Middleware (Planned / Pending Completion)

provenanceEnforcer – ensures __provenance set; adds if missing else logs audit.
forbiddenFieldGuard – strips forbidden derived metrics; increments guardStrips counter.
tenantScopeValidator – asserts userId + teamId scoping in Firestore queries (dev warn, test fail).

-----

## Observability Status & Next Steps

Unified metrics + KPI aggregation extended with invite maintenance counters (markedExpired, deletedAccepted, deletedExpired, orphanIndexes). Health alerts include orphanIndexes + expiration spikes. Next: billing/guard/workflow counters, configurable thresholds, incident event logging, dashboard UI.

-----

## Immediate Remaining Task Breakdown (Updated)

| Task | Type | Deliverables | Owner (implicit) |
|------|------|-------------|------------------|
| PROV-01 finalize | Feature/Guard | universal provenance middleware + enumerator scan + audit test | Platform |
| OBS-01 remaining | Observability | domain counter expansion + configurable thresholds + dashboard UI | Platform |
| TEAM-01 finalize | Security | full RBAC tests + invites flow + effectiveTier usage across gating | Backend |
| PERF-01 team limiter | Performance | team-aware limiter + adaptive thresholds test | Backend |
| MKT-01 automation | Data Integrity | forbidden-fields-scan.mjs + CI integration | Platform |
| OPS-01/02 health | Ops | /health endpoint + runbook maturity + drill test | DevOps |
| THEME-01 finalize | UI | hex scan zero violations + lint rule error | Frontend |
| FIN-02 team billing | Billing | team aggregated usage + proration test + replay script | Billing |

-----

## Updated Definition of Done (Phase 1 Closure)

1. 100% AI endpoints return __provenance; audit test passes.
2. Unified metrics endpoint includes KPIs; latency histograms populated after warm-up run.
3. Rate limiting: per-team enforced & observable; rejection rate < target.
4. Forbidden field scan passes zero incidents in CI.
5. /health returns: status, build sha, git timestamp, firestore ok, metrics summary, provenanceCoverage.
6. No raw hex color lint errors; all replaced by tokens.
7. All P0 routes and domain modules use structured logger (no console.* found by grep-lint).
8. CHANGE_LOG entries with rollback steps for any schema/index change in closure window.

-----
Operating Mode

Execute tasks autonomously in defined priority phases.
After each task: run lint, test:critical (add if missing), update CHANGE_LOG with rollback steps.
Abort and flag if a task risks violating directives or expanding scope beyond defined backlog.
Reporting Cadence

After each merged change group: emit summary JSON (taskIds, files changed, tests added, risks found).
Daily (UTC) status roll-up: % completion per domain, new risks, blocking dependencies.
Phasing (Execute sequentially unless blockers) Phase 1 (Foundation / P0) TEAM-01, MKT-01, MKT-02, NEU-01, NEU-02, NEU-03, FIN-01, FIN-02, LOG-01, TEST-01, SEC-01, GOV-01, PROV-01, THEME-01, PERF-01, OBS-01, OPS-01, OPS-02

Phase 2 (Expansion / Early P1) AUTO-01, DASH-01, DASH-02, SLS-01, SLS-02, INT-01, PROV-02, PERF-02, GOV-02

Phase 3 (Enhancement / Remaining P1/P2) AUTO-02, AUTO-03, SLS-03, MKT-03, DASH-03, INT-02, NEU competitor diff, anomaly detection, retry/backoff, export jobs, advanced observability.

Task Specification Format (Enforce) Each task implementation must:

Create/Update: code + tests + schema doc delta (if data).
Add Acceptance Criteria test(s).
Update CHANGE_LOG with:
Added/Modified: collections, indexes, rules, high-risk behavior
Rollback plan (steps to revert schema/code safely)
Structured logging (logger.) instead of console. for new logic.
Security: add or verify Firestore rules + negative test for cross-tenant access.
Critical Tasks & Acceptance Criteria

TEAM-01 Teams & Membership Schema

Add collections: teams, teamMembers (or memberships).
Firestore rules: only members read/write; owner/admin role gates admin actions.
Tests: non-member denied, member allowed.
Access-control util returns effectiveTier (team plan overrides user plan).
CHANGE_LOG + schema doc entries.
MKT-01 Guard Test

Test inserting doc containing roi/ctr -> stored doc lacks those fields.
Fails if any derived key persists.
MKT-02 Period Normalization

Utility enforces YYYY-MM; invalid rejected.
Test: invalid periods produce error; valid auto-normalized.
NEU-01 Live NeuroSEO Execution

API route invokes backend module (timeout, abort support).
Streaming or chunked progressive updates; fallback to cache then synthetic.
Tests: fallback cascade, timeout triggers synthetic, provenance tagging.
NEU-02 Aggregate Persistence

Store only compact doc (≤5KB): overallScore, key metrics, topGaps[], createdAt, provenance, hashKey (input signature).
Exclude full graph/clusters raw arrays (unless compressed—skip for now).
Size test asserts limit.
NEU-03 Cache Layer

Key: stable hash(url + normalized keywords).
TTL configurable (env).
Metrics: cache hit counter.
Test: second identical request hits cache (no re-exec).
FIN-01 Stripe Webhooks

Handlers: subscription.updated, invoice.payment\_\*.
Idempotency: eventId collection/log prevents duplicates.
Tests: replay same event ignored.
FIN-02 Billing UI Live

Replace mocks with reads from subscriptions + invoices.
Show plan, status, period boundaries, invoice list (paginated).
Test: page renders with fixture documents.
LOG-01 Structured Logger

Module: logger.ts (levels: info, warn, error, audit; fields: component, action, durationMs?, degraded?, userId?, teamId?, errorCode?).
Replace console.\* in P0 domains (workflows, marketing guard, neuroSEO exec, stripe webhook).
Test: logger wrapper adds ISO timestamp & level.
TEST-01 Critical Suite

Include: marketing guard, workflow isolation (user B cannot see user A workflow), retrieval paging boundaries, feature key manifest test (no unknown), provenance presence in AI responses.
CI script test:critical must pass.
SEC-01 Firestore Rules Negative Tests

Attempt cross-tenant read/write fails.
Attempt insert with derived fields blocked (guard + test).
GOV-01 Schema & Feature Docs

FIRESTORE_SCHEMAS.md enumerates collections: fields allowed, forbidden, indexes.
FEATURE_KEYS.md: key, tier, status (alpha/beta/ga).
CI check ensures presence.
PROV-01 AI Provenance

Ensure all AI endpoints set \_\_provenance ('live' | 'cache' | 'synthetic').
Test enumerates endpoints; fails if missing.
THEME-01 Token Sweep

Run hex scan; replace remaining non-allowed hex.
Escalate ESLint no-raw-hex-colors from warn → error.
Test (lint) passes zero violations.
PERF-01 Rate Limiting NeuroSEO

Per-team counter (rolling hour).
Exceed returns 429 with retry-after.
Test: exceed threshold triggers block.
OBS-01 Metrics Counters

In-memory registry export (/api/metrics or /internal/metrics).
Counters: analysisRuns, analysisCacheHits, guardStrips, workflowRuns, workflowFailures, stripeWebhookErrors.
Test: increment verified in unit.
OPS-01 Health Endpoint

/health returns: status OK, build commit, env mode, firestore connectivity, metrics snapshot.
Test: 200 + required keys.
OPS-02 Runbook

RUNBOOK.md with steps for AI outage, billing failure, incident comms.
CI check presence.
Phase 2+ tasks follow same pattern (omit here for brevity—but agent must reference original backlog document under docs/backlog.md if created).

Prohibited Actions

DO NOT add derived metrics to storage.
DO NOT use Math.random outside approved deterministic RNG wrapper.
DO NOT commit new collections without schema + rollback.
DO NOT bypass tests or lint; failing pipeline aborts deployment.
DO NOT introduce raw console.\* in P0 domains after logger integration.
Quality Gates (Block Merge)

Lint errors (incl. raw hex)
Missing provenance on AI outputs
Failing critical tests
Schema change without CHANGE_LOG rollback
New collection lacking rules + tests
Unscoped Firestore queries (missing teamId/userId constraints)
Risk Handling

If task introduces performance regression (p95 > target), rollback or add cache before proceeding.
If stripe webhook failures > threshold (e.g., 3 consecutive), pause related feature enablement; log degraded events.
Monitoring Hook Requirements

Each major operation logs start + completion (durationMs).
Degradation path (fallback) sets degraded=true.
Counters updated atomically.
Automation Scripts (Add Early)

scripts/validate-changelog.mjs: Ensures rollback section for new collections.
scripts/forbidden-fields-scan.mjs: Scans latest Firestore snapshot (stub/local) for forbidden keys (roi, ctr, etc.).
scripts/feature-key-audit.mjs: Ensures all feature keys in code exist in FEATURE_KEYS.md.
Execution Loop (Autonomous Flow)

Select next highest-priority incomplete task (Phase order).
Generate implementation plan (diff summary).
Apply changes (code + tests + docs).
Run checks (lint, tests).
Update CHANGE_LOG & schema docs.
Commit with conventional message (feat|fix|chore + scope + taskId).
Produce status JSON.
Fallback Policy

On failure to integrate live service (e.g., NeuroSEO), maintain synthetic path; log degraded event; schedule retry with exponential backoff (max 3 attempts per 24h).
Completion Definition

All Phase 1 tasks Done, metrics stable (no increasing error counters), zero security test failures, lint error-free, provenance ubiquitous.
Next Action (Default if none provided by human)

Begin PROV-01 finalize: implement universal provenance middleware (inject __provenance live|cache|synthetic), create enumerator script to verify all AI endpoints covered, add failing test if any route missing provenance, update CHANGE_LOG with rollback.
