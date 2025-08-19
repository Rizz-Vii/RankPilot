# AI Usage Policy (Project Scope)

Principles:

- Augment developer productivity; never bypass review on sensitive domains (finance, auth, Firestore schema).
- Preserve provenance metadata & centralized rate limiting.
- Keep diffs minimal and purposeful.

Red Lines:

- No secret material or API keys in prompts or committed artifacts.
- No generation of discriminatory, hateful, or unsafe content.
- No expansion of scheduler cron semantics beyond allowed patterns.

Validation:

- Run `npm run typecheck` + focused tests for touched domains.
- Use `quality:fast` for pre-commit health.

Escalation:

- If uncertain about domain logic (finance metrics, access control), request human clarification before proceeding.
