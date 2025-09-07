import { strict as assert } from "assert";

// Mirrors interface in NeuroSEODashboard (not exported). Re-declare minimal shape for test.
interface UsageStats {
  used: number;
  limit: number;
  periodStart?: string;
  periodEnd?: string;
}

function computeUsagePct(stats: UsageStats): number {
  return stats.limit > 0 ? Math.round((stats.used / stats.limit) * 100) : 0;
}

describe("NeuroSEO UsageStats helper", () => {
  it("computes percentage correctly", () => {
    const pct = computeUsagePct({ used: 25, limit: 100 });
    assert.equal(pct, 25);
  });
  it("handles zero limit safely", () => {
    const pct = computeUsagePct({ used: 5, limit: 0 });
    assert.equal(pct, 0);
  });
});
