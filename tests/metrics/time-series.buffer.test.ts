// Self-contained node test (no mocha harness) to validate ring buffer windowing
import {
  __resetTimeSeriesTestOnly,
  __sampleOnceTestOnly,
  getTimeSeries,
} from "../../src/lib/metrics/time-series";
import {
  __resetUnifiedMetricsTestOnly,
  recordFallback,
  recordRateLimitRejection,
} from "../../src/lib/metrics/unified-metrics";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(msg);
  }
}

(function run() {
  __resetUnifiedMetricsTestOnly();
  __resetTimeSeriesTestOnly();
  // Seed 200 samples to exceed MAX_POINTS=144
  for (let i = 0; i < 200; i++) {
    // vary counters a bit
    if (i % 3 === 0) recordFallback("timeout");
    if (i % 5 === 0) recordRateLimitRejection("user");
    __sampleOnceTestOnly();
  }
  const snapFull = getTimeSeries();
  assert(snapFull.ts.length <= 144, "ring buffer should cap at 144 points");
  const n = 60;
  const snap60 = getTimeSeries(n);
  assert(snap60.ts.length === n, "windowed series should return n points");
  console.log("time-series.buffer tests: PASS");
})();
