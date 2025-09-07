#!/usr/bin/env ts-node
/** Conditional extended critical test suite
 * Set CRITICAL_EXTENDED=1 to run slower / expansive diagnostic scripts.
 * Keeps base `test:critical` fast while allowing full coverage in nightly or explicit CI jobs.
 */
import { spawnSync } from "child_process";

const enabled = process.env.CRITICAL_EXTENDED === "1";
if (!enabled) {
  console.log(
    "[critical-extended] Skipped (set CRITICAL_EXTENDED=1 to enable)"
  );
  process.exit(0);
}

const commands: Array<[string, string[]]> = [
  // New crawler adoption alert Playwright spec
  [
    "npx",
    [
      "playwright",
      "test",
      "testing/specs/main/api/health-crawler-adoption-alert.spec.ts",
      "--config=playwright.config.role-based.ts",
      "--project=api-testing",
    ],
  ],
  ["npm", ["run", "test:marketing-guard"]],
  ["npm", ["run", "test:team-access"]],
  ["ts-node", ["scripts/test-team-invites.ts"]],
  ["ts-node", ["scripts/test-team-invites-negative.ts"]],
  ["npm", ["run", "test:team-ownership"]],
  ["npm", ["run", "test:provenance"]],
  ["npm", ["run", "test:provenance-coverage"]],
  ["ts-node", ["scripts/enumerate-ai-endpoints.ts"]],
  ["ts-node", ["scripts/test-feature-keys.ts"]],
  ["ts-node", ["scripts/test-metrics-registry.ts"]],
  ["ts-node", ["scripts/test-observability-kpis.ts"]],
  ["ts-node", ["scripts/audit-console-usage.ts"]],
  ["npm", ["run", "scan:forbidden-fields"]],
  ["npm", ["run", "scan:hex-colors"]],
  ["ts-node", ["scripts/lint-tenant-scope.ts"]],
  ["node", ["scripts/check-status-colors.js"]],
  ["npm", ["run", "test:entitlements-access"]],
];

for (const [cmd, args] of commands) {
  console.log(`[critical-extended] Running: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (res.status !== 0) {
    console.error(
      `[critical-extended] Failed command: ${cmd} ${args.join(" ")}`
    );
    process.exit(res.status || 1);
  }
}

console.log("[critical-extended] All extended checks passed");
