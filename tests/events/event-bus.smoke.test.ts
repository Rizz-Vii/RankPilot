// Minimal smoke test for typed event bus
import { __countsTestOnly, emit, on } from "../../src/lib/events/event-bus";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(msg);
  }
}

(function run() {
  const off = on("bi.snapshot.requested", (evt) => {
    if (!evt || evt.type !== "bi.snapshot.requested")
      throw new Error("unexpected type");
  });
  const delivered = emit("bi.snapshot.requested", {
    ts: Date.now(),
    source: "test",
  });
  assert(delivered >= 1, "should deliver to at least one subscriber");
  off();
  const delivered2 = emit("bi.snapshot.requested", {
    ts: Date.now(),
    source: "test2",
  });
  assert(delivered2 === 0, "no subscribers after off");
  const counts = __countsTestOnly();
  console.log("event-bus counts", counts);
  console.log("event-bus.smoke tests: PASS");
})();
