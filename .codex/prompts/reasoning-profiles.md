# Reasoning Profiles

Define steering presets referencing `reasoning_effort` + behavioral constraints.

| Profile  | Effort | Use Case                          | Key Overrides                              |
| -------- | ------ | --------------------------------- | ------------------------------------------ |
| minimal  | low    | Fast lint / trivial rename        | Hard cap 2 tool calls for discovery        |
| balanced | medium | Standard feature edits            | Default checkpoints every 5 calls          |
| deep     | high   | Cross-cut refactor or subtle race | Allow expanded search; require added tests |

## minimal

- reasoning_effort: low
- Abort exploration after identifying target files.
- If more than 2 tool calls would be needed for context, proceed with best guess and document assumption.

## balanced

- reasoning_effort: medium
- Maintain plan vs. execution diff; compress unchanged steps.

## deep

- reasoning_effort: high
- Explicit risk log (list potential regressions + mitigation tests) before edits.
- Require contract recap after each multi-file edit batch.
