/*
  Validates semantic map aggregate adoption counters (T14)
*/
require("ts-node/register");
const assert = require("assert");

describe("semantic map adoption counters", () => {
  let metrics;
  before(() => {
    metrics = require("../../../src/lib/metrics/unified-metrics.ts");
  });
  it("increments aggregate and legacy counters", () => {
    metrics.recordSemanticMapAggregateHit();
    metrics.recordSemanticMapAggregateHit();
    metrics.recordSemanticMapLegacyFallback();
    const snap = metrics.getUnifiedMetricsSnapshot();
    assert.ok(snap.semanticMap);
    assert.equal(snap.semanticMap.aggregateHits, 2);
    assert.equal(snap.semanticMap.legacyFallbacks, 1);
  });
});
