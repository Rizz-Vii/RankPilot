const assert = require("assert");
const mod = require("../../dist/brain/scripts/brain/core/classification");
const classify = mod.classify || (mod.default && mod.default.classify);
assert.equal(typeof classify, "function");
assert.equal(classify("fix frontend nav bug"), "frontend");
assert.equal(classify("update docs"), "docs");
console.log("classification.test: OK");
