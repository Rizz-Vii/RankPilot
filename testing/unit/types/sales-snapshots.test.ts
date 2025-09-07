import { strict as assert } from "assert";
import type {
  SalesMetricsSnapshotDoc,
  SalesForecastSnapshotDoc,
} from "@/lib/services/sales-automation-snapshots";

// Lightweight structural tests ensuring required fields exist & types align

describe("Sales Snapshot Types", () => {
  it("SalesMetricsSnapshotDoc shape", () => {
    const sample: SalesMetricsSnapshotDoc = {
      id: "abc",
      userId: "u1",
      pipeline: 1000,
      closedWon: 200,
      totalDeals: 5,
    };
    assert.equal(typeof sample.pipeline, "number");
    assert.equal(typeof sample.closedWon, "number");
    assert.equal(typeof sample.totalDeals, "number");
  });

  it("SalesForecastSnapshotDoc shape", () => {
    const sample: SalesForecastSnapshotDoc = {
      id: "f1",
      userId: "u1",
      period: "2025-08-01",
      forecast: 12345,
    };
    assert.equal(sample.period, "2025-08-01");
    assert.equal(typeof sample.forecast, "number");
  });
});
