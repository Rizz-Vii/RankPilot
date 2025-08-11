## RankPilot (Studio) – Concise AI Agent Guide

Purpose: Enable fast, correct edits aligned with project patterns. Be terse, path-aware, deterministic.

### 1. Core Architecture & Domains
Next.js App Router: `/src/app` ( `(auth)`, `(public)`, `(app)` protected ). API routes co-locate under `/src/app/api/*`.
Firestore realtime (client) + Cloud Functions (`/functions`) for heavy / scheduled / Stripe / performance dashboards.
AI: Primary SEO analyses via `NeuroSEOSuite` (`/src/lib/neuroseo/index.ts`). The legacy cost-optimized singleton (`enhanced-orchestrator.ts`) is an internal experimental engine—do NOT introduce new entrypoints; reuse one of these.
Access & tiers: `src/lib/access-control.ts` (FEATURE_ACCESS, TIER_HIERARCHY). Admin role maps to enterprise + adminOnly gates.

### 2. Data & Persistence Conventions
Every mutable doc: `{ userId, teamId?, createdAt, updatedAt, ...minimalFields }` (client adds optimistic doc where UX requires).
Marketing metrics collection: `marketingCampaigns` only raw counters `{ name, channel, impressions, clicks, leads, spend, revenue, period }` (derive `period` = `YYYY-MM` client-side). Never store ROI/CTR.
NeuroSEO persistence: canonical collection `neuroSeoAnalyses` stores compact aggregates (overallScore + *_Avg metrics, insight/task slices, counts). Do NOT duplicate large arrays unless migrating; rely on in-memory cache (10‑min TTL) for immediacy.
Audits & historical SEO: follow same minimal aggregate pattern; avoid redundant derived fields.

### 3. Firestore & Realtime Rules-of-Thumb
No derived ratios in storage (compute in UI). Deterministic field ordering improves test stability.
Optimistic inserts must emit immediately (e.g., marketing metrics) to keep hooks responsive.

### 4. UI / Hydration / Mobile
Never conditionally omit inputs pre-hydration; render then disable with `useHydration()` or a loading flag. Maintain ≥48px targets (`src/lib/mobile-responsive-utils.ts`). Use CSS tokens in `src/styles/globals.css`; never inline hex—extend tokens first (chart colors = `--chart-1..5`, sidebar = `--sidebar-*`). Reuse existing `accordion-up/down` animations before adding new keyframes.

### 5. Navigation & Feature Gating
Add pages under `(app)` and NavItems in the correct group (`src/constants/enhanced-nav.ts`). Provide `requiredTier` or `adminOnly`; add missing feature key to `FEATURE_ACCESS` to avoid "Unknown feature" console warnings. Wrap gated page export with `<FeatureGate requiredTier="tier" feature="key"/>` when feature-specific. Locked items remain visible (upsell) via `getVisibleNavGroups({ includeLocked: true })`.

### 6. AI Orchestrator & Determinism
Use `new NeuroSEOSuite().runAnalysis({ urls, targetKeywords, analysisType, userPlan, userId })`. Preserve seeded hashing & stable ordering (sort URL & keyword arrays before hashing). Silent degrade on partial engine failures (skip component, continue). Do not throw on competitor crawl failures—log warn.
Caching: 10‑minute in‑process map (purge with `NeuroSEOSuite.purgeCache()`). Enhanced orchestrator variant also LRU caches (30‑min) and throttles concurrency—reuse rather than cloning logic.

### 7. Build / Dev / Functions
Primary dev: `npm run dev-no-turbopack` (stable) or `npm run dev` (Turbopack). Emergency type-skip: `node scripts/build-skip-typecheck.js` (record rationale in `CHANGE_LOG.md`). If ESLint crashes, switch to `eslint.config.emergency.mjs`.
Cloud Functions (Node 20): in `/functions` use `npm run build` then `npm run serve` (emulators) or `npm run deploy`. Performance subset deploy: `npm run deploy:performance` (only key metrics functions). Keep removed stub artifacts out (`functions/lib/api/performance-functions.js` cleaned by build script).

### 8. Testing Strategy
Playwright role-based configs dominate. Fast gate: `npm run test:critical` (auth + accessibility + performance). Place new organized specs under `testing/specs/organized/`. For nav additions add (a) locked vs unlocked visibility test (b) basic success flow. Update warming manifests if page affects performance warm caches (grep "warming").

### 9. Recent Structural Rules (CHANGE_LOG.md Driven)
Removed JS self re-export stubs in dashboard—prefer direct dynamic import of `.tsx` (temporary `allowImportingTsExtensions` set in tsconfig). If rollback needed follow steps in current CHANGE_LOG entry. Adding any exceptional build/tooling workaround requires a succinct dated log entry + rollback plan.

### 10. Security & Secrets
No committed secrets. `serviceAccount.json` guarded—use example template path under `docs/security/`. Add placeholder env var + rotate per `/docs/SECURITY_ROTATION.md` when introducing new external integration.

### 11. Error / Degradation Policy
Silent downgrade for non-critical: AI engine partial failure, competitor fetch miss, navigation analytics, mobile detection. User-facing toasts only on explicit action failure (e.g., content generation attempt). Keep deterministic fallbacks (seeded pseudo values) when real metrics absent.

### 12. Quick Feature Checklist
1) Page + NavItem. 2) Add/align `FEATURE_ACCESS` key. 3) Wrap with `FeatureGate`. 4) Minimal Firestore doc (no ratios). 5) Optimistic emit if user expects immediate UI update. 6) Tests (access + happy path). 7) If build exception: document in CHANGE_LOG.

### Fast References
Access control: `src/lib/access-control.ts`
AI suite: `src/lib/neuroseo/`
Navigation: `src/constants/enhanced-nav.ts`
Mobile utils: `src/lib/mobile-responsive-utils.ts`
Functions deploy scripts: `functions/package.json`
Emergency ESLint: `eslint.config.emergency.mjs`
Change log rationale: `CHANGE_LOG.md`

Clarify ambiguities before large refactors; keep edits scoped & deterministic.
