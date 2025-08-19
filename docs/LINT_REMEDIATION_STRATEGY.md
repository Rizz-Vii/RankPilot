# Lint Remediation Strategy (Aug 2025)

Objective: Reduce 1100+ ESLint errors and 1000+ warnings incrementally without destabilizing the codebase. Focus on high-signal rule families first, batch low‑risk mechanical fixes, and convert noisy patterns into tracked backlog tasks.

## Prioritized Rule Families (Phase 1)

1. Unused variables (`@typescript-eslint/no-unused-vars`)
   - Action: Prefix with `_` if semantically intentional; otherwise remove.
   - Rationale: Reduces noise and clarifies dead code.
2. Explicit `any` hotspots (`@typescript-eslint/no-explicit-any` in core domains: `src/lib/ai`, `src/lib/automation`, `src/lib/neuroseo`)
   - Action: Replace locally with `unknown` + narrow or define lightweight interfaces (no deep model refactors yet).
   - Rationale: Improves type safety where runtime logic is complex.
3. Floating promises (`@typescript-eslint/no-floating-promises`)
   - Action: Add `await`, handle `.catch`, or prefix with `void` when intentionally fire-and-forget.
4. Misused promises (`@typescript-eslint/no-misused-promises`)
   - Action: Wrap async callbacks with void async IIFE or refactor to explicit promise handling.
5. Consistent type imports violations (test suite `import()` annotations)
   - Action: Replace inline type import calls with `import type { ... }` top-level declarations.

## Phase 2 (After Error Count < 400)

6. Large AI orchestration files: introduce focused type aliases for repeated `any` shapes (response payloads, aggregation nodes).
7. Performance & streaming modules: ensure promise handling and error surfaces typed to avoid silent failures.

## Phase 3 (Stabilization)

8. Remaining `any` in tests → allowlist via baseline if narrowing offers no real value.
9. React hook dependency warnings → targeted review (skip mass autofix to avoid behavioral drift).
10. Exhaustive optional chaining / nullish coalescing where implicit assumptions still appear.

## Backlog Tracking

Create delegation tasks per rule family & directory:

```
LINT-FIX-ai-adapter-no-explicit-any
LINT-FIX-neuroseo-floating-promises
```

Cap each task to ≤160 LOC. Use queue lineage tags (e.g., `LINT-P1`) for progress metrics.

## Metrics & Reporting

Run after each batch:

```
npm run lint:report:json
node scripts/metrics/update-metrics-artifacts.mjs
```

Append snapshot deltas (errors removed) into `artifacts/brain/memory.jsonl` via a `lint-progress` memory event (future enhancement).

## Guardrails

- Do not broad-format unrelated code.
- Avoid changing public API surfaces while narrowing types—add adapter layer if needed.
- If a narrowing triggers >10 cascading errors, revert and defer to Phase 2.

## Exit Criteria

Phase 1 complete when: (a) unused-var errors near zero, (b) explicit-any errors in core domains reduced by ≥60%, (c) floating/misused promise errors <15.
Full remediation considered stable when total ESLint error count <50 and warnings <300, with remaining items documented.

---

Maintainer: Brain automation pipeline. Update timestamp when phases advance.
