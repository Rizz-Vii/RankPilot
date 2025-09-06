# Agent Playbooks

Concise, role‑oriented guidance for implementing/maintaining surfaces aligned to the user‑journey. Use with the User‑Journey Contract and `AGENTS.md`.

## Onboarding & Settings

- Inputs/Outputs: Auth session with custom claims; org‑scoped settings in Firestore.
- Keys: `team_management`, `billing_portal_access`.
- Actions:
  - Wizard persists org + domain; language/theme saved to profile.
  - Team invites CRUD with role checks.
  - Render i18n picker; persist locale; verify RTL where needed.
- Tests: `test:e2e:auth`, `test:team-*`.

## NeuroSEO Engines

- Inputs: URL(s), competitors, keywords, analysis type.
- Flow: Validate (Zod) → Orchestrator call (OpenAI→Gemini→static fallback) → Persist results + summaries → Record timings + usage.
- Quotas: team/user/global; respect `RL_API_MAX_REQUESTS` and per‑engine caps.
- Observability: `crawl_time_ms`, `analysis_time_ms`, cache hits; update `/api/health`.
- Tests: `test:unit:crawler`, `test:neuroseo-suite*`, `test:neuroseo-rate-limit`.

## Competitive Intelligence

- Tools: Link View Analyzer (`link_view`), SERP View (`serp_view`), Competitor Analysis (`competitor_analysis`).
- Contract: Read‑only; no PII; exports via `export_formats`.
- Tests: Features E2E and API contracts.

## Marketing Automation

- Surfaces: Dashboard KPIs, Social Presence, Email Campaigns, Lead Gen, Outbound Outreach.
- Data: CRUD with validation; no derived ratios persisted; schedule tasks behind gates.
- Tests: `test:marketing-guard`, critical dashboards.

## Sales Pipeline

- Features: Pipeline metrics, deals board, forecasts, stalled/reforecast tools.
- Enhancements: Stage customization; probability weighting.
- Tests: Extend unit tests for forecasting math; E2E for basic flows.

## Finance & Billing

- Pages: Finance dashboard, invoices; Revenue Analytics and Accounting (planned).
- Rules: Mock transparency banner in dev; deterministic metrics; exports gated.
- Tests: `test:unit:finance-metrics-contract`, provenance wrappers.

## Collaboration

- Chat: Channels and search; ensure auth gating and presence (stub allowed).
- Team pages: Never hang; gated EmptyState with upgrade CTA.

## Cross‑cutting

- FeatureGate: Wrap pages and heavy components.
- Logging: `getLogger(component)`; include orgId/userId, featureKey, duration_ms.
- Validation: Zod; fail with typed error body; include error code.
- Security: Firestore rules; access helpers; avoid storing secrets.
- Exports: Route to `export_formats` gate; honor CSV at agency.
- Metrics: Emit usage counters per engine and action.
- Tests: Prefer minimal, fast unit tests + targeted E2E.
