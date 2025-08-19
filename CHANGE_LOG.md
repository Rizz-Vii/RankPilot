# 18-08-20025

docs/docsData.md
docs/postAug5.md
docs/preAug5.md
docs/archey
docs/archey/ADDENDUM_2025-08-12.md

- feat(types): introduce shared UnknownObject + visualization & NeuroSEO domain types
- chore(lint): add any baseline & regression guard scripts
- test(table): add JSON/CSV parity spec

## 19-08-2025

docs/.github additions (agent orchestration & execution guidance)

- docs: add rankPilotDeveloper.chatmode.md (focused multi-agent dev/refactor/review loop)
- docs: add phase instruction bundles (Phase 1 hardening completion, Phase 2 foundational expansion, Phase 3 enhancement & scaling)
- docs: add autonomous batch prompt templates per phase (batch planning & iterative execution scaffolds)
- docs: add agent-execution-strategy master instructions (context + safety + performance guardrails)
- docs: add PROJECT_EXECUTION_PLAN.md (measurable roadmap with acceptance criteria & diff heuristics)

Rollback plan: Remove the newly added `*.chatmode.md`, `*.prompt.md`, `*.instructions.md`, and `PROJECT_EXECUTION_PLAN.md` files; revert this CHANGE_LOG entry. No runtime or schema impact.

### 19-08-2025 (Governance Hardening – Phase 1 Increment)

- PROV-01: Enhanced provenance wrapper now records injection counter (`provenanceInjected`).
- MKT-01: Introduced central forbidden derived field guard (`src/lib/guards/forbidden-derived-fields.ts`) covering `roi, ctr, conversion, winRate, ltv` with metric (`forbiddenFieldStrips`).
- MKT-01b: Expanded `scripts/scan-forbidden-fields.ts` to full forbidden list; ignores guard definition files to prevent false positives.
- Updated `marketing-write-guard.ts` to delegate stripping to central guard for single source of truth.
- Added ad hoc guard validation script `scripts/test-forbidden-field-guard.ts`.
- Added provenance wrapper injection test file (pending npm script alias) to assert counter increment.

Rollback: Remove guard file, revert `marketing-write-guard.ts` changes, restore original forbidden list in `scan-forbidden-fields.ts`, and remove governance counter usages from `unified-metrics.ts` & provenance middleware. Safe as counters are additive and not schema-bound.
