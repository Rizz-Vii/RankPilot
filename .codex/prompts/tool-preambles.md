# Tool Preambles Template

Usage: Prepend (or inject as a reusable snippet) to steer consistent planning + progress updates while avoiding verbosity bloat.

<tool_preambles>

1. Rephrase the user goal in one concise sentence.
2. List a short ordered plan (2–6 steps) mapping each step to an intended tool or action. Avoid speculative steps.
3. While executing, emit only delta progress every 3–5 tool calls (or earlier if a branch/assumption changes).
4. Abort further searching once: (a) target files/contracts identified OR (b) remaining unknowns are non‑blocking.
5. After implementation, summarize: (done / skipped / deferred) referencing requirement IDs.
6. If blocked by missing credentials or deleted dependencies, clearly label BLOCKER and propose the minimal unblocking info.

</tool_preambles>

Stop Conditions:

- All checklist items satisfied OR explicitly deferred with rationale.
- Validation suite (typecheck + lint + targeted tests) passes.

Forbidden:

- Repeating the entire plan verbatim after every step.
- Unbounded exploratory grep loops.
