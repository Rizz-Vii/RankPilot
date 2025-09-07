// DEV-QUEUE-01 integration test: verifies queue metrics lifecycle exposure inside unified snapshot.
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const assert = require("assert").strict;
const {
  __resetQueueMetrics,
  recordQueueEnqueue,
  recordQueueStart,
  recordQueueDone,
} = require("../../../src/lib/metrics/queue-metrics.ts");
const {
  getUnifiedMetricsSnapshot,
} = require("../../../src/lib/metrics/unified-metrics.ts");

describe("queue metrics integration (DEV-QUEUE-01)", () => {
  beforeEach(() => {
    __resetQueueMetrics();
  });

  it("records lifecycle and exposes queue snapshot with derived depth & successRatio", () => {
    recordQueueEnqueue();
    recordQueueEnqueue();
    recordQueueStart();
    recordQueueDone(true);
    const snapshot = getUnifiedMetricsSnapshot();
    if (!snapshot.queue) throw new Error("queue snapshot missing");
    assert.equal(snapshot.queue.enqueued, 2);
    assert.equal(snapshot.queue.started, 1);
    assert.equal(snapshot.queue.completed, 1);
    assert.equal(snapshot.queue.failed, 0);
    assert.equal(snapshot.queue.running, 0);
    assert.equal(snapshot.queue.depth, 1);
    assert.equal(snapshot.queue.successRatio, 1);
  });

  it("handles no terminal tasks (successRatio null) then failure path", () => {
    recordQueueEnqueue();
    recordQueueStart();
    let snapshot = getUnifiedMetricsSnapshot();
    if (!snapshot.queue) throw new Error("queue snapshot missing early");
    assert.equal(snapshot.queue.successRatio, null);
    recordQueueDone(false);
    snapshot = getUnifiedMetricsSnapshot();
    if (!snapshot.queue)
      throw new Error("queue snapshot missing after failure");
    assert.equal(snapshot.queue.failed, 1);
    assert.equal(snapshot.queue.successRatio, 0);
  });
});
