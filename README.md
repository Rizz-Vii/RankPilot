# RankPilot Studio

A focused AI SEO/marketing SaaS built with Next.js + Firebase.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Cloud_Functions_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)
![Playwright](https://img.shields.io/badge/Playwright-Tests-green?logo=playwright)

## Canonical quick links (AI + engineering)

- DevAgents – in‑app AI agents root guide: [docs/exMD/DevAgents.md](./docs/exMD/DevAgents.md)
- Copilot Chatmode (deterministic profile): [.github/chatmodes/pilotBuddy.chatmode.md](./.github/chatmodes/pilotBuddy.chatmode.md)
- Copilot Instructions (deterministic execution): [.github/chatmodes/copilot-instructions.md](./.github/chatmodes/copilot-instructions.md)
- Production Addendum (2025‑08‑12): [archey/ADDENDUM_2025-08-12.md](./archey/ADDENDUM_2025-08-12.md)
- Docs hub: [docs/README.md](./docs/README.md)

More references:

- PilotBuddy Intelligence: [docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md](./docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md)
- System Architecture: [docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md](./docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md)
- Security Protocols: [docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md](./docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md)
- Development Workflow: [docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md](./docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md)
- Testing Infrastructure: [docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md](./docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md)
- Mobile Performance: [docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md](./docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md)
- Firestore Schemas: [docs/FIRESTORE_SCHEMAS.md](./docs/FIRESTORE_SCHEMAS.md)
- Incomplete Code Audit: [docs/INCOMPLETE_CODE_AUDIT.md](./docs/INCOMPLETE_CODE_AUDIT.md)
- Change Log: [docs/CHANGE_LOG.md](./docs/CHANGE_LOG.md)

## Quickstart

Requirements: Node.js 20+, npm

1. Install dependencies

 ```bash
 npm install
 ```

2. Start the web app (stable dev server)

 ```bash
 npm run dev-no-turbopack
 ```

Optional:

- Lint/format: `npm run lint`
- Run tests (see docs for variants): `npm test`
- Validate delegation log (non-blocking governance check): `npm run validate:aider-log`

## Automation Recipes – Cron support (subset)

The scheduler supports a minimal, deterministic subset of cron for recipe schedules:

- Aliases: `@daily` (00:00 UTC next day), `@hourly` (top of next hour)
- Pattern: `m h * * *` where:
  - `m` = minute (0–59 or `*`), `h` = hour (0–23 or `*`)
  - Day-of-month, month, and day-of-week must be `*` (not supported yet)
- Evaluation is in UTC. Next run is computed by scanning forward up to 48h.

Examples:

- `@daily` → every day at 00:00 UTC
- `@hourly` → every hour at minute 0
- `30 11 * * *` → 11:30 UTC daily
- `0 * * * *` → every hour at minute 0

Notes:

- Don’t set both `intervalMinutes` and `cron` at the same time; creation/update will reject that combination.
- When neither `cron` nor `intervalMinutes` is set, `atHourUTC` (0–23) can be used for daily runs.

## Finance Mock Mode

Finance dashboards (Finance Dashboard, Billing Overview, Invoices) can surface mock metrics for local development or demo states. Behavior is controlled by the helper `allowFinanceMocks()` which resolves in this priority order:

1. Browser override: `localStorage.setItem('allowFinanceMocks','true'|'false')` (immediate toggle without rebuild).
2. Environment variable: `NEXT_PUBLIC_ALLOW_FINANCE_MOCKS=true|false` (at build/runtime).
3. Default: Enabled in non-production (`NODE_ENV !== 'production'`), disabled in production when unspecified.

When mocks are active and no live metrics have loaded, a yellow banner appears stating that finance metrics are mock-sourced (FINANCE_MOCK_MODE). The banner disappears once live data loads or mocks are disabled.


