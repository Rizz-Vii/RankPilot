#!/usr/bin/env node
/**
 * list-env-keys.mjs
 * Scans the repository for environment variable usages and prints
 * a categorized list. Supports generating export lines or .env template.
 *
 * Usage:
 *   node scripts/list-env-keys.mjs                -> human report
 *   node scripts/list-env-keys.mjs --export       -> export KEY=value lines (placeholders)
 *   node scripts/list-env-keys.mjs --env          -> .env style KEY=value placeholders
 *   node scripts/list-env-keys.mjs --json         -> machine-readable JSON
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const exts = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const codeDirs = ["src", "functions", "scripts"];

const codeVarPattern1 = /process\.env\.([A-Z0-9_]+)/g; // dot notation
const codeVarPattern2 = /process\.env\[["'`]([A-Z0-9_]+)["'`]\]/g; // bracket notation
const jsonEnvPattern = /\$\{env:([A-Z0-9_]+)\}/g; // ${env:VAR}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function collectFromFiles(files) {
  const set = new Set();
  for (const f of files) {
    let txt;
    try {
      txt = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    let m;
    while ((m = codeVarPattern1.exec(txt))) set.add(m[1]);
    while ((m = codeVarPattern2.exec(txt))) set.add(m[1]);
    while ((m = jsonEnvPattern.exec(txt))) set.add(m[1]);
  }
  return set;
}

// Gather code files
let codeFiles = [];
for (const d of codeDirs) {
  const p = path.join(root, d);
  if (fs.existsSync(p)) codeFiles = codeFiles.concat(walk(p));
}

// Add top-level JSON configs likely to reference env vars
["mcp.development.json", "mcp.optimized.json", "package.json"].forEach((f) => {
  const fp = path.join(root, f);
  if (fs.existsSync(fp)) codeFiles.push(fp);
});

const codeVars = collectFromFiles(codeFiles);

// Parse .env.example if present
const examplePath = path.join(root, ".env.example");
const exampleVars = new Map();
if (fs.existsSync(examplePath)) {
  const lines = fs.readFileSync(examplePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const ix = line.indexOf("=");
    if (ix === -1) continue;
    const key = line.slice(0, ix).trim();
    if (/^[A-Z0-9_]+$/.test(key)) exampleVars.set(key, line.slice(ix + 1));
  }
}

// Combine
const all = new Set([...codeVars, ...exampleVars.keys()]);

// Categorize
const missingInExample = [...codeVars]
  .filter((k) => !exampleVars.has(k))
  .sort();
const unusedInCode = [...exampleVars.keys()]
  .filter((k) => !codeVars.has(k))
  .sort();
const present = [...codeVars].filter((k) => exampleVars.has(k)).sort();

const result = {
  counts: {
    totalUnique: all.size,
    inCode: codeVars.size,
    inExample: exampleVars.size,
    missingInExample: missingInExample.length,
    unusedInCode: unusedInCode.length,
  },
  present,
  missingInExample,
  unusedInCode,
};

const modeExport = process.argv.includes("--export");
const modeEnv = process.argv.includes("--env");
const modeJson = process.argv.includes("--json");

if (modeJson) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (modeExport || modeEnv) {
  const lines = [];
  for (const key of [...all].sort()) {
    let val = exampleVars.get(key);
    if (val === undefined) val = '""';
    else if (val === "") val = '""';
    // Strip potential comments in value for export mode
    val = String(val).replace(/\s+#.*$/, "");
    if (modeExport) lines.push(`export ${key}=${val}`);
    else lines.push(`${key}=${val}`);
  }
  console.log(lines.join("\n"));
  process.exit(0);
}

// Human report
console.log("Env Variable Inventory");
console.log("======================");
console.log(`Total unique: ${result.counts.totalUnique}`);
console.log(`In code: ${result.counts.inCode}`);
console.log(`In example: ${result.counts.inExample}`);
console.log(`Missing in example: ${result.counts.missingInExample}`);
console.log(
  `Unused in code (present only in example): ${result.counts.unusedInCode}`
);
console.log("\nPresent in both (.env.example & code):");
console.log(present.join(", "));
if (missingInExample.length) {
  console.log("\nMissing in .env.example (add placeholders):");
  console.log(missingInExample.join(", "));
}
if (unusedInCode.length) {
  console.log("\nUnused in code (consider removing from example if legacy):");
  console.log(unusedInCode.join(", "));
}
console.log("\nTip: To generate export lines:");
console.log(
  "  node scripts/list-env-keys.mjs --export > export-env.sh && source export-env.sh"
);
console.log("Or to create a consolidated template:");
console.log("  node scripts/list-env-keys.mjs --env > .env.all");
