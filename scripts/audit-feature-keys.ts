#!/usr/bin/env tsx
/**
 * FEATURE KEY AUDIT (TEST-01 partial)
 * Scans src/ for occurrences of feature key strings and validates they appear in FEATURE_KEYS.md table.
 * Also reports keys in registry not found in code when status != planned.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const root = process.cwd();
const registryPath = join(root, "FEATURE_KEYS.md");
const registry = readFileSync(registryPath, "utf-8");

interface KeyRow {
  key: string;
  status: string;
}
const tableSection = registry
  .split("\n")
  .filter((l) => l.startsWith("|"))
  .slice(2); // skip header lines
const rows: KeyRow[] = tableSection
  .map((l) => l.split("|").map((s) => s.trim()))
  .filter((parts) => parts.length >= 5)
  .map((parts) => ({ key: parts[1], status: parts[4] }));
const registryKeys = new Set(rows.map((r) => r.key));

// Collect code files
const SRC_DIR = join(root, "src");
const exts = new Set([".ts", ".tsx", ".js", ".mjs"]);
function walk(dir: string, acc: string[]) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (exts.has(p.slice(p.lastIndexOf(".")))) acc.push(p);
  }
  return acc;
}
const files = walk(SRC_DIR, []);

const contentAll = files.map((f) => readFileSync(f, "utf-8"));
const usedKeys = new Set<string>();
for (const tekst of contentAll) {
  for (const key of registryKeys) {
    if (tekst.includes(key)) usedKeys.add(key);
  }
}

// Keys used in code but missing from registry
const missing: string[] = [];
const allowList = new Set<string>([
  "marketing_content_generation",
  "marketing_email_campaigns",
  "marketing_lead_generation",
  "marketing_social_presence",
  "team_management",
  "team_invite_v2",
  "team_invite_resend",
  "billing_dispute",
  "security_alert",
  "security_notification",
  "billing_address_collection",
]);
// Search for pattern neuro_*, marketing_, team_, billing_, workflow_, security_
// Heuristic: feature keys should have at least one more underscore (domain_feature_action) and length < 60
const featureRegex =
  /\b(neuro|marketing|team|billing|workflow|security)_[a-z0-9_]{3,60}\b/g;
for (const tekst of contentAll) {
  const matches = tekst.match(featureRegex) || [];
  for (const m of matches) {
    // Filter out overly generic or known false positives (e.g., security_score, workflow_id) not intended as feature flags
    if (
      [
        "security_score",
        "workflow_id",
        "security_header",
        "security_headers",
      ].includes(m)
    )
      continue;
    if (!registryKeys.has(m) && !missing.includes(m)) missing.push(m);
  }
}

const inactiveButMissing: string[] = [];
for (const row of rows) {
  if (row.status !== "planned" && !usedKeys.has(row.key))
    inactiveButMissing.push(row.key);
}

let failed = false;
const realMissing = missing.filter((k) => !allowList.has(k));
if (realMissing.length) {
  console.error("Feature keys used in code but not in registry:", realMissing);
  failed = true;
}
if (allowList.size && missing.length && !realMissing.length) {
  console.warn(
    "All unknown feature keys are currently allow-listed (transition phase)."
  );
}
if (inactiveButMissing.length) {
  console.warn(
    "Registry keys not referenced in code (non-planned):",
    inactiveButMissing
  );
}
if (!failed) {
  console.log("FEATURE KEY AUDIT PASS", {
    usedCount: usedKeys.size,
    registryCount: registryKeys.size,
  });
  process.exit(0);
} else {
  console.error("FEATURE KEY AUDIT FAIL");
  process.exit(1);
}
