/*
  Verifies crawl/analysis p95 computation after enough samples.
*/
require("ts-node/register");
const assert = require("assert");

describe("crawler p95 metrics", () => {
  let metrics;
  before(() => {
    metrics = require("../../../src/lib/metrics/unified-metrics.ts");
  });

  it("computes non-null crawlP95 and analysisP95 after multiple samples", () => {
    const crawlSamples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const analysisSamples = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    for (let i = 0; i < crawlSamples.length; i++) {
      metrics.recordCrawlerSuccess(crawlSamples[i], analysisSamples[i]);
    }
    const snap = metrics.getUnifiedMetricsSnapshot();
    assert.ok(snap.crawler.crawlP95 != null, "crawlP95 should be set");
    assert.ok(snap.crawler.analysisP95 != null, "analysisP95 should be set");
    assert.equal(snap.crawler.crawlP95, 100);
    assert.equal(snap.crawler.analysisP95, 50);
  });
});
