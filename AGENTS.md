# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (Next.js app router in `src/app`, UI in `src/components`, utilities in `src/lib`, hooks in `src/hooks`).
- Assets: `public/` (static), `styles/` under `src/`.
- Serverless/Cloud: `functions/` (Firebase Functions; build/deploy via npm scripts).
- Tests: `testing/` (unit, performance, helpers) and Playwright specs per config; additional fixtures under `tests/`.
- Config: root `eslint.config.mjs`, `.prettierrc`, `tsconfig.json`, multiple `playwright.config.*` files.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js locally on `http://localhost:3000` (Turbopack).
- `npm run build`: Production build (honors env; skips dev errors).
- `npm start`: Serve the built app.
- `npm test`: Playwright role-based suite. Examples: `npm run test:lean`, `npm run test:performance`.
- `npm run test:unit:theme` (and other `test:unit:*`): Mocha-based unit tests in `testing/unit/*`.
- `npm run lint` / `npm run lint:fix`: ESLint; `npm run format` to apply Prettier.
- `npm run typecheck`: TypeScript `tsc --noEmit`.
- Firebase: `npm run firebase:serve` (local), `npm run firebase:deploy`.
- Env verification: `npm run verify-env`.

## Coding Style & Naming Conventions
- TypeScript-first; 2-space indent; semicolons; double quotes by default.
- Prettier config in `.prettierrc` (e.g., `printWidth: 80`, `trailingComma: es5`).
- ESLint via `eslint.config.mjs` plus custom rules (e.g., `no-raw-hex-colors`).
- File names: use kebab-case for files, PascalCase for React components, and `*.tsx` for JSX.

## Testing Guidelines
- Frameworks: Playwright for E2E; Mocha for unit tests.
- Locations: `testing/unit/**` for unit (`*.test.cjs` or `*.spec.cjs`), Playwright specs per the selected `playwright.config.*`.
- Run fast suites locally: `npm run test:lean` or targeted unit scripts.
- Add tests alongside new features and update existing assertions when behavior changes.

## Commit & Pull Request Guidelines
- Conventional Commits observed: `feat`, `fix`, `chore`, `refactor`, `test`, `security`, `audit` with optional scopes (e.g., `feat(nav): add item`).
- Keep messages imperative, concise, and scoped.
- Pull Requests: use `.github/pull_request_template.md`; include summary, risk/impact, and satisfy the Risk Checklist (API, data model, Firestore rules, performance, gating, rollback). Add tests, screenshots for UI, and link issues.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local`; keep `serviceAccount.json` out of VCS (use `serviceAccount.example.json` + env-based credentials). Run `npm run security-check` when in doubt.

