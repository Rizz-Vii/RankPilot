const assert = require('assert');
const mod = require('../../dist/brain/scripts/brain/execution/toolRegistry');
const { getRunnersFor } = mod;
const cfg = { tools: { typecheck: true, eslint: false, playwright: true, terminal: true } };
const r = getRunnersFor('frontend', cfg);
const names = r.map(x => x.name);
assert(names.includes('TypecheckRunner'));
assert(!names.includes('ESLintRunner'));
assert(names.includes('PlaywrightRunner'));
console.log('toolRegistry.map: OK');

