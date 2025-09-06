# Copilot Delta Guide (RankPilot)

Purpose: Brief, high‑signal instructions for AI coding assistants working in this repo.

- Framework: Next.js 15 (App Router), TypeScript 5.7+, Firebase (Hosting, Firestore, Functions)
- Patterns: FeatureGate on new surfaces, structured logging, Zod validation, AI orchestrator with provider fallback
- Keys: See `FEATURE_KEYS.md`. Export behavior consolidated under `export_formats`.
- User Journey: Align work with `.github/instructions/user-journey-contract.md`.

Checklist before opening a PR:

1) FeatureGate added to new pages/routes; server logic guarded with `canAccessFeature`.
2) Inputs validated (Zod); typed responses; errors logged with `getLogger`.
3) Metrics emitted (duration_ms, success, usage counters); update `/api/health` when adding new metrics.
4) Tests updated (unit or targeted E2E); run `npm run quality:fast`.
5) Diffs small; docs updated (`CHANGE_LOG.md`, related md files).

When in doubt, prefer minimal, verifiable changes and improve coverage.
