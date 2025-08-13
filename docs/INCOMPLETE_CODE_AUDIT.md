# Incomplete Code Audit

Date: 2025-08-12
Branch: workshop/performance

This report catalogs incomplete, stubbed, or placeholder code across the repo. It prioritizes items that impact users vs. safe mocks/UX placeholders. Sources: automated scans (TODO/FIXME/placeholder/stub/not implemented) and spot reads of key files.

Legend

- Priority: [P1] user-facing breakage or critical correctness; [P2] feature gap or placeholder in a live path; [P3] tech debt, demo mock, or low-risk placeholder.

## Top findings

- [Resolved] Visualizations export placeholders
  - Server-side exports implemented for PDF/Excel/JSON/PNG/SVG via `generateServerArtifact` and wired through `src/app/api/visualizations/route.ts` with Firebase Storage persistence and signed URLs.
  - Client-side SVG export now supports `includeStyles` to inline computed styles for standalone fidelity.
  - Tests added: unit and integration coverage for artifact-present and server-rendered flows.

- [P2 → Partial] Automation scheduling
  - Implemented a scheduled Cloud Function to run due automation recipes; manual `/api/automation/run-due` deprecated (410).
  - Remaining: emulator tests, optional task queue offloading for heavy actions, and failure backoff/alerts.

- [P2 → Gated] Finance pages rely on mock metrics
  - Files: `src/app/(app)/finance/*` already respect `allowFinanceMocks()`; mock KPIs/rows show only when the flag is enabled. Live data is fetched via `/api/finance/metrics` and snapshots services when available.
  - Action: Keep gating; contract test added (`testing/specs/organized/finance-mocks-flag.spec.ts`); wire remaining subpages to the live API where missing.

- [P2 → Implemented (env-driven + schemas + budgets) + tests + capability routing] AI integration with mock fallback
  - Files: `functions/src/lib/ai-memory-manager.ts` supports env-driven provider selection (`AI_PROVIDER`/`PREFERRED_AI_PROVIDER`) across OpenAI/Gemini/Anthropic, with ordered preference and first-available fallback. Zod schema validation is available via `options.schema` (with `options.strictSchema` and `options.expectJson`), attaching parsed data to `AIResponse.structured` on success. An overall latency budget is enforced (`AI_LATENCY_BUDGET_MS`, default 8000ms; request override `options.latencyBudgetMs`); on budget exceed or error (when `AI_MOCK_FALLBACK=true`) a deterministic mock response returns with provenance.
  - Update: Minimal provider capability routing added (prefers providers that support `options.capability`; emits `ai.capability.fallback` when mismatched). Circuit breaker remains in place.
  - Metrics: emits `ai.request.success|error`, `ai.schema.valid|invalid|exception`, `ai.request.mock_fallback{reason}`, and capability fallback metrics.
  - Tests: `functions/test/ai-memory-manager.test.ts` (fallback/no-provider) and `functions/test/ai-memory-manager.schema-latency.test.ts` (strict schema failure, lenient pass-through, latency budget mock fallback).
  - Action: Add circuit breaker/capability metrics dashboards; broaden provider ordering and capability coverage tests.

- [P2 → Gated] Enterprise dashboard uses mock metrics
  - File: `src/components/dashboard/EnterpriseDashboard.tsx` now gates mock metrics via `allowEnterpriseMocks()`; when disabled, mock values are suppressed.
  - Action: Add contract tests (flag on/off) and wire to real KPIs source when available.

- [P2 → Gated] Integration Hub mocks non-existent methods
  - Files: `src/components/integration/Phase5IntegrationHub.tsx` (admin/demo badges added), `src/app/(app)/integration-hub/page.tsx` (page gated via `<FeatureGate feature="integration_hub" requiredTier="enterprise"/>`), `src/lib/access-control.ts` (added `integration_hub` feature requiresAdmin + enterprise), `src/constants/enhanced-nav.ts` (nav item under Management with Demo badge, adminOnly).
  - Behavior: Hub renders only for admins on enterprise tier with demo content enabled; otherwise shows restricted/disabled messaging. Mocks remain intentionally demo-scoped.
  - Next: If/when real integrations are implemented, keep feature flag and provenance; add Playwright access tests (locked vs unlocked) for this route.

## Notable corrections since previous audit content

- [Resolved] Chat uploads implemented
  - File: `src/components/chat/CustomerChatBot.tsx` now uploads images and voice notes to Firebase Storage and persists attachment metadata via `/api/chat/customer`. Stale comment updated in code.

- [Clarified] SEO audit function
  - File: `functions/src/api/audit.ts` integrates Firecrawl when available and falls back to synthetic crawl; AI call is attempted with structured JSON adoption when possible. This is a functional implementation with graceful fallbacks, not a stub.

- [New] Tutorials page gating
  - File: `src/app/(app)/tutorials/page.tsx` respects demo flag (`NEXT_PUBLIC_DEMO_CONTENT`); mock tutorials render only when enabled. Banner messaging updated accordingly.

- [New] Streaming mock user gated
  - File: `src/app/api/streaming/real-time/route.ts` uses a mock user only when `allowStreamingMockUser()` permits it; otherwise returns 401. Aligns with provenance and safety guidance.

- [Resolved] Deprecated mobile nav test page
  - File: `src/app/mobile-nav-test/page.tsx` now redirects to `/`, removing experimental content.

- [New] Playwright checks for demo banners and gating
  - File: `testing/specs/organized/tutorials-and-content-analyzer-banners.spec.ts` verifies Tutorials banner copy flips with demo flag off/on and Content Analyzer blocks mock report when demo disabled; uses localStorage override supported by `src/lib/flags/demo.ts`.
  - File: `testing/specs/organized/finance-mocks-flag.spec.ts` verifies Finance dashboard mock KPIs hide when `allowFinanceMocks` is false and appear when true (localStorage override), ensuring provenance-safe gating.

## Detailed inventory by area

### Visualizations and exports

- [Resolved] `src/app/api/visualizations/route.ts`: generate* functions now produce real artifacts; PNG rasterized from SVG on server when needed; signed URL persistence implemented.
- [Resolved] `src/lib/visualizations/chart-export-manager.ts`: Implements PDF/Excel/JSON/PNG/SVG buffer generation, including SVG→PNG via sharp.
- [Resolved] Client engine `d3-visualization-engine.ts`: exportAsSVG ensures width/height/background and now supports `includeStyles` to inline styles; avoids DOM mutation and uses robust base64/XMLSerializer fallback.
- [P3] `src/components/ui/chart-components.tsx`: `Progress` still a simple stub; acceptable for now.
- [P3] `src/app/api/visualizations/route.ts`: comment mentions "PDF placeholder" near server export section; reconcile comments with implemented artifact generation to avoid confusion.

### Automation

- [Partial] `functions/src/scheduled/run-due-automation.ts`: Scheduled runner added with transactional locking and idempotency; exported in `functions/src/index.ts`.
- [Partial] `src/app/api/automation/run-due/route.ts`: Deprecated (410) in favor of scheduler.
- [P3] `src/lib/automation/execute.ts`: Reconciliation still MVP; either gate as intentional or expand.
- [P3] `src/app/api/automation/run-now/route.ts`: uses deterministic placeholder for missing source; intentional fallback.

### Chat and media

- [Resolved] `src/components/chat/CustomerChatBot.tsx`: Image/audio uploads are implemented with Storage, quota checks, and persistence to `/api/chat/customer`.
- [P3] `src/components/chat/CustomerChatBot.tsx`: One block notes a basic placeholder voice note recorder; verify all paths hit backend upload and remove outdated placeholder comments.

### AI and functions

- [P2 → Implemented (env-driven + schemas + budgets + capability routing)] `functions/src/lib/ai-memory-manager.ts`: Provider preference via env (`AI_PROVIDER`/`PREFERRED_AI_PROVIDER`), first-available fallback, optional `AI_MOCK_FALLBACK` mock response, Zod schema validation (`options.schema`, `options.strictSchema`, `options.expectJson`), overall latency budget (`AI_LATENCY_BUDGET_MS`, request override `options.latencyBudgetMs`), and minimal provider capability routing (prefers providers that support `options.capability`). Next: add circuit breaker/capability metrics dashboards and broaden tests for provider ordering.
- [P3] `functions/src/api/production-keyword-suggestions.ts`: Real AI attempted with fallback to mock; acceptable with clear observability.
- [P3] `functions/src/lib/metrics-collector.ts`: `insights: []` placeholder; fill in when signals exist.
- [P2] `functions/src/api/audit.ts`: Placeholder crawl logic and loosely parsed AI section; tighten crawl adapter and structured output parsing or document as intentional MVP.
- [P3] `functions/src/api/analyze-content.ts`: Contains `mockContentAnalysis` for emulator tests; acceptable if gated by environment.
- [P3] `functions/src/context.ts`: `errorRate` marked as placeholder; backfill with real rolling metrics when available.

### Dashboards and data

- [P3] `src/lib/dashboard/custom-dashboard-builder.ts`: default widget dataSource may use `query: 'placeholder'` for custom widgets; fine as scaffold.
- [P2 → Gated] Tutorials under `src/app/(app)/tutorials` use mock data only when demo flag is enabled; keep as demo-only until API is ready.
- [P2] `src/app/(app)/billing/page.tsx`: TODO FIN-02 notes placeholder usage metrics/payment method; wire real usage + payment method source.
- [P2 → Gated] `src/components/dashboard/EnterpriseDashboard.tsx`: Mock metrics disabled unless `allowEnterpriseMocks()` is true; wire to real source when ready.

### Security and testing

- [P3] `src/lib/security/security-test-suite.ts`: flags product gaps (MFA, rate limiting); track as product roadmap, not code stubs.
- [P3] Test helpers and negative tests reference unimplemented areas intentionally; acceptable.

### Misc cleanup

- [P3] `src/components/ui/enhanced-card-stub.tsx`: temporary re-export stub likely superseded by `enhanced-card.tsx`; verify imports and remove if unused.
- [P3] `src/app/(app)/dashboard/page-backup.tsx`: dummy data backup page; consider removing from build.
- [P3] `src/app/(app)/team/page-fixed.tsx`: marked deprecated; remove once rollback window closes.
- [Resolved] `src/app/mobile-nav-test/page.tsx`: Deprecated page replaced with server redirect to `/`.
- [P3 → Secured] `src/app/api/streaming/real-time/route.ts`: Mock user gated by `allowStreamingMockUser()`; returns 401 when disabled.
- [P3] `src/context/AuthContext.tsx`: Development mock auth event bridge; ensure disabled in production builds and documented.
- [P3] `src/app/api/table-data/route.ts`: Deterministic generator used as fallback; ensure comments clearly state when it triggers and that provenance marks mock vs live.
- [P3] `src/app/(app)/insights/page.tsx`: Fallback to stub util allowed; add provenance and visibility gating if exposed to non-admin.
- [P3] `src/components/neuroseo/NeuroSEOEnhancedComponents.tsx`: Mock scores for demo; keep behind feature flag or replace with signals.

## Suggested next steps

- Visualizations export polish [P3]
  - Optional: embed font-face rules for custom fonts in SVG; add sample font embedding and docs.

- Scheduler and automation [P2]
  - Add emulator tests for the scheduled runner; consider Cloud Tasks for heavy jobs; add failure backoff and alerting.

- Replace finance mocks [P2]
  - Introduce API/data source for KPIs; keep deterministic fallback under a feature flag.

- AI provider adapter hardening [P2]
  - Add circuit breaker/capability metrics dashboards; extend tests (provider preference/fallback ordering, broader capability coverage).

- Cleanup stubs [P3]
  - Remove deprecated or temp files (`page-backup.tsx`, `page-fixed.tsx`, `enhanced-card-stub.tsx`) once references are gone.
  - Reconcile placeholder comments in streaming API and chat components; add provenance headers where applicable.

## Notes

- Many "placeholder" hits are benign UX placeholders (input placeholders) or demo mocks; they’re marked [P3].

—
Generated by automated scan plus manual verification. Optionally, we can open GitHub issues for each [P2] with owners and acceptance criteria.
