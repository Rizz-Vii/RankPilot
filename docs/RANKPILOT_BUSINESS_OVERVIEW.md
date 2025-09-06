# RankPilot Business Overview and Product Guide

This document consolidates the business context, user journey, feature gating, and technical execution patterns to deliver RankPilot as a professional AI SaaS for business growth.

## 1. What is RankPilot?

RankPilot is an AI‑first SEO and growth platform combining site intelligence (NeuralCrawler™, SemanticMap™, TrustBlock™, AI Visibility) with competitive analysis and go‑to‑market automation (marketing campaigns, sales outreach), plus finance insights to close the loop on ROI.

- Stack: Next.js 15, TypeScript 5.7+, Firebase (Hosting, Firestore, Functions)
- AI orchestration: OpenAI primary → Gemini secondary → deterministic fallback
- RBAC: Role‑based access with strict FeatureGate enforcement
- Tiers: starter | agency | enterprise (with entitlements)

## 2. User Journey (End‑to‑End)

See `.github/instructions/user-journey-contract.md` for the canonical contract. Highlights:

- Onboarding: 7‑day trial, plan selection, domain connect, wizard
- Settings: Profile/company, i18n, theme/accessibility, notifications, data sharing
- NeuroSEO: Crawl and semantic analysis, adoption KPIs, trust signals, AI visibility, rewrites
- Competitive: Link View, SERP View, Competitor Analysis
- Marketing: Dashboard, Social Presence, Email Campaigns, Lead Gen, Outreach
- Sales: Pipeline, Deals, forecasts, stalled‑deal tools
- Finance: Dashboard, Invoices; planned Revenue Analytics & Accounting
- Collaboration: Chat, Team pages; render gated EmptyState for planned content
- Review & Iterate: Exports and automation recipes

## 3. Feature Gating and Plans

Feature keys are defined in `FEATURE_KEYS.md`. Implementation rules:

- Wrap new pages and heavy components in `<FeatureGate feature="key" requiredTier="..."/>`.
- Use `canAccessFeature()` and `canAccessEntitlement()` server‑side.
- For planned features, render gated EmptyState with upgrade CTA; never infinite loaders.
- Export capabilities consolidated under `export_formats` (PDF baseline at starter, CSV at agency).

## 4. Data & Observability

- Logging: Use `getLogger` with component name; add orgId/userId, featureKey, duration_ms, success.
- Metrics: Record `crawl_time_ms`, `analysis_time_ms`, usage counters per engine; surface in `/api/health`.
- Quotas: Respect rate limits (global/team/user); return 429 on exceed.
- Provenance: Maintain auditability for AI outputs; structured error handling.

## 5. AI Provider Strategy

- Primary model: OpenAI; Secondary: Gemini; Fallback: deterministic/static to avoid user‑visible failures.
- Prompt versioning: Hash prompts; track model, tokens, cost in aiUsageDaily.
- Routing: Adaptive scoring by quality, success, latency, and cost.

## 6. Product Surfaces and Contracts

- NeuroSEO: Validated inputs (Zod), orchestrated runs, persisted summaries; adoption KPIs and gauges; quota‑aware.
- Competitive Intelligence: Read‑only insights; exports via `export_formats`.
- Marketing & Sales: CRUD + dashboards; no derived ratios stored; safe sequencing stubs.
- Finance: Deterministic dev metrics and mock transparency; invoice exports.
- Collaboration: RBAC; non‑implemented areas render gated EmptyState.

## 7. Quality Gates

- Lint: `npm run lint:flat:all`
- Types: `npm run typecheck`
- Tests: Unit (Mocha) + E2E (Playwright); targeted suites per area
- Build: `npm run build` (lint disabled during build; use quality scripts before PR)

## 8. Deployment

- Firebase Hosting + Functions. Use `npm run deploy:prod` (sets secrets → build:firebase → deploy).
- Keep environment variables out of code. Use `scripts/verify-env.ts` before deploying.

## 9. Roadmap Pointers

- Revenue analytics, accounting, security center, event backbone, marketplace/templates, embedded workspace, AI ops.
- See `AGENTS.md` phases for detailed execution steps.

## 10. Contribution Etiquette

- Keep diffs small (<200 LOC, <15 files); update `CHANGE_LOG.md` with rationale for behavior changes.
- Use FeatureGate and structured logging by default; validate inputs; add tests.
- Prefer minimal, verifiable increments; ensure `/api/health` remains informative.

Appendix

- Related docs: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*`, `FEATURE_KEYS.md`, `docs/TESTING_MCP_BROWSERS.md`.
