# Refactor Guide Prompt

Goal: Safely refactor a focused area without altering behavior.

Checklist:

1. Capture current behavior (tests / reading code) before change.
2. Identify pain points: duplication, naming, long functions, implicit contracts.
3. Propose minimal refactor steps (ordered) each leaving system in working state.
4. Add/extend tests before risky transformations.
5. Apply changes incrementally; re-run typecheck & tests after each logical group.
6. Verify no public API signature changes unless explicitly approved.
7. Provide final diff summary: LOC touched, new utilities, removed dead code.

Constraints:

- No sweeping formatting or import reorders.
- Keep finance, auth, Firestore schema logic untouched unless task explicitly includes.
- Maintain scheduler cron limits & provenance tagging.

Edge Cases To Reconsider:

- Optional env vars / missing config.
- Large dataset performance.
- Unexpected null/undefined from external APIs.

Output Should Include:

- Rationale per change group.
- Risk assessment + mitigation.
