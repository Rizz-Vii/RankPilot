# RankPilot — Single‑Shot Copilot Master Execution Prompt

Use this file as the one prompt to finish, harden, and validate the RankPilot codebase in this VS Code + GitHub environment. Paste it into Copilot Chat (or a compatible agent) and let it run non‑interactively. Keep changes atomic and verified by the repo’s tasks.

## Scope and objectives

- Unify and harden billing (Stripe) using a single source of truth for tiers/price IDs
- Make Stripe webhooks idempotent and add SOC2‑friendly evidence logs
- Lock down Firestore: multi‑tenant rules + unit tests + indexes
- Stabilize AI client types and SSR/SSE/hydration paths; add robust error boundaries
- Enforce a11y/performance budgets (axe + Lighthouse) and fix regressions
- Add minimal “LLM visibility” gating + analytics hooks (feature‑flagged)
- Pass quality gates: typecheck, lint, tests, fast quality suite; no new TODOs/ts‑ignore without justification

## Environment contract

- Editor: VS Code with tasks configured in `.vscode/tasks.json`
- CI: GitHub Actions workflows in `.github/workflows/*` must stay green
- Commands: Prefer existing npm scripts; use VS Code tasks when available
- Branching: Create a feature branch off current branch and open a PR
- Secrets: Do not print secrets; read Stripe/Google/Firebase config from env/CI only

## Success criteria (must all be true)

- Build/typecheck/lint/tests all pass locally and in CI
- No unused/duplicated Stripe plan config (single tier source of truth)
- Webhooks are idempotent; evidence logs are written for key lifecycle events
- Firestore rules deny‑by‑default, include tenant scoping; rules unit tests cover happy + negative paths
- A11y checks pass (axe) and Lighthouse meets performance budgets
- Minimal docs + runbook notes added in repo for future ops

## Known repo anchors

- Workflows: `.github/workflows/*.yml` (validation gates, provenance, deploy, performance)
- Copilot/Instructions: `.github/copilot-instructions.md`, `.github/instructions/*`
- VS Code tasks: `.vscode/tasks.json` (typecheck, lint, tests, quality)
- Stripe core:
  - `src/lib/stripe/subscription-management.ts` (current real price IDs + lifecycle)
  - `src/lib/stripe.ts` (legacy plan map with placeholders — to be consolidated)
  - `functions/src/stripe-webhook.ts` and/or `functions/src/stripe.ts` (webhook/portal)
- Terms UI example: `src/app/(public)/terms/TermsClient.tsx`

## Non‑interactive execution plan (atomic steps)

Follow in order; commit after each major step with meaningful messages.

1. Create a single Stripe tier config source

- Add a new module `src/lib/stripe/tiers.ts` exporting a frozen config object (RANKPILOT_TIERS) containing all products/prices used in `subscription-management.ts`.
- Replace/route any remaining tier/plan logic to import from this module.
- Remove/flag the legacy `STRIPE_PLANS` in `src/lib/stripe.ts`; keep `getStripe()` functionality intact.
- Add lightweight Zod schema for the tier config to validate env IDs at runtime (log warn, fail only if required IDs missing).

2. Webhook idempotency + evidence logs

- In `functions/src/stripe-webhook.ts` (or equivalent):
  - Implement idempotency by recording handled event IDs to Firestore (collection `stripe_event_receipts`), with TTL if desired.
  - Short‑circuit duplicates safely.
  - Write an “evidence log” document for significant state transitions: checkout completed, subscription created/updated/canceled, invoice.payment_failed, invoice.payment_succeeded.
  - Include key metadata: customer/user id, subscription id, previous/new status, timestamp, request id; exclude PII.
- Add unit tests/mocks for duplicate suppression and evidence writes.

3. Firestore security rules and tests

- Author multi‑tenant, deny‑by‑default rules with clear allow blocks that require tenant match and role checks.
- Provide indexes needed (avoid fan‑out/slow composite queries); keep in `firestore.indexes.json`.
- Add rules unit tests (Firestore emulator) covering: owner read/write, non‑tenant deny, role‑based admin allow, invalid queries denied.
- Ensure rules eval cost stays within limits; prefer pagination and restricted where clauses.

4. AI client typing and SSR/SSE hardening

- Fix any `aiClient` type gaps by introducing strict interfaces and guards; prefer discriminated unions for streamed vs buffered responses.
- Wrap SSE/streaming in an adapter that:
  - Detects server vs browser
  - Backs off/retries transient failures
  - Provides an abort API and timeout
- Add error boundaries and loading skeletons for pages using streaming; ensure reduced‑motion preferences respected.

5. A11y and performance budgets

- Add/ensure an axe integration to run against key pages/components in CI (fail on serious/critical issues).
- Configure Lighthouse CI thresholds to meet Core Web Vitals targets; lazy‑load heavy modules; optimize images.
- Polish `TermsClient.tsx` with final aria labels where missing.

6. LLM visibility + feature flag

- Add a minimal `FeatureGate` utility and a boolean flag `features.llmVisibility`.
- When enabled, capture anonymized usage counters for LLM interactions (count, latency buckets). No content/body stored.
- Wire to a simple analytics sink (console/dev; stub provider in prod with noop unless env enables it).

7. Docs and runbooks

- Update `.github/copilot-instructions.md` with a short note pointing to this master prompt.
- Add a new `docs/ops/stripe-webhook-runbook.md` summarizing idempotency and evidence locations.

## Quality gates (local)

Use VS Code tasks to validate frequently.

- Typecheck
  - Task: “typecheck” or
  - Optional: `npm run typecheck`
- Lint (no new errors)
  - Task: “lint” (and “lint:fix” when safe)
- Unit tests
  - Task: “tests:unit-fast”
- Fast quality suite
  - Task: “quality:fast”

All four must pass before moving to the next step.

## Git flow

- Create branch: `feat/hardening-stripe-rules-a11y`
- Commit granularity:
  1. chore(stripe): add unified tiers module + replace legacy plan map
  2. feat(webhook): idempotency + evidence logs + tests
  3. feat(firestore): tenant rules + rules tests + indexes
  4. feat(ai): typed client + SSE safeguards + boundaries
  5. feat(a11y+perf): axe + Lighthouse budgets + fixes
  6. feat(flags): LLM visibility gate + analytics stub
  7. docs(ops): webhook runbook; ref Copilot master prompt
- Open PR; ensure all GitHub workflows pass. Link to this prompt in PR body.

## Guardrails

- No secrets in code or logs; use env/CI inputs
- Avoid wide dependency upgrades unless required by fixes
- Keep public APIs stable or document breaking changes
- Add minimal but meaningful tests for any new public function

## Copilot instruction (paste below)

You are GitHub Copilot operating in VS Code on the RankPilot repo. Work non‑interactively. Apply the plan above end‑to‑end with atomic commits and passing checks.

Requirements:

- Use `src/lib/stripe/tiers.ts` as a single source of truth for Stripe tiers/prices and remove legacy duplication in `src/lib/stripe.ts` while keeping `getStripe()` untouched.
- Implement idempotent Stripe webhooks with Firestore receipts and SOC2‑style evidence logs (no PII). Add tests.
- Implement strict Firestore rules for multi‑tenant isolation with rules unit tests and required indexes.
- Fix AI client typing and stabilize SSE/hydration using an adapter with abort/retry/timeouts; add error boundaries and skeletons.
- Enforce axe + Lighthouse budgets; fix issues surfaced. Polish `TermsClient.tsx` aria labels.
- Add a minimal feature flag for `llmVisibility` and track anonymized counters/latency only when enabled.
- Keep all quality gates green locally and in CI; do not merge if any workflow fails.

Constraints:

- Do not expose secrets; only read from env/config.
- Keep commits small and descriptive. Add/adjust tests with behavior changes.
- Prefer existing npm scripts and VS Code tasks.

Deliverables:

- Code changes per steps, new modules where noted
- Updated tests and passing runs
- Updated docs: `.github/copilot-instructions.md` link to this file; `docs/ops/stripe-webhook-runbook.md`
- PR opened with a checklist mapping each requirement to evidence (files, tests, CI screenshots/links)

Validation:

- Run (locally): typecheck, lint, tests:unit-fast, quality:fast. Ensure all pass
- Ensure `.github/workflows/*` run green on PR

Stop only when: All requirements are implemented, tests pass, and CI is green. If blocked by missing secrets, stub securely and document next steps.
