const assert = require("assert");
const {
  sampleContext,
} = require("../../dist/brain/scripts/brain/core/contextSampler");
const ctx = sampleContext(8);
assert(
  Array.isArray(ctx.files) && ctx.files.length >= 1,
  "sampleContext returned no files"
);
console.log("context.sampler: OK");
