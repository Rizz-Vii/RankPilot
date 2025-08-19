---
mode: edit
---

Objective:
Fix ESLint issues (no-explicit-any, no-unused-vars, floating promises, require() imports, raw hex color rule, TSConfig/ESLint parsing) in the codebase to ensure clean builds and maintainability.
eliminate all remaining ESLint/TypeScript errors and warnings by implementing or wiring the intended functionality—not by superficially silencing them.
• Constraints: respect the 5‑tier subscription model, RBAC, feature gates, provenance middleware, and design tokens; avoid touching Firestore rules, secrets, or deployment configs. Limit each commit to ≤ 200 added LOC and ≤ 15 files changed; use multiple passes if needed.

WORKFLOW:

1. Enumerate current problems: run `npm run typecheck`, `npm run lint` (flat), and `npm run build` to generate a list of all errors/warnings.
2. Categorize issues (e.g. “any” types, unused vars, missing implementations, Promise misuse, raw hex colors, tsconfig inclusion). Prioritize runtime modules over tests.
3. For each category:
   a. **Implement missing logic** using existing patterns and docs: if a function stub throws “TODO”, implement the expected behavior by reading nearby code, comments, or docs.
   b. **Replace `any`** with concrete types: search the repo for existing types (e.g. `CrawlResult`, `StreamRecord`, `APMSpan`). If none, create a minimal interface near usage with only used fields and add a `// TODO refine type` comment.
   c. **Use/unset variables**: if a variable is unused but logically necessary, use it in telemetry/logging/return metadata. Otherwise remove it or rename to `_`.
   d. **Fix async promise issues**: always `await` promises or mark with `void ... .catch(e => logger.error(...))`.
   e. **Replace raw hex colors** with design tokens imported from `src/constants/design-tokens.ts`, or add tokens and reference them.
   f. **Resolve TSConfig/ESLint parser errors** by expanding `tsconfig.json` `include` to cover files, or creating an auxiliary `tsconfig.eslint.json`. Add `// eslint-disable-next-line` only if absolutely necessary and add a TODO.
4. After each batch of changes: run `npm run typecheck`, `npm run lint`, and relevant tests (`npm run test:unit`, `npm run test:performance`, etc.). If any new errors emerge, adjust fixes or revert that file.
5. Update docs (CHANGE_LOG, README or relevant md) when behavior changes; add feature gating if new routes or pages are created.
6. Commit each batch with message `chore(errors): fix eslint/ts issues (batch n)` and push branch `fix/cleanup-all-errors-batch-n`. Provide a summary of what categories were addressed and note any TODOs requiring manual review.
7. Repeat until `npm run typecheck && npm run lint && npm run build` pass with zero errors/warnings. End by running the full test suite and documenting any unresolved areas.
