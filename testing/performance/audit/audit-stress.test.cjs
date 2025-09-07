/*
 Stress test for audit callable (T13 acceptance)
 Runs 20 parallel audits (depth=1) with GENKIT_TEST_STUB to avoid heavy AI cost.
 Asserts <5% failures and captures p95 crawl duration (approx from timings array).
*/
process.env.GENKIT_TEST_STUB = "1";
require("ts-node/register/transpile-only");
const assert = require("assert");

const audit = require("../../../functions/src/api/audit.ts");

async function runOne(i) {
  try {
    const res = await audit.__testRunSeoAudit(
      {
        url: `https://stress${i}.example.com`,
        depth: 1,
        plan: "admin",
        teamId: "teamStress",
        debugTeamLimit: 1000,
      },
      { uid: `userStress_${i}` }
    );
    return { ok: true, res };
  } catch (e) {
    return { ok: false, err: e };
  }
}

describe("audit stress 20 parallel", () => {
  it("completes with <5% error rate and captures p95 crawl time", async function () {
    this.timeout(30000);
    const rssBefore = process.memoryUsage().rss;
    const N = 20;
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) => runOne(i))
    );
    const settledValues = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    const successes = settledValues.filter((v) => v.ok);
    const failures = settledValues
      .filter((v) => !v.ok)
      .concat(results.filter((r) => r.status === "rejected"));
    const failureRate = failures.length / N;
    assert.ok(failureRate < 0.05, `failureRate ${failureRate}`);
    assert.ok(successes.length > 0, "no successful audits");
    const crawlTimes = successes
      .map((s) => s.res?.timings?.crawl_time_ms ?? 0)
      .sort((a, b) => a - b);
    const p95Index = Math.min(
      crawlTimes.length - 1,
      Math.floor(crawlTimes.length * 0.95)
    );
    const p95 = crawlTimes[p95Index];
    assert.ok(p95 >= 0, "p95 should be non-negative");
    const rssAfter = process.memoryUsage().rss;
    const deltaMB = (rssAfter - rssBefore) / (1024 * 1024);
    // Threshold tuned after initial run showed ~30MB transient growth (module load + ts-node transpile overhead).
    // Treat >40MB as potential leak signal across 20 parallel audits.
    assert.ok(
      deltaMB < 40,
      `Memory RSS delta too high: ${deltaMB.toFixed(2)}MB (limit <40MB)`
    );
    // Optionally log for diagnostics
    console.log(
      JSON.stringify({
        N,
        failureRate,
        p95,
        min: crawlTimes[0],
        max: crawlTimes[crawlTimes.length - 1],
        rssDeltaMB: deltaMB.toFixed(2),
      })
    );
  });
});
