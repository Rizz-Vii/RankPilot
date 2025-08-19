# Prompt Style Guide

Objectives:

- Consistency, traceability, minimal ambiguity.

Structure:

1. Title heading summarizing intent.
2. Short context block (bullets, not prose walls).
3. Ordered steps / checklist for process tasks.
4. Constraints section (must / must not).
5. Output specification (format expectations; map each requirement -> output element).
6. Coverage line indicating completion state.

Patterns:

- Use imperative verbs ("List", "Extract", "Validate").
- Denote placeholders with ALL_CAPS wrapped in <> (e.g., <FILE_PATH>).
- Keep each bullet single-responsibility.

Anti-Patterns:

- Repeating unchanged context across iterations.
- Vague verbs ("handle", "deal with").
- Mixing planning and execution output in one block without separators.
