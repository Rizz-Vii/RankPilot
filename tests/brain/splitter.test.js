const assert = require("assert");
const {
  splitPlan,
} = require("../../dist/brain/scripts/brain/governance/splitter");
const steps = Array.from({ length: 40 }, (_, i) => ({ i }));
const cfg = { governance: { maxBatchTasks: 10, splitThresholdLoc: 300 } };
const groups = splitPlan(steps, cfg);
assert(groups.length >= 2, "splitter did not split");
console.log("splitter: OK");
