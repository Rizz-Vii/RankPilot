#!/usr/bin/env node
// CHANGE_LOG enforcement hook (T57 / DQ7)
// Fails (exit 1) if there are staged source changes altering runtime behavior without CHANGE_LOG.md modifications.
// Heuristic: if staged changes touch src/ or functions/ or firestore.rules but no CHANGE_LOG.md diff, block.

import { execSync } from "child_process";

function getStagedFiles() {
  const output = execSync("git diff --cached --name-only", {
    encoding: "utf8",
  }).trim();
  return output ? output.split(/\n/) : [];
}

function main() {
  const files = getStagedFiles();
  if (!files.length) return;
  const requiresLog = files.some((f) =>
    /^(src\/|functions\/|firestore\.rules|next\.config|package\.json)/.test(f)
  );
  if (!requiresLog) return;
  const hasChangeLog = files.some(
    (f) => f === "docs/CHANGE_LOG.md" || f === "CHANGE_LOG.md"
  );
  if (!hasChangeLog) {
    console.error(
      "\n❌ CHANGE_LOG ENFORCEMENT: Detected runtime-impacting changes without CHANGE_LOG.md update."
    );
    console.error("Files:");
    files
      .filter((f) =>
        /^(src\/|functions\/|firestore\.rules|next\.config|package\.json)/.test(
          f
        )
      )
      .forEach((f) => console.error(" -", f));
    console.error(
      "\nAdd a CHANGE_LOG.md entry with rationale + rollback plan, then re-stage."
    );
    process.exit(1);
  }
  console.log("✅ CHANGE_LOG enforcement passed");
}

try {
  main();
} catch (e) {
  console.error("validate-changelog failed:", e?.message);
  process.exit(1);
}
