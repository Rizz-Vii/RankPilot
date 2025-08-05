# Copilot Instructions for RankPilot Studio

## Project Overview
- **RankPilot Studio** is an AI-first SEO platform built with Next.js, TypeScript, Firebase Functions, and Playwright for testing. It features advanced performance, competitive intelligence, and mobile-first UX.
- The codebase is split between the main app (`src/`) and serverless functions (`functions/`).

## Architecture & Key Components
- **Next.js App**: Main UI and business logic in `src/app/`, `src/components/`, and `src/lib/`.
- **Firebase Functions**: Serverless backend in `functions/src/`, with shared logic in `functions/lib/`.
- **Competitive Intelligence**: Core logic in `src/lib/intelligence/firecrawl-competitive-intelligence.ts` (see class `FirecrawlCompetitiveIntelligence`).
- **Performance Monitoring**: Key files: `src/lib/performance-monitor.ts`, `src/components/performance/`, and dashboard routes.
- **Mobile UX**: Components in `src/components/mobile-tool-layout.tsx`, `src/components/loading-state.tsx`, and enhanced navigation.

## Developer Workflows
- **Build**: `npm run build` (Next.js, disables dev errors for CI), `npm run build:firebase` (includes functions).
- **Dev Server**: `npm run dev-no-turbopack` (preferred for stability), or `npm run dev` (with Turbopack).
- **Type Checking**: `npx tsc --noEmit` or `npm run typecheck`.
- **Linting & Type Safety**:
  - Run `npm run lint` to identify all ESLint errors and warnings.
  - Use `npm run lint:fix` for auto-fixable issues.
  - For efficient, systematic error resolution:
    1. Run `npm run lint` and parse output for all error types and affected files.
    2. Prioritize by severity: fix TypeScript errors first (type mismatches, possibly undefined, property incompatibility), then ESLint warnings.
    3. Batch-fix by error type: replace all unexpected `any` types with strict interfaces or `unknown`, add type guards for possibly undefined values, and update object shapes for compatibility.
    4. Remove unused variables/imports and forbidden non-null assertions in a single sweep.
    5. After each batch, re-run lint and typecheck to validate fixes and surface new issues.
    6. Repeat until all errors and warnings are resolved and the codebase is clean.
  - For markdown docs, use `npm run lint:md` and `npm run lint:md:fix`.

## Patterns & Conventions
- **Event-Driven**: Many modules (e.g., competitive intelligence) use `EventEmitter` for workflow triggers and alerts.
- **Singletons**: Core services (e.g., `firecrawlCompetitiveIntelligence`) are exported as singletons.
- **TypeScript Strictness**: Extensive use of interfaces for data models and metrics. Unexpected `any` types are systematically replaced with strict interfaces or `unknown`. Use type guards and optional chaining for possibly undefined values. Always match object shapes to expected types.
- **Mobile-First**: All UI components must support mobile layouts and touch targets (see `src/components/mobile-tool-layout.tsx`).
- **Performance-First**: All features are tested for response time, cache hit rate, and accessibility (see `/performance-dashboard`).
- **AI Integration**: MCP/Firecrawl endpoints for crawling and analysis, with API calls in `src/lib/intelligence/`.

## Integration Points
- **External APIs**: Firecrawl MCP for competitive crawling, PageSpeed API (mocked in dev), Stripe for payments, Sentry for error reporting.
- **Cross-Component Communication**: Use events and shared state (see `context/` and `EventEmitter` usage).
- **Testing**: Playwright configs in root and `testing/specs/` for role-based, performance, and accessibility suites.

## Examples
- To add a competitor: use `firecrawlCompetitiveIntelligence.addCompetitor(userId, domain, config)`.
- To trigger analysis: call `firecrawlCompetitiveIntelligence.analyzeCompetitor(competitorId)`.
- To generate a report: use `firecrawlCompetitiveIntelligence.generateCompetitiveReport(userId, competitorIds)`.
- To efficiently fix lint/type errors:
  1. Run `npm run lint` and parse output for error locations and types.
  2. Fix all instances of a given error type (e.g., type mismatch, possibly undefined, property incompatibility) in all listed files using batch edits.
  3. Re-run lint and typecheck after each batch to validate and surface new issues.
  4. Repeat for next error type until the codebase is clean.

## References
- For workflow details, see `.github/workflows/README.md`.
- For build/test scripts, see `package.json` and `functions/package.json`.
- For performance targets and dashboard, see `/performance-dashboard` route and related components.

---

**Feedback requested:** If any section is unclear or missing, please specify which workflows, conventions, or integration points need more detail.
