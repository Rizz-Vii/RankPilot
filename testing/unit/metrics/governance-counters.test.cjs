// Governance counters + queue snapshot presence test (Phase 1 hardening)
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const assert = require("assert").strict;
const metrics = require("../../../src/lib/metrics/unified-metrics.ts");

describe("governance counters & queue snapshot", () => {
  beforeEach(() => {
    if (metrics.__resetUnifiedMetricsTestOnly)
      metrics.__resetUnifiedMetricsTestOnly();
  });

  it("increments provenance injection and forbidden field strip counters", () => {
    metrics.recordProvenanceInjection();
    metrics.recordProvenanceInjection();
    metrics.recordForbiddenFieldStrip(3);
    const snap = metrics.getUnifiedMetricsSnapshot();
    assert.equal(snap.governance.provenanceInjected, 2);
    assert.equal(snap.governance.forbiddenFieldStrips, 3);
  });

  it("exposes queue snapshot object even before any queue activity", () => {
    const snap = metrics.getUnifiedMetricsSnapshot();
    assert.ok(snap.queue, "queue snapshot missing");
    assert.equal(snap.queue.enqueued, 0);
    assert.equal(snap.queue.successRatio, 1); // default when no terminal tasks
  });
});
