# RankPilot User‑Journey Contract

Authoritative reference for UX flow, feature gating, and success criteria across the product. Keep in sync with `FEATURE_KEYS.md` and navigation.

## Canonical flow

1. Homepage → Free trial

- Marketing page with NeuroSEO suite (NeuralCrawler, SemanticMap, TrustBlock, AI Visibility, RewriteGen).
- 7‑day trial signup (email/social), plan selection, onboarding wizard, domain connect.

2. Settings hub

- Profile/company details, language & i18n, theme/accessibility, notifications, data‑sharing.
- Team admins: roles/permissions and invites (Team Settings).

3. NeuroSEO Suite

- NeuralCrawler: crawl + render pages; list recent crawls with status and pages scanned.
- SemanticMap: topic clustering and adoption analysis; gauge for adoption progress.
- Adoption KPIs: aggregated adoption scores across crawler + semantic analyses.
- TrustBlock: E‑E‑A‑T evaluation (authors, citations, freshness).
- AI Visibility Engine: simulate AI‑powered search exposure; input query + audience.
- RewriteGen: heading/paragraph rewrites based on semantic density + tone.

4. Competitive Intelligence

- Link View Analyzer: backlink profile and DA distribution for any URL.
- SERP View: simulated SERP for a given keyword.
- Competitor Analysis: compare keyword rankings vs multiple competitors; highlight gaps/opportunities.

5. Marketing Automation & Content Generation

- Marketing Dashboard: email engagement, leads, social velocity; quick actions (Launch Campaign, Optimize Funnel, Generate Content).
- Social Presence: connect social accounts; unified metrics and recent campaigns.
- Email Campaigns: sequence templates, delivery/engagement metrics.
- Lead Generation: capture, enrichment, qualification.
- Outbound Outreach: multi‑step sequences, copy optimization, import leads, AI reply analysis.

6. Sales Pipeline & Deals

- Sales Dashboard: pipeline value, stage velocity, forecast accuracy; add opportunities, stage audits, AI forecasts.
- Deals: list by stage; reforecast and stalled‑deal analyses.
- Outreach workbench: launch sequences, optimize copy, import leads, analyze replies.

7. Finance & Billing

- Finance Dashboard: MRR trend, invoice aging; record invoices, update runway, generate reports.
- Invoices: billing history, download CSVs, receipts, aging digests.
- Revenue Analytics: ARR, churn, LTV; churn cohorts, anomaly detection.
- Accounting: P&L, balance sheet, reconciliation tasks.

8. Collaboration

- Team Chat: real‑time channels, search, voice/video options.
- Team Settings/Projects/Reports: manage members and collaborative assets. If unavailable, show a gated EmptyState instead of loading forever.

9. Review & Iterate

- Inspect dashboards; export CSV/JSON/PDF via `export_formats`.
- Automation recipes to repeat audits, rewrites, campaigns.

## Feature keys and tiers (mirror of active keys)

- neuroseo engines: `semantic_map`, `neural_crawler`, `trustblock`, `ai_visibility`, `rewrite_gen` → starter/agency depending on compute.
- competitive intelligence: `link_view` (starter), `competitor_analysis` (agency), `serp_view` (starter).
- marketing: `marketing_email_campaigns`, `marketing_lead_generation`, `marketing_social_presence`, `marketing_content_generation` → planned; render gated stubs with upgrade CTA.
- sales: `sales_pipeline` (starter), `sales_deals` (agency), `sales_outreach` (agency).
- finance: `finance_billing_overview`, `finance_invoices` (starter); `finance_revenue_analytics`, `finance_accounting` planned.
- collaboration: `team_management` (agency), `voice_agent` (agency).
- exports: `export_formats` (starter baseline; CSV at agency), `white_label` (agency branding).

Use `FeatureGate` on pages and heavy components, and `canAccessFeature/canAccessEntitlement` for server logic.

## Contracts and non‑functional requirements

- Validation: All API routes validate with Zod; fail closed with typed errors and logs.
- Observability: Use `getLogger`; include userId/orgId, featureKey, duration_ms, success; track `crawl_time_ms` and `analysis_time_ms` for engines. Surface in `/api/health`.
- Quotas & rate limiting: Respect global/team/user quotas; 429 on exceed; probe header supported.
- Exports: Route all export actions through `export_formats`; enforce tier logic and transparent fallback.
- Empty states: For planned features, render gated EmptyState with upgrade CTA; never infinite loaders.
- Accessibility/i18n: Use translation keys and ensure ARIA for gauges/visualizations.

## Acceptance criteria per surface

- Onboarding/Settings: Claims set; preferences saved; invites work with RBAC; billing portal access gated.
- NeuroSEO: Engines run with fallback; summaries persisted; adoption KPIs computed; quotas enforced.
- Competitive: Analyses load; exports respect gating; SERP and Link View simulate deterministically when offline.
- Marketing/Sales: CRUD validated; dashboards aggregate correctly; sequencing stubbed; no derived ratios stored.
- Finance: Metrics deterministic in dev; mock banners shown; invoices export works.
- Collaboration: Chat respects RBAC; team pages don’t hang; unimplemented areas show gated EmptyState.

## Test hooks

- Use `npm run quality:fast` before PR; ensure lint/typecheck green.
- Run targeted suites: neuroseo, finance metrics contract, marketing guard, role-based E2E.
- Keep diffs <200 LOC and <15 files where possible; update `CHANGE_LOG.md` for behavior changes.
