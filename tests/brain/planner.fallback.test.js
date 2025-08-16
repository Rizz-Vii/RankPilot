const assert = require('assert');
const { plan } = require('../../dist/brain/scripts/brain/planning/planner');
const out = plan([{ id:'t1', title:'Test', raw:'', domain:'docs', status:'TODO' }], { contextKb: 4 });
assert(out && out.strategy === 'heuristic' && Array.isArray(out.steps), 'planner fallback not heuristic');
console.log('planner.fallback: OK');

