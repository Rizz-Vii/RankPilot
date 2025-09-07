const { strict: assert } = require("assert");
const { getLogger } = require("../../../src/lib/logging/app-logger.ts");

describe("app-logger", () => {
  it("emits structured JSON line with component and level", () => {
    const logs = [];
    const orig = console.info;
    console.info = (line) => logs.push(line);
    try {
      const logger = getLogger("unit-test");
      logger.info("hello", { foo: 1 });
    } finally {
      console.info = orig;
    }
    assert.ok(logs.length >= 1, "no log line captured");
    const obj = JSON.parse(logs[0]);
    assert.equal(obj.level, "info");
    assert.equal(obj.component, "unit-test");
    assert.equal(obj.message, "hello");
    assert.ok(typeof obj.timestamp === "string");
    assert.ok(typeof obj.elapsedMs === "number");
    assert.deepEqual(obj.context, { foo: 1 });
  });

  it("marks audit and degraded flags", () => {
    const logs = [];
    const origWarn = console.warn;
    const origInfo = console.info;
    console.warn = (line) => logs.push(line);
    console.info = (line) => logs.push(line);
    try {
      const logger = getLogger("unit-test");
      logger.audit("sec-event", { userId: "u1" });
      logger.degraded("fallback", { reason: "down" });
    } finally {
      console.warn = origWarn;
      console.info = origInfo;
    }
    const [audit, degr] = logs.map((l) => JSON.parse(l));
    assert.equal(audit.audit, true);
    assert.equal(degr.degraded, true);
  });
});
