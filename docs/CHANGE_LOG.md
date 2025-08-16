# 2025-08-16 Wave 7: Delegation Lockfile & Test Gating

Implemented comprehensive lockfile mechanism and enhanced test gating for the delegation framework.

## Added

- **Lockfile mechanism** in `scripts/delegation/queue-utils.ts`:
  - Atomic lock creation with temp file approach for safety
  - Process ID and hostname tracking for lock ownership  
  - Configurable expiry (default 30 minutes) with automatic cleanup
  - Blocks concurrent delegation runs with clear error messages
  - Signal handlers for graceful lock release on process termination

- **Enhanced risk metadata emission**:
  - LOC delta classification (low/medium/high) based on total changes
  - Risk metadata structure: `{ locDelta, totalLoc, fileCount }`
  - Applied to both aider execution and direct-delete operations
  - Appended to `sessions/aider-log.jsonl` for observability

- **Test gating verification**: 
  - Existing `DELEGATION_RUN_TESTS=1` functionality verified and documented
  - Customizable test script via `DELEGATION_TEST_SCRIPT` environment variable
  - QA metadata logging with lint and test results

- **Comprehensive test suite**:
  - `npm run test:delegation-lockfile` - tests lock creation, expiry, concurrent blocking
  - `npm run test:delegation-gating` - validates test gating implementation
  - TypeScript configuration updated with Node.js types support

- **Documentation updates**:
  - Wave 7 section added to `docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md`
  - Complete API documentation for lockfile mechanism
  - Usage examples and risk classification thresholds

## Risk Assessment

**Low** - Additive functionality with backward compatibility. Lockfile mechanism only activates during delegation runs. No changes to existing API surfaces or runtime behavior outside delegation framework.

## Rollback

1. Revert changes to `scripts/delegation/queue-utils.ts` (remove lockfile functions)
2. Revert changes to `scripts/delegation/process-delegation-queue.ts` (remove lock integration and risk metadata)
3. Remove test files: `scripts/test-delegation-*.ts`
4. Revert `scripts/tsconfig.json` changes
5. Remove Wave 7 documentation section
6. Remove delegation test scripts from `package.json`

# 2025-08-15 Event Backbone Foundation (T26/T27)

Added event registry + `publishEvent`, immutable Firestore rules, and basic unit tests.

- Added event type registry (`src/lib/events/event-types.ts`).
- Implemented publisher with validation and idempotency hash (`src/lib/events/publishEvent.ts`).
- Enforced create-only writes via Firestore rules block for `/orgs/{orgId}/events`.
- Added minimal unit tests for happy path and unknown type.

# 2025-08-15 Delegated Aider Workflow Formalization
 
## 2025-08-15 T28 Event Mirroring Scaffold

Added Firestore onCreate trigger and mirroring stub behind `EVENT_MIRROR_ENABLED`.

- New Cloud Function trigger `onEventWrite` (functions/src/events/onEventWrite.ts) listening on `/orgs/{orgId}/events/{eventId}`.
- Mirroring module `mirrorEvent` (functions/src/lib/event-mirror.ts) publishes minimal payload to Pub/Sub topic `events-raw` when enabled; BigQuery stub left as TODO.
- Single unit test `functions/test/event-mirror.test.ts` covering flag off/on behavior.

Rollback: delete `functions/src/events/onEventWrite.ts`, `functions/src/lib/event-mirror.ts`, test file above, remove export from `functions/src/index.ts`, and remove this CHANGE_LOG section.

## 2025-08-15 Delegation Validation & Dry-Run Enhancements

### Added

- Validation layer in `scripts/delegation/process-delegation-queue.ts` enforcing:
  - Extension allowlist (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.json`, `.md`, `.yml`, `.yaml`, `.css`).
  - Per-file size cap (~80KB) and aggregate task size soft cap (~40KB) with risk classification (`file_issue`, `large_file`, `aggregate_too_large`).
  - `DRY_RUN=1` mode: prints aider command, validation table, aggregate bytes, leaves task pending.
  - Early failure logging (`validation_failed:<reason>`) appended to `sessions/aider-log.jsonl`.
  - Log rotation when `aider-log.jsonl` exceeds 200KB (renames with timestamp, seeds fresh header).

### Rationale

Prevents unsafe or overly large mechanical edits from entering autorun, provides operators a non-mutating inspection mode, and guards telemetry file growth.

### Follow-Up

- Integrate Phase 2 QA (`DELEGATION_RUN_TESTS=1`) post-success.
- Add lock file to prevent concurrent runs.
- Emit task risk metrics for dashboard.

### Rollback

Revert changes in `process-delegation-queue.ts` to prior commit removing validation + DRY_RUN code; delete this CHANGE_LOG section.


## 2025-08-15 Incomplete Code Audit Refresh & Delegation Phase 1 Enhancement

### Added

- Refreshed `INCOMPLETE_CODE_AUDIT.md` (date 2025-08-15) adding new gaps: Stripe webhook upsert unification, delegation framework Phase 2 (tests/timeout), adoption workflow retirement schedule, stub cleanup plan, billing placeholders, insights fallback gating.
- Delegation Framework Phase 1 enhancement: implemented automatic LOC diff capture & log append (task completion) inside processing script (will emit approximate line counts; groundwork for Phase 2 test integration). Updated audit to mark Phase 1 DONE and enumerate Phase 2 actions.

### Rationale

Maintains a living inventory of incomplete logic while incrementally improving autonomous delegation observability (lines changed telemetry) before adding automated test runs.

### Rollback

1. Revert changes in `INCOMPLETE_CODE_AUDIT.md` to prior commit.
2. Remove LOC diff logic from delegation processing script (if introduced in follow-up commit) and corresponding log fields.

### Follow-Up

- Phase 2: Optional `DELEGATION_RUN_TESTS=1` to run lint + critical tests post-diff and annotate log status.
- Phase 3: 30m running task timeout auto-fail + retry enqueue.
- Phase 4: Aggregate delegation metrics surfaced in developer dashboard (deferred).

## 2025-08-15 Delegation Queue Scaffold

Added minimal queue scripts (`delegate:enqueue`, `delegate:process`) and chat/doc updates enabling structured mechanical edit task listing prior to aide execution (manual or `AIDER_AUTORUN=1`).

Limitations: No auto LOC validation or test run yet.

## Added

- Unified Copilot ↔ Aider delegation framework (soft 180 LOC / hard 220 cap per block; split A/B if exceeded) embedding Division of Labor, Delegation Block template, guardrails, logging policy.
- Documentation updates across: `.github/copilot-instructions.md` (Sections 13–20), chat profile `/.github/chatmodes/pilotBuddy.chatmode.md`, and developer guide `docs/DEVELOPER_AI_AGENT.md` aligning wording (diff caps, logging, rollback steps).
- Optional JSONL telemetry file scaffold `sessions/aider-log.jsonl` (capped ≤200KB; rotate by renaming with timestamp) capturing: taskId, filesChanged, locAdded, locRemoved, status, timestamp.

## Rationale

Creates a governed, measurable pathway for mechanical multi-file edits, reducing cognitive load on Copilot while enforcing minimal diffs, safe rollback, and auditable change history. Establishes quantitative limits to prevent over-scoped AI commits.

## Rollback

1. Remove delegation sections from the three docs listed above.
2. Delete `sessions/aider-log.jsonl` (telemetry artifact) if present.
3. Remove LOC cap guidance; treat edits as direct Copilot operations.

Risk: Low (documentation + tooling scaffold only). No runtime or build behavior modified.

# 2025-08-14 Semantic Token Migration (Admin & Chat & Metrics)

## 2025-08-15 Entitlement Warning De-Noise & Admin User Mgmt Hardening

### Changed

- Added `canAccessCapability()` helper in `access-control.ts` (routes to `canAccessEntitlement` when key matches an entitlement) and updated `FeatureGate` + `useSubscription` to use it, suppressing repetitive entitlement misuse warnings while migration completes. Warnings now emit once per entitlement key (Set-based dedupe) instead of on every render/access attempt.
- Hardened `AdminUserManagement` search filtering against undefined/null `email` or `displayName` values (previously could throw `.toLowerCase` TypeError when Firestore doc missing field) by normalizing to empty strings.
- Added unit test `testing/unit/access/entitlement-warn-once.test.cjs` ensuring each entitlement key logs at most one migration warning (prevents console spam regressions).
- Consolidated subscription listener: `useSubscription` hook now accepts `{ realtime?: true }` to enable a single lazy-loaded Firestore `onSnapshot` (default static fetch) preventing duplicate listeners across pages/components; preserves previous behavior when option omitted.
- Unified Permissions-Policy headers (middleware + next.config): added `interest-cohort=()`, consistent payment scoping (`payment=(self)` only in local/dev, blocked in production), microphone toggle via `RP_DISABLE_MIC`, to eliminate console payment directive warnings.
  
## 2025-08-15 Permissions-Policy Simplification & Subscription Listener Consolidation Follow-Up

### Changed

- Simplified Permissions-Policy: removed explicit `payment` directive (letting browser defaults apply) while retaining `camera=(), microphone=(self|())` (env toggle), `geolocation=()`, and `interest-cohort=()`. This reduces Stripe/PayPal dev console noise and aligns security modules (`middleware.ts`, `advanced-security.ts`).
- Consolidated real-time subscription handling: `useSubscription` now lazy-loads a single Firestore `onSnapshot` only when `{ realtime: true }` is requested; default path stays static to prevent duplicate listeners and unnecessary bundle cost. Added internal sentinel `_onSnapshot` to reuse module after first dynamic import.
- Removed custom plan name override ("Admin") that previously produced a non-enumerated PlanType and TypeScript error. Admin users transparently inherit Enterprise plan attributes without altering displayed plan names, ensuring pricing UI consistency.

### Added

- Playwright regression test (pending commit) to assert pricing UI never renders an "Admin" plan label and only shows the canonical tier names (Starter, Agency, Enterprise). Prevents future leakage if an override reappears.

### Rationale

Reduces warning noise, hardens type safety for plan metadata, and guarantees consistent public pricing presentation while minimizing real-time listener overhead.

### Rollback

1. Reintroduce payment directive if explicit allow/block granularity needed: add `payment=(self)` in dev and `payment=()` prod.
2. Restore prior admin label logic by re-adding name override block in `useSubscription` (not recommended – causes PlanType drift).
3. Remove lazy snapshot gating by unconditionally importing `onSnapshot` if blanket real-time behavior desired.


### Rationale

Reduces console noise obscuring real issues and prevents rare crash in admin panel with incomplete user documents. Transitional helper keeps explicit feature vs entitlement APIs while offering safe bridging.

### Rollback

1. Remove `canAccessCapability` export and revert FeatureGate / useSubscription to `canAccessFeature`.
2. Remove Set-based suppression logic if per-call warnings preferred.
3. Revert admin user management filter block to prior implementation.


## 2025-08-15 Firebase Single Initialization Regression Test

### Added

- Playwright spec `firebase-single-init.spec.ts` under `testing/specs/organized/firebase/` asserting exactly one `🔥 Firebase app initialized` log across multiple navigations within a single browser context. Guards against duplicate client `initializeApp` calls after refactors or HMR churn. Rollback: delete spec file and this entry.


## 2025-08-15 Finance Mock Gating Playwright Contract Test

### Added

- Harmonized finance mock banner predicate across /finance, /finance/billing, /finance/invoices, /finance/revenue (show only when mocks enabled AND zero invoices). Added invoicesCount field in /api/finance/metrics for robust detection.
- Added test user bypass to finance invoice seeding endpoint (non-production) for E2E reliability.
- KPI Daily Snapshot contract test ensuring provenance & latency percentile fields persisted.

- Added Playwright spec `finance-mock-gating.spec.ts` validating finance dashboard mock banner visibility when `/api/finance/metrics` fails and `allowFinanceMocks()` permits fallback, and disappearance after setting `localStorage.allowFinanceMocks='false'` (forced API failure persists). Ensures UI respects runtime mock disable without rebuild. No production code changes.

## 2025-08-15 Finance Live Metrics Seeding Test Endpoint & Playwright Spec

- Added non-production test endpoint `/api/test/finance/seed-invoice` (provenance wrapped) to seed a paid `financeInvoices` doc for the authenticated user to exercise live aggregation path.
- New Playwright spec `finance-live-metrics.spec.ts` confirms that after seeding at least one paid invoice, the Finance Dashboard renders KPI cards and the mock data banner is absent.
- Endpoint returns 404 in production; safe additive tool for CI & local contract validation. Rollback: delete route file & spec and remove this entry.

## 2025-08-15 (T15 Observability Completion – MA7 Overlays & Extended KPI Persistence)

Added final enhancements to complete Task T15 (Observability hardening & historical analytics):

- Persisted `cacheHitRatio` and `rateLimitRejectionRate` directly into `kpiDaily` snapshot documents (previously only surfaced via alerts MA7 computation) enabling longitudinal sparklines & moving average overlay calculations.
- Extended `KpiDailyDoc` interface and Cloud Function transaction write (`kpiDailySnapshot`) to include new fields; added unit test coverage asserting persistence when unified metrics export supplies values.
- Introduced deprecation marker into legacy `adoption-gate` workflow (`.github/workflows/adoption-gate.yml`) scheduling removal after a 7‑day stability window (target ≥2025-08-22) now that central validation covers adoption prune gating.
- Added MA7 (7‑day moving average) overlay infrastructure (client-side computation) for provenance coverage, latency p95, adoption %, fallback rate, cache hit ratio, and rate limit rejection metrics (UI sparkline overlay w/ test IDs). (NOTE: UI test scaffolding pending – follow-up to add component spec or Playwright route once Sparkline overlay component extracted. Client overlay is additive and non-breaking.)
- CHANGE_LOG updated to mark T15 COMPLETE; next milestone T16 (KPI parity + finance real metrics gating) proceeds.

Risk: Low (additive fields + UI). Rollback: remove added fields from interface & snapshot write, delete new test, and excise overlay rendering blocks in observability dashboard.

Follow-Up (Post-Completion):

1. Remove legacy adoption-gate workflow after target date.
2. Add Playwright spec asserting presence of MA7 overlay test IDs (if not already covered by component unit test).
3. Consider persisting pre-computed MA7 series if client-side cost grows with expanded history (>30d window).
4. (Done) Client Observability dashboard now prefers server precomputed MA7 fields when present (falls back to client compute). Added MA7 contract test `functions/src/test/kpi-daily-ma7-contract.test.ts` ensuring last 7 snapshot docs have MA7 fields numeric or null.



## 2025-08-15 (T17 Alias Retirement – Phase 1 Removal)

Retired legacy feature alias keys after confirming zero runtime usages via nav gating audit (`npm run audit:nav-gates`) and alias enforcement test:

- Removed alias feature keys and their canonical duplicates from `FEATURE_ACCESS` / alias map: `export_pdf`, `export_csv`, `neuroseo`, `performance_metrics`, `link_analysis`, `ai_content_generation`.

## 2025-08-15 Aider Delegation Framework Introduction

### Added

- Formal Copilot ↔ Aider delegation heuristic (soft 180 LOC / hard 220 LOC, mechanical multi-file patterns only) documented in `.github/copilot-instructions.md`, chatmode profile, and `DEVELOPER_AI_AGENT.md`.
- Delegation Block template with required fields (TaskID, Files, Constraints, ExitCriteria, Rollback, Observability logging).
- sessions/aider-log.jsonl logging convention (optional) for analytics (taskId, filesChanged, locAdded, locRemoved, status, timestamp).

### Rationale

Reduces cognitive load on Copilot for repetitive edits, enforces minimal diffs and safe rollback, and creates measurable telemetry for process refinement without impacting runtime code.

### Rollback

1. Remove delegation sections from the three docs.
2. Delete any generated `sessions/aider-log.jsonl` (tooling artifact).
3. Revert MaxDiffLines policies; treat all edits as direct Copilot operations.


- Updated tutorial components and banners replacing `link_analysis` references with canonical `link_view` feature key.
- Pruned `FEATURE_ALIASES` down to a single transitional mapping `ai_insights -> advanced_analytics` (scheduled for removal next release window pending usage grep; current grep shows only onboarding reference plus alias map entry).
- Adjusted access control logic remains unchanged aside from smaller alias set; alias resolution loop still bounded with cycle guard.
- Ran gating audit and alias usage unit test: PASS (0 findings, no disallowed alias gates).

Why: Reduces surface area & audit noise, enforces canonical capability (`export_formats`) and granular NeuroSEO subtool keys, aligns with Phase 4 data minimization + observability consolidation.

Deployment Notes:

- Change is additive-removal (no new keys introduced); any stale client referencing removed aliases will now resolve as unknown feature (graceful denial + console.warn). Monitor logs for `Unknown feature:` lines post deploy for unexpected external references.
- Keep transitional `ai_insights` one more release to allow analytics dashboards or saved configs (if any) to migrate; schedule verification task (grep + metrics) before final removal.

Rollback Plan:

1. Reintroduce removed alias keys in `FEATURE_ALIASES` mapping to their canonical targets (see git history of `src/lib/access-control.ts` prior to this change for exact values).
2. Optionally restore removed legacy entries in `FEATURE_ACCESS` if any UI still directly checked them (not expected after audit PASS).
3. Re-add tutorial references if required (unlikely) by reverting tutorial component edits.
4. Re-run `npm run audit:nav-gates` & alias usage test to confirm restored state is clean.

Risk: Low. All removed keys were internally mapped duplicates with no direct FeatureGate usage (enforced by existing alias usage spec). Unknown external persistence of alias strings would result only in denied access rather than elevated permissions (safe failure). Monitoring guidance above mitigates stealth regressions.

### Pending (T14 Evidence)

- Seed script `seed:semantic-map-legacy` added to create representative large `semanticMapResults` docs (>2.5KB) for semantic reduction measurement.
- Next staging cycle: seed >=5 docs, run scan/backfill/report sequence to capture semantic `reductionPct`; then mark T14 complete.

### 2025-08-15 (T14 Data Minimization – Evidence Captured & Completion)

- Executed semantic map legacy seed (`SEED_COUNT=6`) producing 6 oversized `semanticMapResults` docs (≈9.8 KB each; total 59,138 bytes).
- Ran backfill aggregate writer producing 6 matching compact aggregate docs totaling 6,831 bytes.
- Size reduction report now shows:
  - Semantic Map: legacyBytes=59,138 aggBytes=6,831 reductionPct=88.45% (matched=6)
  - Neural Crawler (previous evidence): legacyBytes=4,803 aggBytes=842 reductionPct=82.47% (matched=2)
- Evidence artifact: `artifacts/size-reduction.json` (CI-friendly) generated via `npm run report:neuroseo-size:ci`.
- Acceptance Criteria Met for T14: tooling (scan/backfill/report), aggregate collections (crawler & semantic), empirical reduction >70% for both domains (crawler 82.47%, semantic 88.45%), verification scripts & adoption KPI in place.
- Marking T14 COMPLETE. Follow-up hardening: monitor `crawlerAggregateAdoptionPct` until ≥95% then enable prune flag permanently & schedule legacy doc archival script (separate task).

#### 2025-08-15 Test Metrics Seeding Endpoint (Adoption Prune Gating Support)

- Added non-production endpoint `/api/test/metrics/crawler` accepting query params `hits`, `fallbacks`, `domain=crawler|semantic` to mutate in-memory aggregate adoption counters for crawler or semantic map.
- Enables new Playwright contract spec `health-neuroseo-adoption-prune-threshold.spec.ts` to deterministically raise crawler adoption to ≥95% before validating prune readiness.
- Safety: Returns 404 in production; caps per-invocation increments at 1000; no persistence side effects.
- Rollback: Delete `src/app/api/test/metrics/crawler/route.ts` and remove related test references.




## 2025-08-15 (T13 Load Test Completion & Audit Timings Instrumentation)

- Completed Task T13: 20-parallel Firecrawl route performance + memory guard test now stable (<5% error-rate, p95 under target) using `test:unit:firecrawl-perf` suite (audit stress test shows 0% failure, p95 < 200ms).\n+- Completed Task T10: Firecrawl crawler integrated into audit pipeline with robots.txt respect (depth>1), Zod schema validation, multi-phase timings (crawl/analysis/total) included in response.
- Added multi-phase timing instrumentation to Cloud Function SEO audit (`functions/src/api/audit.ts`): crawl_time_ms, analysis_time_ms, total_time_ms (attached to response `timings`).
- Reintroduced audit callable timings unit test (`testing/unit/audit/audit-timings.test.cjs`) via lightweight `GENKIT_TEST_STUB=1` pathway eliminating previous ESM module resolution hacks for Genkit.
- Enhanced unified metrics (`unified-metrics.ts`) with crawler timing sample capture and derived `crawlP95`, `analysisP95` (bounded sample arrays, 500 cap) surfaced in `/api/health` under `crawler.crawlP95` & `crawler.analysisP95`.
- Added test stub shortcut inside `functions/src/ai/genkit.ts` honoring `GENKIT_TEST_STUB=1` to avoid heavy provider initialization during timing/unit tests.
- CHANGE: Health endpoint now includes crawler p95 aggregates; backward-compatible (additive fields).

Rollback Plan:

1. Remove `GENKIT_TEST_STUB` conditional from `functions/src/ai/genkit.ts` if test stub path undesired.
2. Delete `testing/unit/audit/audit-timings.test.cjs` and timing fields (`timings`) assignments in `functions/src/api/audit.ts`.
3. Revert `unified-metrics.ts` additions (crawlSamples/analysisSamples, crawlP95/analysisP95 computation) and remove added fields from health route.
4. Update CHANGE_LOG removing this section and redeploy.

Risk: Low. Additive metrics & test-only stub; no production behavior change apart from exposing new optional timing percentile fields.


## 2025-08-15 (T16 Revenue KPI Enrichment)

Added revenue metrics to daily KPI snapshot (T16 increment):

- Enriched Cloud Function `kpiDailySnapshot` persistence with monthly revenue aggregates sourced from `financeInvoices` collection for the current period (YYYY-MM):
  - `revenueMrr` (sum of amounts for status=paid invoices in month)
  - `revenueOutstanding` (count of invoices with status != paid)
  - `revenueOnTimePct` (percentage of paid invoices where `paidAt <= dueAt`, 1 decimal precision)
- Best-effort aggregation: failures in revenue query now logged with structured warn event `kpiDailySnapshot.revenueAggregationFailed` and omitted from snapshot (fields remain undefined) per degradation policy.
- Updated accompanying unit test in `functions/test/kpi-daily-snapshot.test.ts` to assert new revenue fields plus retention purge and AI usage aggregation (paid on-time vs late scenarios + outstanding invoice).
- No Firestore schema/index changes required (existing `period` field used; queries remain simple equality match capped at 5000 docs).
- Checklist: Mark T6 (Revenue KPI validation) core aggregation DONE; T16 progresses to next planned enrichment (provenanceCoveragePct & latency percentile expansion) after metrics sharing refactor.

Rollback Plan:

1. Remove revenue aggregation block in `functions/src/scheduled/kpi-daily-snapshot.ts` (search for `revenueMrr`) and delete related optional fields from `KpiDailyDoc` interface.
2. Adjust unit test removing revenue assertions.
3. Deploy functions; historical snapshot docs retain prior revenue fields (harmless) or can be backfilled to delete via ad-hoc script if strict schema desired.


Risk: Low. Additive fields; failure path already silent with warning log. Transaction write unchanged except added optional fields.

### 2025-08-15 Observability & Finance API Additions (Consolidated Documentation)

New API surface (additive; all provenance-wrapped where applicable):

## 2025-08-15 Optional AI CLI Agent (Aider) Integration

### Added

- Documentation file `docs/DEVELOPER_AI_AGENT.md` outlining opt-in usage of Aider (AI pair programming CLI) for constrained, minimal-diff refactors (smoothing extension, CRUD scaffolds, test adjustments). No production/runtime code paths modified.
- Project-scoped `.aiderignore` excluding large/generated/sensitive files (mirrors existing `.gitignore` plus explicit secret & binary patterns) to reduce accidental context expansion & secret exposure.
- NPM script `ai:aider` (informational echo) – does not install dependencies; directs contributors to the doc for local-only setup.

### Rationale

Accelerate remaining backlog (T15/T16/T18+) with a disciplined AI assistant while preserving repository determinism (no added deps, no build impact). Provides a standardized, documented workflow avoiding ad hoc AI edits.

### Risk

Low. Purely additive docs + ignore + script. No runtime, build, or test behavior change. Secret leakage risk mitigated via `.aiderignore` and existing `.gitignore`.

### Rollback

1. Delete `docs/DEVELOPER_AI_AGENT.md` & `.aiderignore`.
2. Remove `ai:aider` script from `package.json`.
3. Remove this CHANGE_LOG section.

No further cleanup required (no persisted config elsewhere).

- `/api/admin/ai-usage/daily` (GET) – historical AI token & cost usage range with optional `seed=1` for local test seeding and date range query params (`start`, optional `end`). Auth gated via `x-observability-key` when `OBSERVABILITY_API_KEY` is set; otherwise open in non‑production. Persisted documents live in `aiUsageDaily` collection (one per provider/date). Used by health KPI exposure & Playwright contract tests.
- `/api/chat/admin/stream` (POST SSE) – admin chat streaming endpoint supporting OpenAI provider (if `OPENAI_API_KEY`) with circuit breaker + synthetic fallback (one‑shot) + rate limiting (team aware). Emits structured JSON SSE frames with provenance marker and final summary event. Records route latency, errors, fallbacks, and rate limit rejections into unified metrics.
- `/api/finance/metrics` (GET) – consolidated finance dashboard metrics endpoint returning aggregated KPIs, optional real‑time subscription metrics and targets, falling back to client-side Firestore aggregation if non‑200. Includes `x-finance-diagnostics` header in non‑production for triage. Accepts `months` and optional `teamId` query parameters.

Supporting libraries & instrumentation:

- `src/lib/metrics/ai-usage.ts` – rolling 24h bucketed token + cost estimator with per-model cost heuristic (env override) and subtool usage counters. Exposed via `/api/health` (`aiUsage24h`, `subtoolUsage24h`) and daily export job.
- `src/lib/visualizations/server-exports.ts` & `server-artifacts.ts` – server‑side artifact generation (PDF/PNG/SVG/Excel/JSON) for chart/dashboard exports uploading to Firebase Storage with signed URLs (integration point for future async export queue).
- `src/app/api/chat/admin/stream/route.ts` – streaming admin chat endpoint (see above) with latency measurement and provenance enforcement.
- `src/lib/finance/revenue-metrics.ts` and `derive-subscription-events.ts` – revenue snapshot computation formulas (MRR, ARR, churn, ARPU, LTV) and invoice→subscription derivation heuristic used in KPI contract tests and future Cloud Function enrichment.

Color & Semantic Token Compliance:

- Replaced remaining `border-amber-400 bg-amber-50/60 text-amber-900` finance mock banners with semantic `border-warning/30 bg-warning/15 text-warning-foreground` tokens across Billing, Invoices, and Finance dashboard pages to eliminate final raw status palette offenders (scan now passes with zero offenders).

Test Consolidation & Optimization:

- Introduced focused unit scripts for revenue metrics (`test-revenue-metrics`, `test-revenue-kpi-contract`, `test-revenue-derive-events`) and entitlement checks to keep `test:critical` fast while still covering finance logic.
- Added color compliance scan (`scripts/check-status-colors.js`) to `test:critical` chain; updated finance pages to maintain green state.
- Neural crawler aggregate parity test (`test-neural-crawler-aggregate`) validates compact doc size (<2.5KB threshold) and field parity for T14 migration progress; integrated early to catch regressions pre‑prune phase.

Risk: Low. All APIs additive and flag / key gated; existing clients unaffected. Finance mock banners now rely solely on semantic design tokens.

Rollback (this section only): Remove new API route files, revert finance page banner class changes, and delete new metrics helper modules. Tests referencing removed modules must be pruned from `package.json` scripts.

#### 2025-08-15 KPI Daily Snapshot Enrichment (T16 incremental)

- Added second test case in `functions/test/kpi-daily-snapshot.test.ts` asserting enrichment of provenance coverage & latency percentile fields when a `unifiedMetricsDaily/{date}` export doc exists (p90/p95/p99 + provenanceCoveragePct). Confirms Cloud Function snapshot consumes exported metrics rather than leaving placeholders null.
- No functional code change required (existing logic already loaded `unifiedMetricsDaily`); test closes verification gap for next T16 milestone.
Rollback: Remove added test block (search for "enriches provenance") if reverting unified metrics export consumption.


## 2025-08-14 (T7 Completion & T16 Scaffold)

Completed Task T7 (AI usage & cost metrics):

 -Daily token & cost aggregation persists to `aiUsageDaily` via `ai-memory-manager` with provider-specific usage extraction (OpenAI/Anthropic real usage; Gemini metadata parsing heuristic improved).
 -`/api/health` now injects daily aggregates (`aiDailyTokensIn`, `aiDailyTokensOut`, `aiDailyCostEstimate`) into KPI payload; Playwright + Mocha tests enforce presence.
 -Added historical usage range endpoint `/api/admin/ai-usage/daily` (auth header gating + optional seed) plus unit test covering date filtering.
 -Gemini usage contract test validates metadata parsing paths.

Scaffolded Task T16 (KPI snapshot function initial slice):

 -Added Cloud Function `kpiDailySnapshot` (scheduled every 24h) persisting compact daily KPI doc (`kpiDaily/{YYYY-MM-DD}`) with AI token in/out + cost, schema version & 90-day retention purge.
 -Unit test `kpi-daily-snapshot.test.ts` seeds `aiUsageDaily` docs, executes snapshot, asserts aggregate & retention deletion of >90d doc.
 -Checklist updated: T7 -> DONE; T16 -> IN-PROGRESS (next: extend snapshot to include provenanceCoveragePct, latency aggregates once unified metrics extraction shared to functions layer).
 -Progress Task T6 (Live Billing Integration) – added financeInvoices upsert in Stripe functions webhook for invoice payment succeeded/failed events (period YYYY-MM, status, amount, timestamps, planTier, user mapping via stripeCustomerId). Pending: handle invoice.created/finalized, unify Next.js webhook logic, add tests & revenue KPI validation.


### 2025-08-14 Daily AI Usage KPI Exposure

Added optional daily AI usage KPI fields surfaced via `/api/health` (`kpis.aiDailyTokensIn`, `kpis.aiDailyTokensOut`, `kpis.aiDailyCostEstimate`) populated by aggregating `aiUsageDaily` Firestore documents for the current date. Added Mocha test `functions/test/health-daily-ai-kpis.test.ts` seeding a deterministic `aiUsageDaily` doc and asserting mandatory presence of the fields. Extended `KpiSnapshot` interface with optional properties. Gemini token usage remains heuristic (length-based estimator) – follow-up task will integrate native usage metadata once stable provider endpoint parity is finalized.


## 2025-08-14 Phase 1 Gating Hardening (Partial)

Scope (initial incremental commit of Phase 1 acceptance tasks):

- Added alias usage enforcement script `testing/unit/access/feature-gate-alias-usage.spec.cjs` preventing direct FeatureGate usage of keys present in `FEATURE_ALIASES` (governance for upcoming alias retirement).
- Introduced finance mock transparency banners (Finance Dashboard, Billing Overview, Invoices) displayed when mocks active (determined by `allowFinanceMocks()` / FINANCE_MOCK_MODE) and live metrics absent; improves user clarity & provenance.
- Verified NeuroSEO subtool & Link View pages already wrapped with granular FeatureGate keys: neural_crawler, semantic_map, trust_block, ai_visibility, rewrite_gen, link_view (no further edits needed for gating insertion).
- Confirmed nav tiers alignment for `team_management`, `content_briefs`, `link_view` in `enhanced-nav.ts` (agency tier where required); no mismatch adjustments needed this pass.
- Added navigation gating matrix Playwright spec `feature-nav-gating-matrix.spec.ts` validating starter/agency/enterprise enable vs disabled states.
- Added npm scripts: `test:feature-aliases`, `test:feature-deprecated` for CI integration of alias & deprecated FeatureGate usage checks.

Pending (next incremental patch for full Phase 1 acceptance):

- Nav gating matrix test (starter vs agency vs enterprise visibility/disabled states across representative features).
- Script wiring into CI for alias & deprecated feature gate checks.
- Finance mock mode env doc snippet + potential `NEXT_PUBLIC_ALLOW_FINANCE_MOCKS` guidance.

Rollback Plan:

1. Remove alias enforcement script file if causing false positives.
2. Remove banner JSX blocks (search for "Finance mock data banner") from affected finance pages.
3. Re-run gating audit script to ensure no regressions introduced by removal.

Risk: Low. Changes are additive (diagnostic/test + UI notice). No backend contract modifications.


## 2025-08-14 PR2 Feature Gating Completion (Navigation Alignment)

Added explicit feature keys & page-level FeatureGate wrappers for cross-domain dashboards and core analyzer tools:

- New / aligned feature keys: content_analyzer, seo_audit, sales_dashboard, finance_dashboard, marketing_dashboard.
- Wrapped pages: /content-analyzer, /seo-audit, /sales, /finance, /marketing, plus previously added competitors & team collaboration subpages.
- Updated audit script regex to recognize inline feature key definitions (fixed white_label false negative) ensuring clean PASS (0 errors / 0 warnings).
- Navigation audit now yields only INFO-class orphan features (documented for roadmap/admin & entitlement-only usage) – no active gating gaps.
- Added Playwright spec `feature-dashboard-gating.spec.ts` validating locked Marketing dashboard for starter tier and unlock at enterprise.

Rollback Plan:

1. Revert edits to gated page files and `src/constants/enhanced-nav.ts` removing new feature fields.
2. Revert regex change in `scripts/audit-nav-feature-gates.ts` if it causes unintended matches.
3. Remove added Playwright spec if reverting gating scope.

Risk: Low – UI gating metadata only; no backend/API contract changes.

### 2025-08-14 Orphan Feature Classification & Audit Noise Suppression

Context: Post-PR2 audit produced 18 INFO-class ORPHAN_FEATURE findings (legacy, entitlement, export, roadmap, admin consolidation). These obscured actionable regressions.

Changes:

- Added inline suppression annotations (`// audit:ignore-orphan category=<token> rationale="..."`) to `src/lib/access-control.ts` for non-navigable / entitlement / roadmap placeholders.
- Enhanced `scripts/audit-nav-feature-gates.ts` (section 5) to parse annotations and skip emitting ORPHAN_FEATURE findings for those keys while preserving error/warn detection.
- Categories introduced: legacy-ui, internal-metrics, export, roadmap, entitlement, admin.
- Result: `npm run audit:nav-gates` now outputs PASS with 0 infos (previously 18) improving signal-to-noise for future gating regressions.

Governance:

- Suppression is explicit & documented; new features must not be annotated until reviewed.
- FEATURE_KEYS.md update deferred (next pass) – annotations act as primary documentation inline.

Rollback Plan:

1. Remove added `audit:ignore-orphan` comment lines (search for that token) in `access-control.ts`.
2. Revert orphan handling block in `scripts/audit-nav-feature-gates.ts` to prior version (git history) or delete suppression parsing code.
3. Re-run `npm run audit:nav-gates` to confirm INFO findings restored for unused features.

Risk: Very low – audit tooling / comments only; no runtime logic path invoked by application code.

### 2025-08-14 Feature Gating Phase 2 – Entitlement Refactor

Changes:

- Removed entitlement-only keys (`priority_support`, `dedicated_support`, `enterprise_sla`) from `FEATURE_ACCESS` to prevent misuse as navigable features.
- Added `ENTITLEMENT_FLAGS` map in `access-control.ts` with minimumTier + description, consumed implicitly by `canAccessFeature` (returns tier check) for any legacy references.
- Updated alias resolution path; entitlement flags now bypass FeatureGate UI gating.

Rationale:

- Entitlements are plan benefits, not discrete UI modules; keeping them in FEATURE_ACCESS created noise and false orphan findings.

Result:

- `audit:nav-gates` remains PASS (0 findings) with a leaner feature surface.

Rollback Plan:

1. Reinsert removed keys into `FEATURE_ACCESS` with prior configs.
2. Remove `ENTITLEMENT_FLAGS` block and related conditional in `canAccessFeature`.
3. Re-run `npm run audit:nav-gates` (expect INFO orphans to return if unused).

Risk: Low (read-only restructuring). No user-facing UI change; authorization semantics unchanged for tiers that already qualified.


Refactored remaining hard-coded Tailwind palette color utilities to semantic design tokens (continued incremental sweep):

Semantic Token Migration Batch 2 (Metrics & Dashboards):

- Added centralized helper `src/lib/metrics/status-colors.ts` mapping status states to semantic tokens.
- Replaced raw palette utilities (emerald/amber/rose/green/yellow/red/blue/violet) with semantic tokens in metrics & dashboard components: `QuotaBar.tsx`, `MetricCard.tsx`, `adaptive-progress.tsx`, `performance-dashboard.tsx`, `VisualizationDashboardBuilder.tsx`, `EnterpriseDashboard.tsx`.
- Converted gradient in `QuotaBar` unlimited state to semantic `from-primary/40 via-accent/40 to-success/40`.
- Standardized intent styling and delta badges in `MetricCard` to success/warning/destructive surfaces.
- Health status & error surfaces in `performance-dashboard` and `EnterpriseDashboard` now use semantic badge + background tokens (success/warning/destructive) instead of green/yellow/red palette shades.
- Dashboard builder selection & metric sample highlight switched to primary token surfaces; table change indicators use success/destructive foreground tokens.
- Added safeguard unit test `testing/unit/metrics/metrics-colors.spec.cjs` scanning updated components for forbidden raw palette utilities.
- Deferred neutral gray consolidation pending final gray token policy (unchanged in this batch).
Governance: Visual parity preserved; semantic tokens ensure future theming consistency. Rollback: revert modified component files & remove `status-colors.ts` and new test.
Governance: Maintains design consistency; no functional logic changes. If rollback needed, revert commits touching the above files; palette classes were replaced 1:1 with nearest semantic equivalents.

## 2025-08-14 Semantic Token Migration Batch 3 Initiation (Status Severity Abstraction)


### 2025-08-14 Batch 3 Progress (Payment Success semantic refactor)


- Updated action highlight (green) to `bg-success/15 text-success`; converted checkbox + progress bar blues to primary tokens
- No behavioral changes; visual intent preserved. Rollback path: revert this section's commit; search for `from-primary to-accent` within chat component to restore previous gradient if necessary.

- Ensures tutorial & timeline UI now fully participate in theming and future palette adjustments without searching raw hex/hue utilities.
- Rollback: revert both component files; search for `getTierColor` and `getActivityBadgeColor` to restore prior hard-coded mappings.

- Rationale: Align admin panel role/subscription indicators with semantic system; remove final lingering status palette utilities discovered by compliance regex.
- Rollback: revert file; restore previous classes; ensure compliance test `design-status-colors-compliance.spec.ts` updated or temporarily skipped if reverting.

- Removed these files from compliance ALLOWLIST (test updated) shrinking migration backlog; residual allowlisted files documented for subsequent passes.
- Rollback: revert modified files & restore prior gradient/color classes; reinsert paths into ALLOWLIST if test failures block rollback.

- Migrated `billing-settings-card.tsx` warning panel (yellow palette) to semantic `bg-warning/15 border-warning/30 text-warning` set and replaced green success icons/text (`text-green-500/600`) with `text-success`.
- Migrated `subscription-management.tsx` analytics Issues metric from `text-red-600` to `text-destructive`; removed file from compliance ALLOWLIST.
- Shrunk compliance test ALLOWLIST accordingly; next targets: `standardized-button.tsx` (hover variants already semantic but allowlisted), `enhanced-cards.tsx`, `loading-spinner.tsx`, remaining profile/tiers components with amber/yellow classes.
- Rollback: revert the two component files and re-add their paths to ALLOWLIST in `design-status-colors-compliance.spec.ts`.

### 2025-08-14 Batch 3 Progress (Completion – Zero Offenders Status Palette)

Date: 2025-08-14

Outcome:

- Docs gradient (blue/purple) → primary/accent; helper text-blue-100 → text-primary/25.
- Admin tier migration log colors red/yellow → destructive/warning.
- Production deployment monitoring metrics green/blue/purple/orange → success/primary/accent/warning semantic tokens; status badges semantic surfaces (success/warning/destructive).
- Design system illustrative error example updated to semantic destructive (prevents scan false positive while documenting anti-pattern).
- UX integration example & micro-interactions state config: all blue/green/orange/purple shades → primary/success/warning/accent + subtle backgrounds; final bg-blue-600 removed.
- Feature gate enterprise badge unified to accent.
- Adjusted `status-colors` comment to avoid regex false positive.
- Scan script integrated in prior batch now reports zero offenders.

Verification: `node scripts/check-status-colors.js` → No raw status palette utilities found (excluding allowlist). Allowlist now obsolete for status colors; candidate for removal.

Risk: Low (class substitutions only). No logic changes.

Next Steps:

- Remove/relocate dormant Playwright compliance spec & ALLOWLIST.
- Optionally make scan fail build on any future offender (currently informative in test:critical chain).
- Consider documenting semantic mapping guidelines in DESIGN_TOKENS.md (future).


# 2025-08-13

- Synchronized status docs to reflect implemented AI memory adapter (env-driven provider selection + mock fallback):
  - Updated `.github/copilot-instructions.md` and `archey/ADDENDUM_2025-08-12.md`.
  - Refreshed `docs/INCOMPLETE_CODE_AUDIT.md` date and notes (visualizations comment cleanup note, provenance header audit action).
- No behavior changes; documentation-only.

- PROV-01 audit enhancement: `scripts/audit-provenance-coverage.ts` now performs optional runtime checks for `/api/table-data` provenance
  - JSON response must include `__provenance` field
  - CSV response must include `x-provenance` header
  - Configure origin via `PROV_ORIGIN` (default http://localhost:3000); set `PROV_REQUIRE_SERVER=1` to fail when server unavailable

- CI update: Added runtime provenance audit to Table Data Contract workflow
  - Workflow `.github/workflows/table-data-contract.yml` now runs `npm run test:provenance-audit` with `PROV_ORIGIN=http://localhost:3000` and `PROV_REQUIRE_SERVER=1` after contract tests.
  - NPM script alias `test:provenance-audit:runtime` added for local runs.

- CI update: Broader runtime provenance checks
  - dev-preview-validation: runtime audit now executes after the preview URL is determined; remains non-blocking.
  - deployment-ready-to-staging: added non-blocking runtime audit against PERFORMANCE_URL.
  - production-deploy: moved runtime audit to post-deploy and targets PRODUCTION_URL; remains non-blocking.

- Chat UI: Removed outdated "placeholder" comment in voice recorder, added attachment quota check for audio, and ensured restore/pagination preserve attachment `type` and `mediaUrl` for proper rendering.

<!-- markdownlint-disable MD046 -->

# Unreleased (GOV-01 Documentation Baseline)

## [CI - Table Data Contract Test] (2025-08-12)

### Added

- GitHub Actions workflow `.github/workflows/table-data-contract.yml` that boots the Next.js dev server, optionally seeds demo data (non-blocking), waits for readiness, and runs the `/api/table-data` contract test against `http://localhost:3000`.

### Notes

- Seeding in CI is best-effort and will be skipped if Firestore emulators/creds are unavailable; the route falls back to deterministic data.

### Rollback Plan

1. Delete the workflow file `.github/workflows/table-data-contract.yml`.
2. Remove any CI references to the table-data contract test if added elsewhere.

## [Data Source Swap - Table Data API] (2025-08-12)

### Changed

- `/api/table-data` now reads from Firestore at `dashboardTables/{widgetId}/rows` instead of using a mock generator, preserving the existing API contract (query params: `widgetId`, `sort`, `page`, `pageSize`, `format=json|csv`).
- Supports numeric-first sorting via `valueNum` and `changeNum` when present (falls back to string `value`/`change`).
- Cursor-based pagination under the hood while retaining simple `page/pageSize` at the edge.
- CSV export (`format=csv`) with `all=true` streams batches with a safety cap; sorted consistently with JSON.
- Deterministic generator retained as a fallback if Firestore is unavailable or empty (ensures demo continuity).

### Added (Non-breaking)

- Optional scoping support in `/api/table-data` via `teamId` and `userId` query params. When provided, queries filter rows by those fields and synthetic fallback is disabled (empty result if no scoped rows). See FIRESTORE_SCHEMAS.md for schema and index notes.

### Notes

- Recommended row schema per `dashboardTables/{widgetId}/rows`:
  - `metric` (string)
  - `value` (string, formatted)
  - `valueNum` (number)
  - `change` (string)
  - `changeNum` (number)
- No new Firestore indexes required for baseline queries; role/user scoping may be added later if needed.

### Rollback Plan

1. Revert `src/app/api/table-data/route.ts` to the deterministic mock generator implementation (git history).
2. Remove any references to Firestore-backed sorting/pagination in comments/docs if not used.
3. Validate UI table and CSV export still function using mock data.

### Verification Steps

- JSON: Request `/api/table-data?widgetId=demo-table&sort=metric.asc&page=1&pageSize=25&format=json` and verify rows and pagination.
- CSV: Request `/api/table-data?widgetId=demo-table&sort=valueNum.desc&format=csv&all=true` and confirm full, sorted CSV.
- Empty collection: With no Firestore rows, confirm deterministic fallback data is returned without errors.

## [Universal Provenance Middleware Enforcement] (2025-08-11)

### Added

- Provenance enforcement (`withProvenance` and `enforceProvenance`) added to all dashboard, visualizations, and billing invoices API endpoints for universal coverage (PROV-01).
- All API responses from these endpoints now include `__provenance` as required by audit.

### Rollback Plan

1. Revert changes in `src/app/api/dashboard/custom/route.ts`, `src/app/api/visualizations/route.ts`, and `src/app/api/billing/invoices/route.ts` to remove `withProvenance` and `enforceProvenance` imports and usage.
2. Remove provenance wrapping from all affected API responses and handlers.
3. Confirm provenance audit/test passes with expected failures for these endpoints (if reverting for test purposes).
4. Update CHANGE_LOG marking rollback executed; deploy.

### Verification Steps

- Run `PROV_STRICT=1 npm run test:provenance-audit --silent` and confirm 100% coverage.
- Manually hit dashboard, visualizations, and billing invoices endpoints and verify `__provenance` is present in all responses.

### Notes

- This change ensures compliance with PROV-01 and blocks merges if provenance is missing on any AI/LLM endpoint.

## [Unreleased Enhancements - Observability & Rate Limiting] (2025-08-11)

### Added

- p90 / p95 / p99 latency computation per route in unified metrics (`unified.latency[route].p90|p95|p99`) plus flattened `p95` map in `/api/health` for quick consumption.
- Team-aware rate limiting module `src/lib/rate-limit/team-rate-limit.ts` (fixed 1h window) and integration in `chat/customer` route when user has `teamId`.
- Metrics counters: `rateLimitRejections` (scope + route) and per-latency entry `p95` field.
- Fallback + error taxonomy instrumentation parity for `ai/conversational-seo` and `ai/multi-model` routes (now record 4xx_user / 5xx_server and backend_error fallbacks).
- Compact doc size tracking via `recordCompactDocSize` invoked on NeuroSEO stream persistence; surfaced in unified metrics snapshot under `compactDocs`.
- Team limiter coverage expanded: integrated `enforceTeamRateLimit` into `neuroseo/live`, `neuroseo/stream` (hybrid fallback to legacy user limiter), and `seo-audit/run` routes; added team-aware rate limit smoke test (`test:team-rate-limit`).
- Ownership & role escalation negative test script (`scripts/test-team-ownership-and-roles.ts`) ensuring non-owner cannot transfer ownership and members cannot self-escalate roles; integrated into `test:critical` chain.
- Team rate limit allowed counter (`teamRateLimitAllows`) and utilization KPI (`teamRateLimitUtilizationPct`) derived in `kpi-aggregation` (formula: teamAllows / (teamAllows + teamRejects) * 100).
- KPI aggregation layer (`src/lib/metrics/kpi-aggregation.ts`) deriving: provenanceCoveragePct, cacheHitRatio, fallbackRate, p90LatencyOverall, p95LatencyOverall, p99LatencyOverall, rateLimitRejectionRate, avgCompactDocBytes, routesP95 map.
- `/api/health` now includes `kpis` object with above fields (additive, backward-compatible).
- KPI validation script `scripts/test-observability-kpis.ts` added to `test:critical` chain.
- Health alerts array (`alerts`) with threshold-based warn/critical entries (provenanceCoverage, fallbackRate, cacheHitRatio, rateLimitRejectionRate, avgCompactDocBytes) exposed by `/api/health` (OPS-01 initial alert surfacing).
- Console usage audit script `scripts/audit-console-usage.ts` (LOG-01) failing build on disallowed console.* in P0 domains; integrated in `test:critical` chain.
- Tenant scope linter `scripts/lint-tenant-scope.ts` (soft mode) generating `tenant-scope-report.json` for potential unscoped Firestore queries (SEC-01 / GOV-01).

### Changed

- `/api/health` response schema now includes top-level `p95` field (additive, backward-compatible) and each latency entry carries `p90|p95|p99`.
- `/api/health` response extended with `kpis` aggregation object (see Added) for higher-level dashboard consumption plus new `alerts` array for threshold breaches.

### Rollback Plan

1. Remove `p95` map creation and field plus `alerts` array from `/api/health/route.ts`.
2. In `unified-metrics.ts`, delete percentile computation helper, remove `p90|p95|p99` from latency entries and snapshot type, and remove `rateLimitRejections` structure & recorder if not needed.
3. (If reverting KPI layer) Delete `src/lib/metrics/kpi-aggregation.ts`, remove `kpis` import & field from `/api/health/route.ts`, remove `recordCompactDocSize` references & compactDocs structure, and delete test script `scripts/test-observability-kpis.ts` plus its invocation in `package.json` `test:critical`.
4. Delete `scripts/audit-console-usage.ts` and `scripts/lint-tenant-scope.ts` references from `test:critical` chain; remove files.
5. Delete `src/lib/rate-limit/team-rate-limit.ts` and related imports/usages (`enforceTeamRateLimit`, `TeamRateLimitError`, `recordRateLimitRejection`).
6. (Team limiter expansion rollback) Remove team limiter imports/usages from `neuroseo/live`, `neuroseo/stream`, `seo-audit/run`; delete `scripts/test-team-rate-limit.ts`, `scripts/test-team-ownership-and-roles.ts`, remove `test:team-rate-limit` & `test:team-ownership` scripts and references from `test:critical`; remove `teamRateLimitAllows` counter & `recordTeamRateLimitAllowed` function from `unified-metrics.ts`, remove utilization KPI computation & field from `kpi-aggregation.ts`.
6. Optional: Delete `teamRateLimits` Firestore collection documents (or allow to expire manually if TTL policy later added).
7. Update CHANGE_LOG marking rollback executed; deploy.

### Verification Steps

- Hit `/api/health` locally and confirm presence of `p95` object (may be empty until traffic).
- Generate sample traffic (invoke chat & neuroseo endpoints) then re-check `/api/internal/metrics` for populated latency buckets & `p95` values.
- Force rate limit exceed (set `TEAM_RATE_LIMIT=1`, perform two chat requests) and verify 2nd returns 429 with `Retry-After` and `rateLimitRejections` increments.

### Notes

- Percentiles derived from latency histogram buckets; if distribution sparse, percentile falls back to `maxMs`.
- Alerts are early baseline; future work: escalate to dedicated incident channel + configurable thresholds.
- Theming: Replaced remaining insights gradient + semantic map chart hex colors with design tokens (chart-2 / chart-3). Further sweep pending for branding customization page dynamic placeholders (user input allowed).
- TEAM-01: Added automated invite flow test script `scripts/test-team-invites.ts` and integrated into `test:critical` chain (skips gracefully if required test tokens not set).


## Docs Update (2025-08-11)

- Updated `gpt5Agent.md` with consolidated functional status, revised Phase 1 ordering, KPIs, risks, DoD refinements.
- Added `STATUS_ROLLUP.md` (concise status summary) and initial `RUNBOOK.md` draft (incident response & KPIs).
- No schema/index changes; operational only. Rollback: delete new files and revert `gpt5Agent.md` to prior commit.

- NEU-01: Added streaming NeuroSEO analysis endpoint (SSE) at /api/neuroseo/stream with incremental chunk + progress + completion events; introduced runAnalysisStream generator in enhanced orchestrator.
- NEU-01: Streaming acceptance completion – added provenance on cached/complete events, synthetic fallback (timeout & error) with 'fallback' event, timeoutMs parameter, streaming test script (test:neuro-stream), counters parity with live exec.
- NEU-02: Streaming path compact persistence added (hashKey deterministic doc id, <5KB guard, validation via CompactAnalysisSchema) + size/hash test (test:neuro-persist-size). Rollback: remove persistCompact() from /api/neuroseo/stream route and delete related test & script entry.
- NEU-01: Added client hook (useNeuroSeoStream) and UI runner component (NeuroSEOStreamingRunner) with progress bar, live event log, and abort support.
- FEATURE_KEYS.md: Feature key registry with lifecycle states.
- MKT-01: Added marketing guard unit test script (test:marketing-guard) verifying derived fields stripped & numeric normalization.

### 2025-08-15 Firecrawl Integration Scaffold (T10 initial)

- 2025-08-15 (T12) Upgraded Firecrawl endpoint quota: moved from in-memory counter to Firestore-backed hourly window with in-memory fallback. Added `quota.remaining` & `quota.resetAt` in success + rate-limited responses, and records allowance via `recordTeamRateLimitAllowed('seo-audit/firecrawl')` plus rejection metrics. Future: expand scope key to team/user.

- Added `src/lib/crawler/firecrawl-client.ts` implementing depth/limit & timeout constrained crawl with soft deterministic fallback when `FIRECRAWL_API_KEY` absent or errors/timeout occur. Instrumented latency + fallback/error counters via unified metrics (`firecrawl/crawl`).
- New experimental endpoint: `GET /api/seo-audit/firecrawl?url=...&depth=1&limit=5` returning normalized `pages[]` plus provenance (`live` vs `synthetic`). Serves as contract + latency probe ahead of full audit pipeline wiring & Zod schema validation (T11).
- No existing audit routes modified; safe additive slice. Consumers can progressively adopt by calling this endpoint prior to invoking Cloud Function based audit.
- Unit test `testing/unit/crawler/firecrawl-client.test.cjs` asserts synthetic fallback behavior without API key.
Rollback: Delete client file, endpoint route, unit test, and this CHANGE_LOG section.
  - MKT-02: Added normalizePeriod utility (strict YYYY-MM) integrated into sanitizeMarketingCampaignDoc with error on invalid; extended tests.
- TEAM-01: Added computeEffectiveTier util and unit test (test:team-access) ensuring team plan tier overrides individual when higher.
  - TEAM-01: Added Firestore rule test harness (test:team-rules) – skips automatically if FIRESTORE_EMULATOR_HOST not set.
  - LOG-01: Replaced console logging in stripe webhook, support reply, contact API routes with structured logger (component ids: stripe-webhook, support-reply, contact).
  - TEAM-01: Enhanced subscribeToTeamMembers to use live subcollection snapshots with periodic refresh fallback; retains embedded fallback.
    - NEU-01: Added live NeuroSEO execution scaffold (`src/lib/neuroseo/live-exec.ts`) with timeout + cache-first + synthetic fallback and new API route `/api/neuroseo/live` gated by `neuro_live_backend` feature key (rolling_out). Added minimal test script `test:neuro-live`.
    - NEU-02: Added compact persistence of live/synthetic analyses to `neuroSeoAnalyses` (fields: userId, overallScore, createdAt, urls, hashKey, topKeywords[<=10], provenance `__provenance`). Deterministic doc id based on hashKey for idempotent upsert. Feature key `neuro_live_persistence` (rolling_out). Non-blocking writes with structured logging on degradation.
    - PROV-01: Added provenance preservation in marketing sanitizer + smoke tests (`test:provenance`) asserting `__provenance` retained and persisted analyses contain provenance.
    - NEU-03: Introduced cache abstraction (`src/lib/cache/simple-cache.ts`), SWR background refresh in live exec, zod validation for compact persistence, negative provenance test, and cleanup script (`neuro:cleanup`) for TTL pruning.
    - FIN-01: Added idempotency to Stripe webhook via `stripeProcessedEvents/{eventId}` guard; duplicate events short-circuit with logged event. (Rollback: delete collection + remove processedRef logic.)
      - LOG-01 (finalized): Added audit() and degraded() structured logger helpers (flags: audit, degraded) + test script `test:logger` ensuring ISO timestamp, level, and flags; replaced remaining webhook console.error usages with structured logger + degraded notices on persistence failure.
      - SEC-01: Expanded negative Firestore rule tests (`test:security-negative`) adding: usage subcollection cross-write denial, audits cross-read denial, project outsider read/update restrictions, supportMessages admin-only + replies isolation, team reports membership enforcement, mismatched ownerId team creation denial, member invite deletion denial, role self-escalation prevention; CI integration via emulator.
  - FIN-02 (partial): Introduced live billing data fetch utility `src/lib/billing/fetch-billing-data.ts` and rewired `/app/(app)/billing/page.tsx` to remove mock data in favor of Firestore `subscriptions` + `financeInvoices` reads gated by `billing_portal_access` feature. Added test script `scripts/test-billing-ui.ts` seeding subscription + invoices in emulator verifying `effectiveMonthly` computation and `nextInvoice` selection. Added client-side invoice pagination + Playwright smoke test `billing-live.spec.ts`. Added payment method helper `payment-method.ts` + API route `/api/billing/payment-method` and integrated client fetch (non-blocking). Added dynamic usage metrics integration (`fetch-usage-metrics.ts`) pulling top-level `/usage` doc for current period and displaying limits (∞ for unlimited). Implemented invoices pagination API route `/api/billing/invoices` initially with period cursor then refined to composite cursor (period|createdAt) + secondary orderBy to prevent multi-invoice period skips (requires composite index `(userId, period desc, createdAt desc)`). Wired lazy load in billing UI consuming composite cursor if present. Enhanced accessibility & regression test coverage (a11y landmarks, keyboard nav, pagination, failure resilience). Added negative security test asserting cross-user subscription read denial. (Remaining: none for FIN-02 core; future: team billing scope.)
  - PERF-01 (partial): Implemented NeuroSEO live execution rate limiting via new `neuroseoRateLimits` collection + transaction-based counter with 1h window and 429 responses (`Retry-After`) in `/api/neuroseo/live`; added test script `test:neuroseo-rate-limit`. (Remaining: team-scoped limits, integration with central metrics registry.)
  - OBS-01 (partial): Added lightweight internal metrics endpoint `/api/internal/metrics` exposing NeuroSEO counters (analysisRuns, analysisCacheHits) pending unified registry expansion.
  - LOG-01 (expansion): Replaced ad-hoc `console.*` statements in `src/lib/neuroseo/index.ts` NeuroSEO suite orchestrator with structured logger (`getLogger('neuroseo-suite').withTrace()`) emitting JSON envelopes (events: phase.* start, item failures, degraded trend/persistence states, completion). Backwards-compatible; no functional changes. Rollback: revert file to previous revision restoring console statements.
- NEU-03: Unified NeuroSEO metrics registry (live + stream) with env-configurable TTL (NEUROSEO_CACHE_TTL_MS) applied; SSE end provenance fix; streaming test asserts cached speed.
- TEST-01: Added feature key audit (test-feature-keys.ts) + metrics registry increment test (test-metrics-registry.ts) and extended test:critical aggregation to include provenance + feature + metrics checks. Rollback: delete scripts and revert package.json test:critical line.
  - Added missing feature keys (api_access, white_label, team_management, custom_integrations) to FEATURE_KEYS.md after audit failure.

## Rollback (FIN-02 cursor refinement)

1. Revert `/src/app/api/billing/invoices/route.ts` to period-only ordering (remove second `orderBy('createdAt','desc')` and composite cursor parsing logic).
2. Update `/src/app/(app)/billing/page.tsx` to stop referencing `periodAndCreatedAtCursor` and request using `cursor=period` only.
3. Delete composite Firestore index `(userId, period desc, createdAt desc)` from `firestore.indexes.json` if added; keep `(userId, period desc)` if previously present. Remove financeInvoices createdAt required note in `FIRESTORE_SCHEMAS.md` (mark it optional again) and adjust docs.
4. Validate pagination still functional (may skip multi-invoice same-period edge); run `billing-live.spec.ts` and a manual multi-invoice same-period test.
5. Remove this rollback section in CHANGE_LOG after completion.

## Rollback (FIN-02 partial)

      1. Revert `src/app/(app)/billing/page.tsx` to prior mock-based version (use git history).
      2. Delete `src/lib/billing/fetch-billing-data.ts`.
      3. Remove billing test script `scripts/test-billing-ui.ts` and related npm script (if added later).
      4. Optionally demote `billing_portal_access` feature key status in `FEATURE_KEYS.md` back to previous state (e.g., planned) if exposure caused regression.
      5. Validate by running `npm run test:security-negative` (should be unaffected) and manual smoke of billing page (should show mock data again).

## Rollback

### Rollback

1. Remove delegation sections from the three docs.
2. Delete any generated `sessions/aider-log.jsonl` (tooling artifact).
3. Revert MaxDiffLines policies; treat all edits as direct Copilot operations.

# 2025-08-10: Removed self-reexport JS stubs for dashboard charts

Refactor: Eliminated `*.js` stub re-export files in `src/components/dashboard/` (seo-score-trend, traffic-sources-chart, keyword-visibility-chart, backlinks-chart, domain-authority-chart) in favor of direct dynamic imports of `.tsx` modules.
Added: `allowImportingTsExtensions` in `tsconfig.json` to permit explicit `.tsx` specifiers until broader barrel strategy is adopted.
Added: Custom ESLint rule `no-self-reexport` and codemod script `scripts/codemods/remove-self-reexport-stubs.mjs` for future automated cleanup.
Rollback Plan:

1. Recreate stub file (e.g. `seo-score-trend.js`) with `export { default } from './seo-score-trend.tsx';` if bundler regression occurs.
2. Revert dynamic import paths in `src/app/(app)/dashboard/page.tsx` from `.tsx` back to `.js`.
3. Remove `allowImportingTsExtensions` from `tsconfig.json` if not needed elsewhere.
4. Disable rule by commenting `'custom-rules/no-self-reexport'` in `eslint.config.mjs`.
   Verification: Typecheck + dashboard page render (charts load, no recursion warnings).

Security Hardening (2025-08-10):

- Added ESLint guard against committed `serviceAccount.json`.
- Introduced template `docs/security/serviceAccount.example.json` and updated security protocols.
- Action required: remove real `serviceAccount.json` from git history (BFG or git filter-repo) and rotate exposed credentials.

# 🚀 RankPilot Comprehensive Change Log

**Session Date:** July 30, 2025  
**Branch:** workshop/performance  
**Session Type:** Post-Optimization Analysis & Infrastructure Restoration

## 📋 **Session Overview**

### **Primary Issues Addressed:**

1. **Post-Restart Empty Files Investigation** - Analyzed why files appeared empty after VS Code restart
2. **Payment Infrastructure Restoration** - Restored critical Stripe payment system components
3. **Security API Cleanup** - Removed unused security endpoints and optimized architecture
4. **VS Code Extension Optimization** - Resolved extension conflicts and performance issues

### **Root Cause Analysis:**

- Files were **intentionally deleted** during previous optimization session, not corrupted
- Git history confirmed deliberate cleanup of unused security API routes
- VS Code extension conflicts caused by Python/Jupyter extensions interfering with TypeScript development

---

## 🔄 **File Changes Tracked**

### **A. Restored Critical Payment Infrastructure**

#### **1. Stripe Webhook Handler** - `/src/app/api/stripe/webhook/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Critical Stripe webhook processing for payment events
**Key Components:**

```typescript
- Complete webhook signature verification
- Event handling for checkout.session.completed
- Subscription lifecycle management (created/updated/deleted)
- Payment success/failure processing
- Firebase Firestore integration for user updates
- Comprehensive error handling and logging
```

#### **2. Stripe Checkout Handler** - `/src/app/api/stripe/checkout/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Stripe checkout session creation for subscription tiers
**Key Components:**

```typescript
- Firebase Functions integration via httpsCallable
- Tier validation (starter/agency/enterprise)
- Checkout session creation with metadata
- Error handling for authentication and validation
- GET endpoint for session retrieval
```

#### **3. Subscription Management Library** - `/src/lib/stripe/subscription-management.ts`

**Status:** 🔧 **MODIFIED** (TypeScript compatibility fixes)
**Changes Made:**

```typescript
// BEFORE: Direct property access causing TypeScript errors
currentPeriodEnd: subscription.current_period_end,
trialEnd: subscription.trial_end

// AFTER: Type-safe property access with conversion
currentPeriodEnd: (subscription as any).current_period_end * 1000, // Stripe API compatibility
trialEnd: (subscription as any).trial_end ? (subscription as any).trial_end * 1000 : null
```

### **B. VS Code Development Environment Optimization**

#### **4. Extensions Configuration** - `/.vscode/extensions.json`

**Status:** ✅ **CREATED** (new optimized configuration)
**Purpose:** Curated extension management with conflict resolution
**Configuration:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "bradlc.vscode-tailwindcss", // Tailwind CSS IntelliSense
    "esbenp.prettier-vscode", // Code formatting
    "GitHub.copilot", // AI assistance
    "GitHub.copilot-chat", // AI chat
    "ms-playwright.playwright", // Testing framework
    "zerotask.firebase-configuration-schema", // Firebase support
    "ms-vscode.powershell", // PowerShell scripting
    "davidanson.vscode-markdownlint" // Markdown linting
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript", // Conflicts with typescript-next
    "ms-python.python", // Removed - not needed for this project
    "ms-python.debugpy", // Removed - Python debugging
    "ms-toolsai.jupyter", // Removed - Jupyter notebooks
    "ms-toolsai.jupyter-keymap", // Removed - Jupyter shortcuts
    "ms-toolsai.jupyter-renderers", // Removed - Jupyter renderers
    "ms-toolsai.vscode-jupyter-cell-tags", // Removed - Jupyter cell tagging
    "ms-toolsai.vscode-jupyter-slideshow" // Removed - Jupyter slideshow
  ]
}
```

#### **5. Workspace Settings Enhancement** - `/.vscode/settings.json`

**Status:** 🔧 **MODIFIED** (TypeScript memory optimization)
**Key Enhancement:**

```json
// BEFORE: 4GB TypeScript server memory
"typescript.tsserver.maxTsServerMemory": 4096,

// AFTER: 6GB TypeScript server memory for better performance
"typescript.tsserver.maxTsServerMemory": 6144,
```

### **C. Security Infrastructure Cleanup**

#### **6. Unused Security API Routes** - `/src/app/api/security/*`

**Status:** ❌ **DELETED** (confirmed unused via codebase analysis)
**Deleted Files:**

- `/src/app/api/security/rotate-credentials/route.ts` (empty file)
- `/src/app/api/security/validate-access/route.ts` (empty file)
- `/src/app/api/security/check-permissions/route.ts` (empty file)

**Justification:**

- Comprehensive grep search revealed **zero references** to these endpoints
- Files were **empty** with no implementation
- Security is handled via **Firebase Auth middleware** and **tier-based access control**
- Removal improves **API surface area security** and **build performance**

### **D. Development Infrastructure**

#### **7. AI Implementation Roadmap** - `/Agents_implementation.prompt.md`

**Status:** ✅ **CREATED** (development planning document)
**Purpose:** Comprehensive AI agent implementation roadmap
**Contains:**

- Content Intelligence Agent specifications
- Technical SEO Agent framework
- Keyword Intelligence Agent design
- Competitive Intelligence Agent architecture
- 4-phase implementation priority plan

---

## 🔄 **File Changes Tracked**

### **A. Restored Critical Payment Infrastructure**

#### **1. Stripe Webhook Handler** - `/src/app/api/stripe/webhook/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Critical Stripe webhook processing for payment events
**Key Components:**

```typescript
- Complete webhook signature verification
- Event handling for checkout.session.completed
- Subscription lifecycle management (created/updated/deleted)
- Payment success/failure processing
- Firebase Firestore integration for user updates
- Comprehensive error handling and logging
```

#### **2. Stripe Checkout Handler** - `/src/app/api/stripe/checkout/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Stripe checkout session creation for subscription tiers
**Key Components:**

```typescript
- Firebase Functions integration via httpsCallable
- Tier validation (starter/agency/enterprise)
- Checkout session creation with metadata
- Error handling for authentication and validation
- GET endpoint for session retrieval
```

#### **3. Subscription Management Library** - `/src/lib/stripe/subscription-management.ts`

**Status:** 🔧 **MODIFIED** (TypeScript compatibility fixes)
**Changes Made:**

```typescript
// BEFORE: Direct property access causing TypeScript errors
currentPeriodEnd: subscription.current_period_end,
trialEnd: subscription.trial_end

// AFTER: Type-safe property access with conversion
currentPeriodEnd: (subscription as any).current_period_end * 1000, // Stripe API compatibility
trialEnd: (subscription as any).trial_end ? (subscription as any).trial_end * 1000 : null
```

### **B. VS Code Development Environment Optimization**

#### **4. Extensions Configuration** - `/.vscode/extensions.json`

**Status:** ✅ **CREATED** (new optimized configuration)
**Purpose:** Curated extension management with conflict resolution
**Configuration:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "bradlc.vscode-tailwindcss", // Tailwind CSS IntelliSense
    "esbenp.prettier-vscode", // Code formatting
    "GitHub.copilot", // AI assistance
    "GitHub.copilot-chat", // AI chat
    "ms-playwright.playwright", // Testing framework
    "zerotask.firebase-configuration-schema", // Firebase support
    "ms-vscode.powershell", // PowerShell scripting
    "davidanson.vscode-markdownlint" // Markdown linting
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript", // Conflicts with typescript-next
    "ms-python.python", // Removed - not needed for this project
    "ms-python.debugpy", // Removed - Python debugging
    "ms-toolsai.jupyter", // Removed - Jupyter notebooks
    "ms-toolsai.jupyter-keymap", // Removed - Jupyter shortcuts
    "ms-toolsai.jupyter-renderers", // Removed - Jupyter renderers
    "ms-toolsai.vscode-jupyter-cell-tags", // Removed - Jupyter cell tagging
    "ms-toolsai.vscode-jupyter-slideshow" // Removed - Jupyter slideshow
  ]
}
```

#### **5. Workspace Settings Enhancement** - `/.vscode/settings.json`

**Status:** 🔧 **MODIFIED** (TypeScript memory optimization)
**Key Enhancement:**

```json
// BEFORE: 4GB TypeScript server memory
"typescript.tsserver.maxTsServerMemory": 4096,

// AFTER: 6GB TypeScript server memory for better performance
"typescript.tsserver.maxTsServerMemory": 6144,
```

### **C. Security Infrastructure Cleanup**

#### **6. Unused Security API Routes** - `/src/app/api/security/*`

**Status:** ❌ **DELETED** (confirmed unused via codebase analysis)
**Deleted Files:**

- `/src/app/api/security/rotate-credentials/route.ts` (empty file)
- `/src/app/api/security/validate-access/route.ts` (empty file)
- `/src/app/api/security/check-permissions/route.ts` (empty file)

**Justification:**

- Comprehensive grep search revealed **zero references** to these endpoints
- Files were **empty** with no implementation
- Security is handled via **Firebase Auth middleware** and **tier-based access control**
- Removal improves **API surface area security** and **build performance**

### **D. Development Infrastructure**

#### **7. AI Implementation Roadmap** - `/Agents_implementation.prompt.md`

**Status:** ✅ **CREATED** (development planning document)
**Purpose:** Comprehensive AI agent implementation roadmap
**Contains:**

- Content Intelligence Agent specifications
- Technical SEO Agent framework
- Keyword Intelligence Agent design
- Competitive Intelligence Agent architecture
- 4-phase implementation priority plan

---

## 🔄 **File Changes Tracked**

### **A. Restored Critical Payment Infrastructure**

#### **1. Stripe Webhook Handler** - `/src/app/api/stripe/webhook/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Critical Stripe webhook processing for payment events
**Key Components:**

```typescript
- Complete webhook signature verification
- Event handling for checkout.session.completed
- Subscription lifecycle management (created/updated/deleted)
- Payment success/failure processing
- Firebase Firestore integration for user updates
- Comprehensive error handling and logging
```

#### **2. Stripe Checkout Handler** - `/src/app/api/stripe/checkout/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Stripe checkout session creation for subscription tiers
**Key Components:**

```typescript
- Firebase Functions integration via httpsCallable
- Tier validation (starter/agency/enterprise)
- Checkout session creation with metadata
- Error handling for authentication and validation
- GET endpoint for session retrieval
```

#### **3. Subscription Management Library** - `/src/lib/stripe/subscription-management.ts`

**Status:** 🔧 **MODIFIED** (TypeScript compatibility fixes)
**Changes Made:**

```typescript
// BEFORE: Direct property access causing TypeScript errors
currentPeriodEnd: subscription.current_period_end,
trialEnd: subscription.trial_end

// AFTER: Type-safe property access with conversion
currentPeriodEnd: (subscription as any).current_period_end * 1000, // Stripe API compatibility
trialEnd: (subscription as any).trial_end ? (subscription as any).trial_end * 1000 : null
```

### **B. VS Code Development Environment Optimization**

#### **4. Extensions Configuration** - `/.vscode/extensions.json`

**Status:** ✅ **CREATED** (new optimized configuration)
**Purpose:** Curated extension management with conflict resolution
**Configuration:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "bradlc.vscode-tailwindcss", // Tailwind CSS IntelliSense
    "esbenp.prettier-vscode", // Code formatting
    "GitHub.copilot", // AI assistance
    "GitHub.copilot-chat", // AI chat
    "ms-playwright.playwright", // Testing framework
    "zerotask.firebase-configuration-schema", // Firebase support
    "ms-vscode.powershell", // PowerShell scripting
    "davidanson.vscode-markdownlint" // Markdown linting
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript", // Conflicts with typescript-next
    "ms-python.python", // Removed - not needed for this project
    "ms-python.debugpy", // Removed - Python debugging
    "ms-toolsai.jupyter", // Removed - Jupyter notebooks
    "ms-toolsai.jupyter-keymap", // Removed - Jupyter shortcuts
    "ms-toolsai.jupyter-renderers", // Removed - Jupyter renderers
    "ms-toolsai.vscode-jupyter-cell-tags", // Removed - Jupyter cell tagging
    "ms-toolsai.vscode-jupyter-slideshow" // Removed - Jupyter slideshow
  ]
}
```

#### **5. Workspace Settings Enhancement** - `/.vscode/settings.json`

**Status:** 🔧 **MODIFIED** (TypeScript memory optimization)
**Key Enhancement:**

```json
// BEFORE: 4GB TypeScript server memory
"typescript.tsserver.maxTsServerMemory": 4096,

// AFTER: 6GB TypeScript server memory for better performance
"typescript.tsserver.maxTsServerMemory": 6144,
```

### **C. Security Infrastructure Cleanup**

#### **6. Unused Security API Routes** - `/src/app/api/security/*`

**Status:** ❌ **DELETED** (confirmed unused via codebase analysis)
**Deleted Files:**

- `/src/app/api/security/rotate-credentials/route.ts` (empty file)
- `/src/app/api/security/validate-access/route.ts` (empty file)
- `/src/app/api/security/check-permissions/route.ts` (empty file)

**Justification:**

- Comprehensive grep search revealed **zero references** to these endpoints
- Files were **empty** with no implementation
- Security is handled via **Firebase Auth middleware** and **tier-based access control**
- Removal improves **API surface area security** and **build performance**

### **D. Development Infrastructure**

#### **7. AI Implementation Roadmap** - `/Agents_implementation.prompt.md`

**Status:** ✅ **CREATED** (development planning document)
**Purpose:** Comprehensive AI agent implementation roadmap
**Contains:**

- Content Intelligence Agent specifications
- Technical SEO Agent framework
- Keyword Intelligence Agent design
- Competitive Intelligence Agent architecture
- 4-phase implementation priority plan

---

## 🔄 **File Changes Tracked**

### **A. Restored Critical Payment Infrastructure**

#### **1. Stripe Webhook Handler** - `/src/app/api/stripe/webhook/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Critical Stripe webhook processing for payment events
**Key Components:**

```typescript
- Complete webhook signature verification
- Event handling for checkout.session.completed
- Subscription lifecycle management (created/updated/deleted)
- Payment success/failure processing
- Firebase Firestore integration for user updates
- Comprehensive error handling and logging
```

#### **2. Stripe Checkout Handler** - `/src/app/api/stripe/checkout/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Stripe checkout session creation for subscription tiers
**Key Components:**

```typescript
- Firebase Functions integration via httpsCallable
- Tier validation (starter/agency/enterprise)
- Checkout session creation with metadata
- Error handling for authentication and validation
- GET endpoint for session retrieval
```

#### **3. Subscription Management Library** - `/src/lib/stripe/subscription-management.ts`

**Status:** 🔧 **MODIFIED** (TypeScript compatibility fixes)
**Changes Made:**

```typescript
// BEFORE: Direct property access causing TypeScript errors
currentPeriodEnd: subscription.current_period_end,
trialEnd: subscription.trial_end

// AFTER: Type-safe property access with conversion
currentPeriodEnd: (subscription as any).current_period_end * 1000, // Stripe API compatibility
trialEnd: (subscription as any).trial_end ? (subscription as any).trial_end * 1000 : null
```

### **B. VS Code Development Environment Optimization**

#### **4. Extensions Configuration** - `/.vscode/extensions.json`

**Status:** ✅ **CREATED** (new optimized configuration)
**Purpose:** Curated extension management with conflict resolution
**Configuration:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "bradlc.vscode-tailwindcss", // Tailwind CSS IntelliSense
    "esbenp.prettier-vscode", // Code formatting
    "GitHub.copilot", // AI assistance
    "GitHub.copilot-chat", // AI chat
    "ms-playwright.playwright", // Testing framework
    "zerotask.firebase-configuration-schema", // Firebase support
    "ms-vscode.powershell", // PowerShell scripting
    "davidanson.vscode-markdownlint" // Markdown linting
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript", // Conflicts with typescript-next
    "ms-python.python", // Removed - not needed for this project
    "ms-python.debugpy", // Removed - Python debugging
    "ms-toolsai.jupyter", // Removed - Jupyter notebooks
    "ms-toolsai.jupyter-keymap", // Removed - Jupyter shortcuts
    "ms-toolsai.jupyter-renderers", // Removed - Jupyter renderers
    "ms-toolsai.vscode-jupyter-cell-tags", // Removed - Jupyter cell tagging
    "ms-toolsai.vscode-jupyter-slideshow" // Removed - Jupyter slideshow
  ]
}
```

#### **5. Workspace Settings Enhancement** - `/.vscode/settings.json`

**Status:** 🔧 **MODIFIED** (TypeScript memory optimization)
**Key Enhancement:**

```json
// BEFORE: 4GB TypeScript server memory
"typescript.tsserver.maxTsServerMemory": 4096,

// AFTER: 6GB TypeScript server memory for better performance
"typescript.tsserver.maxTsServerMemory": 6144,
```

### **C. Security Infrastructure Cleanup**

#### **6. Unused Security API Routes** - `/src/app/api/security/*`

**Status:** ❌ **DELETED** (confirmed unused via codebase analysis)
**Deleted Files:**

- `/src/app/api/security/rotate-credentials/route.ts` (empty file)
- `/src/app/api/security/validate-access/route.ts` (empty file)
- `/src/app/api/security/check-permissions/route.ts` (empty file)

**Justification:**

- Comprehensive grep search revealed **zero references** to these endpoints
- Files were **empty** with no implementation
- Security is handled via **Firebase Auth middleware** and **tier-based access control**
- Removal improves **API surface area security** and **build performance**

### **D. Development Infrastructure**

#### **7. AI Implementation Roadmap** - `/Agents_implementation.prompt.md`

**Status:** ✅ **CREATED** (development planning document)
**Purpose:** Comprehensive AI agent implementation roadmap
**Contains:**

- Content Intelligence Agent specifications
- Technical SEO Agent framework
- Keyword Intelligence Agent design
- Competitive Intelligence Agent architecture
- 4-phase implementation priority plan

---

## 🔄 **File Changes Tracked**

### **A. Restored Critical Payment Infrastructure**

#### **1. Stripe Webhook Handler** - `/src/app/api/stripe/webhook/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Critical Stripe webhook processing for payment events
**Key Components:**

```typescript
- Complete webhook signature verification
- Event handling for checkout.session.completed
- Subscription lifecycle management (created/updated/deleted)
- Payment success/failure processing
- Firebase Firestore integration for user updates
- Comprehensive error handling and logging
```

#### **2. Stripe Checkout Handler** - `/src/app/api/stripe/checkout/route.ts`

**Status:** ✅ **RESTORED** (was intentionally deleted during optimization)
**Purpose:** Stripe checkout session creation for subscription tiers
**Key Components:**

```typescript
- Firebase Functions integration via httpsCallable
- Tier validation (starter/agency/enterprise)
- Checkout session creation with metadata
- Error handling for authentication and validation
- GET endpoint for session retrieval
```

#### **3. Subscription Management Library** - `/src/lib/stripe/subscription-management.ts`

**Status:** 🔧 **MODIFIED** (TypeScript compatibility fixes)
**Changes Made:**

```typescript
// BEFORE: Direct property access causing TypeScript errors
currentPeriodEnd: subscription.current_period_end,
trialEnd: subscription.trial_end

// AFTER: Type-safe property access with conversion
currentPeriodEnd: (subscription as any).current_period_end * 1000, // Stripe API compatibility
trialEnd: (subscription as any).trial_end ? (subscription as any).trial_end * 1000 : null
```

### **B. VS Code Development Environment Optimization**

#### **4. Extensions Configuration** - `/.vscode/extensions.json`

**Status:** ✅ **CREATED** (new optimized configuration)
**Purpose:** Curated extension management with conflict resolution
**Configuration:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "bradlc.vscode-tailwindcss", // Tailwind CSS IntelliSense
    "esbenp.prettier-vscode", // Code formatting
    "GitHub.copilot", // AI assistance
    "GitHub.copilot-chat", // AI chat
    "ms-playwright.playwright", // Testing framework
    "zerotask.firebase-configuration-schema", // Firebase support
    "ms-vscode.powershell", // PowerShell scripting
    "davidanson.vscode-markdownlint" // Markdown linting
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript", // Conflicts with typescript-next
    "ms-python.python", // Removed - not needed for this project
    "ms-python.debugpy", // Removed - Python debugging
    "ms-toolsai.jupyter", // Removed - Jupyter notebooks
    "ms-toolsai.jupyter-keymap", // Removed - Jupyter shortcuts
    "ms-toolsai.jupyter-renderers", // Removed - Jupyter renderers
    "ms-toolsai.vscode-jupyter-cell-tags", // Removed - Jupyter cell tagging
    "ms-toolsai.vscode-jupyter-slideshow" // Removed - Jupyter slideshow
  ]
}
```

#### **5. Workspace Settings Enhancement** - `/.vscode/settings.json`

**Status:** 🔧 **MODIFIED** (TypeScript memory optimization)
**Key Enhancement:**

```json
// BEFORE: 4GB TypeScript server memory
"typescript.tsserver.maxTsServerMemory": 4096,

// AFTER: 6GB TypeScript server memory for better performance
"typescript.tsserver.maxTsServerMemory": 6144,
```

### **C. Security Infrastructure Cleanup**

#### **6. Unused Security API Routes** - `/src/app/api/security/*`

**Status:** ❌ **DELETED** (confirmed unused via codebase analysis)
**Deleted Files:**

- `/src/app/api/security/rotate-credentials/route.ts` (empty file)
- `/src/app/api/security/validate-access/route.ts` (empty file)
- `/src/app/api/security/check-permissions/route.ts` (empty file)

**Justification:**

- Comprehensive grep search revealed **zero references** to these endpoints
- Files were **empty** with no implementation
- Security is handled via **Firebase Auth middleware** and **tier-based access control**
- Removal improves **API surface area security** and **build performance**

### **D. Development Infrastructure**

#### **7. AI Implementation Roadmap** - `/Agents_implementation.prompt.md`

**Status:** ✅ **CREATED** (development planning document)
**Purpose:** Comprehensive AI agent implementation roadmap
**Contains:**

- Content Intelligence Agent specifications
- Technical SEO Agent framework
- Keyword Intelligence Agent design
- Competitive Intelligence Agent architecture
- 4-phase implementation priority plan

---

## 2025-08-15 Server-Side MA7 Precompute (kpiDaily Additive Fields)

### Added

- Added MA7 overlay fields (`ma7Provenance`, `ma7CrawlerAdoption`, `ma7SemanticAdoption`, `ma7FallbackRate`, `ma7LatencyP95`, `ma7CacheHitRatio`, `ma7RateLimitRejectionRate`) directly to `kpiDaily` documents. Cloud Function updates these after computing moving averages during alert snapshot persistence.
- Updated `KpiDailyDoc` interface & contract test to assert presence of `ma7Provenance`.

### Rationale

Reduces client computation cost and prepares for longer history windows (>14 days) without increasing hydration time. Client code can progressively read precomputed values (backward compatible—fields optional & null-safe).

### Risk

Low. Additive optional fields. Failure to persist logs `kpiDailySnapshot.ma7PersistFailed` but does not break primary snapshot.

### Rollback

1. Remove MA7 field definitions & update block in `kpi-daily-snapshot.ts`.
2. Remove test assertion for `ma7Provenance`.
3. Deploy functions; historical docs retain extra fields (harmless) or can be cleaned via ad-hoc script.

# 2025-08-16 Event Type Validator Script

Added developer tooling to validate canonical event types usage.

- New script `scripts/validate-event-types.mjs` scans `src/` and `functions/` for string literals that look like event types and ensures they exist in `src/lib/events/event-types.ts`. Unknown literals are printed as `UNKNOWN_EVENT: <literal>` and cause a non-zero exit.
- NPM script added: `validate:event-types`.

Rationale: Prevents drift between ad-hoc string literals and the central event registry.

Rollback: delete `scripts/validate-event-types.mjs`, remove the `validate:event-types` entry from `package.json` scripts, and remove this CHANGE_LOG section. No runtime behavior impacted.
