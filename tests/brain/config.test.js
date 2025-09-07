const assert = require("assert");
const mod = require("../../dist/brain/scripts/brain/config");
const { loadConfig, validateConfig } = mod;
const cfg = loadConfig();
assert.equal(validateConfig(cfg).ok, true);
const bad = JSON.parse(JSON.stringify(cfg));
bad.limits.maxFiles = -1;
assert.equal(validateConfig(bad).ok, false);
console.log("config.test: OK");
