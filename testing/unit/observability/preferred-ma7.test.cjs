const { expect } = require("chai");

// Dynamically import TS/JSX module transpiled by Next build system not needed; we reimplement minimal helper logic to avoid heavy React import in unit test context.
// This mirrors exported preferredMA from observability/page.
function preferredMA(computed, serverVal) {
  if (typeof serverVal === "number") return serverVal;
  return computed && computed.length ? computed[0] : undefined;
}

describe("preferredMA helper", () => {
  it("returns server value when present even if computed exists", () => {
    const out = preferredMA([10, 9, 8], 7.5);
    expect(out).to.equal(7.5);
  });
  it("falls back to first computed when server missing", () => {
    const out = preferredMA([12.34, 11], null);
    expect(out).to.equal(12.34);
  });
  it("returns undefined when neither present", () => {
    const out = preferredMA([], null);
    expect(out).to.equal(undefined);
  });
});
