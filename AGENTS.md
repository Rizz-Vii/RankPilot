<!-- RankPilot Studio Agents Instructions This document defines the responsibilities, working guidelines, and contextual knowledge for an autonomous Codex CLI agent that will be responsible for completing all remaining work in the RankPilot Studio repository. It consolidates the project scope, backlog, coding conventions and execution phases into a single reference. The goal is for the agent to operate with minimal human intervention while respecting the architecture, security policies, and process constraints established by the team. -->
# RankPilot Studio – Agent Operating Handbook

1 Mission & Context

RankPilot Studio is an AI‑first SEO platform built on Next.js 15,
TypeScript 5.7, Firebase (Hosting, Firestore, Functions) and
integrated with various AI engines (NeuralCrawler™, SemanticMap™, AI
Visibility, TrustBlock™, RewriteGen™, etc.). It follows a 5‑tier
subscription model and employs strict role‑based access control with
feature gating. The system is serverless, designed for global
scalability and modern UX (PWA, edge caching, offline mode). The code
base is heavily linted and tested; type safety and code quality are
enforced via a four‑phase error‑resolution workflow: Detection →
Classification → Resolution → Verification
raw.githubusercontent.com
.

This handbook guides an autonomous Codex CLI agent tasked with
finishing the project. The agent must implement missing functionality
and clear all ESLint/TypeScript errors by writing production‑ready
code, updating documentation and tests, and preserving existing
behaviour. The agent operates within resource and safety constraints:

Small, testable increments: Each commit must modify ≤200 lines and
≤15 files to minimise risk and ease review (derived from the
brain governance limits
raw.githubusercontent.com
).

Audit‑ready: Use provenance enforcement and update the
CHANGE_LOG whenever behaviour changes. Never commit secrets or
sensitive data.

Follow error‑resolution protocol: When fixing errors or
implementing features, use the established four‑phase workflow:
detect issues with npm run typecheck & npm run lint, classify the
errors, apply context‑aware fixes (e.g. add missing types, remove
unused variables, or implement incomplete logic), then verify with
tests and builds
raw.githubusercontent.com
.

2 Agent Roles & Deliverables

The Codex CLI agent must complete outstanding tasks across all phases
defined in the project roadmap. Tasks may span frontend pages,
backend API routes, automation pipelines, data migrations, AI
integration and documentation. Below is a high‑level summary of
deliverables the agent is expected to tackle:

Phase 1 (P0 – Hardening & Gating)

Gating alignment: Ensure all pages and subtools are wrapped in
FeatureGate with correct entitlement keys. Implement or
correct keys if missing.

Navigation & tests: Maintain and update nav gating matrix tests
for each tier. Ensure alias keys are removed and the alias
enforcement test passes.

Finance mock transparency: Display banners when finance data is
served from mocks; enforce environment flags for mock mode.

Documentation: Update change log for gating changes.

Phase 2 (P1 – Foundational Data & Metrics)

Revenue analytics: Implement metrics (MRR, ARR, churn, LTV)
in memory and expose via /finance/revenue. Unit‑test formulas.

AI usage & cost: Instrument ai-memory-manager to count
tokens (input/output) and cost; persist in Firestore.

Subtool telemetry: Add counters (e.g. semantic_map_runs) to
track usage of each AI engine.

Orchestrator refactor: Replace the SemanticMap simulate stub with
calls to the orchestrator with deterministic fallback.

Tests and KPIs: Extend /api/health to show AI metrics. Ensure
new fields are covered by tests.

Phase 3 (P2 – Audit & Crawler Enhancement)

Crawler integration: Integrate the Firecrawl client to perform
server‑side crawling with queueing, depth limits and robots.txt
respect. Add environment gating and fallback to deterministic mode.

Audit schemas: Introduce Zod schemas for AI JSON outputs;
strictly parse and fall back gracefully on invalid responses.

Quotas: Implement shared quota counters (team/user/global) for
crawling; return 429 errors if limits exceeded.

Concurrency tests: Add a 20‑parallel stress test and ensure no
memory leaks. Record crawl_time_ms and analysis_time_ms for
observability.

Phase 4 (P2–P3 – Data Minimisation & Observability)

Data minimisation migration: Aggregate large AI result docs into
summary documents; write one‑time backfill script; purge or archive
legacy docs.

Observability dashboard: Build an admin UI summarising KPIs
(latencies, cache hit ratio, rate limits, AI cost, provenance
coverage). Implement MA7 and exponential smoothing; persist daily
snapshots.

Daily KPI snapshot CF: Create Cloud Function to compute and
persist daily aggregates with retention policy.

Alias retirement: Remove deprecated feature keys and clean up
alias mapping logic.

Phase 5 (P3 – Marketing & Sales Engines)

Marketing campaigns: Implement CRUD operations for campaigns in
Firestore and build a dashboard; enforce validation and avoid
storing derived ratios.

Sales pipeline enhancements: Allow stage customisation,
probability weighting and forecasting charts.

Outreach sequencing skeleton: Define data model and create a
scheduler stub with tests.

Phase 6 (P3 – Security & Compliance)

Security centre: Rename advanced_security module and create a
minimal UI showing role activity, rate limit charts and anomaly list.

Audit log service: Create middleware to write audit logs
(auditLogs collection) on critical mutations (actor, action,
target, timestamp, metadata).

SSO/SAML skeleton: Stub configuration for SSO/SAML integration;
gate behind feature key.

PII scan & retention: Write a script to scan common fields for
PII and purge old analyses beyond retention policy.

Phase 7 (P2–P3 – Event Backbone & Orchestration)

Canonical event schema & publisher: Implement
/src/lib/events/publishEvent.ts to write immutable events under
/orgs/{orgId}/events and document the schema. Update Firestore
security rules to allow create only.

Event registry & lint: Create central enum of event types and a
pre‑commit lint to disallow unknown event types.

Pub/Sub & BigQuery mirror: Build Cloud Function to stream events
to Pub/Sub and BigQuery for analytics and causal modelling.

Event explorer page: Create an admin page to filter events by
type/source/date and export CSV. Emit lifecycle events for
automations.

Simulation sandbox: Design API contract for historical replay;
implement in later phases.

Phase 8 (P3 – Revenue Truth Analytics)

Data join service: Correlate events with deals, invoices,
campaigns to explain revenue changes.

Attribution explainer: Generate lists of factors (with
percentages) contributing to revenue fluctuations; no persistence.

Deal probability enhancer: Combine stage, finance risk and
engagement signals to adjust probability of closing deals.

Anomaly detector: Batch function to detect metric deviations (z‑
score or EWM) and emit analytics.anomaly events.

Revenue truth UI: Build a drawer panel in the finance page
summarising causality narrative and anomalies.

Phase 9 (P3+ – Marketplace & Templates)

Template entity & path: Define a global templates collection
(kind, version, checksum, author, usageCount) and create util to
access it.

Validation pipeline: Implement dry‑run executor for templates,
simulating automation steps without side effects.

Publishing workflow: Add states (draft → review → published →
deprecated) and transitions with tests.

Revenue share ledger: Persist monthly template earnings per org;
no payout logic yet.

Discovery UI: Build marketplace listing page with filters by kind
and popularity; show metrics.

Usage telemetry: Emit template.applied and
template.failed events; increment usageCount.

Phase 10 (P3+ – Embedded Workspace & Extension)

Side panel manifest: Document the postMessage API for a
browser extension or embedded panel (auth token request, command
invocation, event stream subscribe).

Scoped token endpoint: Create /api/embedded/token issuing
short‑lived JWTs (orgId, scopes, exp) to embed front‑end clients.

Presence channel: Implement join/leave event feed for embedded
workspace using Firestore or in‑memory channel.

Quick action palette: Define command taxonomy and implement a
minimal invocation endpoint.

Embed metrics: Track usage (active panels, commands executed)
and expose via health KPIs.

Phase 11 (Continuous – AI Ops & Provider Optimisation)

Provider registry & health: Record latency, success rate and
cost per AI provider; persist snapshots.

Adaptive routing: Implement a scoring function to pick a
provider per call (qualityWeight × successRate – costFactor × λ +
latencyPenalty) and log decisions.

Cost ledger persistence: Enrich aiUsageDaily with per‑call
cost and model information.

Prompt versioning: Register and hash prompts; write regression
tests to detect drift.

SLO dashboard widgets: Add panels for latency and error SLOs in
observability dashboard.

Alerting: Emit ai.provider.anomaly events when error spikes
exceed thresholds.

Phase 12 (Continuous – Documentation & Dev Productivity)

Architecture delta doc: Update system architecture docs when
implementing Business OS Graph, Orchestration Layer and other new
modules.

Event schema reference: Document source/type/field expectations
for events.

PR template upgrade: Add risk checklist to PR template; ensure
every behaviour change includes rationale.

Aider context index generator: Build job to produce
/generated/dev/context-index.json for smarter context injection.

CHANGE_LOG enforcement: Implement pre‑commit/push hook to
reject missing rationale for behaviour changes.

Onboarding validation script: Write script to check env vars,
Firestore indexes and feature key sanity.

3 Coding Guidelines & Patterns

The agent must follow the project’s coding standards and patterns. Key
guidelines include:

Error‑resolution workflow: Use the four‑phase protocol for
TypeScript/ESLint errors—detect, classify, resolve, verify
raw.githubusercontent.com
.
Resolve errors by completing missing implementations, adding
types or removing unused variables. Avoid superficial fixes; always
maintain or enhance functionality. Suggested techniques include
completing missing types, removing or renaming invalid props,
adding null‑safety checks and updating deprecated APIs
raw.githubusercontent.com
.

Small diffs: Each commit should modify no more than ~450 lines
(soft limit) and 15 files
raw.githubusercontent.com
. When a task spans many
files, break it into multiple PRs. Each PR must compile, lint and
run tests successfully.

Type safety: Avoid any types. Prefer existing domain types
when available. If none exist, define minimal interfaces near the
code and mark with // TODO: refine type. Use unknown and
runtime type guards where necessary.

Promise handling: Always await or handle Promises. If a
function intentionally ignores a promise, prefix with void and
catch errors (e.g. void asyncFn().catch(logger.error)).

Feature gating: Wrap new pages or API routes in FeatureGate
with appropriate keys. Use canAccessFeature and
canAccessEntitlement helpers to guard backend logic.

Design tokens: Replace raw hex colours with tokens imported
from src/constants/design-tokens.ts. Add tokens if necessary.

Environment flags: Keep development/test flags out of
production logic; respect RANKPILOT_AGENTS_ENABLED and other
toggles. Add new flags to .env.example and document them.

Documentation: Update relevant .md files and CHANGE_LOG on
every behaviour change. Cross‑reference sources and include
rationale.

4 Workflow & Tooling

To operate autonomously, the agent should use these commands:

Detection:

npm run typecheck – compile TypeScript without emitting.

npm run lint or npm run lint:flat – run ESLint.

npm run lint:report:json – output ESLint results to JSON for
analysis.

Build & Tests:

npm run build – production build (with lint disabled for dev
errors).

npm run test – run Playwright tests.

npm run test:unit:types – run Mocha unit tests for TypeScript.

Use additional test commands (test:performance, test:neuroseo
etc.) depending on the area being modified.

Codemods & Cleanup:

npm run codemod:unused-vars – remove unused variables via script.

npm run codemod:any-simple – normalise simple any types.

Delegation queue (optional): Use
npm run delegate:enqueue and npm run delegate:process for
mechanical tasks within the guardrails; set AIDER_AUTORUN=1 to
process tasks automatically.

Telemetry & Observability: For new features, integrate metrics
into /api/health and the observability dashboard. Use existing
helpers to record latencies, usage counts, cache hit ratio and
provenance coverage.

Documentation & Enforcement: Update docs in /docs (e.g.
PRD, Execution Plan, Scaling Strategy) and maintain the
comprehensive change log. Ensure the enforcement hooks for
CHANGE_LOG and event schema run via pre‑commit.

5 Acceptance Criteria

For each phase and task, acceptance is defined by:

Functional completeness: The feature works as per the PRD. API
contracts and UI flows are stable; no runtime errors.

Lint & type clean: Running npm run typecheck && npm run lint
yields zero errors or warnings related to the modified code.

Tests pass: All relevant tests—unit, integration, E2E—pass.

Performance: New code does not introduce significant latency
regressions; Core Web Vitals remain acceptable.

Security & compliance: All data access follows Firestore rules
and RBAC; secrets remain secure. For AI features, provenance
metadata is present and audit logs are written.

Documentation updated: CHANGE_LOG and docs reflect the change.
New environment variables, API routes or schemas are documented.

6 Working Tips

Study the code: Read existing modules (e.g. src/lib/ai,
src/app/api) to understand patterns. Reuse helper functions.

Search within the repo: Use grep (ripgrep) to find types,
functions or constants relevant to your task.

Focus on high‑impact files: Prioritise business logic and
production code before test specs. Where possible, clear test
warnings using simple renames or cleanup.

Incremental improvements: When implementing complex
functionality (e.g. data joins, orchestrators), break into small
functions, add unit tests and integrate gradually.

Leave TODO comments: When uncertain, leave // TODO: notes for
humans to refine. Do not guess critical business logic or data
handling.

7 Summary

This agents.md defines the role of an autonomous Codex CLI agent for
RankPilot Studio. It summarises the project’s phases, tasks,
constraints and coding guidelines, providing enough context to operate
independently. The agent should respect error‑resolution protocols

raw.githubusercontent.com
, follow guardrails on diff size

raw.githubusercontent.com
, implement missing functionality using
project patterns
raw.githubusercontent.com
, run tests and
update documentation. By working iteratively across the phases
outlined above, the agent can help deliver a robust, scalable and
secure AI‑first SEO platform.
