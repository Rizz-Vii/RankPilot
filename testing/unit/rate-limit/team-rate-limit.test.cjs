const { expect } = require("chai");
require("ts-node/register");
const path = require("path");
const Module = require("module");

// Mock TS path-alias modules used inside the module under test
const __originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/logging/app-logger") {
    return {
      getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
    };
  }
  if (request === "@/lib/metrics/unified-metrics") {
    return {
      recordRateLimitRejection: () => {},
      recordTeamRateLimitAllowed: () => {},
    };
  }
  return __originalLoad(request, parent, isMain);
};

const { enforceTeamRateLimit, TeamRateLimitError } = require(
  path.resolve(__dirname, "../../../src/lib/rate-limit/team-rate-limit.ts")
);

function makeDbDouble() {
  const state = { count: 0, windowStart: Date.now() };
  return {
    collection: () => ({
      doc: () => ({
        _ref: true,
      }),
    }),
    runTransaction: async (fn) =>
      fn({
        get: async () => ({
          exists: true,
          data: () => ({
            count: state.count,
            windowStart: { toMillis: () => state.windowStart },
          }),
        }),
        set: async (_ref, data) => {
          state.count = data.count;
          state.windowStart = data.windowStart?.toMillis
            ? data.windowStart.toMillis()
            : state.windowStart;
        },
      }),
    _state: state,
  };
}

describe("team-rate-limit", () => {
  it("second call is rate limited with retryAfter populated", async () => {
    const db = makeDbDouble();
    const teamId = "t1";
    await enforceTeamRateLimit(db, teamId, { limit: 1, routeKey: "unit-test" });
    try {
      await enforceTeamRateLimit(db, teamId, {
        limit: 1,
        routeKey: "unit-test",
      });
      throw new Error("Expected rate limit error");
    } catch (e) {
      expect(e).to.be.instanceOf(TeamRateLimitError);
      expect(e.retryAfterSeconds).to.be.greaterThan(0);
    }
  });
});
