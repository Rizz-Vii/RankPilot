# Copilot Instructions for RankPilot (Studio)

## Project Overview

- **Product:** RankPilot (internal: Studio) is a production-ready AI-first SEO SaaS platform
- **Status:** Phase 4 - Production Readiness (all core features implemented)
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Backend:** Firebase Cloud Functions (Node.js), Firestore (NoSQL)
- **AI/Processing:** NeuroSEO™ Suite (6 engines), OpenAI API (GPT-4o), Genkit AI flows
- **Authentication:** Firebase Auth with 5-tier access (Free/Starter/Agency/Enterprise/Admin)
- **CI/CD:** GitHub Actions, Firebase Hosting, comprehensive Playwright testing (153 tests)

## 🧠 PilotBuddy Autonomous Learning System

### Pattern Recognition Memory

**ESLint Compatibility Patterns:**

- Issue: ESLint v9.x + Next.js 15.4.1 compatibility failures
- Solution: Graceful fallback configuration with try-catch error handling
- Prevention: Monitor dependency compatibility matrices before updates
- Template: Always implement fallback mechanisms for critical build tooling

**Testing Framework Evolution:**

- Issue: Fragmented test utilities and inconsistent authentication
- Solution: Enhanced testing framework with TestOrchestrator and graceful error handling
- Prevention: Design testing utilities as first-class citizens from start
- Template: Centralized test orchestration with retry mechanisms

**Mobile Performance Optimization:**

- Issue: Desktop-first development causing mobile UX degradation
- Solution: 8 mobile-responsive utilities with 48px WCAG-compliant touch targets
- Prevention: Mobile-first development with progressive enhancement
- Template: Component design with mobile optimization baked in

**Authentication System Complexity:**

- Issue: 5-tier subscription system creating testing overhead
- Solution: Enhanced authentication utilities with tier-based routing
- Prevention: Abstract complex authorization into reusable utilities
- Template: Tier systems with clear inheritance and fallbacks

**NeuroSEO™ Suite Integration:**

- Issue: 6 AI engines requiring orchestration and quota management
- Solution: Orchestrator pattern with unified API and quota tracking
- Prevention: Design AI service architecture with degradation strategies
- Template: AI service orchestration with graceful degradation

**Documentation Consolidation & Organization:**

- Issue: 17+ scattered documentation files creating maintenance overhead
- Solution: Automated consolidation into 6 comprehensive documents
- Template: Safety-first PowerShell automation with backup/rollback
- Prevention: Consolidate when 3+ related files exist in same domain

### Autonomous Decision Framework

**When Build Fails:**

1. Check ESLint compatibility first
2. Apply fallback configuration pattern
3. Use emergency build script if needed
4. Update documentation with resolution

**When Tests Are Unstable:**

1. Apply retry mechanisms and timeout adjustments
2. Use enhanced authentication utilities
3. Implement graceful error handling patterns
4. Enhance test orchestration

**When Mobile Issues Arise:**

1. Activate mobile-first component patterns
2. Ensure 48px minimum touch targets
3. Apply responsive utility patterns
4. Test across viewport ranges (320px-1920px)

**When Authentication Errors Occur:**

1. Use enhanced auth utilities with dev mode fallbacks
2. Check tier-based access patterns
3. Verify subscription system inheritance
4. Apply graceful authentication degradation

**When AI Services Fail:**

1. Implement orchestrator pattern with quota management
2. Apply service degradation strategies
3. Use caching for AI responses
4. Monitor service uptime and quotas

**When Documentation Becomes Scattered:**

1. Apply consolidation pattern (3+ related files → consolidate)
2. Use `pilotScripts/documentation/consolidate-documentation.ps1`
3. Create comprehensive documents with TOC and structured content
4. Update navigation and cross-references

**When Manual Tasks Become Repetitive:**

1. Identify automation opportunity (frequency >= weekly OR error-prone)
2. Create PowerShell script with safety features (dry-run, backup, logging)
3. Place in appropriate pilotScripts/ subdirectory
4. Document in pilotScripts/README.md with usage examples

### Dynamic Content System

**Auto-Generated Insights:** Updated every development session
**Script Reference Map:** All automation scripts categorized and tracked
**Configuration Monitoring:** Real-time status of critical config files
**Pattern Evolution:** Continuous learning from issue resolution history
**Metrics Tracking:** Build success, test stability, performance scores

### Critical File References

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
