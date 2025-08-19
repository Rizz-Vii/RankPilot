# Metaprompt Optimization Template

Goal: Improve an underperforming prompt with minimal edits.

Steps:

1. Restate the current prompt objective.
2. Identify contradictions / vagueness / redundancy.
3. Suggest additive clarifications (<=5) ranked by impact.
4. Suggest removals (<=5) that reduce ambiguity.
5. Provide an Updated Prompt (diff-style: lines prefixed with `+` additions, `-` removals, unchanged omitted unless anchor context needed).
6. Provide a risk note (what new failure modes may appear).

Output Sections:

- Objective
- Issues
- Additions
- Removals
- Updated Prompt Diff
- Risks
