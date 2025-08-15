// Audit callable timings verification (crawl_time_ms, analysis_time_ms, total_time_ms)
// Uses GENKIT_TEST_STUB=1 to bypass heavy Genkit initialization.
process.env.GENKIT_TEST_STUB = '1';
require('ts-node/register/transpile-only');
const { expect } = require('chai');
// Minimal fetch stub (single page)
global.fetch = async () => ({ ok: true, text: async () => '<html><title>T</title><meta name="description" content="d"><h1>H1</h1></html>' });

const auditModule = require('../../../functions/src/api/audit.ts');

describe('audit callable timings', () => {
  it('includes timings with numeric fields and logical ordering', async () => {
    const { __testRunSeoAudit } = auditModule;
    const res = await __testRunSeoAudit({ url: 'https://timing.test', depth: 1 }, { uid: 'userX' });
    expect(res).to.have.property('timings');
    expect(res.timings).to.include.keys(['crawl_time_ms','analysis_time_ms','total_time_ms']);
    expect(res.timings.total_time_ms).to.be.at.least(res.timings.crawl_time_ms);
    expect(res.timings.crawl_time_ms).to.be.at.least(0);
  });
});
