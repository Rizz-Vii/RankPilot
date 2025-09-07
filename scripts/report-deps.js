#!/usr/bin/env node
/**
 * Simple dependency usage reporter combining depcheck + size placeholder.
 */
import depcheck from "depcheck";
import fs from "fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const options = { skipMissing: true };

async function run() {
  const result = await depcheck(process.cwd(), options);
  console.log("--- Dependency Audit Report (basic) ---");
  if (result.dependencies.length) {
    console.log("Unused (prod):", result.dependencies.join(", "));
  }
  if (result.devDependencies.length) {
    console.log("Unused (dev):", result.devDependencies.join(", "));
  }
  if (!result.dependencies.length && !result.devDependencies.length) {
    console.log("No unused deps detected (heuristic).");
  }
  const invalid = Object.entries(result.invalidFiles);
  if (invalid.length) {
    console.log("\nInvalid files encountered (parse errors):");
    for (const [file, err] of invalid) {
      console.log(" -", file, err);
    }
  }
  console.log(
    "\nMissing (referenced but not installed):",
    Object.keys(result.missing || {}).join(", ") || "None"
  );
  console.log(
    "\nPeer Issues (not checked):",
    Object.keys(result.invalidDirs || {}).length
  );
  console.log(
    "\nScripts summary (core set):",
    Object.keys(pkg.scripts)
      .filter((s) => ["dev", "build", "start", "test", "lint"].includes(s))
      .join(", ")
  );
}
run();
