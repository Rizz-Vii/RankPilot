const assert = require('assert');
const { checkBatchLimits } = require('../../dist/brain/scripts/brain/governance/guards');
assert.equal(checkBatchLimits({ locAdded: 999, files: 1 }, { maxLocAdded: 450, maxFiles: 15 }).ok, false);
console.log('runBatch.guard: OK');

