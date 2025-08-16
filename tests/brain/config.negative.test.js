const assert = require('assert');
const { loadConfig, validateConfig } = require('../../dist/brain/scripts/brain/config');
const cfg = loadConfig();
const bad = JSON.parse(JSON.stringify(cfg));
bad.governance.maxBatchTasks = 0;
bad.tokens.temperature = 3;
const res = validateConfig(bad);
assert.equal(res.ok, false);
console.log('config.negative: OK');

