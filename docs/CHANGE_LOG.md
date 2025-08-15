# 2025-08-14 Semantic Token Migration (Admin & Chat & Metrics)

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

- Remove both docs and any CI validation referencing them; revert related CHANGE_LOG segment.

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

## 🛠️ **VS Code Extension Optimization Details**

### **Extensions Removed (8 total):**

1. `ms-python.python@2025.10.1` - Python language support
2. `ms-toolsai.jupyter@2025.6.0` - Jupyter notebook support
3. `ms-toolsai.jupyter-keymap@1.1.2` - Jupyter keyboard shortcuts
4. `ms-toolsai.jupyter-renderers@1.0.20` - Jupyter output renderers
5. `ms-toolsai.vscode-jupyter-cell-tags@0.1.9` - Jupyter cell tagging
6. `ms-toolsai.vscode-jupyter-slideshow@0.1.6` - Jupyter slideshow
7. `ms-python.debugpy@2025.1.0` - Python debugging
8. `ms-python.vscode-pylance@2025.1.1` - Python language server

### **Extension Count Optimization:**

- **Before:** 21 extensions installed
- **After:** 13 extensions (38% reduction)
- **Focus:** TypeScript/Next.js development without Python/Jupyter conflicts

### **Performance Improvements:**

- **Memory:** TypeScript server increased from 4GB to 6GB
- **Conflicts:** Eliminated Python extension interference with TypeScript
- **Startup:** Reduced extension load time and resource usage
- **IntelliSense:** Improved TypeScript performance and suggestions

---

## 🔍 **Technical Analysis Summary**

\n## Unreleased (2025-08-11)

### Data Integrity & Cleanup

- Stripped derived fields (ctr, roi) from all marketing optimistic inserts; added provenance flag `__provenance`.
- Added `sanitizeMarketingCampaignDoc` write guard to enforce raw-only marketingCampaigns storage.
- Removed heuristic revenue multipliers in marketing automation (replaced with 0) and tagged synthetic records.
- Deleted unused `empty-module.js` and redundant empty `subscription.tsx`.
- Annotated deprecated legacy pages (`dashboard/page-backup.tsx`, `team/page-fixed.tsx`, `mobile-nav-test/page.tsx`) pending removal after parity verification.
- Added comments clarifying exclusion of derived ratios from persistence.

### NeuroSEO Module Simplification (2025-08-11)

- Removed hand-written proxy file `src/lib/neuroseo.js`; all dynamic imports now target extensionless specifier `lib/neuroseo` relying on Bundler module resolution for `.ts`.
- Rationale: eliminated duplicate re-export (JS + TS) after confirming `moduleResolution: Bundler` resolves `.ts` without explicit extension and `allowJs` is false (no emission concerns).
- Ensures single authoritative export surface (`neuroseo.ts`) and reduces maintenance overhead.

#### Rollback Plan

1. Recreate `src/lib/neuroseo.js` with `export * from './neuroseo/index';` if any runtime or test environment fails to resolve the TS module.
2. Change dynamic imports in `src/app/api/neuroseo/route.ts` and any agents (grep `lib/neuroseo"`) back to `lib/neuroseo.js`.
3. Document reversal here and investigate build pipeline incompatibility with extensionless specifiers.

### Template Persistence (2025-08-11)

### Template/Workflow Indexing (2025-08-11)

- Persisted workflows to Firestore (`workflows` collection) with minimal schema and provenance marker.
- Added Firestore composite index for `workflows` on (`userId` ASC, `metadata.updated` DESC) to support recent-first per-user queries.
- Initial implementation auto-loaded recent workflows globally; superseded by security hardening (user-scoped explicit loading) while retaining debounced persistence (create/update/status/delete) with silent degradation.

#### Rollback Plan

1. Remove persistence helper methods (`persistWorkflow`, `loadPersistedWorkflows`, `deletePersistedWorkflow`).
2. Delete the `workflows` collection (after confirming no dependent features) and remove the composite index from `firestore.indexes.json`.
3. Remove this changelog section; workflows revert to in-memory volatile state.

- Added Firestore persistence for dashboard and workflow (Zapier) templates.
- New collections: `dashboardTemplates`, `workflowTemplates` storing minimal template documents (no derived metrics; includes widgets/layout and trigger/action definitions only).
- Builders (`CustomDashboardBuilder`, `ZapierWorkflowBuilder`) now:
  - Seed in-memory templates then fire-and-forget sync from Firestore.
  - Upsert missing local templates to Firestore (idempotent) with `__provenance: 'seed'`.
  - Provide cached (10‑min TTL) fetch + `refreshTemplates()` for admin/manual refresh.
- Silent degrade on Firestore errors (logs warn prefix, no user disruption) per degradation policy.

#### Rollback Plan

1. Remove persistence methods (`persistLocalTemplates`, `syncTemplatesFromFirestore`, `refreshTemplates`) from both builders.
2. Optionally delete new collections (`dashboardTemplates`, `workflowTemplates`) after confirming no other readers.
3. Remove changelog section and provenance markers; retain in-memory initialization only.

#### Rollback Plan

1. Reintroduce revenue heuristic by reverting changes in `marketing-automation.ts` if required for interim forecasting.
2. Restore deleted empty files from git history if any build integration unexpectedly referenced them.
3. Remove provenance flags by search (`__provenance:`) if telemetry dashboards mis-handle the marker.

### **Git History Investigation:**

### Security & Theming Hardening (2025-08-11)

- Replaced global eager workflow loading with explicit user-scoped `loadUserWorkflows(userId)` to prevent cross-tenant exposure.
- Added debounced workflow persistence queue (500ms) lowering Firestore write amplification.
- Began theming refactor: tokenized chart palette in `EnterpriseDashboard.tsx` using CSS variables `--chart-1..5` instead of hex literals.
- Extended theming refactor: replaced remaining NeuroSEO chart hex colors (semantic-map, trust-block, rewrite-gen, NeuroSEOEnhancedComponents) with token palette `--chart-1..5`.
- Added rollback guidance; further theming refactor pending for other chart components.

### Team Schema & Logging Unification (2025-08-11)

- TEAM-01 Phase 1: Tightened Firestore `teams` rules – reads now restricted to members (via `memberIds`) or admin; creation allowed for authenticated owner (must appear in `memberIds`); updates/deletes remain admin-only pending granular RBAC.
- Added documentation `docs/teams/TEAM_SCHEMA_PLAN.md` outlining Phase 2 & 3 evolution (subcollection membership, invites, event sourcing) and rollback plan.
- LOG-01 Phase 1: Introduced unified isomorphic structured logger `src/lib/logging/app-logger.ts` producing JSON envelopes with trace IDs; replaced ad-hoc console logger in `enhanced-orchestrator.ts` (NeuroSEO) with `getLogger('neuroseo-orchestrator').withTrace()`.
  - LOG-01 (expansion): Added streaming generator `runAnalysisStream` leveraging structured events (chunk.start, progress, complete) for SSE endpoint.
- Rationale: Establish consistent logging contract ahead of cross-service trace propagation & future ingestion pipeline (BigQuery / OTLP exporter).
- Rollback: Revert Firestore rule block & restore inline console logger if unexpected UI authorization regressions surface.

### Team Schema Phase 2 Scaffolding (2025-08-11)

- Added membership subcollection `teams/{teamId}/members/{memberId}` and invites subcollection `teams/{teamId}/invites/{inviteId}` rules (read for members/admin, create restricted to owner/admin, update/delete admin for invites).
- Updated `team.service.ts` to prefer subcollection members if present (fallback to embedded array).
- Added backfill script `scripts/backfill-team-members-subcollection.ts` plus npm script `teams:backfill:members`.
- Extended Firestore rules for granular future RBAC without yet migrating writes to subcollection (read-first strategy reduces risk).
- Added safeguards: creation/update guarded by ownership; invites limited to owner/admin (delete limited to admin pending moderation model).

#### Rollback Plan

1. If debounced persistence causes stale state after rapid multi-updates, shrink debounce window or revert to immediate writes.
2. If tokens missing in production theme, reintroduce hex palette temporarily and open issue to align `globals.css` variables.
3. For admin aggregate views, introduce a separate admin-only loader rather than reverting to global preload.

# 2025-08-14 Semantic Token Migration (Admin & Chat & Metrics)

## 2025-08-15 (T14 Data Minimization – Neural Crawler Aggregate Dual-Write Scaffold)

Initial slice of T14:

- Added compact aggregate collection `neuralCrawlerResultsAgg` (schema documented in FIRESTORE_SCHEMAS.md) storing only counts + key numeric fields (no large content arrays) – versioned (v1).
- Implemented client-side dual-write helper `dualWriteNeuralCrawlerAggregate` gated by env flag `NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_DUAL_WRITE=1` (silent degrade on failure).
- Updated neural crawler page to invoke dual-write after legacy `neuralCrawlerResults` insertion (does not block primary write).
- No read path changes yet; pending: backfill script, verification parity test, read cutover flag, legacy field pruning.

Rollback Plan:

1. Remove invocation in `neuroseo/neural-crawler/page.tsx`.
2. Delete `src/lib/neural-crawler/aggregate.ts` and collection (optional purge) if unused.
3. Remove schema section from FIRESTORE_SCHEMAS.md (or mark deprecated) if abandoning.

Risk: Low – additive optional write; failures are silent and non-blocking.

### 2025-08-15 (T14 Backfill & Verification Tooling)

- Added backfill script `scripts/backfill-neural-crawler-aggregate.ts` (env: DRY_RUN=1, BATCH_SIZE). Iterates `neuralCrawlerResults` in paginated batches, skips existing aggregates (historyId or userId+url), derives compact docs.
- Added verification script `scripts/verify-neural-crawler-aggregate.ts` sampling legacy docs and asserting count parity (links/images/issues/entities/wordCount/readingTime).
- NPM scripts: `backfill:neural-crawler-agg`, `verify:neural-crawler-agg`.
- Next planned: read cutover flag `NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_READ_AGG`, UI fallback logic, then prune phase disabling legacy writes.

Rollback: Remove scripts + npm entries; delete CHANGE_LOG section. Aggregates remain harmless or can be purged.

### 2025-08-15 (T14 Read Cutover Flag – Aggregate Preferred Read Path)

- Implemented environment flag `NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_READ_AGG=1` enabling aggregate-first read strategy on Neural Crawler page.
- When enabled, page attempts to hydrate latest crawl result from `neuralCrawlerResultsAgg` (by matching historyId = latest history doc id) and reconstructs a minimal legacy-shape object (synthetic placeholders for omitted arrays) for existing UI components.
- Fallback: If aggregate doc missing it queries legacy `neuralCrawlerResults` (userId + url, latest) and logs a console warning `[neuralCrawler] legacy fallback (aggregate miss)`; aggregate hits log `[neuralCrawler] aggregate hit` for quick manual telemetry.
- Added lightweight reconstruction helpers (heading & link placeholder builders) to avoid UI null checks while keeping memory footprint low.
- No destructive changes; legacy full document still written until prune phase flag introduced.
- FIRESTORE_SCHEMAS.md updated (neuralCrawlerResultsAgg section) noting read cutover flag.

Rollback Plan:

1. Remove hydrate effect & helper functions in `neuroseo/neural-crawler/page.tsx` (search for `aggregate hit`).
2. Delete flag references; unset env variable.
3. (Optional) Remove console logs if verbosity undesired.

Risk: Low – additive read path + fallback. UI gracefully handles partial reconstructed data. Pending: prune phase script & dual‑write disable flag.

### 2025-08-15 (T14 Prune Phase Flag & Metrics Instrumentation)

- Added prune phase environment flag `NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_PRUNE_LEGACY=1` disabling legacy full document writes on Neural Crawler page (skips `addDoc` to `neuralCrawlerResults` while retaining aggregate dual-write for monitoring) – guarded for activation only after verification confidence.
- Integrated unified metrics counters for aggregate read hits vs legacy fallbacks (`crawler.aggregateHits`, `crawler.legacyFallbacks`) replacing reliance on console-only observation; console logs retained for manual spot checks.
- Added localStorage override (`neuralCrawlerReadAggOverride` = 'on'|'off') to facilitate QA toggling without rebuild.
- Implemented Playwright spec `neural-crawler-aggregate-read.spec.ts` validating aggregate-first hydration renders metrics cards and records an aggregate hit or fallback log.

Rollback Plan:

1. Remove prune flag usage in `neural-crawler/page.tsx` (search for `PRUNE_LEGACY`).
2. Delete metric recording calls (`recordCrawlerAggregateHit`, `recordCrawlerLegacyFallback`) if reverting to console-only.
3. Remove new counters from snapshot consumer logic if any downstream dashboards assume them.
4. Delete Playwright spec if causing flake pre-flag activation.

Risk: Low (flag gated). Ensure verification script `verify:neural-crawler-agg` shows high coverage before enabling prune flag in production.

### 2025-08-15 (Observability – Crawler Adoption KPI & Test Chain Optimization)

- Added KPI `crawlerAggregateAdoptionPct` to `kpi-aggregation.ts` -> surfaced via `/api/health.kpis.crawlerAggregateAdoptionPct` representing percentage of neural crawler read hydrations served from the new aggregate collection (`aggregateHits / (aggregateHits + legacyFallbacks) * 100`). Null until at least one hit or fallback recorded. Supports deciding when to flip `PRUNE_LEGACY` flag permanently.
- Trimmed base `test:critical` runtime: moved slower diagnostic & enumeration scripts (feature keys, metrics registry, AI endpoint enumeration, console usage audit, color scans, tenant scope lint, extended invites/team ownership suites, provenance coverage, etc.) behind opt-in env flag `CRITICAL_EXTENDED=1` executed via new orchestrator script `scripts/run-critical-extended.ts`. Default run now focuses on: auth/accessibility/performance Playwright specs + AI usage contract + revenue metrics & derivations + crawler/AI core KPIs (extended set optional). Nightly or extended CI can enable full chain (`CRITICAL_EXTENDED=1 npm run test:critical`).
- Removed obsolete status color `ALLOWLIST` in `scripts/check-status-colors.js`; any raw Tailwind status palette utility now fails the scan. (All previously allowlisted components migrated to semantic tokens.) Rollback: reintroduce allowlist array if unexpected false positives emerge.
- Enhanced `src/lib/visualizations/README.md` with quick API route export example and security/provenance notes clarifying when to use server vs client export paths.

Rollback Plan:

1. Revert `kpi-aggregation.ts` changes and remove `crawlerAggregateAdoptionPct` field usage if KPI deemed noisy.
2. Restore previous `test:critical` script chain from git history or set `CRITICAL_EXTENDED=1` in CI to approximate prior coverage without reversal.
3. Re-add ALLOWLIST array if legitimate palette utilities (e.g., third-party lib wrappers) require temporary exemption.
4. Remove README additions if server export example conflicts with future abstraction.

Rationale: Reduce CI wall time while preserving high-signal gates; introduce explicit adoption metric to guide data minimization rollout milestone (target 95%+ aggregate hit ratio before pruning legacy writes). Strengthens color token enforcement posture by eliminating grandfathered exceptions.
