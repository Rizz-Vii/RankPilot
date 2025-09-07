#!/usr/bin/env ts-node
/** Snapshot Provenance Metrics (PROV-01 / OBS-01)
 * Appends a compact line JSON snapshot of key provenance + KPI metrics to metrics-snapshots.log
 * Intended for scheduled (cron / workflow) daily run to enable simple historical trend diffs without external TSDB.
 */
import fs from "fs";
import path from "path";
// Use relative imports to avoid ts-node path alias issues in standalone execution
import { getUnifiedMetricsSnapshot } from "../src/lib/metrics/unified-metrics";
import { getKpiSnapshot } from "../src/lib/metrics/kpi-aggregation";

function run() {
  const unified = getUnifiedMetricsSnapshot();
  const kpis = getKpiSnapshot();
  const entry = {
    ts: new Date().toISOString(),
    coverage: unified.aiResponses.coveragePct,
    total: unified.aiResponses.total,
    fallbackRate: kpis.fallbackRate,
    cacheHitRatio: kpis.cacheHitRatio,
    p95Overall: kpis.p95LatencyOverall,
    rateLimitRej: kpis.rateLimitRejectionRate,
    avgCompactDoc: kpis.avgCompactDocBytes,
  };
  const file = path.join(process.cwd(), "metrics-snapshots.log");
  fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  console.log("Snapshot appended", entry);
}
run();
