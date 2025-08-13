# Scripts quickstart: seeding and table-data tests

This note explains how to seed demo table rows and run the table-data contract/edge-case tests locally.

## Prerequisites

- Dev server running on http://localhost:3000
  - Start: `npm run dev-no-turbopack`

## Seeding table widget rows

Script: `scripts/seed-dashboard-table-rows.ts`

Environment variables:

- `WIDGET_ID` (default: `demo-table`)
- `COUNT` (default: `25`)
- `TEAM_ID` (optional: scopes rows to a team)
- `USER_ID` (optional: scopes rows to a user)
- `STRING_ONLY` (optional: `true` to omit numeric shadows and store values as strings)

Examples:

- Default demo seed
  - `npm run seed:table`
- Seed scoped rows (team + user) for a specific widget
  - `WIDGET_ID=edge-scoped-empty TEAM_ID=team-edge USER_ID=user-edge npm run seed:table:scoped`
- Seed string-only values for a specific widget
  - `WIDGET_ID=demo-table STRING_ONLY=true npm run seed:table`
  - or `WIDGET_ID=demo-table npm run seed:table:string-only` (uses STRING_ONLY=true)

## Run table-data tests locally

- Contract test (sort/pagination/CSV):
  - `BASE_URL=http://localhost:3000 npm run -s test:table-contract`
- Edge-case tests (scoped empty, string-only sort order, CSV all-cap):
  - `BASE_URL=http://localhost:3000 npm run -s test:table-edge`
  - Optional overrides:
    - `WIDGET_ID` (default: `edge-table`)
    - `STRING_ONLY_WIDGET_ID` (default: `edge-fallback`)
    - `FALLBACK_WIDGET_ID` (default: `edge-fallback`)
    - `SCOPED_EMPTY_WIDGET_ID` (default: `edge-scoped-empty`)

Notes:

- When `teamId`/`userId` query params are used, the API disables synthetic fallback. If no scoped rows exist, the response is empty by design.
- CSV `all=true` respects a safety cap to avoid runaway exports; the edge-case test verifies this using a fallback dataset.
