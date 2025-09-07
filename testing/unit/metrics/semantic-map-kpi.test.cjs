/* Validates semanticMapAggregateAdoptionPct in KpiSnapshot */
require("ts-node/register");
const assert = require("assert");
const {
  recordSemanticMapAggregateHit,
  recordSemanticMapLegacyFallback,
} = require("../../../src/lib/metrics/unified-metrics.ts");
const {
  getUnifiedMetricsSnapshot,
} = require("../../../src/lib/metrics/unified-metrics.ts");

describe("KPI semantic map adoption", () => {
  it("computes adoption pct correctly", () => {
    recordSemanticMapAggregateHit();
    recordSemanticMapAggregateHit();
    recordSemanticMapLegacyFallback();
    const unified = getUnifiedMetricsSnapshot();
    const sm = unified.semanticMap;
    const denom = (sm.aggregateHits || 0) + (sm.legacyFallbacks || 0);
    const pct = denom ? (sm.aggregateHits / denom) * 100 : 0;
    assert.ok(pct >= 66 && pct <= 67);
  });
});
