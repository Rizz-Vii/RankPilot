#!/usr/bin/env ts-node
/*
 * T14 Migration – CI Validation: Backfill DRY_RUN & Scan Artifact
 * Verifies:
 *  1. NeuroSEO large-doc scanner produces JSON artifact (write=false)
 *  2. Backfill scripts respect DRY_RUN flag (log dryRun=true and no failure)
 *  3. Emits basic metrics lines without fatal errors
 * Fails fast with non-zero exit if expectations not met.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

function run(cmd: string, env: Record<string, string | undefined> = {}) {
  const mergedEnv = { ...process.env, ...env } as NodeJS.ProcessEnv;
  return execSync(cmd, { stdio: "pipe", env: mergedEnv, encoding: "utf8" });
}

function assert(cond: unknown, msg: string) {
  if (!Boolean(cond)) {
    console.error("\n[CI][BACKFILL-DRY-RUN] Assertion FAILED:", msg);
    process.exit(1);
  }
}

function log(msg: string) {
  console.log(`[CI][BACKFILL-DRY-RUN] ${msg}`);
}

async function main() {
  const artifactsDir = path.resolve("artifacts");
  if (!fs.existsSync(artifactsDir))
    fs.mkdirSync(artifactsDir, { recursive: true });
  const scanFile = path.join(artifactsDir, "neuroseo-scan.json");
  if (fs.existsSync(scanFile)) fs.unlinkSync(scanFile);

  log("Running large-doc scanner (dry run) to generate artifact JSON...");
  const scanOut = run("npx ts-node scripts/scan-neuroseo-large-docs.ts", {
    OUTPUT_FILE: scanFile,
  });
  if (!/DRY RUN/i.test(scanOut))
    log("Scanner output did not explicitly state DRY RUN (FYI)");
  assert(
    fs.existsSync(scanFile),
    "Expected scan artifact JSON file not created"
  );
  const artifact = JSON.parse(fs.readFileSync(scanFile, "utf8"));
  assert(
    artifact && artifact.write === false,
    "Artifact should indicate write=false (dry run)"
  );
  assert(Array.isArray(artifact.entries), "Artifact entries array missing");
  log(`Scan artifact OK (entries=${artifact.entries.length})`);

  log("Running neural crawler aggregate backfill in DRY_RUN mode...");
  const crawlerOut = run(
    "npx tsx scripts/backfill-neural-crawler-aggregate.ts",
    { DRY_RUN: "1", BATCH_SIZE: "25" }
  );
  assert(
    /start batchSize=25 dryRun=true/.test(crawlerOut),
    "Neural crawler backfill did not log dryRun=true start line"
  );
  assert(
    !/Backfill FAILED/i.test(crawlerOut),
    "Neural crawler backfill reported failure"
  );
  log("Neural crawler DRY_RUN pass");

  log("Running semantic map aggregate backfill in DRY_RUN mode...");
  const smOut = run("npx tsx scripts/backfill-semantic-map-aggregate.ts", {
    DRY_RUN: "1",
    BATCH_SIZE: "25",
  });
  assert(
    /start batchSize=25 dryRun=true/.test(smOut),
    "Semantic map backfill did not log dryRun=true start line"
  );
  assert(
    !/Backfill FAILED/i.test(smOut),
    "Semantic map backfill reported failure"
  );
  assert(
    /DRY RUN ONLY/i.test(smOut) || /complete scanned=0/.test(smOut),
    "Semantic map DRY_RUN completion marker missing"
  );
  log("Semantic map DRY_RUN pass");

  log("All DRY_RUN & scan artifact validations passed.");
}

main().catch((e) => {
  console.error("[CI][BACKFILL-DRY-RUN] Unexpected error", e);
  process.exit(1);
});
