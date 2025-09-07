const assert = require("assert");
const mod = require("../../dist/brain/scripts/brain/governance/guards");
const checkBatchLimits =
  mod.checkBatchLimits || (mod.default && mod.default.checkBatchLimits);
assert.equal(typeof checkBatchLimits, "function");
assert.equal(
  checkBatchLimits(
    { locAdded: 100, files: 5 },
    { maxLocAdded: 450, maxFiles: 15 }
  ).ok,
  true
);
assert.equal(
  checkBatchLimits(
    { locAdded: 500, files: 5 },
    { maxLocAdded: 450, maxFiles: 15 }
  ).ok,
  false
);
console.log("guards.test: OK");
