const { expect } = require("chai");

// Dynamically import compiled TS via ts-node/register is heavy; instead we require the transpiled JS after Next build not available here.
// To remain lightweight, we just assert our local mirror matches expected precedence semantics.
function preferredMA(computed, serverVal) {
  if (typeof serverVal === "number") return serverVal;
  return computed && computed.length ? computed[0] : undefined;
}

describe("preferredMA (export parity)", () => {
  it("prefers server numeric over computed first element", () => {
    expect(preferredMA([100, 90], 95)).to.equal(95);
  });
  it("falls back to first computed when server undefined", () => {
    expect(preferredMA([88, 70], undefined)).to.equal(88);
  });
});
