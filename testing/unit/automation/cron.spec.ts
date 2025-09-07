import { expect } from "chai";
import { describe, it } from "mocha";
import {
  computeNextRun as computeNextRunPublic,
  type AutomationRecipe,
} from "../../../src/lib/automation/recipes";

// We can't import computeNextFromCron directly (private), so we test via computeNextRun with cron.

function withCron(cron: string): AutomationRecipe {
  return {
    userId: "u",
    name: "t",
    active: true,
    schedule: { cron },
    actions: ["runNeuroSEOAnalysis"],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastRun: null,
    nextRun: null,
  };
}

describe("Cron scheduling (subset)", () => {
  it("supports @daily (00:00 UTC next day if past midnight)", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 0, 0, 0));
    const next = computeNextRunPublic(now, withCron("@daily"))!;
    expect(next.getUTCDate()).to.equal(2);
    expect(next.getUTCHours()).to.equal(0);
    expect(next.getUTCMinutes()).to.equal(0);
  });

  it("supports @hourly (next hour at minute 0)", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 30, 0));
    const next = computeNextRunPublic(now, withCron("@hourly"))!;
    expect(next.getUTCHours()).to.equal(11);
    expect(next.getUTCMinutes()).to.equal(0);
  });

  it('supports "m h * * *" exact time same day if in future', () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 15, 0));
    const next = computeNextRunPublic(now, withCron("30 11 * * *"))!;
    expect(next.getUTCHours()).to.equal(11);
    expect(next.getUTCMinutes()).to.equal(30);
    expect(next.getUTCDate()).to.equal(1);
  });

  it("rolls to next day if time passed", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 23, 50, 0));
    const next = computeNextRunPublic(now, withCron("45 23 * * *"))!;
    // Our implementation steps forward starting at +1 minute, so past times roll to tomorrow
    expect(next.getUTCDate()).to.equal(2);
  });

  it("returns null for unsupported fields", () => {
    const now = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    const next = computeNextRunPublic(now, withCron("0 0 1 * *"));
    expect(next).to.equal(null);
  });
});
