# RankPilot Agents (Quarantined Generators)

This folder contains safe, opt-in generators and codemods.

- Default mode: plan (dry-run)
- Apply requires --yes and creates backups in .agent-backups
- A manifest (scripts/agents/manifest.json) records generated files for rollback

Usage:

```bash
npm run agents:plan   # show planned changes and diffs
npm run agents:apply  # apply changes (requires --yes in the script)
```

Guidelines:

- Do not overwrite production routes. If scaffolding is needed, create \*.gen.ts files.
- Enforce repository patterns (FeatureGate, getLogger, Stripe SSoT, @/lib imports).
- Validate via lint/typecheck/tests before finalizing changes.
