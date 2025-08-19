# Planning Session Template

Context Summary:

- Repo: RankPilot Studio (Next.js App Router, TS)
- Domains: neuroseo, monitoring, finance (gated), scheduler, brain automation.

Steps:

1. Restate task in one sentence.
2. Extract checklist of explicit + inferred requirements.
3. Identify impacted files (verify with search before edits).
4. Outline solution (data flows, contracts, edge cases):
   - Edge cases: empty data, network fail, permission denied, large payload, timeouts.
5. Define validation plan: which scripts/tests to run.
6. Execute in small batches (3–5 edits) with checkpoints.
7. Summarize deltas + coverage.

Decision Heuristics:

- Reuse existing helpers before new util.
- If new helper needed, single-responsibility & documented.
- Avoid broad refactors in feature PRs.
- Add/adjust smallest tests to cover new behavior.

Exit Criteria:

- All requirements addressed.
- Typecheck + lint + targeted tests pass.
- No unrelated diffs.
