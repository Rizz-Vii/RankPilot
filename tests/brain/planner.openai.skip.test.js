const assert = require('assert');
const { planWithOpenAI, savePlanText } = require('../../dist/brain/scripts/brain/planning/planner');
(async () => {
  const cfg = { tools: { openaiPlanner: true } };
  const res = await planWithOpenAI([{ id:'t', title:'x', raw:'', domain:'docs', status:'TODO' }], cfg, 4);
  assert(res && Array.isArray(res.steps), 'plan missing');
  const runId = 'test-'+Date.now();
  savePlanText(runId, res);
  console.log('planner.openai.skip: OK');
})().catch(e=>{ console.error(e); process.exit(1); });

