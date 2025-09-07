#!/usr/bin/env node
/**
 * ensure-single-dev.js
 * Prevents launching a second Next.js dev server in the same workspace by
 * checking if the desired port is already in use. If occupied, exits non-zero
 * with a helpful message instead of auto-binding to a new port (e.g., 3001).
 */
const { execSync } = require("child_process");

const desiredPort = process.env.PORT || process.env.NEXT_DEV_PORT || "3000";

function portInUse(port) {
  try {
    const out = execSync(
      `bash -lc "ss -ltnp | grep -E ':${port}\\b' || true"`,
      { stdio: ["ignore", "pipe", "pipe"] }
    )
      .toString()
      .trim();
    return out.length > 0 ? out : "";
  } catch {
    return "";
  }
}

const existing = portInUse(desiredPort);
if (existing) {
  // Friendly message and non-zero exit to prevent spawning a second dev server
  console.error(`\n[dev-guard] Port ${desiredPort} is already in use.\n`);
  console.error(
    `[dev-guard] A Next.js dev server appears to be running already:\n${existing}\n`
  );
  console.error("[dev-guard] To stop it:");
  console.error(`  - kill by port:   fuser -k ${desiredPort}/tcp  # or`);
  console.error(`  - kill by name:   pkill -f "node .*next dev"`);
  console.error(
    "\n[dev-guard] Aborting to avoid spawning another server on a different port."
  );
  // Ensure non-zero exit even if process.exit is ignored by parent tooling
  try {
    process.exit(12);
  } catch {}
  throw new Error(`[dev-guard] Port ${desiredPort} is occupied`);
}

// All clear
// Let Node exit normally
