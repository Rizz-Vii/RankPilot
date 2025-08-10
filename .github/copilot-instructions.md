## RankPilot (Studio) – AI Agent Working Guide

Purpose: Enable immediate, safe productivity. Keep responses concise, code-first, project-aware.

### 1. Core Architecture
- Next.js App Router (`/src/app`) + Tailwind + shadcn/ui. All protected feature pages live in `(app)`; auth flows in `(auth)`; marketing/public in `(public)`.
- Firestore is the single realtime data source; Cloud Functions (`/functions`) extend heavy / scheduled logic.
- AI layer: NeuroSEO™ Suite (`/src/lib/neuroseo/`) + supplementary Genkit flows (`/src/ai/flows/`). Always route complex SEO analyses through the Orchestrator entrypoint, not individual engines directly.
- 5-tier subscription gating (Free→Admin) enforced via `FeatureGate`, hooks (`useProtectedRoute`, enhanced auth utils), and nav visibility rules.

### 2. Data & Realtime Patterns
- Campaign analytics unify multiple actions into `marketingCampaigns` collection; recent work: lead/content/social/email actions emit summary documents (see `marketing-automation.ts`).
- Metrics hook pattern: `useMarketingCampaignMetrics` uses `onSnapshot` + in-memory aggregation + `addOptimistic` for instant UX. When adding new contributing actions, emit a minimal campaign doc with: `{ name, channel, impressions, clicks, leads, spend, revenue, period }`.
- Derive `period` via shared helper (e.g., `YYYY-MM`). Never compute ROI/CTR on write—those are derived client-side.

### 3. Critical Conventions
- Hydration: Never conditionally hide inputs pre-hydration. Always render, disable via `useHydration()` until ready.
- Mobile-first: Maintain 48px interactive target rule; use responsive utilities in `src/lib/mobile-responsive-utils.ts`.
- ESLint fallback safety: If lint crashes (v9 / Next mismatch) auto-fallback to `eslint.config.emergency.mjs` pattern before blocking build.
- AI service resilience: Wrap multi-engine calls with orchestrator; degrade gracefully (skip non-critical engines) instead of failing whole request.
- Deterministic dev AI: Local marketing/content pseudo-AI utilities use seeded hash; preserve seeds when extending to keep predictability for tests.

### 4. Testing & Quality
- Playwright test suite (161 files) organized under `testing/specs/organized/`; add new UI flows there—avoid legacy `specs/main/` unless maintaining backwards compatibility.
- Use `TestOrchestrator` + unified test users (`enhanced-auth.ts`) for any new role-based scenario; never hardcode credentials in tests.
- Warm/page performance tests rely on cache manifests; when adding performance-sensitive routes, update warming config if present.

### 5. Build / Run Essentials
- Primary dev: `npm run dev-no-turbopack` (stable) or `npm run dev:turbo` (fast iterate).
- Genkit AI local flows: `npm run genkit:dev`.
- Emergency build (skip typecheck) only if CI blocking: `scripts/build-skip-typecheck.js` (document usage afterward).

### 6. Feature Gating & Navigation
- Add new feature: declare nav item with `requiredTier` and optional badge; wrap page content in `FeatureGate` with matching tier constant.
- In multi-tier logic prefer inheritance (higher tiers get lower tier features automatically) — follow existing tier arrays; do not duplicate.

### 7. Firestore Write Patterns
- Always include `userId` and optional `teamId` for multi-tenant safety; timestamp fields: `createdAt`, and `updatedAt` on mutable docs.
- For synthetic summary docs (marketing), keep write minimal, let client derive advanced metrics; avoid storing computed CTR/ROI.
- Batch or parallel writes sparingly; prioritize deterministic order for tests.

### 8. Error & Degradation Strategy
- Prefer silent downgrade (reduced feature subset) over throwing for: mobile detection failure, non-critical AI engine timeout, navigation analytics.
- Surface user-visible toasts only when action-level intent fails (e.g., content generation, lead import).

### 9. Security & Secrets
- Never commit raw credentials: reference `/docs/SECURITY_ROTATION.md` for rotation steps. If a new secret needed, add placeholder env key + doc update, not inline values.

## RankPilot (Studio) – AI Agent Quick Operating Guide

Goal: Fast, safe, high‑signal contributions. Be terse, code‑first, path‑specific.
3. Emit campaign summary if it should appear in unified analytics.
### Core Architecture
- Next.js App Router: `(app)` protected, `(auth)` auth, `(public)` marketing. Tailwind + shadcn/ui.
- Data: Firestore realtime; heavy / scheduled in Cloud Functions (`/functions`).
- AI: NeuroSEO™ Suite orchestrator (`/src/lib/neuroseo/`) is SINGLE entry; extra flows in `/src/ai/flows/`.
- Access: 5-tier (Free→Admin) via `FeatureGate`, `useProtectedRoute`, enhanced auth utils.
- If creating ≥3 related docs, trigger consolidation (`pilotScripts/documentation/consolidate-documentation.ps1`).
### Data / Realtime
- Marketing metrics: write minimal doc to `marketingCampaigns` `{ name, channel, impressions, clicks, leads, spend, revenue, period }` (derive `period` `YYYY-MM`). No ROI/CTR persisted—compute client‑side.
- Hook: `useMarketingCampaignMetrics` gives optimistic aggregation; emit minimal doc then rely on it.
- Lint crash → fallback config → log note.
### Critical Conventions
- Hydration: Never hide form/content pre-hydration; render & `disabled={!hydrated}` via `useHydration()`.
- Mobile: 48px targets; use `src/lib/mobile-responsive-utils.ts` helpers.
- Firestore writes: always `userId`, optional `teamId`, `createdAt`, `updatedAt` (on mutation).
- Deterministic pseudo-AI: Preserve seeding & hashing logic when extending local mock utilities.
- AI resilience: Orchestrator must degrade (skip failing engine) not crash entire analysis.
- Lint fallback: On ESLint v9/Next crash fallback to `eslint.config.emergency.mjs`.
Feedback welcome: clarify any section if an agent encounters ambiguity.
### Testing
- Add new tests only in `testing/specs/organized/` (keep `specs/main/` stable legacy).
- Use `TestOrchestrator` + unified users (`testing/utils/enhanced-auth.ts`). Never embed credentials.
- Update warming / performance manifests if adding perf‑sensitive route (search "warming").
### Pattern Recognition Memory
### Build / Run
- Dev: `npm run dev-no-turbopack` (stable) or `npm run dev:turbo`.
- AI flows dev: `npm run genkit:dev`.
- CI unblock: `node scripts/build-skip-typecheck.js` then note in `CHANGE_LOG.md`.
- Issue: ESLint v9.x + Next.js 15.4.1 compatibility failures
### Feature Gating / Nav
- Add nav item (respect inheritance) + wrap page in `<FeatureGate requiredTier="x"/>`.
- Do NOT duplicate tier arrays—reuse constants.
- Template: Always implement fallback mechanisms for critical build tooling
### Firestore Pattern
- Minimal writes; derive analytics client-side. Limit batch writes; deterministic ordering aids tests.
- Issue: Fragmented test utilities and inconsistent authentication
### Degradation & Errors
- Silent downgrade for non-critical failures (mobile detect, ancillary AI engine, nav analytics).
- Toast only on user-intent failure (generation/import). Avoid noisy background errors.
- Template: Centralized test orchestration with retry mechanisms
### Security
- No plaintext secrets. Add placeholder env + doc reference (`/docs/SECURITY_ROTATION.md`).
**Mobile Performance Optimization:**
### Automated Action (Marketing) Playbook
1. Deterministic utility in `/src/lib/...` (keep seed).
2. Minimal Firestore metrics doc (+ required IDs & timestamps).
3. Emit summary doc for unified analytics.
4. Update page: invoke action, optimistic insert via metrics hook, toast success/failure.
5. Add organized test (tier gate + success path).

### Documentation
- ≥3 related new docs → run consolidation script (dry-run first).
- Cross-cutting change → update `/docs/PROJECT_STATUS_AND_NEXT_STEPS.md`.
- Issue: 5-tier subscription system creating testing overhead
### Rapid Triage
- Lint crash → switch to `eslint.config.emergency.mjs`.
- Metrics drift → confirm doc shape & `period` field.
- AI spike failures → log failing engine IDs; continue orchestrator partial response.
### NeuroSEO™ Usage
```tsx
import { NeuroSEOSuite } from "@/lib/neuroseo";
await new NeuroSEOSuite().runAnalysis({ urls, targetKeywords, analysisType, userPlan, userId });
```

### Agent Output Expectations
- Prefer precise file edits (patches) over explanation.
- Cite exact paths; stay concise; no generic advice.
- Ask only when genuinely blocked.

Feedback welcome: request clarification if any pattern unclear.

**Enhanced Testing Framework:**

- `testing/utils/enhanced-auth.ts` - 5-tier authentication with graceful fallbacks
- `testing/utils/graceful-test-utils.ts` - Retry mechanisms and error recovery
- `testing/utils/test-orchestrator.ts` - Role-based testing with mobile validation

**Build and Configuration:**

- `eslint.config.mjs` - Enhanced with fallback configuration for stability
- `scripts/build-skip-typecheck.js` - Emergency build script for deployment
- `scripts/pilotbuddy-aggregator.ps1` - Dynamic content generation system

**Mobile Performance:**

- `src/lib/mobile-responsive-utils.ts` - 8 custom hooks for mobile detection
- `src/components/ui/enhanced-*` - Mobile-first components with touch targets

**AI Service Architecture:**

- `src/lib/neuroseo/` - NeuroSEO™ Suite with 6 AI engines and orchestration
- `src/ai/flows/` - Genkit AI flows for additional AI features

**Documentation & Script Management (July 2025 Update):**

- `pilotScripts/documentation/` - Documentation automation scripts
- `pilotScripts/documentation/consolidate-documentation.ps1` - End-to-end consolidation automation
- `pilotScripts/documentation/cleanup-consolidated-docs.ps1` - Safe cleanup with verification
- `pilotScripts/README.md` - Script catalog and collaborative development standards
- `docs/*_COMPREHENSIVE.md` - Consolidated comprehensive documentation (6 files)

## Architecture & Data Flow

### App Structure

- `/src/app/(app)/` - Protected feature pages with enhanced navigation
- `/src/app/(auth)/` - Authentication pages with tier-based routing
- `/src/app/(public)/` - Public marketing pages
- `/src/components/` - Reusable UI components using shadcn/ui patterns
- `/src/lib/neuroseo/` - **NeuroSEO™ Suite** (6 AI engines) - FULLY IMPLEMENTED
- `/src/ai/flows/` - Genkit AI flows for additional features
- `/functions/` - Firebase Cloud Functions for backend logic
- `/docs/` - Comprehensive project documentation (69+ files)

### Critical Data Flow Pattern

1. User submits form → Enhanced navigation routes to appropriate tier-restricted features
2. Handler validates with Zod → Calls NeuroSEO™ engines or AI flows
3. **NeuroSEO™ Orchestrator** coordinates 6 engines with quota management
4. Results logged to Firestore with subscription tier tracking
5. Results displayed with animated charts/tables using Recharts + framer-motion

### NeuroSEO™ Suite Architecture (PRODUCTION-READY)

- **NeuralCrawler™**: Intelligent web content extraction with Playwright
- **SemanticMap™**: Advanced NLP analysis and topic visualization
- **AI Visibility Engine**: LLM citation tracking and optimization
- **TrustBlock™**: E-A-T optimization and content authenticity
- **RewriteGen™**: AI-powered content rewriting
- **Orchestrator**: Unified analysis pipeline with competitive positioning

## Key Patterns & Conventions

### Enhanced Navigation System (COMPLETED)

- **NeuroSEO™ Suite Prominence**: Primary navigation group with AI badges
- **Tier-Based Visibility**: Granular control (Free/Starter/Agency/Enterprise/Admin)
- **Collapsible Groups**: Logical feature organization with progressive disclosure
- **Mobile-Optimized**: Touch-friendly navigation with 48px minimum targets

### Subscription Tier Architecture (IMPLEMENTED)

```tsx
// Tier hierarchy with feature inheritance
const tierHierarchy = {
  free: ["dashboard", "keyword-tool"],
  starter: [...free, "content-analyzer", "neuroseo-basic"],
  agency: [...starter, "competitors", "neuroseo-advanced"],
  enterprise: [...agency, "adminonly", "unlimited-neuroseo"],
  admin: [...enterprise, "user-management", "system-admin"],
};

// Usage in components
<FeatureGate requiredTier="agency">
  <NeuroSEOAdvancedFeatures />
</FeatureGate>;
```

### Hydration & Client State (CRITICAL)

- **Never conditionally render form fields based on hydration state**
- Use `useHydration()` hook to control disabled state: `const hydrated = useHydration();`
- Pattern: Always render forms, use `disabled={!hydrated || isLoading}` for inputs
- Example: Components wrapped in `<HydrationProvider>` for hydration-safe rendering

### NeuroSEO™ Integration Pattern (PRODUCTION)

```tsx
// Import the full suite
import { NeuroSEOSuite } from "@/lib/neuroseo";

// Usage in components
const neuroSEO = new NeuroSEOSuite();
const report = await neuroSEO.runAnalysis({
  urls: ["https://example.com"],
  targetKeywords: ["seo", "optimization"],
  analysisType: "comprehensive",
  userPlan: user.subscriptionTier,
  userId: user.uid,
});
```

### Mobile Performance Optimization (COMPLETED)

- **Responsive Utilities**: `src/lib/mobile-responsive-utils.ts` with 8 hooks
- **Touch Targets**: 48px minimum (WCAG compliant)
- **Network-Aware Fetching**: Adaptive loading based on connection
- **Core Web Vitals**: Optimized for LCP < 2.5s, CLS < 0.1

## Developer Workflows

### Test Orchestration System

```typescript
// TestOrchestrator handles user flows and authentication
import { TestOrchestrator } from "../utils/test-orchestrator";

// Setup pattern
test.beforeEach(async ({ page }) => {
  orchestrator = new TestOrchestrator(page);
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(20000);
});

// Usage pattern
const flow = userFlows.find((flow) => flow.name.includes("FeatureName"));
await orchestrator.executeFlow(flow);

// Authentication pattern
await orchestrator.userManager.loginAs("tierName"); // "free", "starter", "agency", "enterprise", "admin"
```

### Production Readiness Commands (PowerShell)

```powershell
# Development server (optimized for production testing)
npm run dev-no-turbopack           # Primary dev server (stable)
npm run dev:turbo                  # Turbopack for faster development

# NeuroSEO™ Suite Development
npm run genkit:dev                 # Genkit AI development server
npm run genkit:watch               # Genkit with file watching

# Comprehensive Testing (153 Tests Organized)
npm run test:role-based            # Full role-based tests (5 tiers)
npm run test:critical              # Fast critical path tests
npm run test:performance           # Core Web Vitals validation
npm run test:mobile                # Mobile viewport testing
npm run test:accessibility         # WCAG compliance testing
.\scripts\run-role-based-tests.ps1 # Windows-optimized test runner

# Performance & Optimization (Windows-Specific)
npm run optimize-windows           # Windows filesystem optimization
npm run emfile:check              # File handle monitoring
npm run emfile:monitor             # Continuous monitoring
```

### Production Deployment

```powershell
# Backend functions (australia-southeast2)
firebase deploy --only functions  # Deploy to production region
firebase emulators:start          # Local testing environment

# Frontend (Auto-deployment via GitHub Actions)
git push origin master            # Triggers production deployment
```

### Testing Architecture (Production-Ready)

- **Playwright Suite**: 153 tests across 8 categories (unit, integration, e2e, mobile, visual, performance, accessibility)
- **Role-Based Testing**: Real Firebase users across 5 tiers
- **Test Users**:
  - `free.user1@test.com` (Free)
  - `starter.user1@test.com` (Starter)
  - `agency.user1@test.com` (Agency)
  - `enterprise.user1@test.com` (Enterprise)
  - `admin.enterprise@test.com` (Admin)
- **Mobile Testing**: Dedicated viewport testing with Core Web Vitals
- **Performance Testing**: Automated Core Web Vitals validation
- **Test Structure Pattern**:

  ```typescript
  // Standard role-based test structure
  test("User Tier - Feature Access", async ({ page }) => {
    // Find specific flow from predefined flows
    const featureFlow = tierUserFlows.find((flow) =>
      flow.name.includes("FeatureName")
    );

    // Execute flow via orchestrator
    await orchestrator.executeFlow(featureFlow);

    // Verify tier-specific elements
    await expect(page.locator('[data-testid="feature-results"]')).toBeVisible();
  });

  // Access restriction pattern
  test("User Tier - Access Restrictions", async ({ page }) => {
    await orchestrator.userManager.loginAs("tierName");
    await page.goto("/restricted-feature");
    await expect(
      page.locator("text=/upgrade|premium|subscribe/i")
    ).toBeVisible();
  });
  ```

## Integration Points

### NeuroSEO™ Suite (PRODUCTION SYSTEM)

- **6 AI Engines**: Fully implemented and operational
- **Usage Quotas**: Tier-based limits with real-time tracking
- **API Endpoints**: `/api/neuroseo` with authentication
- **Dashboard**: Professional UI with comprehensive analytics
- **Competitive Analysis**: SWOT analysis and positioning

### Firebase Architecture (PRODUCTION-READY)

- **Project**: rankpilot-h3jpc (australia-southeast2)
- **Authentication**: 5-tier role-based access system
- **Database**: Firestore with RBAC security rules
- **Functions**: Node.js v20, optimized for NeuroSEO™ workloads
- **Monitoring**: Error reporting and performance tracking

### Subscription System (IMPLEMENTED)

- **5 Tiers**: Free → Starter → Agency → Enterprise → Admin
- **Payment**: PayPal integration with webhook handling
- **Quota Management**: Real-time usage tracking and enforcement
- **Access Control**: Page-level protection via `useProtectedRoute()` hook
- **Billing**: Automated subscription management

### Enhanced Navigation (COMPLETED)

- **Collapsible Groups**: NeuroSEO™ Suite, SEO Tools, Competitive Intelligence, Management
- **Tier Visibility**: Features show/hide based on subscription level
- **Mobile Navigation**: Touch-optimized with bottom sheet pattern
- **Analytics**: Built-in navigation behavior tracking

## Project-Specific Guidance

### Production Readiness Focus

- **All core features are implemented** - focus on optimization and launch preparation
- **NeuroSEO™ Suite is operational** - 6 AI engines with quota management
- **Enhanced navigation is live** - tier-based access with mobile optimization
- **Testing infrastructure is comprehensive** - 153 tests across 8 categories

### Critical Development Rules

- **Never use hydration checks to conditionally render form fields or results**
- **Always update documentation in `/docs/` after major changes**
- **Follow security protocols in `/docs/SECURITY_ROTATION.md` - never commit secrets**
- **Check `/docs/PROJECT_STATUS_AND_NEXT_STEPS.md` before major architectural changes**

### Memory Management (Windows-Specific)

- Use `cross-env NODE_OPTIONS='--max-old-space-size=3072'` for development
- Monitor EMFILE errors with `npm run emfile:check`
- Run `npm run optimize-windows` for filesystem optimization

### Documentation Protocol

- **Status:** Update `/docs/PROJECT_STATUS_AND_NEXT_STEPS.md` after releases
- **Features:** Document in `/docs/AGILE_PRIORITY_PLAN.md` for prioritization
- **Architecture:** Maintain `/docs/COMPREHENSIVE_INSTRUCTIONS.md` for deep knowledge

## Example Implementation: NeuroSEO™ Integration

### Component Integration (`/src/components/NeuroSEODashboard.tsx`)

```tsx
import { NeuroSEOSuite } from "@/lib/neuroseo";

const neuroSEO = new NeuroSEOSuite();
const report = await neuroSEO.runAnalysis({
  urls: ["https://example.com"],
  targetKeywords: ["seo", "optimization"],
  analysisType: "comprehensive",
  userPlan: user.subscriptionTier,
  userId: user.uid,
});
```

### API Integration (`/src/app/api/neuroseo/route.ts`)

```tsx
export async function POST(request: NextRequest) {
  const { urls, targetKeywords, analysisType, userPlan, userId } = body;

  const report = await neuroSEO.runAnalysis({
    urls: Array.isArray(urls) ? urls : [urls],
    targetKeywords,
    analysisType,
    userPlan,
    userId,
  });

  return NextResponse.json(report);
}
```

### Enhanced Navigation (`/src/constants/enhanced-nav.ts`)

```tsx
export const neuroSEOItems: NavItem[] = [
  {
    title: "NeuroSEO™ Dashboard",
    href: "/neuroseo",
    icon: Brain,
    badge: "AI",
    requiredTier: "free",
  },
  {
    title: "AI Visibility Engine",
    href: "/neuroseo/ai-visibility",
    icon: Eye,
    requiredTier: "agency",
  },
];
```

---

**Key References:**

- `docs/PILOTBUDDY_COMPREHENSIVE.md` - AI assistant capabilities and chat mode commands
- `docs/DEVELOPER_WORKFLOW_COMPREHENSIVE.md` - Complete development workflows and processes
- `docs/MOBILE_PERFORMANCE_COMPREHENSIVE.md` - Mobile optimization and performance strategies
- `docs/PROJECT_COMPREHENSIVE.md` - Project structure and organization guide
- `pilotScripts/documentation/consolidate-documentation.ps1` - Documentation consolidation automation
- `pilotScripts/README.md` - Script catalog and collaborative development standards

## PilotBuddy Development Assistant

### Response Style & Commands

- **Ultra-Concise**: Prioritize shortest actionable responses (3 bullets or less)
- **PowerShell-First**: Always provide PowerShell commands for Windows environment (never bash/cmd)
- **Context-Aware**: Remember project structure and reference correct files automatically
- **Code-First**: Default to providing code snippets rather than explanations
- **Pattern-Driven**: Recognize and apply established project patterns automatically

### Quick Access Commands

- `@docs [topic]` - Access comprehensive documentation (workflow, mobile, security, subscription, pilotbuddy, project)
- `@scripts [category]` - List and run pilotScripts automation (docs, test, deploy, optimize, utilities)
- `@consolidate` - Run documentation consolidation workflow
- `@automate [task]` - Generate automation script for repetitive tasks
- **Pattern-Driven**: Recognize and apply established project patterns automatically

### Productivity Commands (PowerShell)

```powershell
# Development commands
npm run dev-no-turbopack           # Start dev server
npm run test:role-based            # Run complete role-based tests
.\scripts\run-role-based-tests.ps1 # Windows-specific test runner

# Project navigation
Get-ChildItem src\app\(app)\       # Feature pages
Get-ChildItem src\components\      # UI components
Get-ChildItem functions\           # Backend logic
Get-ChildItem docs\                # Documentation
Get-ChildItem pilotScripts\        # Automation scripts

# Documentation and script management
.\pilotScripts\documentation\consolidate-documentation.ps1 -DryRun  # Preview consolidation
.\pilotScripts\documentation\cleanup-consolidated-docs.ps1 -DryRun   # Preview cleanup
Get-Content pilotScripts\README.md                                   # View script catalog

# Performance monitoring
Get-Process | Where-Object {$_.ProcessName -eq "node"}  # Check Node processes
npm run optimize-windows           # Windows filesystem optimization
npm run emfile:check              # Check for EMFILE issues
```

### Quick Actions

- `@pattern [type]`: Generate code (form|state|ai-flow|firebase)
- `@optimize`: Performance suggestions for current file/feature
- `@security`: Security review based on SECURITY_ROTATION.md
- `@neuro`: NeuroSEO™ implementation guidance
