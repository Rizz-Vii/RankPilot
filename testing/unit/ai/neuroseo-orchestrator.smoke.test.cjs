require('ts-node/register/transpile-only');
const { expect } = require('chai');

const { neuroSEOOrchestrator } = require('../../../src/lib/ai/enhanced-neuroseo-orchestrator');

describe('EnhancedNeuroSEOOrchestrator smoke', () => {
    it('runs analysis and returns merged result shape', async () => {
        const req = {
            urls: ['https://example.com/test-page'],
            targetKeywords: ['example', 'test', 'seo'],
            analysisType: 'seo-focused',
            userPlan: 'admin',
            userId: 'smoke-user'
        };
        const result = await neuroSEOOrchestrator.runAnalysis(req);
        expect(result).to.be.an('object');
        expect(result).to.have.property('summary');
        expect(result.summary).to.have.property('totalAnalyzed');
        expect(result).to.have.property('metadata');
        expect(result.metadata.totalUrls).to.equal(req.urls.length);
    });
});
