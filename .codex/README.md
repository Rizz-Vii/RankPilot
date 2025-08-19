# Project Codex Workspace

This `.codex/` directory is the project-scoped companion to any user-level Codex data found under `~/.codex` (or `/home/codespace/.codex` in GitHub Codespaces). It is committed to version control to share automation and prompt assets among collaborators and CI.

## Purpose

| Area        | Contents                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `prompts/`  | Shared prompt snippets / system seeds used by delegation or AI planning scripts.                 |
| `queues/`   | Template JSONL files for delegation or background task queues (sanitized, no secrets).           |
| `policies/` | Project guardrails, guidelines, lint guard configurations, codemod manifests.                    |
| `sessions/` | (Optional) Curated, redacted session transcripts illustrating workflows. Avoid raw private data. |
| `scripts/`  | Helper scripts for codex-related maintenance (e.g., prune queues, summarize history).            |

## What NOT To Put Here

- API keys, tokens, auth credentials (keep those only in the user-level `~/.codex` or env vars)
- Large binary artifacts or logs
- Proprietary customer data or PII

## Recommended Workflow

1. Keep ephemeral run-time state (live session logs, caches) in the user-level `.codex` only.
2. When a prompt/policy becomes generally useful, migrate a sanitized copy into `./.codex/`.
3. Reference these assets from scripts (e.g., `npm run delegate:*`) using relative paths.
4. Add lightweight tests/validation for any JSONL queue templates if structure is important.

## Versioning Guidance

- Treat changes here like code: small, reviewed PRs.
- Add context in commit messages (e.g., `codex: add semantic-map pruning prompt v2`).

## Privacy & Compliance

Before committing new material:

- Strip user identifiers.
- Replace confidential org/product names with neutral labels where possible.
- Ensure licenses allow redistribution (for any borrowed text fragments).

## Bootstrapping New Contributors

Provide a short section in root `README.md` linking here. A newcomer should be able to:

```
# Inspect available prompts
ls .codex/prompts

# View policies
ls .codex/policies
```

If any required private files are needed, document them (filename + description) but do **not** commit placeholders containing secrets.

## Future Ideas

- Add a `schema/` folder if adopting JSON Schema for queue/prompt validation.
- Introduce a nightly job to diff user-level improvisations vs. committed prompts and suggest merges.

---

Maintainers: update this README as automation patterns evolve.
