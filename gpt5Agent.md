# AI Development Agent Instruction Set

Context

Date: 2025-08-11
Repo: RankPilot Studio (SEO/Marketing AI SaaS)
Current State: Core scaffolding + data integrity guards + template/workflow persistence + deterministic synthetic fallbacks. Missing: live NeuroSEO backend, Teams/Finance/Sales schemas, structured logging, security & test hardening.
Prime Directives:
Never persist derived ratios (ROI, CTR, conversion, winRate, etc.). Compute only at read time.
Tag every AI/synthetic output with \_\_provenance.
Minimize synthetic payloads (store aggregates only).
Enforce tenant isolation (userId + teamId scoping + Firestore rules).
No raw hex colors (enforce design tokens).
Deterministic synthetic paths must use seeded RNG utility (no bare Math.random).
Every new collection/index/change has schema doc + rollback plan in CHANGE_LOG.md.
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

Begin TEAM-01 (schema + rules + tests).
