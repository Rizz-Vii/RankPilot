# Agents quarantine notice

Agents in this folder are not part of the runtime application. They are generators/orchestrators with potential side effects and are disabled by default. To run them, use the CLI in `scripts/agents` with plan/apply and backups.

- Enable only by setting RANKPILOT_AGENTS_ENABLED=true
- Prefer using `npm run agents:plan` to preview changes
- Do not import these from API routes or pages
